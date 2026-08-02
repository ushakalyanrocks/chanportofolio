import { RANGES } from '../components/RangeToggle'

// rows: array of objects with a `date` field (YYYY-MM-DD string)
// rangeKey: one of '1W' | '1M' | '2M' | '3M' | '6M' | '9M' | '1Y' | 'ALL'
export function filterByRange(rows, rangeKey) {
  const range = RANGES.find((r) => r.key === rangeKey)
  if (!range || range.days === null && range.months === undefined) return rows

  const cutoff = new Date()
  if (range.months) {
    cutoff.setMonth(cutoff.getMonth() - range.months)
  } else if (range.days !== null && range.days !== undefined) {
    cutoff.setDate(cutoff.getDate() - range.days)
  }

  return rows.filter((row) => new Date(row.date) >= cutoff)
}
