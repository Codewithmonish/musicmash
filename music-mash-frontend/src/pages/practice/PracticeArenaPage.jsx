import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FiClock } from 'react-icons/fi'
import PageShell from '../../components/layout/PageShell'
import SectionHeader from '../../components/ui/SectionHeader'
import TrackCard, { TileGrid, TileItem } from '../../components/ui/TrackCard'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import Skeleton, { TrackCardSkeleton } from '../../components/ui/Skeleton'
import { notify } from '../../components/ui/Toast'
import Metronome from '../../components/practice/Metronome'
import Tuner from '../../components/practice/Tuner'
import SessionRunner from '../../components/practice/SessionRunner'
import PracticeHeatmap from '../../components/practice/PracticeHeatmap'
import { IMAGES } from '../../utils/images'
import { formatDate, formatDuration, instrumentLabel, titleCase } from '../../utils/music'
import { cn } from '../../utils/cn'
import api from '../../services/api'

/** Time on this page since it opened: the practice session clock. */
const useSessionClock = () => {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const startedAt = Date.now()
    const timer = setInterval(() => setSeconds((Date.now() - startedAt) / 1000), 1000)
    return () => clearInterval(timer)
  }, [])
  return seconds
}

const PracticeArenaPage = () => {
  const [params, setParams] = useSearchParams()
  const [exercises, setExercises] = useState(null)
  const [profile, setProfile] = useState(null)
  const [history, setHistory] = useState(null)
  const [sessions, setSessions] = useState([])
  const [filter, setFilter] = useState('ALL')
  const [bpm, setBpm] = useState(80)
  const [timeSignature, setTimeSignature] = useState('4/4')
  const [celebration, setCelebration] = useState(null)
  const sessionClock = useSessionClock()
  const runnerRef = useRef(null)

  const selectedId = Number(params.get('exercise')) || null
  const selected = exercises?.find((e) => e.id === selectedId) ?? null

  const loadHistory = useCallback(() => {
    api.get('/practice/history').then((r) => setHistory(r.data)).catch(() => setHistory([]))
    api.get('/practice/sessions').then((r) => setSessions(r.data)).catch(() => setSessions([]))
  }, [])

  useEffect(() => {
    api.get('/practice/exercises').then((r) => setExercises(r.data)).catch(() => setExercises([]))
    api.get('/profile/me').then((r) => setProfile(r.data)).catch(() => setProfile(null))
    loadHistory()
  }, [loadHistory])

  useEffect(() => {
    if (selected) {
      setBpm(selected.bpm)
      setTimeSignature(selected.timeSignature)
      runnerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [selected])

  const instruments = useMemo(() => {
    const ids = new Set((exercises ?? []).map((e) => e.instrument).filter((i) => i !== 'ANY'))
    return ['ALL', ...[...ids].sort()]
  }, [exercises])
  const visible = (exercises ?? []).filter((e) => filter === 'ALL' || e.instrument === filter || e.instrument === 'ANY')

  // Instrument used for analysis: the exercise's, or the user's own for "any instrument" exercises.
  const sessionInstrument = selected?.instrument === 'ANY' ? (profile?.primaryInstrument || 'VOCALS') : selected?.instrument

  const handleSaved = useCallback((result) => {
    loadHistory()
    if (result.levelUp) {
      setCelebration({ title: `Level ${result.stats.level}`, body: `You reached level ${result.stats.level} with ${result.stats.totalXp} XP.` })
    } else if (result.streakMilestone) {
      setCelebration({ title: `${result.stats.streak}-day streak`, body: `You have practised ${result.stats.streak} days in a row.` })
    } else {
      notify({ title: `+${result.xpEarned} XP`, body: 'Session saved with its measured scores.', image: selected?.coverImage })
    }
  }, [loadHistory, selected])

  const banner = IMAGES.scenes.practice

  return (
    <PageShell>
      <section className="relative h-48 overflow-hidden sm:h-60">
        <img src={banner?.src} alt={banner?.alt ?? ''} width="1600" height="700" className="absolute inset-0 h-full w-full object-cover" />
        <div className="hero-scrim absolute inset-0" aria-hidden="true" />
        <div className="page relative flex h-full flex-col justify-end gap-3 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-heading font-thin text-white">Practice Arena</h1>
            <p className="mt-1 max-w-xl text-body-sm text-fog">Real tools and exercises scored on what you actually play.</p>
          </div>
          <p className="flex items-center gap-2 text-body-sm text-white" aria-label={`Session time ${formatDuration(sessionClock)}`}>
            <FiClock aria-hidden="true" /> Session {formatDuration(sessionClock)}
          </p>
        </div>
      </section>

      <div className="page space-y-16 py-10">
        {/* Selected exercise: the scored session */}
        {selected && (
          <div ref={runnerRef} className="scroll-mt-20">
            <SessionRunner key={selected.id} exercise={selected} instrument={sessionInstrument}
              onClose={() => setParams({})} onSaved={handleSaved} />
          </div>
        )}

        {/* Tools */}
        <section>
          <SectionHeader title="Tools" description="Warm up, check your tuning, lock in a tempo." />
          <div className="grid gap-6 lg:grid-cols-2">
            <Metronome bpm={bpm} setBpm={setBpm} timeSignature={timeSignature} setTimeSignature={setTimeSignature} />
            <Tuner />
          </div>
        </section>

        {/* Exercise library */}
        <section>
          <SectionHeader title="Exercises" description="Pick one: one bar count-in, record, and get your measured scores." />
          <div className="mb-6 flex flex-wrap gap-2" role="radiogroup" aria-label="Filter by instrument">
            {instruments.map((id) => (
              <button key={id} type="button" role="radio" aria-checked={filter === id} onClick={() => setFilter(id)}
                className={cn('h-8 rounded px-3 text-body-sm', filter === id ? 'bg-white font-semibold text-obsidian' : 'bg-graphite text-fog hover:text-white')}>
                {id === 'ALL' ? 'All' : instrumentLabel(id)}
              </button>
            ))}
          </div>
          {exercises === null ? (
            <TileGrid>{Array.from({ length: 6 }, (_, i) => <TileItem key={i}><TrackCardSkeleton /></TileItem>)}</TileGrid>
          ) : visible.length ? (
            <TileGrid key={filter}>
              {visible.map((exercise) => (
                <TileItem key={exercise.id}>
                  <TrackCard title={exercise.title} image={exercise.coverImage} seed={`exercise-${exercise.id}`}
                    subtitle={`${exercise.instrument === 'ANY' ? 'Any instrument' : instrumentLabel(exercise.instrument)} · ${titleCase(exercise.difficulty)}`}
                    meta={`${exercise.bpm} BPM · ${exercise.timeSignature} · ${formatDuration(exercise.durationSeconds)} · ${exercise.xpReward} XP`}
                    onClick={() => setParams({ exercise: exercise.id })} />
                </TileItem>
              ))}
            </TileGrid>
          ) : (
            <EmptyState image={IMAGES.emptyStates.practice?.src} title="No exercises" body="The exercise library could not be loaded." />
          )}
        </section>

        {/* History */}
        <section>
          <SectionHeader title="Your practice" description="Every scored session, day by day." />
          <div className="bg-graphite p-4 shadow-subtle sm:p-6">
            {history === null ? <Skeleton className="h-28" /> : <PracticeHeatmap history={history} />}
          </div>
          {sessions.length > 0 ? (
            <ul className="mt-6 divide-y divide-graphite">
              {sessions.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-body-sm">
                  <span className="font-semibold text-white">{s.title}</span>
                  <span className="text-fog">
                    Intonation {s.intonationScore ?? '—'} · Rhythm {s.rhythmScore ?? '—'} · {s.xpEarned} XP · {formatDate(s.completedAt)}
                    {s.analysisId && <> · <Link to={`/ai-analysis/${s.analysisId}`} className="link">details</Link></>}
                  </span>
                </li>
              ))}
            </ul>
          ) : history !== null && (
            <p className="mt-4 text-body-sm text-fog">No scored sessions yet. Pick an exercise above to record your first.</p>
          )}
        </section>
      </div>

      <Modal open={Boolean(celebration)} onClose={() => setCelebration(null)} title={celebration?.title}
        image={selected?.coverImage ?? IMAGES.covers[0]?.src} imageAlt=""
        actions={<Button onClick={() => setCelebration(null)}>Keep practising</Button>}>
        {celebration?.body}
      </Modal>
    </PageShell>
  )
}

export default PracticeArenaPage
