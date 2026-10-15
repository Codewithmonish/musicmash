import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import PageShell from '../../components/layout/PageShell'
import Button from '../../components/ui/Button'
import Stat from '../../components/ui/Stat'
import Badge from '../../components/ui/Badge'
import ProgressRing from '../../components/ui/ProgressRing'
import EqualizerBars from '../../components/ui/EqualizerBars'
import EmptyState from '../../components/ui/EmptyState'
import SectionHeader from '../../components/ui/SectionHeader'
import PitchContourChart, { describeCents } from '../../components/ai/PitchContourChart'
import ReferenceComparison from '../../components/ai/ReferenceComparison'
import { IMAGES } from '../../utils/images'
import { formatDate } from '../../utils/music'
import api from '../../services/api'

// Every number on this page is measured by the AI service (music-mash-ai/docs/METRICS.md).
// A null metric is shown as "Not available" with the reason the service gives.

const signed = (value, digits = 0) => `${value > 0 ? '+' : ''}${value.toFixed(digits)}`
const POLL_MS = 1500

const METRIC_GROUPS = [
  {
    title: 'Pitch',
    metrics: [
      { key: 'mean_abs_cents', label: 'Average deviation', unit: '¢', format: (v) => v.toFixed(1), hint: 'From the nearest semitone' },
      { key: 'median_abs_cents', label: 'Median deviation', unit: '¢', format: (v) => v.toFixed(1), hint: 'Ignores most slides between notes' },
      { key: 'mean_signed_cents', label: 'Sharp / flat', unit: '¢', format: (v) => signed(v, 1), hint: '+ is sharp, − is flat' },
      { key: 'pct_frames_within_25_cents', label: 'Within ±25¢', unit: '%', format: (v) => v.toFixed(0) },
      { key: 'pitch_stability_cents', label: 'Wobble on held notes', unit: '¢', format: (v) => `±${v.toFixed(1)}`, hint: 'Lower is steadier; vibrato counts too' },
      { key: 'voiced_ratio', label: 'Pitched audio', unit: '%', format: (v) => Math.round(v * 100), hint: 'Share of the take with a pitch' },
      { key: 'note_count', label: 'Notes detected', format: (v) => v },
    ],
  },
  {
    title: 'Rhythm',
    metrics: [
      { key: 'tempo_bpm', label: 'Tempo', unit: 'BPM', format: (v) => v.toFixed(1) },
      { key: 'mean_abs_timing_error_ms', label: 'Average timing error', unit: 'ms', format: (v) => v.toFixed(1), hint: 'Onsets vs a steady beat grid' },
      { key: 'pct_onsets_within_30ms', label: 'Onsets within ±30 ms', unit: '%', format: (v) => v.toFixed(0) },
      { key: 'tempo_stability_cv', label: 'Beat-length variation', unit: '%', format: (v) => (v * 100).toFixed(1), hint: 'Lower is a steadier pulse' },
      { key: 'tempo_drift_bpm', label: 'Tempo drift', unit: 'BPM', format: (v) => signed(v, 1), hint: 'Second half vs first; + is rushing' },
      { key: 'onset_count', label: 'Onsets detected', format: (v) => v },
    ],
  },
  {
    title: 'Dynamics',
    metrics: [
      { key: 'mean_rms_dbfs', label: 'Average level', unit: 'dBFS', format: (v) => v.toFixed(1) },
      { key: 'dynamic_range_db', label: 'Dynamic range', unit: 'dB', format: (v) => v.toFixed(1), hint: 'Loud (95th pct) minus quiet (5th pct)' },
    ],
  },
]

const errorText = (err, fallback) => err?.response?.data?.detail || err?.response?.data?.message || fallback

/** A 0-100 score with its formula underneath and a thin white bar (a figure, not a status). */
const ScoreStat = ({ label, score, reason, formula }) => (
  <Stat label={label} value={score == null ? null : Math.round(score)} unit="/ 100" reason={reason}>
    <div className="mt-3 h-1 w-full bg-obsidian" aria-hidden="true">
      <div className="h-full bg-white" style={{ width: `${score}%` }} />
    </div>
    {formula && <p className="mt-2 text-caption text-fog">{formula}</p>}
  </Stat>
)

const FeedbackList = ({ title, items, emptyText, dot }) => (
  <div>
    <h3 className="mb-3 flex items-center gap-2 text-body-sm font-semibold text-white">
      {dot && <span aria-hidden="true" className={`h-2 w-2 rounded-full ${dot}`} />}{title}
    </h3>
    {items.length === 0 ? <p className="text-body-sm text-fog">{emptyText}</p> : (
      <ul className="space-y-2">
        {items.map((item) => <li key={item} className="bg-graphite p-3 text-body-sm text-white shadow-subtle">{item}</li>)}
      </ul>
    )}
  </div>
)

const NotesTable = ({ notes }) => (
  <details className="mt-6 text-body-sm text-fog">
    <summary className="cursor-pointer select-none text-white">Show detected notes as a table</summary>
    <div className="mt-3 overflow-x-auto scroll-quiet">
      <table className="w-full min-w-[420px] text-left">
        <thead className="text-caption">
          <tr className="border-b border-mid-gray/40">
            <th className="py-2 pr-4 font-normal">Start</th><th className="py-2 pr-4 font-normal">End</th>
            <th className="py-2 pr-4 font-normal">Note</th><th className="py-2 font-normal">Average tuning</th>
          </tr>
        </thead>
        <tbody>
          {notes.map((note) => (
            <tr key={`${note.start}-${note.midi}`} className="border-b border-mid-gray/40">
              <td className="py-2 pr-4">{note.start.toFixed(2)} s</td>
              <td className="py-2 pr-4">{note.end.toFixed(2)} s</td>
              <td className="py-2 pr-4 font-semibold text-white">{note.note_name}</td>
              <td className="py-2">{describeCents(note.mean_cents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </details>
)

const AIAnalysisPage = () => {
  const { id } = useParams()
  const [state, setState] = useState({ phase: 'loading' })   // loading | processing | ready | failed | error
  const timer = useRef(null)

  // Poll the status while the analysis is queued or running (the studio opens this page at once).
  const load = useCallback(async () => {
    clearTimeout(timer.current)
    try {
      const { data: status } = await api.get(`/ai/status/${id}`)
      if (status.status === 'FAILED') return setState({ phase: 'failed', message: status.error_message })
      if (status.status !== 'COMPLETED') {
        setState({ phase: 'processing' })
        timer.current = setTimeout(load, POLL_MS)
        return undefined
      }
      const [result, contour] = await Promise.allSettled([api.get(`/ai/result/${id}`), api.get(`/ai/result/${id}/pitch-contour`)])
      if (result.status === 'rejected') throw result.reason
      return setState({
        phase: 'ready',
        data: result.value.data,
        contour: contour.status === 'fulfilled' ? contour.value.data : null,
        contourError: contour.status === 'rejected' ? errorText(contour.reason, 'The pitch curve could not be loaded.') : null,
      })
    } catch (err) {
      return setState({ phase: 'error', message: errorText(err, 'The analysis could not be loaded.') })
    }
  }, [id])

  useEffect(() => {
    load()
    return () => clearTimeout(timer.current)
  }, [load])

  if (state.phase !== 'ready') {
    return (
      <PageShell>
        <div className="page py-16">
          {state.phase === 'loading' || state.phase === 'processing' ? (
            <div className="flex flex-col items-center gap-6 py-24 text-center" role="status" aria-live="polite">
              <EqualizerBars count={6} className="h-8" />
              <div>
                <h1 className="text-heading font-thin">{state.phase === 'processing' ? 'Measuring your take' : 'Loading analysis'}</h1>
                {state.phase === 'processing' && (
                  <p className="mt-2 text-body-sm text-fog">Tracking pitch, finding notes and lining up the beat. A short take takes a few seconds.</p>
                )}
              </div>
            </div>
          ) : (
            <EmptyState image={IMAGES.emptyStates.analysis?.src} imageAlt=""
              title={state.phase === 'failed' ? 'This take could not be analysed' : 'Analysis not available'}
              body={state.message}
              action={state.phase === 'failed' ? { label: 'Record a new take', to: '/upload' } : { label: 'Try again', onClick: load }} />
          )}
        </div>
      </PageShell>
    )
  }

  const { data, contour, contourError } = state
  const features = data.audio_features || {}
  const skill = data.skill_prediction || {}
  const reasons = features.unavailable_reasons || {}
  const level = skill.predicted_level ? skill.predicted_level.charAt(0) + skill.predicted_level.slice(1).toLowerCase() : null

  return (
    <PageShell>
      <div className="page space-y-16 py-10">
        {/* Header + overall */}
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className="text-body-sm text-fog">Analysis · {formatDate(data.analysis?.processing_completed_at)}</p>
            <h1 className="mt-2 text-heading font-thin">Your take, measured</h1>
            <p className="mt-2 max-w-xl text-body-sm text-fog">
              Intonation is measured in cents from the nearest note; timing in milliseconds against a steady beat grid.
              Every number on this page comes from your audio.
            </p>
          </div>
          <div className="flex flex-col gap-6 bg-graphite p-6 shadow-subtle sm:flex-row sm:items-center">
            {skill.overall_score == null ? (
              <div className="max-w-[12rem]">
                <p className="text-caption text-fog">Overall score</p>
                <p className="mt-1 text-body font-semibold text-fog">Not available</p>
                <p className="mt-1 text-caption text-fog">{reasons.overall_score}</p>
              </div>
            ) : (
              <ProgressRing progress={skill.overall_score} size={120} label={Math.round(skill.overall_score)} sublabel="Overall" />
            )}
            <div className="max-w-[18rem]">
              <p className="text-caption text-fog">Level</p>
              <p className="text-subheading font-semibold text-white">{level ?? 'Not available'}</p>
              {skill.level_basis && <p className="mt-1 text-caption text-fog">{skill.level_basis}</p>}
            </div>
          </div>
        </section>

        {/* Scores */}
        <section className="grid gap-4 sm:grid-cols-3" aria-label="Scores">
          <ScoreStat label="Intonation" score={skill.intonation_score} reason={reasons.intonation_score}
            formula={features.mean_abs_cents != null && `100 − 4 × ${features.mean_abs_cents.toFixed(1)}¢ from the nearest note`} />
          <ScoreStat label="Rhythm" score={skill.rhythm_score} reason={reasons.rhythm_score}
            formula={features.mean_abs_timing_error_ms != null && `100 − 2 × ${features.mean_abs_timing_error_ms.toFixed(1)} ms timing error`} />
          <Stat label="Tempo" value={features.tempo_bpm == null ? null : Math.round(features.tempo_bpm)} unit="BPM" reason={reasons.tempo_bpm}
            hint={features.tempo_drift_bpm != null ? `Drift ${signed(features.tempo_drift_bpm, 1)} BPM from the first half to the second` : undefined} />
        </section>

        {/* Pitch curve */}
        <section>
          <SectionHeader title="Your pitch curve"
            description="The line is the pitch you played; the light bars are the notes it settled on. 100 cents = 1 semitone (one piano key), so 50 cents is halfway to the next note. Hover the line for the note and how sharp or flat it was." />
          <div className="bg-graphite p-4 shadow-subtle sm:p-6">
            {contourError || !contour || contour.points.length === 0 ? (
              <p className="text-body-sm text-fog">Not available: {contourError || contour?.reason || 'no pitch was found in this take.'}</p>
            ) : (
              <>
                <PitchContourChart points={contour.points} notes={contour.notes} />
                {contour.notes.length > 0 && <NotesTable notes={contour.notes} />}
              </>
            )}
          </div>
        </section>

        {/* Reference comparison */}
        <ReferenceComparison analysisId={id} />

        {/* Feedback */}
        <section>
          <SectionHeader title="Feedback from your measurements" action={{ label: 'Practise now', to: '/practice' }} />
          <div className="grid gap-8 md:grid-cols-3">
            <FeedbackList title="Strengths" items={skill.strengths || []} dot="bg-status-good" emptyText="No metric reached a strength threshold." />
            <FeedbackList title="To work on" items={skill.weaknesses || []} dot="bg-status-warning" emptyText="No metric crossed a weakness threshold." />
            <FeedbackList title="Suggested drills" items={skill.improvement_areas || []} emptyText="No drills needed for the measured metrics." />
          </div>
        </section>

        {/* All measurements */}
        <section>
          <SectionHeader title="All measurements" />
          <div className="space-y-8">
            {METRIC_GROUPS.map((group) => (
              <div key={group.title}>
                <h3 className="mb-3 flex items-center gap-2 text-body-sm font-semibold text-white">{group.title}<Badge tone="muted">{group.metrics.length}</Badge></h3>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {group.metrics.map(({ key, label, unit, format, hint }) => (
                    <Stat key={key} label={label} value={features[key] == null ? null : format(features[key])}
                      unit={unit} hint={hint} reason={reasons[key]} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <Button to="/upload">Record another take</Button>
          <Button to="/practice" variant="subtle">Go to the Practice Arena</Button>
        </div>
      </div>
    </PageShell>
  )
}

export default AIAnalysisPage
