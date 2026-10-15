import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiArrowRight, FiPlay } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import PageShell from '../../components/layout/PageShell'
import Button from '../../components/ui/Button'
import Stat from '../../components/ui/Stat'
import Badge from '../../components/ui/Badge'
import SectionHeader from '../../components/ui/SectionHeader'
import EmptyState from '../../components/ui/EmptyState'
import Skeleton, { TrackCardSkeleton } from '../../components/ui/Skeleton'
import TrackCard, { TileGrid, TileItem } from '../../components/ui/TrackCard'
import CoverImage from '../../components/ui/CoverImage'
import { IMAGES } from '../../utils/images'
import { formatDate, instrumentLabel, titleCase } from '../../utils/music'
import api from '../../services/api'

const XP_PER_LEVEL = 250   // same rule as UserStats.addXp on the server

const greeting = () => {
  const hour = new Date().getHours()
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
}

const score = (value) => (value == null ? <span className="text-fog">—</span> : Math.round(value))

const DashboardPage = () => {
  const { user } = useAuth()
  const [data, setData] = useState(null)

  useEffect(() => {
    const load = async () => {
      const [profile, stats, performances, sessions] = await Promise.allSettled([
        api.get('/profile/me'), api.get('/practice/stats'), api.get('/performances'), api.get('/practice/sessions'),
      ])
      const value = (r, fallback) => (r.status === 'fulfilled' ? r.value.data : fallback)
      const profileData = value(profile, null)
      const exercises = await api.get('/practice/exercises', { params: { instrument: profileData?.primaryInstrument || undefined } })
        .then((r) => r.data).catch(() => [])
      setData({ profile: profileData, stats: value(stats, null), performances: value(performances, []),
        sessions: value(sessions, []), exercises })
    }
    load()
  }, [])

  const name = data?.profile?.displayName || user?.username || ''
  const stats = data?.stats
  const lastSession = data?.sessions?.[0]
  const continueExercise = data && (data.exercises.find((e) => e.id === lastSession?.exerciseId) ?? data.exercises[0])
  const xpIntoLevel = stats ? stats.totalXp % XP_PER_LEVEL : 0
  const banner = IMAGES.scenes.dashboard

  return (
    <PageShell>
      {/* Banner + greeting */}
      <section className="relative h-56 overflow-hidden sm:h-72">
        <img src={banner?.src} alt={banner?.alt ?? ''} width="1600" height="700" className="absolute inset-0 h-full w-full object-cover" />
        <div className="hero-scrim absolute inset-0" aria-hidden="true" />
        <div className="page relative flex h-full flex-col justify-end pb-8">
          <p className="text-body-sm text-fog">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1 className="mt-1 text-heading font-thin text-white">{greeting()}{name && `, ${name}`}</h1>
        </div>
      </section>

      <div className="page space-y-16 py-10">
        {/* Real stats */}
        <section aria-label="Your practice">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats ? (
              <>
                <Stat label="Practice streak" value={stats.streak} unit={stats.streak === 1 ? 'day' : 'days'}
                  hint={stats.lastPracticeDate ? `Last practised ${formatDate(stats.lastPracticeDate)}` : 'No sessions yet'} />
                <Stat label={`Level ${stats.level}`} value={stats.totalXp} unit="XP"
                  hint={`${XP_PER_LEVEL - xpIntoLevel} XP to level ${stats.level + 1}`} />
                <Stat label="Time practised" value={stats.totalPracticeMinutes} unit="min" />
                <Stat label="Sessions scored" value={stats.exercisesCompleted} />
              </>
            ) : Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[104px]" />)}
          </div>
          {stats && (
            <div className="mt-4 h-1 w-full bg-graphite" role="progressbar" aria-label={`Level ${stats.level} progress`}
              aria-valuemin={0} aria-valuemax={XP_PER_LEVEL} aria-valuenow={xpIntoLevel}>
              <div className="h-full bg-white transition-all duration-700" style={{ width: `${(xpIntoLevel / XP_PER_LEVEL) * 100}%` }} />
            </div>
          )}
        </section>

        {/* Continue practising */}
        <section>
          <SectionHeader title={lastSession ? 'Continue practising' : 'Start practising'}
            description={lastSession ? `You last practised ${lastSession.title}.` : 'Pick up an exercise for your instrument.'}
            action={{ label: 'All exercises', to: '/practice' }} />
          {!data ? <Skeleton className="h-40" /> : continueExercise ? (
            <div className="grid gap-6 bg-graphite p-4 shadow-subtle sm:grid-cols-[180px_1fr] sm:items-center">
              <CoverImage src={continueExercise.coverImage} alt={continueExercise.title} seed={`exercise-${continueExercise.id}`} />
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge>{titleCase(continueExercise.difficulty)}</Badge>
                  <Badge tone="muted">{instrumentLabel(continueExercise.instrument === 'ANY' ? 'Any instrument' : continueExercise.instrument)}</Badge>
                  <Badge tone="muted">{continueExercise.bpm} BPM · {continueExercise.timeSignature}</Badge>
                </div>
                <h3 className="mt-3 text-subheading font-semibold text-white">{continueExercise.title}</h3>
                <p className="mt-1 max-w-xl text-body-sm text-fog">{continueExercise.description}</p>
                <Button to={`/practice?exercise=${continueExercise.id}`} icon={FiPlay} className="mt-4">
                  {lastSession ? 'Practise again' : 'Start'}
                </Button>
              </div>
            </div>
          ) : (
            <EmptyState image={IMAGES.emptyStates.practice?.src} imageAlt="" title="No exercises available"
              body="The exercise library could not be loaded." compact />
          )}
        </section>

        {/* Latest measured scores */}
        <section>
          <SectionHeader title="Latest scores" description="Measured from your recorded practice attempts." />
          {!data ? <Skeleton className="h-40" /> : data.sessions.length ? (
            <div className="overflow-x-auto scroll-quiet">
              <table className="w-full min-w-[560px] text-left text-body-sm">
                <thead className="text-caption text-fog">
                  <tr className="border-b border-graphite">
                    <th className="py-2 pr-4 font-normal">Exercise</th>
                    <th className="py-2 pr-4 font-normal">Intonation</th>
                    <th className="py-2 pr-4 font-normal">Rhythm</th>
                    <th className="py-2 pr-4 font-normal">XP</th>
                    <th className="py-2 pr-4 font-normal">Date</th>
                    <th className="py-2 font-normal"><span className="sr-only">Analysis</span></th>
                  </tr>
                </thead>
                <tbody>
                  {data.sessions.slice(0, 5).map((s) => (
                    <tr key={s.id} className="border-b border-graphite">
                      <td className="py-3 pr-4 font-semibold text-white">{s.title}</td>
                      <td className="py-3 pr-4">{score(s.intonationScore)}</td>
                      <td className="py-3 pr-4">{score(s.rhythmScore)}</td>
                      <td className="py-3 pr-4">{s.xpEarned}</td>
                      <td className="py-3 pr-4 text-fog">{formatDate(s.completedAt)}</td>
                      <td className="py-3 text-right">
                        {s.analysisId && <Link to={`/ai-analysis/${s.analysisId}`} className="link">Details</Link>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState image={IMAGES.emptyStates.analysis?.src} imageAlt="" compact title="No scores yet"
              body="Record an attempt in the Practice Arena and your measured intonation and rhythm appear here."
              action={{ label: 'Open the Practice Arena', to: '/practice' }} />
          )}
        </section>

        {/* Recent performances */}
        <section>
          <SectionHeader title="Your performances" action={{ label: 'Upload a new one', to: '/upload' }} />
          {!data ? (
            <TileGrid>{Array.from({ length: 6 }, (_, i) => <TileItem key={i}><TrackCardSkeleton /></TileItem>)}</TileGrid>
          ) : data.performances.length ? (
            <TileGrid>
              {data.performances.slice(0, 12).map((p) => (
                <TileItem key={p.id}>
                  <TrackCard title={p.title} image={p.thumbnailUrl} seed={`performance-${p.id}`}
                    subtitle={`${instrumentLabel(p.instrument)} · ${titleCase(p.status)}`} meta={formatDate(p.submittedAt)} />
                </TileItem>
              ))}
            </TileGrid>
          ) : (
            <EmptyState image={IMAGES.emptyStates.performances?.src} imageAlt=""
              title="No performances yet" body="Record or upload a take and it appears here."
              action={{ label: 'Open the studio', to: '/upload' }} />
          )}
          {data?.performances?.length > 12 && (
            <Link to="/profile" className="link mt-6 inline-flex items-center gap-1">All performances <FiArrowRight /></Link>
          )}
        </section>
      </div>
    </PageShell>
  )
}

export default DashboardPage
