import { useState } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts'

// "How close am I to the original?" — result of GET /api/ai/compare/{id}/result.
// See music-mash-ai/docs/ALIGNMENT.md for how every number is computed.

// One lane per issue family. Colours are the first three categorical slots (validated
// all-pairs on the dark surface); the lane label and the symbol in each block carry the same
// information, so colour is never the only cue.
const LANES = [
  { key: 'pitch', label: 'Pitch', color: '#3987e5' },
  { key: 'tempo', label: 'Tempo', color: '#d95926' },
  { key: 'notes', label: 'Notes', color: '#199e70' },
]

const ISSUES = {
  pitch_sharp: { lane: 'pitch', symbol: '♯', label: 'Sharp' },
  pitch_flat: { lane: 'pitch', symbol: '♭', label: 'Flat' },
  rushing: { lane: 'tempo', symbol: '»', label: 'Rushing' },
  dragging: { lane: 'tempo', symbol: '«', label: 'Dragging' },
  missing_notes: { lane: 'notes', symbol: '∅', label: 'Missing notes' },
}

const clock = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`

export const describeTempo = (ratio) => {
  const percent = Math.round(Math.abs(ratio - 1) * 100)
  if (percent === 0) return 'the same tempo as the original'
  return `${percent}% ${ratio > 1 ? 'faster' : 'slower'} than the original`
}

const TempoTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="rounded-lg border border-white/10 bg-[#0d0d13]/95 px-3 py-2 text-xs shadow-xl">
      <div className="text-muted">at {point.ref_time.toFixed(1)} s of the original</div>
      <div className="font-semibold text-white">{point.tempo_ratio.toFixed(2)}× · {describeTempo(point.tempo_ratio)}</div>
    </div>
  )
}

// Even, whole-second ticks from 0 to the reference duration (same span as the timeline above).
const secondTicks = (duration) => {
  const step = Math.max(1, Math.ceil(duration / 6))
  return Array.from({ length: Math.floor(duration / step) + 1 }, (_, i) => i * step)
}

const TempoDriftChart = ({ curve, duration }) => {
  const ratios = curve.map((p) => p.tempo_ratio)
  const low = Math.min(0.8, ...ratios)
  const high = Math.max(1.2, ...ratios)
  return (
    <ResponsiveContainer width="100%" height={140}>
      <LineChart data={curve} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
        <XAxis dataKey="ref_time" type="number" domain={[0, duration]} ticks={secondTicks(duration)}
          interval={0} tickFormatter={(t) => `${t}s`} stroke="rgba(255,255,255,0.35)" tick={{ fontSize: 11 }} />
        <YAxis domain={[Math.floor(low * 10) / 10, Math.ceil(high * 10) / 10]} tickFormatter={(r) => `${r.toFixed(1)}×`}
          stroke="rgba(255,255,255,0.35)" tick={{ fontSize: 11 }} width={40} />
        <ReferenceLine y={1} stroke="rgba(255,255,255,0.4)" strokeDasharray="4 4"
          label={{ value: 'original tempo', position: 'insideTopRight', fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} />
        <Tooltip content={<TempoTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.3)' }} isAnimationActive={false} />
        <Line dataKey="tempo_ratio" type="monotone" stroke="#d95926" strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

const ComparisonTimeline = ({ result }) => {
  const [selected, setSelected] = useState(null)
  const duration = result.ref_duration_s
  const sections = result.problem_sections
  const pct = (seconds) => `${(Math.min(seconds, duration) / duration) * 100}%`

  return (
    <div className="space-y-5">
      {/* Headline numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white/5 border border-white/5">
          <div className="text-[11px] font-mono uppercase text-muted">Similarity</div>
          <div className="text-3xl font-display font-bold text-white">{Math.round(result.similarity)}<span className="text-sm text-muted">/100</span></div>
          {result.played_similarity != null && Math.round(result.played_similarity) !== Math.round(result.similarity) && (
            <p className="text-[11px] text-muted mt-1">{Math.round(result.played_similarity)}/100 where you play (missing passages lower the overall score)</p>
          )}
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/5">
          <div className="text-[11px] font-mono uppercase text-muted">Overall tempo</div>
          <div className="text-3xl font-display font-bold text-white">{result.tempo_ratio.toFixed(2)}×</div>
          <p className="text-[11px] text-muted mt-1">{describeTempo(result.tempo_ratio)}</p>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/5">
          <div className="text-[11px] font-mono uppercase text-muted">Compared with</div>
          <div className="text-lg font-display font-bold text-white truncate">{result.reference.title}</div>
          <p className="text-[11px] text-muted mt-1">
            {result.reference.artist ? `${result.reference.artist} · ` : ''}{clock(duration)} long
            {result.truncated ? ' · only the first 3 minutes were compared' : ''}
          </p>
        </div>
      </div>

      {!result.reliable && (
        <div className="p-3 rounded-xl border border-warning/30 bg-warning/10 text-xs text-white">{result.unreliable_reason}</div>
      )}

      {/* Timeline of the reference with problem sections */}
      {result.reliable && (
        <div>
          <h4 className="text-xs font-mono uppercase text-muted mb-2">Where it differs from the original (click a block)</h4>
          <div className="space-y-1.5">
            {LANES.map((lane) => (
              <div key={lane.key} className="flex items-center gap-3">
                <span className="w-12 shrink-0 text-[11px] text-muted">{lane.label}</span>
                <div className="relative h-7 flex-1 rounded-md bg-white/5">
                  {sections.map((section, i) => ISSUES[section.issue].lane === lane.key && (
                    <button
                      key={`${section.issue}-${section.ref_start}`}
                      type="button"
                      onClick={() => setSelected(i)}
                      aria-label={`${ISSUES[section.issue].label} from ${clock(section.ref_start)} to ${clock(section.ref_end)}`}
                      className={`absolute top-0.5 bottom-0.5 rounded flex items-center justify-center text-base leading-none font-bold text-white transition ${selected === i ? 'ring-2 ring-white' : 'hover:brightness-125'}`}
                      style={{ left: pct(section.ref_start), width: `calc(${pct(section.ref_end - section.ref_start)} - 2px)`, backgroundColor: lane.color }}
                    >
                      {ISSUES[section.issue].symbol}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex justify-between pl-[3.75rem] text-[11px] text-muted">
              <span>0:00</span><span>{clock(duration / 2)}</span><span>{clock(duration)}</span>
            </div>
          </div>

          {sections.length === 0 ? (
            <p className="mt-3 text-xs text-muted">No section crossed a problem threshold: pitch within ±25¢ and tempo within 10% of the original everywhere.</p>
          ) : selected != null && sections[selected] ? (
            <div className="mt-3 p-3 rounded-xl bg-white/5 border border-white/10 text-xs">
              <div className="font-semibold text-white mb-1">
                {ISSUES[sections[selected].issue].symbol} {ISSUES[sections[selected].issue].label}
                <span className="font-normal text-muted"> · {clock(sections[selected].ref_start)}–{clock(sections[selected].ref_end)} in the original, {clock(sections[selected].user_start)}–{clock(sections[selected].user_end)} in your take</span>
              </div>
              <p className="text-muted">{sections[selected].detail}</p>
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted">{sections.length} problem section{sections.length > 1 ? 's' : ''} found. Click a block for details.</p>
          )}

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
            {Object.entries(ISSUES).map(([key, issue]) => (
              <span key={key} className="flex items-center gap-1.5">
                <span className="inline-flex h-4 w-4 items-center justify-center rounded text-[10px] font-bold text-white"
                  style={{ backgroundColor: LANES.find((l) => l.key === issue.lane).color }}>{issue.symbol}</span>
                {issue.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tempo drift */}
      {result.tempo_curve.length > 1 && (
        <div>
          <h4 className="text-xs font-mono uppercase text-muted mb-1">Your tempo compared with the original</h4>
          <p className="text-[11px] text-muted mb-2">Above 1.0× you were faster than the original at that point, below 1.0× slower (each point averages a 4-second window, so sudden changes appear gradual).</p>
          <TempoDriftChart curve={result.tempo_curve} duration={duration} />
        </div>
      )}
    </div>
  )
}

export default ComparisonTimeline
