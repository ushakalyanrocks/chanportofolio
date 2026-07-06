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

// Detects a large one-off jump (e.g. a deposit) and computes the y-domain
// from only the values AFTER that jump, so small daily moves aren't
// flattened by a huge one-time step change.
function computeSmartDomain(values) {
  if (values.length < 3) {
    const only = values[0] ?? 0
    return [Math.max(0, only * 0.95), only * 1.05 || 1]
  }

  // find the single biggest day-to-day jump
  let jumpIndex = 0
  let maxJump = 0
  for (let i = 1; i < values.length; i++) {
    const jump = Math.abs(values[i] - values[i - 1])
    if (jump > maxJump) {
      maxJump = jump
      jumpIndex = i
    }
  }

  const postJump = values.slice(jumpIndex)
  const avgDailyMove =
    postJump.length > 1
      ? postJump
          .slice(1)
          .reduce((sum, v, i) => sum + Math.abs(v - postJump[i]), 0) /
        (postJump.length - 1)
      : 0

  // if that jump is way bigger than typical daily movement, treat it as a
  // deposit/withdrawal event and zoom the axis to the steady-state range only
  const isDepositLikeJump = maxJump > avgDailyMove * 5 && postJump.length > 1

  const focusValues = isDepositLikeJump ? postJump : values
  const min = Math.min(...focusValues)
  const max = Math.max(...focusValues)
  const range = max - min

  // buffer scales with the value itself (roughly 3-5%) so daily ₹5-6k moves
  // on a ₹30L+ portfolio are still clearly visible, not just proportional
  // to the tiny range between min/max
  const padding = Math.max(range * 0.4, max * 0.03)

  const rawMin = Math.max(0, min - padding)
  const rawMax = max + padding

  // round outward to the nearest lakh so axis labels are clean
  // (e.g. 30,00,000 / 32,00,000 instead of 30,41,822 / 31,98,004)
  const LAKH = 100000
  const niceMin = Math.floor(rawMin / LAKH) * LAKH
  const niceMax = Math.ceil(rawMax / LAKH) * LAKH

  return [niceMin, niceMax === niceMin ? niceMax + LAKH : niceMax]
}

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
  const yDomain = computeSmartDomain(values)

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
