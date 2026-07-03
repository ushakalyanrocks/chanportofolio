import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import RangeToggle from '../components/RangeToggle'
import PortfolioChart from '../components/PortfolioChart'
import StockTable from '../components/StockTable'
import AddStockDialog from '../components/AddStockDialog'
import PortfolioAnalytics from '../components/PortfolioAnalytics'
import RebalancingAdvice from '../components/RebalancingAdvice'
import { filterByRange } from '../utils/range'
import { exportPortfolioToCSV, downloadCSV } from '../utils/csvExport'
import { refreshPrices } from '../utils/priceService'

export default function Dashboard() {
  const [stocks, setStocks] = useState([])
  const [portfolioHistory, setPortfolioHistory] = useState([])
  const [latestCloseByStock, setLatestCloseByStock] = useState({})
  const [todayCloseByStock, setTodayCloseByStock] = useState({})
  const [yesterdayCloseByStock, setYesterdayCloseByStock] = useState({})
  const [range, setRange] = useState('1M')
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [addingStock, setAddingStock] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    let isMounted = true

    async function load() {
      setLoading(true)

      const [stocksRes, portfolioRes, pricesRes] = await Promise.all([
        supabase.from('stocks').select('*').order('created_at'),
        supabase.from('portfolio_daily_value').select('*').order('date'),
        supabase
          .from('daily_prices')
          .select('stock_id, date, close_price')
          .order('date', { ascending: false }),
      ])

      if (!isMounted) return

      if (stocksRes.error) console.error(stocksRes.error)
      if (portfolioRes.error) console.error(portfolioRes.error)
      if (pricesRes.error) console.error(pricesRes.error)

      setStocks(stocksRes.data || [])
      setPortfolioHistory(portfolioRes.data || [])

      // Reduce to the most recent close price per stock
      const latest = {}
      const today = {}
      const yesterday = {}
      const pricesByStock = {}

      for (const row of pricesRes.data || []) {
        if (!pricesByStock[row.stock_id]) {
          pricesByStock[row.stock_id] = []
        }
        pricesByStock[row.stock_id].push(row)
      }

      // Get latest, today's, and yesterday's prices
      for (const [stockId, prices] of Object.entries(pricesByStock)) {
        if (prices.length > 0) {
          latest[stockId] = prices[0].close_price
          today[stockId] = prices[0].close_price

          // Find yesterday's price (previous trading day)
          if (prices.length > 1) {
            yesterday[stockId] = prices[1].close_price
          }
        }
      }

      setLatestCloseByStock(latest)
      setTodayCloseByStock(today)
      setYesterdayCloseByStock(yesterday)

      setLoading(false)
    }

    load()
    return () => {
      isMounted = false
    }
  }, [])

  const handleUpdateStock = async (stockId, updates) => {
    try {
      const { error } = await supabase
        .from('stocks')
        .update(updates)
        .eq('id', stockId)

      if (error) throw error

      // Update local state
      setStocks(
        stocks.map((s) => (s.id === stockId ? { ...s, ...updates } : s))
      )
    } catch (err) {
      console.error('Failed to update stock:', err)
      throw err
    }
  }

  const handleDeleteStock = async (stockId) => {
    try {
      const { error } = await supabase
        .from('stocks')
        .delete()
        .eq('id', stockId)

      if (error) throw error

      // Update local state
      setStocks(stocks.filter((s) => s.id !== stockId))
    } catch (err) {
      console.error('Failed to delete stock:', err)
      throw err
    }
  }

  const handleAddStock = async (stockData) => {
    setAddingStock(true)
    try {
      const { data, error } = await supabase
        .from('stocks')
        .insert([stockData])
        .select()

      if (error) throw error

      setStocks([...stocks, data[0]])
      setShowAddDialog(false)
    } catch (err) {
      console.error('Failed to add stock:', err)
      throw err
    } finally {
      setAddingStock(false)
    }
  }

  const handleExitStock = async (stockId, exitPrice) => {
    try {
      const { error } = await supabase
        .from('stocks')
        .update({ status: 'exited', exit_date: new Date().toISOString().split('T')[0] })
        .eq('id', stockId)

      if (error) throw error

      setStocks(
        stocks.map((s) =>
          s.id === stockId
            ? { ...s, status: 'exited', exit_date: new Date().toISOString().split('T')[0] }
            : s
        )
      )
    } catch (err) {
      console.error('Failed to exit stock:', err)
      throw err
    }
  }

  const handleExportCSV = () => {
    const portfolioSummary = {
      totalInvested: stocks.reduce((sum, s) => sum + s.quantity * s.avg_price, 0),
      currentValue: stocks.reduce(
        (sum, s) =>
          sum +
          (latestCloseByStock[s.id]
            ? s.quantity * latestCloseByStock[s.id]
            : s.quantity * s.avg_price),
        0
      ),
      activeCount: stocks.filter((s) => s.status === 'active').length,
      exitedCount: stocks.filter((s) => s.status === 'exited').length,
    }

    portfolioSummary.totalGainLoss =
      portfolioSummary.currentValue - portfolioSummary.totalInvested
    portfolioSummary.totalGainLossPct =
      portfolioSummary.totalInvested > 0
        ? (portfolioSummary.totalGainLoss / portfolioSummary.totalInvested) * 100
        : 0

    const csv = exportPortfolioToCSV(stocks, latestCloseByStock, portfolioSummary)
    const filename = `portfolio-${new Date().toISOString().split('T')[0]}.csv`
    downloadCSV(csv, filename)
  }

  const handleRefreshPrices = async () => {
    setRefreshing(true)
    setToast(null)

    try {
      const result = await refreshPrices()
      setToast({ type: 'success', message: result.message })

      // Reload prices from database
      const pricesRes = await supabase
        .from('daily_prices')
        .select('stock_id, date, close_price')
        .order('date', { ascending: false })

      if (!pricesRes.error) {
        const latest = {}
        const today = {}
        const yesterday = {}
        const pricesByStock = {}

        for (const row of pricesRes.data || []) {
          if (!pricesByStock[row.stock_id]) {
            pricesByStock[row.stock_id] = []
          }
          pricesByStock[row.stock_id].push(row)
        }

        for (const [stockId, prices] of Object.entries(pricesByStock)) {
          if (prices.length > 0) {
            latest[stockId] = prices[0].close_price
            today[stockId] = prices[0].close_price
            if (prices.length > 1) {
              yesterday[stockId] = prices[1].close_price
            }
          }
        }

        setLatestCloseByStock(latest)
        setTodayCloseByStock(today)
        setYesterdayCloseByStock(yesterday)
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message })
    } finally {
      setRefreshing(false)

      // Auto-dismiss toast after 5 seconds
      setTimeout(() => setToast(null), 5000)
    }
  }

  const tableRows = useMemo(
    () =>
      stocks.map((s) => ({
        ...s,
        latestClose: latestCloseByStock[s.id] ?? null,
        todayChange:
          todayCloseByStock[s.id] && yesterdayCloseByStock[s.id]
            ? todayCloseByStock[s.id] - yesterdayCloseByStock[s.id]
            : null,
      })),
    [stocks, latestCloseByStock, todayCloseByStock, yesterdayCloseByStock]
  )

  const chartData = useMemo(
    () => filterByRange(portfolioHistory, range),
    [portfolioHistory, range]
  )

  const latestTotal = chartData.length
    ? chartData[chartData.length - 1].total_value
    : null
  const investedTotal = chartData.length
    ? chartData[chartData.length - 1].total_invested
    : null
  const totalGain =
    latestTotal != null && investedTotal != null
      ? latestTotal - investedTotal
      : null
  const totalGainPct =
    totalGain != null && investedTotal
      ? (totalGain / investedTotal) * 100
      : null

  const formatINR = (v) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(v)

  if (loading) {
    return (
      <div className="page">
        <p className="loading-text">Loading portfolio…</p>
      </div>
    )
  }

  return (
    <div className="page">
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          <span>{toast.type === 'success' ? '✓' : '✕'}</span>
          {toast.message}
        </div>
      )}

      <div className="summary-block">
        <p className="eyebrow">Total portfolio value</p>
        <p className="total-value">
          {latestTotal != null ? formatINR(latestTotal) : '—'}
        </p>
        {totalGain != null && (
          <p className={`total-change ${totalGain >= 0 ? 'gain' : 'loss'}`}>
            {totalGain >= 0 ? '+' : ''}
            {formatINR(totalGain)} ({totalGainPct.toFixed(1)}%) since investment
          </p>
        )}
      </div>

      <RangeToggle value={range} onChange={setRange} />
      <PortfolioChart data={chartData} />

      <PortfolioAnalytics stocks={stocks} latestCloseByStock={latestCloseByStock} />

      <RebalancingAdvice stocks={stocks} latestCloseByStock={latestCloseByStock} />

      <div className="holdings-header">
        <p className="eyebrow">Holdings</p>
        <div className="holdings-actions">
          <button 
            className="btn-refresh" 
            onClick={handleRefreshPrices}
            disabled={refreshing}
            title="Fetch latest prices from Yahoo Finance"
          >
            {refreshing ? '⟳ Updating...' : '⟳ Refresh Prices'}
          </button>
          <button className="btn-add" onClick={() => setShowAddDialog(true)}>
            + Add Stock
          </button>
          <button className="btn-export" onClick={handleExportCSV}>
            📥 Export CSV
          </button>
        </div>
      </div>

      <StockTable 
        rows={tableRows} 
        onUpdate={handleUpdateStock}
        onDelete={handleDeleteStock}
        onExit={handleExitStock}
      />

      <AddStockDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onAdd={handleAddStock}
        loading={addingStock}
      />
    </div>
  )
}
