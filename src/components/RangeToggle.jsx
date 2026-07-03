const RANGES = [
  { key: '1W', label: '1W', days: 7 },
  { key: '1M', label: '1M', days: 30 },
  { key: '1Y', label: '1Y', days: 365 },
  { key: 'ALL', label: 'All', days: null },
]

export { RANGES }

export default function RangeToggle({ value, onChange }) {
  return (
    <div className="range-toggle">
      {RANGES.map((r) => (
        <button
          key={r.key}
          className={value === r.key ? 'active' : ''}
          onClick={() => onChange(r.key)}
          type="button"
        >
          {r.label}
        </button>
      ))}
    </div>
  )
}
