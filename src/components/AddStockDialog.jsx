import { useMemo, useState } from 'react'

const formatINR = (v) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(v)

export default function AddStockDialog({ isOpen, onClose, onAdd, loading, existingStocks = [] }) {
  const [formData, setFormData] = useState({
    symbol: '',
    quantity: '',
    avg_price: '',
  })
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setError(null)
  }

  // If this symbol already has an active position, show what the merged
  // result will look like: combined quantity + weighted-average price.
  const mergePreview = useMemo(() => {
    const symbol = formData.symbol.toUpperCase().trim()
    const qty = parseFloat(formData.quantity)
    const price = parseFloat(formData.avg_price)
    if (!symbol || isNaN(qty) || qty <= 0 || isNaN(price) || price <= 0) {
      return null
    }

    const existing = existingStocks.find(
      (s) => s.status === 'active' && s.symbol === symbol
    )
    if (!existing) return null

    const combinedQty = Number(existing.quantity) + qty
    const combinedAvgPrice =
      (Number(existing.quantity) * Number(existing.avg_price) + qty * price) /
      combinedQty

    return { existing, combinedQty, combinedAvgPrice }
  }, [formData, existingStocks])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.symbol || !formData.quantity || !formData.avg_price) {
      setError('All fields are required')
      return
    }

    if (isNaN(formData.quantity) || formData.quantity <= 0) {
      setError('Quantity must be a positive number')
      return
    }

    if (isNaN(formData.avg_price) || formData.avg_price <= 0) {
      setError('Average price must be a positive number')
      return
    }

    try {
      await onAdd({
        symbol: formData.symbol.toUpperCase().trim(),
        quantity: parseFloat(formData.quantity),
        avg_price: parseFloat(formData.avg_price),
      })
      setFormData({ symbol: '', quantity: '', avg_price: '' })
      setError(null)
    } catch (err) {
      setError(err.message || 'Failed to add stock')
    }
  }

  if (!isOpen) return null

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-card" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h3>Add Stock</h3>
          <button className="dialog-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="dialog-form">
          <div className="field">
            <label htmlFor="symbol">Symbol (NSE)</label>
            <input
              id="symbol"
              type="text"
              name="symbol"
              placeholder="e.g., RELIANCE, TCS"
              value={formData.symbol}
              onChange={handleChange}
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="field">
            <label htmlFor="quantity">Quantity</label>
            <input
              id="quantity"
              type="number"
              name="quantity"
              placeholder="e.g., 10"
              value={formData.quantity}
              onChange={handleChange}
              disabled={loading}
              step="0.01"
            />
          </div>

          <div className="field">
            <label htmlFor="avg_price">Average Price (₹)</label>
            <input
              id="avg_price"
              type="number"
              name="avg_price"
              placeholder="e.g., 2500.50"
              value={formData.avg_price}
              onChange={handleChange}
              disabled={loading}
              step="0.01"
            />
          </div>

          {mergePreview && (
            <div className="merge-preview">
              You already hold {mergePreview.existing.quantity} @{' '}
              {formatINR(mergePreview.existing.avg_price)}. This will update it
              to <strong>{mergePreview.combinedQty}</strong> units at avg{' '}
              <strong>{formatINR(mergePreview.combinedAvgPrice)}</strong> —
              no duplicate row will be created.
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <div className="dialog-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-save"
              disabled={loading}
            >
              {loading
                ? 'Saving...'
                : mergePreview
                ? 'Update Position'
                : 'Add Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
