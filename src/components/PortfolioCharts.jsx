import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts'

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })

const formatINR = (v) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(v)

function computeSmartDomain(values) {
  const numericValues = values.filter((value) => value != null && !Number.isNaN(value))

  if (numericValues.length === 0) {
    return [0, 1]
  }

  const min = Math.min(...numericValues)
  const max = Math.max(...numericValues)
  const range = Math.max(max - min, 1)
  const padding = Math.max(range * 0.2, Math.max(Math.abs(min), Math.abs(max), 1) * 0.1)

  const rawMin = min - padding
  const rawMax = max + padding
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(range, 1)))
  const niceMin = Math.floor(rawMin / magnitude) * magnitude
  const niceMax = Math.ceil(rawMax / magnitude) * magnitude

  return [niceMin, niceMax === niceMin ? niceMax + magnitude : niceMax]
}

function ChartCard({ title, subtitle, children, empty }) {
  return (
    <div className="chart-card portfolio-chart-card">
      <div className="chart-card-header">
        <div>
          <p className="chart-card-title">{title}</p>
          {subtitle && <p className="chart-card-subtitle">{subtitle}</p>}
        </div>
      </div>
      {empty ? <div className="chart-empty">{empty}</div> : children}
    </div>
  )
}

export default function PortfolioCharts({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="portfolio-charts-grid">
        <ChartCard
          title="Invested vs Current"
          subtitle="Your capital growth trend"
          empty="No chart data available yet."
        />
        <ChartCard
          title="Profit & Loss"
          subtitle="Rolling gain or loss over time"
          empty="No chart data available yet."
        />
      </div>
    )
  }

  const investmentSeries = data.map((d) => ({
    date: d.date,
    invested: d.total_invested ?? 0,
    current: d.total_value ?? 0,
  }))

  const pnlSeries = data.map((d) => ({
    date: d.date,
    pnl: (d.total_value ?? 0) - (d.total_invested ?? 0),
  }))

  const combinedSeries = data.map((d) => ({
    date: d.date,
    invested: d.total_invested ?? 0,
    current: d.total_value ?? 0,
    pnl: (d.total_value ?? 0) - (d.total_invested ?? 0),
  }))

  const investmentDomain = computeSmartDomain([
    ...investmentSeries.map((d) => d.invested),
    ...investmentSeries.map((d) => d.current),
  ])

  const pnlDomain = computeSmartDomain(pnlSeries.map((d) => d.pnl))
  const combinedPnlDomain = computeSmartDomain(combinedSeries.map((d) => d.pnl))

  return (
    <div className="portfolio-charts-grid">
      <ChartCard
        title="Invested vs Current"
        subtitle="Compare your capital committed with the live portfolio value"
      >
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={investmentSeries} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#223049" strokeDasharray="0" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="#8892a6"
              fontSize={11}
              fontFamily="IBM Plex Mono"
              tickLine={false}
              axisLine={{ stroke: '#223049' }}
              minTickGap={24}
            />
            <YAxis
              domain={investmentDomain}
              stroke="#8892a6"
              fontSize={11}
              fontFamily="IBM Plex Mono"
              tickLine={false}
              axisLine={false}
              width={70}
              tickFormatter={(v) => formatINR(v)}
            />
            <Tooltip
              contentStyle={{
                background: '#17233a',
                border: '1px solid #223049',
                borderRadius: 6,
                fontFamily: 'IBM Plex Mono',
                fontSize: 12,
              }}
              labelFormatter={formatDate}
              formatter={(value, name) => [formatINR(value), name === 'current' ? 'Current value' : 'Invested value']}
            />
            <Line
              type="monotone"
              dataKey="invested"
              stroke="#8892a6"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="current"
              stroke="#d8a657"
              strokeWidth={2}
              dot={{ r: 3, fill: '#d8a657', strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Profit & Loss"
        subtitle="Track the running gain or loss from your invested capital"
      >
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={pnlSeries} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#223049" strokeDasharray="0" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="#8892a6"
              fontSize={11}
              fontFamily="IBM Plex Mono"
              tickLine={false}
              axisLine={{ stroke: '#223049' }}
              minTickGap={24}
            />
            <YAxis
              domain={pnlDomain}
              stroke="#8892a6"
              fontSize={11}
              fontFamily="IBM Plex Mono"
              tickLine={false}
              axisLine={false}
              width={70}
              tickFormatter={(v) => formatINR(v)}
            />
            <Tooltip
              contentStyle={{
                background: '#17233a',
                border: '1px solid #223049',
                borderRadius: 6,
                fontFamily: 'IBM Plex Mono',
                fontSize: 12,
              }}
              labelFormatter={formatDate}
              formatter={(value) => [formatINR(value), 'Profit / Loss']}
            />
            <ReferenceLine y={0} stroke="#8892a6" strokeDasharray="3 3" />
            <Area
              type="monotone"
              dataKey="pnl"
              stroke={pnlSeries.some((item) => item.pnl >= 0) ? '#4fd1a5' : '#f0685c'}
              strokeWidth={2}
              fill="url(#pnlFill)"
              dot={{ r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
            <defs>
              <linearGradient id="pnlFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4fd1a5" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#4fd1a5" stopOpacity={0} />
              </linearGradient>
            </defs>
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Combined View"
        subtitle="Overlay invested value, current value, and profit/loss together"
      >
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={combinedSeries} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#223049" strokeDasharray="0" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="#8892a6"
              fontSize={11}
              fontFamily="IBM Plex Mono"
              tickLine={false}
              axisLine={{ stroke: '#223049' }}
              minTickGap={24}
            />
            <YAxis
              yAxisId="left"
              domain={investmentDomain}
              stroke="#8892a6"
              fontSize={11}
              fontFamily="IBM Plex Mono"
              tickLine={false}
              axisLine={false}
              width={70}
              tickFormatter={(v) => formatINR(v)}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={combinedPnlDomain}
              stroke="#8892a6"
              fontSize={11}
              fontFamily="IBM Plex Mono"
              tickLine={false}
              axisLine={false}
              width={70}
              tickFormatter={(v) => formatINR(v)}
            />
            <Tooltip
              contentStyle={{
                background: '#17233a',
                border: '1px solid #223049',
                borderRadius: 6,
                fontFamily: 'IBM Plex Mono',
                fontSize: 12,
              }}
              labelFormatter={formatDate}
              formatter={(value, name) => [
                formatINR(value),
                name === 'current' ? 'Current value' : name === 'invested' ? 'Invested value' : 'Profit / Loss',
              ]}
            />
            <ReferenceLine yAxisId="right" y={0} stroke="#8892a6" strokeDasharray="3 3" />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="invested"
              stroke="#8892a6"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="current"
              stroke="#d8a657"
              strokeWidth={2}
              dot={{ r: 3, fill: '#d8a657', strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="pnl"
              stroke={combinedSeries.some((item) => item.pnl >= 0) ? '#4fd1a5' : '#f0685c'}
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}
