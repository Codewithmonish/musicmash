import { Fragment, useEffect, useState } from 'react'
import { FiRefreshCw } from 'react-icons/fi'
import SectionHeader from '../ui/SectionHeader'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import EqualizerBars from '../ui/EqualizerBars'
import { cn } from '../../utils/cn'
import api from '../../services/api'

const errorText = (err, fallback) => err.response?.data?.detail || err.response?.data?.message || fallback

/** A measured fact, quoted exactly as the AI service wrote it. */
const MetricChip = ({ children }) => (
  <span className="inline-block rounded bg-obsidian px-2 py-1 text-caption text-silver shadow-subtle">{children}</span>
)

const SourceTag = ({ doc }) => (
  <span className="text-caption text-fog">Source: <span className="text-silver">{doc.title}</span></span>
)

/** **bold** → <strong>; everything else stays plain text (the docs are our own markdown). */
const inline = (text) => text.split(/(\*\*[^*]+\*\*)/).map((part, i) => (part.startsWith('**') && part.endsWith('**')
  ? <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>
  : <Fragment key={i}>{part}</Fragment>))

const LIST_ITEM = /^(\d+\.|-)\s/

/** Doc block → items. The docs are hard-wrapped, so a line that doesn't start a list item
 *  continues the previous one. */
const blockItems = (block) => block.split('\n').map((l) => l.trim()).filter(Boolean)
  .reduce((items, line) => (items.length && !LIST_ITEM.test(line)
    ? [...items.slice(0, -1), `${items[items.length - 1]} ${line}`]
    : [...items, line]), [])

/** Renders a doc excerpt: blocks of "1." or "-" items become lists, other blocks paragraphs. */
const Excerpt = ({ text }) => (
  <div className="space-y-3 text-body-sm text-silver">
    {text.split(/\n\s*\n/).map((block, b) => {
      const items = blockItems(block)
      if (!items.length) return null
      if (!LIST_ITEM.test(items[0])) return <p key={b}>{inline(items.join(' '))}</p>
      const numbered = /^\d+\./.test(items[0])
      const List = numbered ? 'ol' : 'ul'
      return (
        <List key={b} className={cn('space-y-1 pl-5', numbered ? 'list-decimal' : 'list-disc')}>
          {items.map((item, i) => <li key={i}>{inline(item.replace(LIST_ITEM, ''))}</li>)}
        </List>
      )
    })}
  </div>
)

const storageKey = (analysisId) => `coach-plan-${analysisId}`
const loadChecked = (analysisId) => {
  try { return JSON.parse(localStorage.getItem(storageKey(analysisId))) || {} } catch { return {} }
}

/** 7-day plan as a checklist; ticks are remembered in this browser only. */
const PlanChecklist = ({ analysisId, plan }) => {
  const [checked, setChecked] = useState(() => loadChecked(analysisId))
  const toggle = (id) => setChecked((current) => {
    const next = { ...current, [id]: !current[id] }
    try { localStorage.setItem(storageKey(analysisId), JSON.stringify(next)) } catch { /* private mode */ }
    return next
  })
  const total = plan.reduce((n, day) => n + day.tasks.length, 0)
  const done = plan.reduce((n, day) => n + day.tasks.filter((_, i) => checked[`${day.day}-${i}`]).length, 0)
  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h3 className="text-body-sm font-semibold text-white">Your 7-day plan</h3>
        <span className="text-caption text-fog">{done} of {total} done</span>
      </div>
      <ol className="grid gap-px overflow-hidden rounded bg-obsidian sm:grid-cols-2 lg:grid-cols-4">
        {plan.map((day) => (
          <li key={day.day} className="bg-graphite p-4">
            <p className="text-caption text-fog">Day {day.day}</p>
            <p className="mb-3 text-body-sm font-semibold text-white">{day.focus}</p>
            <ul className="space-y-2">
              {day.tasks.map((task, i) => {
                const id = `${day.day}-${i}`
                return (
                  <li key={id}>
                    <label className="flex cursor-pointer items-start gap-2 text-body-sm text-silver">
                      <input type="checkbox" checked={Boolean(checked[id])} onChange={() => toggle(id)}
                        className="mt-1 h-4 w-4 shrink-0 accent-white" />
                      <span className={cn(checked[id] && 'text-fog line-through')}>{task}</span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  )
}

const IssueCard = ({ issue, index }) => (
  <li className="bg-graphite p-5 shadow-subtle">
    <p className="text-caption text-fog">Issue {index + 1}</p>
    <h3 className="mt-1 text-subheading font-semibold text-white">{issue.issue}</h3>
    <div className="mt-3 flex flex-wrap gap-2" aria-label="Measured evidence">
      {issue.evidence.map((e) => <MetricChip key={e}>{e}</MetricChip>)}
    </div>
    <p className="mt-4 text-body-sm text-white">{issue.exercise}</p>
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
      <span className="text-caption text-silver">{issue.how_long}</span>
      <SourceTag doc={issue.source_doc} />
    </div>
  </li>
)

/** Basic mode: each measured problem with the exercises retrieved for it, as the docs write them. */
const DiagnosisBlock = ({ diagnosis, exercises }) => (
  <li className="bg-graphite p-5 shadow-subtle">
    <h3 className="text-subheading font-semibold text-white">{diagnosis.label}</h3>
    <div className="mt-3 flex flex-wrap gap-2" aria-label="Measured evidence">
      {diagnosis.evidence.map((e) => <MetricChip key={e}>{e}</MetricChip>)}
    </div>
    <div className="mt-5 space-y-5">
      {exercises.map((x) => (
        <div key={x.source_doc.id} className="border-t border-obsidian pt-4">
          <p className="mb-2 text-body-sm font-semibold text-white">{x.source_doc.title}</p>
          <Excerpt text={x.excerpt} />
          {x.how_long && <p className="mt-2 text-caption text-silver">{inline(x.how_long)}</p>}
          <div className="mt-1"><SourceTag doc={x.source_doc} /></div>
        </div>
      ))}
    </div>
  </li>
)

/**
 * "AI Coach" section. The AI service diagnoses the measured metrics (deterministic), retrieves
 * practice docs, and (with an LLM key) writes advice that must quote those measurements.
 * Without a key it returns "basic mode": no generated text, just the diagnosis and the docs.
 */
const AICoach = ({ analysisId }) => {
  const [coach, setCoach] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = async (refresh = false) => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.post(`/ai/coach/${analysisId}`, { refresh })
      setCoach(data)
    } catch (err) {
      setError(errorText(err, 'The coach could not be reached.'))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [analysisId])

  const llm = coach?.mode === 'llm'
  const description = !coach ? 'Practice advice based only on what was measured in this take.'
    : llm ? `Written by ${coach.model} from your measurements and our practice library, then checked: every number it quotes was measured.`
      : 'Your measured problems, each matched with exercises from our practice library.'

  return (
    <section aria-busy={loading}>
      <SectionHeader title="AI Coach" description={description} />

      {loading && !coach && (
        <div className="flex items-center gap-4 bg-graphite p-6 shadow-subtle">
          <EqualizerBars count={4} label="Preparing your coaching" />
          <p className="text-body-sm text-fog">Reading your measurements and picking exercises…</p>
        </div>
      )}

      {error && (
        <div className="flex flex-wrap items-center justify-between gap-4 bg-graphite p-6 shadow-subtle">
          <p className="text-body-sm text-silver">{error}</p>
          <Button size="sm" variant="subtle" onClick={() => load()}>Try again</Button>
        </div>
      )}

      {coach && (
        <div className="space-y-10">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="muted" dot={llm ? 'live' : undefined}>{llm ? 'AI generated, grounded' : 'Basic mode'}</Badge>
            <Button size="sm" variant="ghost" icon={FiRefreshCw} onClick={() => load(true)} disabled={loading}>
              {loading ? 'Working…' : 'Generate again'}
            </Button>
          </div>

          {coach.notes.length > 0 && (
            <ul className="space-y-1 text-body-sm text-fog">
              {coach.notes.map((note) => <li key={note}>{note}</li>)}
            </ul>
          )}

          {llm && coach.summary && <p className="max-w-3xl text-body text-white">{coach.summary}</p>}

          {llm ? (
            <ol className="grid gap-4 lg:grid-cols-3">
              {coach.top_issues.map((issue, i) => <IssueCard key={issue.issue} issue={issue} index={i} />)}
            </ol>
          ) : coach.diagnosis.length > 0 ? (
            <ol className="grid gap-4 lg:grid-cols-2">
              {coach.diagnosis.map((d) => (
                <DiagnosisBlock key={d.key} diagnosis={d} exercises={coach.exercises.filter((x) => x.diagnosis_key === d.key)} />
              ))}
            </ol>
          ) : coach.exercises.length > 0 && (
            <ol className="grid gap-4 lg:grid-cols-2">
              <DiagnosisBlock diagnosis={{ label: 'Keep in shape', evidence: [] }} exercises={coach.exercises} />
            </ol>
          )}

          {coach.plan.length > 0 && <PlanChecklist analysisId={analysisId} plan={coach.plan} />}
        </div>
      )}
    </section>
  )
}

export default AICoach
