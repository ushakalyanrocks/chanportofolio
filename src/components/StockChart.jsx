import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts'

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })

const formatINR = (v) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(v)

export default function StockChart({ data, avgPrice }) {
  if (!data || data.length === 0) {
    return (
      <div className="chart-card">
        <div className="chart-empty">
          No price history yet for this range.
        </div>
      </div>
    )
  }

  return (
    <div className="chart-card">
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="stockFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4fd1a5" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#4fd1a5" stopOpacity={0} />
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
            domain={['auto', 'auto']}
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
            formatter={(v) => [formatINR(v), 'Close price']}
          />
          {avgPrice && (
            <ReferenceLine
              y={avgPrice}
              stroke="#d8a657"
              strokeDasharray="4 4"
              label={{
                value: `Avg ${formatINR(avgPrice)}`,
                position: 'insideTopRight',
                fill: '#d8a657',
                fontSize: 11,
                fontFamily: 'IBM Plex Mono',
              }}
            />
          )}
          <Area
            type="monotone"
            dataKey="close_price"
            stroke="#4fd1a5"
            strokeWidth={2}
            fill="url(#stockFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
