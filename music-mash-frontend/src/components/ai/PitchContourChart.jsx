import { useMemo } from 'react'
import {
  ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceArea, Brush,
} from 'recharts'

// Pitch curve over time, coloured by how far each point is from the nearest note.
// Data comes from GET /api/ai/result/{id}/pitch-contour (see music-mash-ai/docs/METRICS.md).

// Colour bands (in cents) per comparison mode:
// - 'reference-free': distance to the NEAREST note, which can never exceed ±50¢, so the
//   bands sit inside that range (what we measure today).
// - 'reference': distance to a reference melody's note (Phase 3), where a wrong note can be
//   100¢ or more off.
const BAND_LIMITS = {
  'reference-free': [20, 35],
  reference: [25, 50],
}

const COLORS = { inTune: '#0ca30c', near: '#fab219', off: '#d03b3b' }

export const bandsFor = (mode) => {
  const [green, amber] = BAND_LIMITS[mode]
  return [
    { key: 'inTune', label: `Within ±${green}¢`, color: COLORS.inTune, test: (c) => Math.abs(c) <= green },
    { key: 'near', label: `${green}–${amber}¢ off`, color: COLORS.near, test: (c) => Math.abs(c) <= amber },
    { key: 'off', label: `More than ${amber}¢ off`, color: COLORS.off, test: () => true },
  ]
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export const midiToNoteName = (midi) => {
  const rounded = Math.round(midi)
  return `${NOTE_NAMES[((rounded % 12) + 12) % 12]}${Math.floor(rounded / 12) - 1}`
}


export const describeCents = (cents) => {
  const rounded = Math.round(cents)
  if (rounded === 0) return 'in tune'
  return `${rounded > 0 ? '+' : ''}${rounded}¢ ${rounded > 0 ? 'sharp' : 'flat'}`
}

/**
 * One row per contour point with a value in exactly the series of its colour band.
 * When the band changes, the previous point is also copied into the new band's series,
 * so the coloured segments join up instead of leaving a gap. Unvoiced points are null
 * in every series, which breaks the line where there is no pitch.
 */
const toChartRows = (points, bands) => {
  const bandOf = (cents) => bands.find((band) => band.test(cents)).key
  return points.map((point) => {
    const row = { ...point, inTune: null, near: null, off: null }
    if (!point.voiced) return row
    row[bandOf(point.cents_off)] = point.midi_float
    return row
  }).map((row, i, rows) => {
    const next = rows[i + 1]
    if (row.voiced && next?.voiced) {
      const nextBand = bandOf(next.cents_off)
      if (nextBand !== bandOf(row.cents_off)) return { ...row, [nextBand]: row.midi_float }
    }
    return row
  })
}

// Y ticks on note names. At most ~13 labels fit the chart height without overlapping, so:
// every semitone for up to an octave, natural notes (no sharps) up to two octaves, and only
// the Cs beyond that. All returned ticks are drawn (interval={0}); recharts would otherwise
// silently drop "colliding" labels, which hid E4 and B4 in the first screenshot.
const noteTicks = (low, high) => {
  const all = Array.from({ length: high - low + 1 }, (_, i) => low + i)
  const span = high - low
  if (span <= 12) return all
  if (span <= 24) return all.filter((m) => !NOTE_NAMES[((m % 12) + 12) % 12].includes('#'))
  return all.filter((m) => m % 12 === 0)
}

const ContourTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="rounded-lg border border-white/10 bg-[#0d0d13]/95 px-3 py-2 text-xs shadow-xl">
      <div className="text-muted">{point.t.toFixed(2)} s</div>
      <div className="font-semibold text-white">
        {point.voiced ? `${midiToNoteName(point.midi_float)} · ${describeCents(point.cents_off)}` : 'No pitch'}
      </div>
    </div>
  )
}

const PitchContourChart = ({ points, notes, mode = 'reference-free', height = 340 }) => {
  const bands = useMemo(() => bandsFor(mode), [mode])
  const rows = useMemo(() => toChartRows(points, bands), [points, bands])

  const [low, high] = useMemo(() => {
    const pitches = [
      ...points.filter((p) => p.voiced).map((p) => p.midi_float),
      ...notes.map((n) => n.midi),
    ]
    return [Math.floor(Math.min(...pitches)) - 1, Math.ceil(Math.max(...pitches)) + 1]
  }, [points, notes])

  const usedBands = bands.filter((band) => rows.some((row) => row[band.key] != null))

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={rows} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
          {notes.map((note) => (
            <ReferenceArea
              key={`${note.start}-${note.midi}`}
              x1={note.start}
              x2={note.end}
              y1={note.midi - 0.25}
              y2={note.midi + 0.25}
              fill="#ffffff"
              fillOpacity={0.12}
              stroke="none"
              radius={4}
              ifOverflow="hidden"
            />
          ))}
          <XAxis
            dataKey="t"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(t) => `${t.toFixed(1)}s`}
            stroke="rgba(255,255,255,0.35)"
            tick={{ fontSize: 11 }}
          />
          <YAxis
            type="number"
            domain={[low, high]}
            ticks={noteTicks(low, high)}
            interval={0}
            tickFormatter={midiToNoteName}
            stroke="rgba(255,255,255,0.35)"
            tick={{ fontSize: 11 }}
            width={44}
            allowDataOverflow
          />
          <Tooltip content={<ContourTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.3)' }} isAnimationActive={false} />
          {usedBands.map((band) => (
            <Line
              key={band.key}
              dataKey={band.key}
              name={band.label}
              type="linear"
              stroke={band.color}
              strokeWidth={2}
              dot={false}
              activeDot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          ))}
          {rows.length > 1 && (
            <Brush
              dataKey="t"
              height={24}
              travellerWidth={8}
              stroke="rgba(255,255,255,0.35)"
              fill="rgba(255,255,255,0.04)"
              tickFormatter={(t) => `${t.toFixed(1)}s`}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
        {usedBands.map((band) => (
          <span key={band.key} className="flex items-center gap-2">
            <span className="inline-block h-0.5 w-5 rounded" style={{ backgroundColor: band.color }} />
            {band.label}
          </span>
        ))}
        <span className="flex items-center gap-2">
          <span className="inline-block h-2 w-5 rounded bg-white/20" />
          Detected note
        </span>
        <span>Drag the handles under the chart to zoom.</span>
      </div>
    </div>
  )
}

export default PitchContourChart
