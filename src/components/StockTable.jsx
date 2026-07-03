import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const formatINR = (v) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(v)

export default function StockTable({ rows, onUpdate, onDelete, onExit }) {
  const navigate = useNavigate()
  const [editingId, setEditingId] = useState(null)
  const [editValues, setEditValues] = useState({})
  const [exitingId, setExitingId] = useState(null)
  const [exitPrice, setExitPrice] = useState('')
  const [saving, setSaving] = useState(false)

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

  const handleExitSave = async (e, stockId, row) => {
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

  if (!rows || rows.length === 0) {
    return <p className="chart-empty">No stocks added yet.</p>
  }

  return (
    <table className="stock-table">
      <thead>
        <tr>
          <th>Symbol</th>
          <th>Status</th>
          <th>Qty</th>
          <th>Avg Price</th>
          <th>Cost Basis</th>
          <th>Latest Close</th>
          <th>Today's P&L</th>
          <th>Overall P&L</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const hasPrice = r.latestClose != null
          const costBasis = r.quantity * r.avg_price
          const currentValue = hasPrice ? r.quantity * r.latestClose : costBasis
          const gainAbs = currentValue - costBasis
          const gainPct = costBasis > 0 ? (gainAbs / costBasis) * 100 : 0
          const isGain = gainAbs >= 0
          const todayPL = r.todayChange != null && hasPrice 
            ? r.todayChange * r.quantity 
            : null
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
                    onChange={(e) =>
                      setEditValues({ ...editValues, quantity: e.target.value })
                    }
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                    step="0.01"
                  />
                ) : (
                  qty
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
                    onChange={(e) =>
                      setEditValues({ ...editValues, avg_price: e.target.value })
                    }
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
                  ? `${isGain ? '+' : ''}${formatINR(gainAbs)} (${gainPct.toFixed(1)}%)`
                  : '—'}
              </td>
              <td onClick={(e) => e.stopPropagation()} className="actions-cell">
                {isEditing ? (
                  <>
                    <button
                      className="btn-save"
                      onClick={(e) => handleSave(e, r.id)}
                      disabled={saving}
                    >
                      Save
                    </button>
                    <button
                      className="btn-cancel"
                      onClick={handleCancel}
                      disabled={saving}
                    >
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
                    <button
                      className="btn-save"
                      onClick={(e) => handleExitSave(e, r.id, r)}
                      disabled={saving}
                      title="Confirm exit"
                    >
                      ✓
                    </button>
                    <button
                      className="btn-cancel"
                      onClick={handleExitCancel}
                      disabled={saving}
                      title="Cancel exit"
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <>
                    {r.status === 'active' && (
                      <button
                        className="btn-edit"
                        onClick={(e) => handleEditClick(e, r)}
                        title="Edit quantity and average price"
                      >
                        ✎
                      </button>
                    )}
                    {r.status === 'active' && (
                      <button
                        className="btn-exit"
                        onClick={(e) => handleExitClick(e, r)}
                        title="Mark as exited"
                      >
                        ⊗
                      </button>
                    )}
                    <button
                      className="btn-delete"
                      onClick={(e) => handleDelete(e, r.id)}
                      title="Delete this stock"
                    >
                      🗑
                    </button>
                  </>
                )}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
