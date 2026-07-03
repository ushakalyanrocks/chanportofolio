const formatINR = (v) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(v)

export default function PortfolioAnalytics({ stocks, latestCloseByStock }) {
  if (!stocks || stocks.length === 0) {
    return null
  }

  // Calculate metrics (only active positions count toward invested/current totals)
  const metrics = stocks.reduce(
    (acc, s) => {
      const hasPrice = latestCloseByStock[s.id] != null
      const costBasis = s.quantity * s.avg_price
      const currentValue = hasPrice ? s.quantity * latestCloseByStock[s.id] : costBasis
      const gainLoss = currentValue - costBasis

      if (s.status === 'active') {
        acc.totalInvested += costBasis
        acc.totalCurrent += currentValue

        if (hasPrice) {
          if (gainLoss > 0) {
            acc.gainers.push({ ...s, gainLoss, gainPct: (gainLoss / costBasis) * 100 })
            acc.winCount += 1
          } else if (gainLoss < 0) {
            acc.losers.push({ ...s, gainLoss, gainPct: (gainLoss / costBasis) * 100 })
          } else {
            acc.breakeven += 1
          }
        }

        acc.activeCount += 1
      } else {
        acc.exitedCount += 1
      }

      return acc
    },
    {
      totalInvested: 0,
      totalCurrent: 0,
      gainers: [],
      losers: [],
      winCount: 0,
      breakeven: 0,
      activeCount: 0,
      exitedCount: 0,
    }
  )

  const totalGainLoss = metrics.totalCurrent - metrics.totalInvested
  const totalGainPct =
    metrics.totalInvested > 0 ? (totalGainLoss / metrics.totalInvested) * 100 : 0
  const winRate =
    metrics.activeCount > 0
      ? ((metrics.winCount / metrics.activeCount) * 100).toFixed(1)
      : 0

  // Get top 3 gainers and losers
  const topGainers = metrics.gainers
    .sort((a, b) => b.gainPct - a.gainPct)
    .slice(0, 3)
  const topLosers = metrics.losers
    .sort((a, b) => a.gainPct - b.gainPct)
    .slice(0, 3)

  return (
    <div className="analytics-section">
      <h3 className="eyebrow">Performance Overview</h3>

      <div className="analytics-grid">
        {/* Key Metrics */}
        <div className="metric-card">
          <p className="metric-label">Total Invested</p>
          <p className="metric-value">{formatINR(metrics.totalInvested)}</p>
        </div>

        <div className="metric-card">
          <p className="metric-label">Current Value</p>
          <p className="metric-value">{formatINR(metrics.totalCurrent)}</p>
        </div>

        <div className={`metric-card ${totalGainLoss >= 0 ? 'gain' : 'loss'}`}>
          <p className="metric-label">Total Gain/Loss</p>
          <p className="metric-value">
            {totalGainLoss >= 0 ? '+' : ''}
            {formatINR(totalGainLoss)}
          </p>
          <p className="metric-subtext">({totalGainPct.toFixed(1)}%)</p>
        </div>

        <div className="metric-card">
          <p className="metric-label">Win Rate</p>
          <p className="metric-value">{winRate}%</p>
          <p className="metric-subtext">
            {metrics.winCount} gainers, {metrics.breakeven} breakeven
          </p>
        </div>

        <div className="metric-card">
          <p className="metric-label">Holdings</p>
          <p className="metric-value">{metrics.activeCount}</p>
          <p className="metric-subtext">{metrics.exitedCount} exited</p>
        </div>

        <div className="metric-card">
          <p className="metric-label">Avg P&L</p>
          <p className="metric-value">
            {metrics.activeCount > 0
              ? formatINR(totalGainLoss / metrics.activeCount)
              : '—'}
          </p>
        </div>
      </div>

      {/* Top Performers */}
      <div className="performers-section">
        <div className="performers-column">
          <h4 className="performers-title gain-text">Top Gainers</h4>
          <ul className="performers-list">
            {topGainers.length > 0 ? (
              topGainers.map((stock) => (
                <li key={stock.id} className="performer-item">
                  <span className="performer-name">{stock.symbol}</span>
                  <span className="performer-gain gain-text">
                    +{stock.gainPct.toFixed(1)}%
                  </span>
                </li>
              ))
            ) : (
              <li className="performer-empty">No gainers yet</li>
            )}
          </ul>
        </div>

        <div className="performers-column">
          <h4 className="performers-title loss-text">Top Losers</h4>
          <ul className="performers-list">
            {topLosers.length > 0 ? (
              topLosers.map((stock) => (
                <li key={stock.id} className="performer-item">
                  <span className="performer-name">{stock.symbol}</span>
                  <span className="performer-gain loss-text">
                    {stock.gainPct.toFixed(1)}%
                  </span>
                </li>
              ))
            ) : (
              <li className="performer-empty">No losers yet</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}