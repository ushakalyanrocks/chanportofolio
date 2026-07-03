import { RANGES } from '../components/RangeToggle'

// rows: array of objects with a `date` field (YYYY-MM-DD string)
// rangeKey: one of '1W' | '1M' | '1Y' | 'ALL'
export function filterByRange(rows, rangeKey) {
  const range = RANGES.find((r) => r.key === rangeKey)
  if (!range || range.days === null) return rows

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - range.days)

  return rows.filter((row) => new Date(row.date) >= cutoff)
}
