import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FiTarget, FiMusic, FiTrendingUp, FiCheckCircle, FiCpu, FiAlertTriangle, FiStar, FiActivity } from 'react-icons/fi'
import { useParams, Link } from 'react-router-dom'
import Navbar from '../../components/layout/Navbar'
import AmbientBackground from '../../components/ui/AmbientBackground'
import EqualizerBars from '../../components/ui/EqualizerBars'
import RadialProgress from '../../components/ui/RadialProgress'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import PitchContourChart, { describeCents } from '../../components/ai/PitchContourChart'
import StatCard from '../../components/ai/StatCard'
import api from '../../services/api'

// Every number on this page is measured by the AI service (music-mash-ai/docs/METRICS.md).
// A null metric is shown as "Not available" with the reason the service gives.

const signed = (value, digits = 0) => `${value > 0 ? '+' : ''}${value.toFixed(digits)}`

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

const NotAvailable = ({ reason }) => (
  <div>
    <div className="text-xl font-display font-bold text-muted">Not available</div>
    {reason && <p className="text-xs text-muted mt-1">{reason}</p>}
  </div>
)

const ScoreCard = ({ label, icon, score, reason, detail, barClass }) => (
  <Card hover>
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs font-mono text-muted uppercase">{label}</span>
      {icon}
    </div>
    {score == null ? (
      <NotAvailable reason={reason} />
    ) : (
      <>
        <div className="text-3xl font-display font-bold text-white">{Math.round(score)}<span className="text-sm text-muted">/100</span></div>
        <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden mt-3">
          <div className={`h-full rounded-full ${barClass}`} style={{ width: `${score}%` }} />
        </div>
        {detail && <p className="text-xs text-muted mt-2">{detail}</p>}
      </>
    )}
  </Card>
)

const FeedbackList = ({ title, icon, items, emptyText }) => (
  <div>
    <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">{icon} {title}</h4>
    {items.length === 0 ? (
      <p className="text-xs text-muted">{emptyText}</p>
    ) : (
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="p-3 rounded-xl bg-white/5 border border-white/5 text-xs leading-relaxed text-muted">{item}</li>
        ))}
      </ul>
    )}
  </div>
)

const PitchContourSection = ({ contour, error }) => {
  let body
  if (error) {
    body = <NotAvailable reason={error} />
  } else if (!contour || contour.points.length === 0) {
    body = <NotAvailable reason={contour?.reason} />
  } else {
    body = (
      <>
        <PitchContourChart points={contour.points} notes={contour.notes} />
        {contour.notes.length > 0 && (
          <details className="mt-4 text-xs text-muted">
            <summary className="cursor-pointer select-none">Show detected notes as a table</summary>
            <table className="mt-2 w-full text-left">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="py-1 pr-4 font-medium">Start</th>
                  <th className="py-1 pr-4 font-medium">End</th>
                  <th className="py-1 pr-4 font-medium">Note</th>
                  <th className="py-1 font-medium">Average tuning</th>
                </tr>
              </thead>
              <tbody>
                {contour.notes.map((note) => (
                  <tr key={`${note.start}-${note.midi}`} className="border-b border-white/5">
                    <td className="py-1 pr-4">{note.start.toFixed(2)} s</td>
                    <td className="py-1 pr-4">{note.end.toFixed(2)} s</td>
                    <td className="py-1 pr-4 text-white">{note.note_name}</td>
                    <td className="py-1">{describeCents(note.mean_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        )}
      </>
    )
  }

  return (
    <Card hover={false} className="border-white/10 p-6 mb-8">
      <h3 className="font-display text-xl font-bold text-white mb-1 flex items-center gap-2">
        <FiActivity className="text-accent" /> Your pitch curve
      </h3>
      <p className="text-xs text-muted mb-4 max-w-3xl">
        The line is the pitch you played over time; the light bars are the notes it settled on.
        Tuning is measured in <strong className="text-white">cents</strong>: 100 cents = 1 semitone
        (one piano key), so 50 cents off is exactly halfway to the next note. Hover the line to see
        the note and how sharp or flat it was.
      </p>
      {body}
    </Card>
  )
}

const AIAnalysisPage = () => {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [contour, setContour] = useState(null)
  const [contourError, setContourError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchAIResult()
  }, [id])

  const errorMessage = (err, fallback) =>
    err.response?.data?.detail || err.response?.data?.message || fallback

  const fetchAIResult = async () => {
    setLoading(true)
    setError(null)
    setContourError(null)
    const [result, contourResult] = await Promise.allSettled([
      api.get(`/api/ai/result/${id}`),
      api.get(`/api/ai/result/${id}/pitch-contour`),
    ])
    if (result.status === 'fulfilled') {
      setData(result.value.data)
    } else {
      console.error('Failed to fetch AI analysis:', result.reason)
      setError(errorMessage(result.reason, 'The analysis result could not be loaded.'))
    }
    if (contourResult.status === 'fulfilled') {
      setContour(contourResult.value.data)
    } else {
      setContourError(errorMessage(contourResult.reason, 'The pitch curve could not be loaded.'))
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#06060A] text-foreground flex items-center justify-center relative overflow-hidden">
        <AmbientBackground />
        <div className="text-center relative z-10">
          <EqualizerBars count={10} className="h-16 gap-2 mb-6 mx-auto" />
          <h2 className="font-display font-bold text-2xl text-white animate-pulse">Loading analysis...</h2>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#06060A] text-foreground pt-24 pb-20 px-4 relative overflow-hidden">
        <AmbientBackground />
        <Navbar />
        <div className="max-w-xl mx-auto relative z-10">
          <Card hover={false} className="text-center p-8">
            <FiAlertTriangle className="text-warning text-3xl mx-auto mb-3" />
            <h2 className="font-display font-bold text-xl text-white mb-2">Analysis not available</h2>
            <p className="text-sm text-muted mb-6">{error}</p>
            <Button variant="accent" onClick={fetchAIResult} className="text-xs uppercase font-bold">Try again</Button>
          </Card>
        </div>
      </div>
    )
  }

  const features = data?.audio_features || {}
  const skill = data?.skill_prediction || {}
  const reasons = features.unavailable_reasons || {}

  return (
    <div className="min-h-screen bg-[#06060A] text-foreground pt-24 pb-20 px-4 relative overflow-hidden">
      <AmbientBackground />
      <Navbar />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent text-xs font-mono font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <FiCpu /> AI AUDIO REPORT
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-bold text-white tracking-tight">
            Performance <span className="gradient-text-cyan">AI Insights</span>
          </h1>
          <p className="text-muted text-xs sm:text-sm mt-1">Measured pitch accuracy (pYIN), timing against a steady beat grid, and dynamics.</p>
        </motion.div>

        {/* Overall Score */}
        <Card hover={false} variant="glow" className="mb-8 p-8 text-center relative overflow-hidden">
          <div className="flex flex-col items-center">
            {skill.overall_score == null ? (
              <NotAvailable reason={reasons.overall_score} />
            ) : (
              <RadialProgress progress={skill.overall_score} size={150} strokeWidth={10} label={`${Math.round(skill.overall_score)}`} sublabel="OVERALL SCORE" />
            )}
            <div className="font-display font-bold text-2xl text-white mt-4">
              Skill level: <span className="gradient-text">{skill.predicted_level || 'Not available'}</span>
            </div>
            {skill.level_basis && <div className="text-xs font-mono text-muted mt-1 max-w-xl">{skill.level_basis}</div>}
          </div>
        </Card>

        {/* Score Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <ScoreCard
            label="Pitch score"
            icon={<FiTarget className="text-accent text-xl" />}
            score={skill.pitch_score}
            reason={reasons.pitch_score}
            barClass="bg-accent"
            detail={features.mean_abs_cents != null && `100 − 2 × ${features.mean_abs_cents.toFixed(1)}¢ average deviation`}
          />
          <ScoreCard
            label="Rhythm score"
            icon={<FiMusic className="text-primary-light text-xl" />}
            score={skill.rhythm_score}
            reason={reasons.rhythm_score}
            barClass="bg-primary"
            detail={features.mean_abs_timing_error_ms != null && `100 − 2 × ${features.mean_abs_timing_error_ms.toFixed(1)} ms average timing error`}
          />
          <Card hover>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-muted uppercase">Tempo</span>
              <FiTrendingUp className="text-secondary text-xl" />
            </div>
            {features.tempo_bpm == null ? (
              <NotAvailable reason={reasons.tempo_bpm} />
            ) : (
              <>
                <div className="text-3xl font-display font-bold text-white">{Math.round(features.tempo_bpm)} <span className="text-sm text-muted">BPM</span></div>
                {features.tempo_drift_bpm != null && (
                  <p className="text-xs text-muted mt-2">Drift: {signed(features.tempo_drift_bpm, 1)} BPM from first half to second half</p>
                )}
              </>
            )}
          </Card>
        </div>

        {/* Pitch Contour */}
        <PitchContourSection contour={contour} error={contourError} />

        {/* Coach Feedback */}
        <Card hover={false} className="border-white/10 p-6 mb-8">
          <h3 className="font-display text-xl font-bold text-white mb-4 flex items-center gap-2">
            <FiStar className="text-warning" /> Feedback from your measurements
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeedbackList title="Strengths" icon={<FiCheckCircle className="text-success" />} items={skill.strengths || []} emptyText="No metric reached a strength threshold." />
            <FeedbackList title="To work on" icon={<FiAlertTriangle className="text-warning" />} items={skill.weaknesses || []} emptyText="No metric crossed a weakness threshold." />
            <FeedbackList title="Suggested drills" icon={<FiTarget className="text-accent" />} items={skill.improvement_areas || []} emptyText="No drills needed for the measured metrics." />
          </div>
          <div className="mt-6 flex justify-end">
            <Link to="/practice">
              <Button variant="accent" className="text-xs uppercase font-bold">
                Go to Practice Arena
              </Button>
            </Link>
          </div>
        </Card>

        {/* Measured Metrics */}
        {METRIC_GROUPS.map((group) => (
          <section key={group.title} className="mb-6">
            <h3 className="text-xs font-mono text-muted uppercase mb-3">{group.title}</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {group.metrics.map(({ key, label, unit, format, hint }) => (
                <StatCard
                  key={key}
                  label={label}
                  value={features[key] == null ? null : format(features[key])}
                  unit={unit}
                  hint={hint}
                  reason={reasons[key]}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

export default AIAnalysisPage
