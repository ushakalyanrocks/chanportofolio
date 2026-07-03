const formatINR = (v) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(v)

export default function RebalancingAdvice({ stocks, latestCloseByStock }) {
  if (!stocks || stocks.length === 0) {
    return null
  }

  // Calculate current allocations
  const allocations = stocks
    .filter((s) => s.status === 'active')
    .map((s) => {
      const hasPrice = latestCloseByStock[s.id] != null
      const currentValue = hasPrice ? s.quantity * latestCloseByStock[s.id] : 0
      return {
        ...s,
        currentValue,
        hasPrice,
      }
    })

  const totalValue = allocations.reduce((sum, a) => sum + a.currentValue, 0)

  if (totalValue === 0) {
    return null
  }

  // Calculate allocations and deviations
  const allocData = allocations
    .map((a) => {
      const pct = (a.currentValue / totalValue) * 100
      const currentInvested = a.quantity * a.avg_price
      const gainLoss = a.currentValue - currentInvested
      const gainPct = currentInvested > 0 ? (gainLoss / currentInvested) * 100 : 0
      return {
        ...a,
        allocationPct: pct,
        gainLossPct: gainPct,
      }
    })
    .sort((a, b) => b.allocationPct - a.allocationPct)

  // Find underperformers and overperformers
  const avgAllocation = 100 / allocData.length
  const avgGainPct =
    allocData.reduce((sum, a) => sum + a.gainLossPct, 0) / allocData.length

  const underperformers = allocData.filter(
    (a) => a.gainLossPct < avgGainPct * 0.8 && a.gainLossPct < 0
  )
  const overperformers = allocData.filter(
    (a) => a.gainLossPct > avgGainPct * 1.2 && a.gainLossPct > 0
  )
  const overconcentrated = allocData.filter(
    (a) => a.allocationPct > avgAllocation * 1.5
  )

  // Generate recommendations
  const recommendations = []

  if (overconcentrated.length > 0) {
    recommendations.push({
      type: 'concentration',
      title: 'High Concentration Risk',
      message: `${overconcentrated[0].symbol} is ${overconcentrated[0].allocationPct.toFixed(0)}% of your portfolio. Consider trimming to reduce risk.`,
      severity: 'warning',
    })
  }

  if (underperformers.length > 0 && underperformers.length <= 2) {
    recommendations.push({
      type: 'underperformer',
      title: 'Consider Review',
      message: `${underperformers.map((a) => a.symbol).join(', ')} underperforming. Review investment thesis or exit if conviction is low.`,
      severity: 'info',
    })
  }

  if (overperformers.length > 0) {
    recommendations.push({
      type: 'overperformer',
      title: 'Stellar Performers',
      message: `${overperformers[0].symbol} is up ${overperformers[0].gainLossPct.toFixed(1)}%. Consider taking profits or letting winners run.`,
      severity: 'success',
    })
  }

  if (recommendations.length === 0) {
    recommendations.push({
      type: 'balanced',
      title: 'Portfolio Balanced',
      message: 'Your portfolio looks well-balanced. Continue monitoring.',
      severity: 'success',
    })
  }

  return (
    <div className="rebalancing-section">
      <h3 className="eyebrow">Rebalancing & Recommendations</h3>

      {recommendations.map((rec, idx) => (
        <div key={idx} className={`recommendation-card severity-${rec.severity}`}>
          <div className="recommendation-header">
            <span className={`recommendation-icon severity-${rec.severity}`}>
              {rec.severity === 'warning'
                ? '⚠'
                : rec.severity === 'info'
                  ? 'ℹ'
                  : '✓'}
            </span>
            <h4>{rec.title}</h4>
          </div>
          <p className="recommendation-message">{rec.message}</p>
        </div>
      ))}

      {/* Allocation breakdown */}
      <div className="allocation-breakdown">
        <h4 className="eyebrow">Current Allocation</h4>
        <div className="allocation-list">
          {allocData.map((a) => (
            <div key={a.id} className="allocation-item">
              <div className="allocation-bar">
                <div
                  className="allocation-fill"
                  style={{ width: `${a.allocationPct}%` }}
                />
              </div>
              <span className="allocation-symbol">{a.symbol}</span>
              <span className="allocation-pct">{a.allocationPct.toFixed(1)}%</span>
              <span
                className={`allocation-value ${
                  a.gainLossPct >= 0 ? 'gain-text' : 'loss-text'
                }`}
              >
                {a.gainLossPct >= 0 ? '+' : ''}
                {a.gainLossPct.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
