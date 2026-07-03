/**
 * Export portfolio data to CSV
 */
export function exportPortfolioToCSV(stocks, latestCloseByStock, portfolioSummary) {
  const formatINR = (v) => {
    if (v === null || v === undefined) return '-'
    return v.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  // CSV Header
  const headers = [
    'Symbol',
    'Status',
    'Quantity',
    'Avg Price (₹)',
    'Cost Basis (₹)',
    'Latest Close (₹)',
    'Current Value (₹)',
    'Gain/Loss (₹)',
    'Gain/Loss (%)',
  ]

  // CSV Body
  const rows = stocks.map((s) => {
    const hasPrice = latestCloseByStock[s.id] != null
    const costBasis = s.quantity * s.avg_price
    const currentValue = hasPrice ? s.quantity * latestCloseByStock[s.id] : 0
    const gainLoss = currentValue - costBasis
    const gainLossPct = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0

    return [
      s.symbol,
      s.status === 'active' ? 'Active' : 'Exited',
      formatINR(s.quantity),
      formatINR(s.avg_price),
      formatINR(costBasis),
      hasPrice ? formatINR(latestCloseByStock[s.id]) : '-',
      hasPrice ? formatINR(currentValue) : '-',
      hasPrice ? formatINR(gainLoss) : '-',
      hasPrice ? gainLossPct.toFixed(2) : '-',
    ]
  })

  // Summary section
  const summaryRows = [
    [],
    ['PORTFOLIO SUMMARY'],
    [],
    ['Total Invested (₹)', formatINR(portfolioSummary.totalInvested)],
    ['Current Value (₹)', formatINR(portfolioSummary.currentValue)],
    ['Total Gain/Loss (₹)', formatINR(portfolioSummary.totalGainLoss)],
    ['Total Gain/Loss (%)', portfolioSummary.totalGainLossPct.toFixed(2)],
    ['Active Holdings', portfolioSummary.activeCount],
    ['Exited Holdings', portfolioSummary.exitedCount],
  ]

  // Combine all rows
  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ...summaryRows.map((row) =>
      row.length > 0
        ? row.map((cell) => `"${cell}"`).join(',')
        : ''
    ),
  ].join('\n')

  return csvContent
}

/**
 * Trigger CSV download
 */
export function downloadCSV(csvContent, filename = 'portfolio.csv') {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
