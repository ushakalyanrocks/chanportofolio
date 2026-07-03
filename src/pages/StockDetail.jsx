import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import RangeToggle from '../components/RangeToggle'
import StockChart from '../components/StockChart'
import { filterByRange } from '../utils/range'

const formatINR = (v) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(v)

export default function StockDetail() {
  const { id } = useParams()
  const [stock, setStock] = useState(null)
  const [prices, setPrices] = useState([])
  const [range, setRange] = useState('1M')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function load() {
      setLoading(true)

      const [stockRes, pricesRes] = await Promise.all([
        supabase.from('stocks').select('*').eq('id', id).single(),
        supabase
          .from('daily_prices')
          .select('date, close_price')
          .eq('stock_id', id)
          .order('date'),
      ])

      if (!isMounted) return

      if (stockRes.error) console.error(stockRes.error)
      if (pricesRes.error) console.error(pricesRes.error)

      setStock(stockRes.data || null)
      setPrices(pricesRes.data || [])
      setLoading(false)
    }

    load()
    return () => {
      isMounted = false
    }
  }, [id])

  const chartData = useMemo(() => filterByRange(prices, range), [prices, range])

  const latestClose = prices.length ? prices[prices.length - 1].close_price : null
  const gainAbs =
    latestClose != null && stock ? (latestClose - stock.avg_price) * stock.quantity : null
  const gainPct =
    latestClose != null && stock ? ((latestClose - stock.avg_price) / stock.avg_price) * 100 : null

  if (loading) {
    return (
      <div className="page">
        <p className="loading-text">Loading…</p>
      </div>
    )
  }

  if (!stock) {
    return (
      <div className="page">
        <Link to="/" className="back-link">← Back to dashboard</Link>
        <p>Stock not found.</p>
      </div>
    )
  }

  return (
    <div className="page">
      <Link to="/" className="back-link">← Back to dashboard</Link>

      <div className="stock-header">
        <h1>{stock.symbol}</h1>
        {stock.status === 'exited' && (
          <span className="status-pill exited">Exited</span>
        )}
      </div>

      <div className="stat-row">
        <div className="stat">
          <p className="stat-label">Quantity</p>
          <p className="stat-value">{stock.quantity}</p>
        </div>
        <div className="stat">
          <p className="stat-label">Avg price</p>
          <p className="stat-value">{formatINR(stock.avg_price)}</p>
        </div>
        <div className="stat">
          <p className="stat-label">Latest close</p>
          <p className="stat-value">
            {latestClose != null ? formatINR(latestClose) : '—'}
          </p>
        </div>
        <div className="stat">
          <p className="stat-label">Gain / Loss</p>
          <p className={`stat-value ${gainAbs >= 0 ? 'gain-text' : 'loss-text'}`}>
            {gainAbs != null
              ? `${gainAbs >= 0 ? '+' : ''}${formatINR(gainAbs)} (${gainPct.toFixed(1)}%)`
              : '—'}
          </p>
        </div>
        <div className="stat">
          <p className="stat-label">Entry date</p>
          <p className="stat-value">{stock.entry_date}</p>
        </div>
      </div>

      <RangeToggle value={range} onChange={setRange} />
      <StockChart data={chartData} avgPrice={stock.avg_price} />
    </div>
  )
}
