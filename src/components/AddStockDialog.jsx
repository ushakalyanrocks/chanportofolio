import { useState } from 'react'

export default function AddStockDialog({ isOpen, onClose, onAdd, loading }) {
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
              {loading ? 'Adding...' : 'Add Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
