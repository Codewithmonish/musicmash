import { useMemo } from 'react'

const WEEKS = 53
const CELL = 11
const GAP = 3
// Minutes practised -> step. Single achromatic ramp on Graphite: a magnitude, not a category.
const STEPS = [
  { max: 0, fill: '#303030', label: 'none' },
  { max: 5, fill: '#5a5a5a', label: 'up to 5 min' },
  { max: 15, fill: '#8f8f8f', label: '5–15 min' },
  { max: 30, fill: '#c4c4c4', label: '15–30 min' },
  { max: Infinity, fill: '#ffffff', label: 'over 30 min' },
]
const stepFor = (minutes) => STEPS.find((s) => minutes <= s.max)

// Local calendar day as YYYY-MM-DD (toISOString would convert to UTC and can shift the day).
const isoDay = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

/**
 * GitHub-style practice heatmap for the last 53 weeks from /practice/history
 * ([{date, sessions, minutes, xp}]). Each cell is one day; hover shows the totals, and a text
 * summary is provided for screen readers.
 */
const PracticeHeatmap = ({ history }) => {
  const { weeks, daysPractised, longest, totalMinutes } = useMemo(() => {
    const byDay = new Map(history.map((h) => [h.date, h]))
    const today = new Date()
    today.setHours(12, 0, 0, 0)
    // Start on the Sunday WEEKS-1 weeks back, so each column is one week ending this week.
    const start = new Date(today)
    start.setDate(today.getDate() - today.getDay() - (WEEKS - 1) * 7)
    const columns = []
    let run = 0
    let best = 0
    for (let w = 0; w < WEEKS; w += 1) {
      const column = []
      for (let d = 0; d < 7; d += 1) {
        const date = new Date(start)
        date.setDate(start.getDate() + w * 7 + d)
        if (date > today) {
          column.push(null)
          continue
        }
        const entry = byDay.get(isoDay(date))
        run = entry ? run + 1 : 0
        best = Math.max(best, run)
        column.push({ date, entry })
      }
      columns.push(column)
    }
    return {
      weeks: columns,
      daysPractised: history.length,
      longest: best,
      totalMinutes: Math.round(history.reduce((sum, h) => sum + h.minutes, 0)),
    }
  }, [history])

  const width = WEEKS * (CELL + GAP)
  const height = 7 * (CELL + GAP)

  return (
    <div>
      <p className="mb-4 text-body-sm text-fog">
        <span className="font-semibold text-white">{daysPractised}</span> {daysPractised === 1 ? 'day' : 'days'} practised in the last year ·
        longest run <span className="font-semibold text-white">{longest}</span> {longest === 1 ? 'day' : 'days'} ·
        <span className="font-semibold text-white"> {totalMinutes}</span> min in total
      </p>
      <div className="overflow-x-auto scroll-quiet pb-2">
        <svg width={width} height={height} role="img"
          aria-label={`Practice heatmap: ${daysPractised} days practised in the last year, longest run ${longest} days.`}>
          {weeks.map((column, w) => column.map((cell, d) => cell && (
            <rect key={`${w}-${d}`} x={w * (CELL + GAP)} y={d * (CELL + GAP)} width={CELL} height={CELL} rx={2}
              fill={stepFor(cell.entry?.minutes ?? 0).fill}>
              <title>
                {cell.entry
                  ? `${cell.entry.sessions} ${cell.entry.sessions === 1 ? 'session' : 'sessions'}, ${cell.entry.minutes} min, ${cell.entry.xp} XP on ${cell.date.toDateString()}`
                  : `No practice on ${cell.date.toDateString()}`}
              </title>
            </rect>
          )))}
        </svg>
      </div>
      <div className="mt-2 flex items-center justify-end gap-1 text-caption text-fog">
        <span className="mr-1">Less</span>
        {STEPS.map((step) => <span key={step.label} title={step.label} className="h-[11px] w-[11px]" style={{ background: step.fill, borderRadius: 2 }} />)}
        <span className="ml-1">More</span>
      </div>
    </div>
  )
}

export default PracticeHeatmap
