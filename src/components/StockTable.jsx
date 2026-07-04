import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const formatINR = (v) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(v)

const formatQty = (v) =>
  new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
  }).format(v)

export default function StockTable({ rows, onUpdate, onDelete, onExit }) {
  const navigate = useNavigate()
  const [editingId, setEditingId] = useState(null)
  const [editValues, setEditValues] = useState({})
  const [exitingId, setExitingId] = useState(null)
  const [exitPrice, setExitPrice] = useState('')
  const [saving, setSaving] = useState(false)
  const [sortKey, setSortKey] = useState('symbol')
  const [sortDirection, setSortDirection] = useState('asc')

  const handleEditClick = (e, row) => {
    e.stopPropagation()
    setEditingId(row.id)
    setEditValues({ quantity: row.quantity, avg_price: row.avg_price })
  }

  const handleSave = async (e, stockId) => {
    e.stopPropagation()
    if (!editValues.quantity || !editValues.avg_price) return

    setSaving(true)
    try {
      await onUpdate(stockId, {
        quantity: parseFloat(editValues.quantity),
        avg_price: parseFloat(editValues.avg_price),
      })
      setEditingId(null)
    } catch (err) {
      console.error('Failed to update:', err)
    }
    setSaving(false)
  }

  const handleCancel = (e) => {
    e.stopPropagation()
    setEditingId(null)
  }

  const handleDelete = async (e, stockId) => {
    e.stopPropagation()
    if (window.confirm('Are you sure you want to delete this stock?')) {
      setSaving(true)
      try {
        await onDelete(stockId)
      } catch (err) {
        console.error('Failed to delete:', err)
      }
      setSaving(false)
    }
  }

  const handleExitClick = (e, row) => {
    e.stopPropagation()
    setExitingId(row.id)
    setExitPrice('')
  }

  const handleExitSave = async (e, stockId) => {
    e.stopPropagation()
    if (!exitPrice || isNaN(exitPrice) || parseFloat(exitPrice) <= 0) {
      alert('Please enter a valid exit price')
      return
    }

    setSaving(true)
    try {
      await onExit(stockId, parseFloat(exitPrice))
      setExitingId(null)
      setExitPrice('')
    } catch (err) {
      console.error('Failed to exit stock:', err)
    }
    setSaving(false)
  }

  const handleExitCancel = (e) => {
    e.stopPropagation()
    setExitingId(null)
  }

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }

  const getSortIndicator = (key) => {
    if (sortKey !== key) return '↕'
    return sortDirection === 'asc' ? '↑' : '↓'
  }

  const enrichedRows = useMemo(
    () =>
      (rows || []).map((r) => {
        const hasPrice = r.latestClose != null
        const costBasis = r.quantity * r.avg_price
        const currentValue = hasPrice ? r.quantity * r.latestClose : costBasis
        const gainAbs = currentValue - costBasis
        const gainPct = costBasis > 0 ? (gainAbs / costBasis) * 100 : 0
        const todayPL = r.todayChange != null && hasPrice ? r.todayChange * r.quantity : null

        return {
          ...r,
          hasPrice,
          costBasis,
          currentValue,
          gainAbs,
          gainPct,
          todayPL,
        }
      }),
    [rows]
  )

  const sortedRows = useMemo(() => {
    const rowsToSort = [...enrichedRows]

    rowsToSort.sort((a, b) => {
      let comparison = 0

      switch (sortKey) {
        case 'symbol':
          comparison = a.symbol.localeCompare(b.symbol)
          break
        case 'qty':
          comparison = (a.quantity || 0) - (b.quantity || 0)
          break
        case 'amount':
          comparison = (a.costBasis || 0) - (b.costBasis || 0)
          break
        case 'today':
          comparison = (a.todayPL ?? -Infinity) - (b.todayPL ?? -Infinity)
          break
        case 'current':
          comparison = (a.currentValue || 0) - (b.currentValue || 0)
          break
        default:
          comparison = a.symbol.localeCompare(b.symbol)
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })

    return rowsToSort
  }, [enrichedRows, sortDirection, sortKey])

  const totals = useMemo(
    () =>
      enrichedRows.reduce(
        (acc, row) => {
          acc.qty += Number(row.quantity) || 0
          acc.costBasis += row.costBasis || 0
          acc.currentValue += row.currentValue || 0
          acc.todayPL += row.todayPL ?? 0
          acc.overallPL += row.gainAbs || 0
          return acc
        },
        { qty: 0, costBasis: 0, currentValue: 0, todayPL: 0, overallPL: 0 }
      ),
    [enrichedRows]
  )

  if (!rows || rows.length === 0) {
    return <p className="chart-empty">No stocks added yet.</p>
  }

  return (
    <table className="stock-table">
      <thead>
        <tr>
          <th>
            <button type="button" className="sort-button" onClick={() => handleSort('symbol')}>
              Symbol <span className="sort-indicator">{getSortIndicator('symbol')}</span>
            </button>
          </th>
          <th>Status</th>
          <th>
            <button type="button" className="sort-button" onClick={() => handleSort('qty')}>
              Qty <span className="sort-indicator">{getSortIndicator('qty')}</span>
            </button>
          </th>
          <th>Avg Price</th>
          <th>
            <button type="button" className="sort-button" onClick={() => handleSort('amount')}>
              Amount <span className="sort-indicator">{getSortIndicator('amount')}</span>
            </button>
          </th>
          <th>Latest Close</th>
          <th>
            <button type="button" className="sort-button" onClick={() => handleSort('today')}>
              Today&apos;s <span className="sort-indicator">{getSortIndicator('today')}</span>
            </button>
          </th>
          <th>
            <button type="button" className="sort-button" onClick={() => handleSort('current')}>
              Current Value <span className="sort-indicator">{getSortIndicator('current')}</span>
            </button>
          </th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {sortedRows.map((r) => {
          const hasPrice = r.hasPrice
          const costBasis = r.costBasis
          const currentValue = r.currentValue
          const gainAbs = r.gainAbs
          const gainPct = r.gainPct
          const todayPL = r.todayPL
          const isGain = gainAbs >= 0
          const isTodayGain = todayPL != null && todayPL >= 0

          const isEditing = editingId === r.id
          const isExiting = exitingId === r.id
          const qty = isEditing ? editValues.quantity : r.quantity
          const avgPrice = isEditing ? editValues.avg_price : r.avg_price

          return (
            <tr key={r.id} className={isEditing || isExiting ? '' : 'clickable'} onClick={() => !isEditing && !isExiting && navigate(`/stock/${r.id}`)}>
              <td>
                <span className="symbol-cell">{r.symbol}</span>
              </td>
              <td>
                <span className={`status-pill ${r.status}`}>
                  {r.status === 'active' ? 'Active' : 'Exited'}
                </span>
              </td>
              <td
                onClick={(e) => !isEditing && !isExiting && handleEditClick(e, r)}
                className={isEditing ? '' : 'editable-cell'}
              >
                {isEditing ? (
                  <input
                    type="number"
                    value={qty}
                    onChange={(e) => setEditValues({ ...editValues, quantity: e.target.value })}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                    step="0.01"
                  />
                ) : (
                  formatQty(qty)
                )}
              </td>
              <td
                onClick={(e) => !isEditing && !isExiting && handleEditClick(e, r)}
                className={isEditing ? '' : 'editable-cell'}
              >
                {isEditing ? (
                  <input
                    type="number"
                    value={avgPrice}
                    onChange={(e) => setEditValues({ ...editValues, avg_price: e.target.value })}
                    onClick={(e) => e.stopPropagation()}
                    step="0.01"
                  />
                ) : (
                  formatINR(avgPrice)
                )}
              </td>
              <td onClick={(e) => !isEditing && !isExiting && e.stopPropagation()}>
                {formatINR(costBasis)}
              </td>
              <td onClick={(e) => !isEditing && !isExiting && e.stopPropagation()}>
                {hasPrice ? formatINR(r.latestClose) : '—'}
              </td>
              <td
                className={todayPL != null ? (isTodayGain ? 'gain-text' : 'loss-text') : ''}
                onClick={(e) => !isEditing && !isExiting && e.stopPropagation()}
              >
                {todayPL != null ? `${isTodayGain ? '+' : ''}${formatINR(todayPL)}` : '—'}
              </td>
              <td
                className={hasPrice ? (isGain ? 'gain-text' : 'loss-text') : ''}
                onClick={(e) => !isEditing && !isExiting && e.stopPropagation()}
              >
                {hasPrice
                  ? `${formatINR(currentValue)} · ${isGain ? '+' : ''}${formatINR(gainAbs)} (${gainPct.toFixed(1)}%)`
                  : '—'}
              </td>
              <td onClick={(e) => e.stopPropagation()} className="actions-cell">
                {isEditing ? (
                  <>
                    <button className="btn-save" onClick={(e) => handleSave(e, r.id)} disabled={saving}>
                      Save
                    </button>
                    <button className="btn-cancel" onClick={handleCancel} disabled={saving}>
                      Cancel
                    </button>
                  </>
                ) : isExiting ? (
                  <>
                    <input
                      type="number"
                      value={exitPrice}
                      onChange={(e) => setExitPrice(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Exit price"
                      step="0.01"
                      className="exit-price-input"
                      autoFocus
                    />
                    <button className="btn-save" onClick={(e) => handleExitSave(e, r.id)} disabled={saving} title="Confirm exit">
                      ✓
                    </button>
                    <button className="btn-cancel" onClick={handleExitCancel} disabled={saving} title="Cancel exit">
                      ✕
                    </button>
                  </>
                ) : (
                  <>
                    {r.status === 'active' && (
                      <button className="btn-edit" onClick={(e) => handleEditClick(e, r)} title="Edit quantity and average price">
                        ✎
                      </button>
                    )}
                    {r.status === 'active' && (
                      <button className="btn-exit" onClick={(e) => handleExitClick(e, r)} title="Mark as exited">
                        ⊗
                      </button>
                    )}
                    <button className="btn-delete" onClick={(e) => handleDelete(e, r.id)} title="Delete this stock">
                      🗑
                    </button>
                  </>
                )}
              </td>
            </tr>
          )
        })}
      </tbody>
      <tfoot>
        <tr className="table-footer">
          <td><strong>Total</strong></td>
          <td></td>
          <td>{formatQty(totals.qty)}</td>
          <td></td>
          <td>{formatINR(totals.costBasis)}</td>
          <td></td>
          <td className={totals.todayPL >= 0 ? 'gain-text' : 'loss-text'}>
            {`${totals.todayPL >= 0 ? '+' : ''}${formatINR(totals.todayPL)}`}
          </td>
          <td className={totals.overallPL >= 0 ? 'gain-text' : 'loss-text'}>
            {formatINR(totals.currentValue)}
            <span className="footer-subtext">
              {`${totals.overallPL >= 0 ? '+' : ''}${formatINR(totals.overallPL)}`}
            </span>
          </td>
          <td></td>
        </tr>
      </tfoot>
    </table>
  )
}
