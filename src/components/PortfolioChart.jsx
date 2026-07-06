import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })

const formatINR = (v) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(v)

export default function PortfolioChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="chart-card">
        <div className="chart-empty">
          No price history yet for this range. Once the daily fetch job runs,
          your portfolio value will appear here.
        </div>
      </div>
    )
  }

  const values = data.map((d) => d.total_value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const padding = (max - min) * 0.1 || max * 0.05 || 1 // fallback if flat line or single point
  const yDomain = [Math.max(0, min - padding), max + padding]

  return (
    <div className="chart-card">
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="portfolioFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d8a657" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#d8a657" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#223049" strokeDasharray="0" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            stroke="#8892a6"
            fontSize={11}
            fontFamily="IBM Plex Mono"
            tickLine={false}
            axisLine={{ stroke: '#223049' }}
            minTickGap={30}
          />
          <YAxis
            domain={yDomain}
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
            formatter={(v) => [formatINR(v), 'Portfolio value']}
          />
          <Area
            type="monotone"
            dataKey="total_value"
            stroke="#d8a657"
            strokeWidth={2}
            fill="url(#portfolioFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
