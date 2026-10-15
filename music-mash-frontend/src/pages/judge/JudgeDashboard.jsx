import { useEffect, useState } from 'react'
import PageShell from '../../components/layout/PageShell'
import PageBanner from '../../components/layout/PageBanner'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Input from '../../components/ui/Input'
import EmptyState from '../../components/ui/EmptyState'
import CoverImage from '../../components/ui/CoverImage'
import Skeleton from '../../components/ui/Skeleton'
import { notify } from '../../components/ui/Toast'
import { IMAGES, instrumentImage } from '../../utils/images'
import { formatDate, genreLabel, instrumentLabel, titleCase } from '../../utils/music'
import { cn } from '../../utils/cn'
import api, { mediaUrl } from '../../services/api'

/** The six criteria the backend stores. Each is a whole number 0–100 entered by the judge. */
const CRITERIA = [
  ['pitchScore', 'Pitch'], ['rhythmScore', 'Rhythm'], ['timingScore', 'Timing'],
  ['techniqueScore', 'Technique'], ['creativityScore', 'Creativity'], ['expressionScore', 'Expression'],
]
const EMPTY_FORM = { ...Object.fromEntries(CRITERIA.map(([key]) => [key, ''])), feedback: '' }

const isScore = (value) => value !== '' && Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 100

/** Same rule as EvaluationService.calculateOverallScore: integer mean of the six scores. */
const overallOf = (form) => (CRITERIA.every(([key]) => isScore(form[key]))
  ? Math.floor(CRITERIA.reduce((sum, [key]) => sum + Number(form[key]), 0) / CRITERIA.length) : null)

const EvaluationForm = ({ performance, onDone, onCancel }) => {
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const overall = overallOf(form)
  const valid = overall !== null && form.feedback.trim()

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      const body = { ...Object.fromEntries(CRITERIA.map(([key]) => [key, Number(form[key])])), feedback: form.feedback.trim() }
      await api.post('/judge/evaluations', body, { params: { performanceId: performance.id } })
      notify.success('Evaluation saved', `${performance.title} scored ${overall}/100.`)
      onDone(performance.id)
    } catch (e) {
      notify.error('Could not save the evaluation', e.response?.data?.message || 'Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4 border-t border-obsidian pt-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {CRITERIA.map(([key, label]) => (
          <Input key={key} label={label} type="number" inputMode="numeric" min={0} max={100} step={1} required
            placeholder="0–100" value={form[key]} error={form[key] !== '' && !isScore(form[key]) ? 'Whole number 0–100' : undefined}
            onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
        ))}
      </div>
      <Input as="textarea" rows={3} label="Feedback for the musician" required value={form.feedback}
        onChange={(e) => setForm((f) => ({ ...f, feedback: e.target.value }))} />
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={!valid || saving}>Submit evaluation</Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <p className="text-body-sm text-fog">
          Overall: {overall === null ? 'fill in all six scores' : <span className="font-semibold text-white">{overall}/100</span>}
          <span className="text-caption"> (mean of the six, rounded down)</span>
        </p>
      </div>
    </form>
  )
}

const SubmissionRow = ({ performance, open, onOpen, onClose, onDone }) => {
  const cover = instrumentImage(performance.instrument)
  const audio = mediaUrl(performance.audioUrl)
  return (
    <li className={cn('bg-graphite p-4 shadow-subtle sm:p-6', open && 'shadow-[inset_0_0_0_1px_#666666]')}>
      <div className="grid gap-4 sm:grid-cols-[96px_1fr_auto] sm:items-center">
        <CoverImage src={cover?.src} alt={cover?.alt ?? ''} seed={`performance-${performance.id}`} className="w-24" />
        <div className="min-w-0">
          <p className="truncate text-body-sm font-semibold text-white">{performance.title}</p>
          <p className="text-body-sm text-fog">
            {performance.username} · {instrumentLabel(performance.instrument)}
            {performance.category && ` · ${genreLabel(performance.category)}`}
            {performance.difficulty && ` · ${titleCase(performance.difficulty)}`}
          </p>
          <p className="text-caption text-fog">Submitted {formatDate(performance.submittedAt)}</p>
        </div>
        {!open && <Button size="sm" onClick={onOpen}>Evaluate</Button>}
      </div>
      {performance.description && <p className="mt-4 text-body-sm text-silver">{performance.description}</p>}
      {audio ? (
        <audio controls preload="none" src={audio} className="mt-4 w-full" aria-label={`Recording of ${performance.title}`} />
      ) : (
        <p className="mt-4 text-caption text-fog">No audio file is attached to this submission.</p>
      )}
      {open && <EvaluationForm performance={performance} onDone={onDone} onCancel={onClose} />}
    </li>
  )
}

/** Submissions waiting for a human judge. Scores here are the judge's own, not AI output. */
const JudgeDashboard = () => {
  const [performances, setPerformances] = useState(null)
  const [openId, setOpenId] = useState(null)

  useEffect(() => {
    api.get('/judge/performances').then((r) => setPerformances(r.data)).catch(() => setPerformances([]))
  }, [])

  const done = (id) => {
    setPerformances((list) => list.filter((p) => p.id !== id))
    setOpenId(null)
  }

  return (
    <PageShell>
      <PageBanner image={IMAGES.scenes.competitions} title="Judging"
        description="Listen to each submission and score it yourself. Your scores and feedback go straight to the musician." />
      <div className="page py-10">
        <div className="mb-6 flex items-center gap-3">
          <h2 className="text-subheading font-semibold text-white">Waiting for review</h2>
          {performances && <Badge tone="muted">{performances.length}</Badge>}
        </div>
        {performances === null ? (
          <div className="space-y-4">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-32" />)}</div>
        ) : performances.length ? (
          <ul className="space-y-4">
            {performances.map((p) => (
              <SubmissionRow key={p.id} performance={p} open={openId === p.id}
                onOpen={() => setOpenId(p.id)} onClose={() => setOpenId(null)} onDone={done} />
            ))}
          </ul>
        ) : (
          <EmptyState image={IMAGES.emptyStates.performances?.src} title="Nothing to judge"
            body="Submitted performances appear here until a judge has scored them." />
        )}
      </div>
    </PageShell>
  )
}

export default JudgeDashboard
