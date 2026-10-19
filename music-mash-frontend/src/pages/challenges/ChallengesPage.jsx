import { useEffect, useState } from 'react'
import PageShell from '../../components/layout/PageShell'
import PageBanner from '../../components/layout/PageBanner'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import SectionHeader from '../../components/ui/SectionHeader'
import CoverImage from '../../components/ui/CoverImage'
import { TileGrid, TileItem } from '../../components/ui/TrackCard'
import { TrackCardSkeleton } from '../../components/ui/Skeleton'
import { IMAGES, coverFor } from '../../utils/images'
import { formatDate } from '../../utils/music'
import api from '../../services/api'

const timeLeft = (endDate) => {
  const hours = Math.round((new Date(endDate) - Date.now()) / 3600000)
  if (hours <= 0) return 'Ended'
  return hours < 48 ? `${hours} h left` : `${Math.round(hours / 24)} days left`
}

/**
 * Challenges are goals set by the platform. Completion and their XP rewards are not tracked
 * by the backend yet, so this page shows them as goals only and does not promise rewards.
 */
const ChallengesPage = () => {
  const [challenges, setChallenges] = useState(null)
  const [achievements, setAchievements] = useState(null)

  useEffect(() => {
    api.get('/challenges').then((r) => setChallenges(r.data)).catch(() => setChallenges([]))
    api.get('/achievements/user').then((r) => setAchievements(r.data)).catch(() => setAchievements([]))
  }, [])

  return (
    <PageShell>
      <PageBanner image={IMAGES.scenes.challenges} title="Challenges" description="Short goals to give your practice a target." />
      <div className="page space-y-16 py-10">
        <section>
          <SectionHeader title="Active challenges"
            description="Goals to aim for. Completion is not tracked automatically yet, so they don't award XP. XP comes from scored practice sessions." />
          {challenges === null ? (
            <TileGrid className="lg:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <TileItem key={i}><TrackCardSkeleton /></TileItem>)}</TileGrid>
          ) : challenges.length ? (
            <TileGrid className="lg:grid-cols-3">
              {challenges.map((c) => {
                const cover = coverFor(c.title)
                return (
                  <TileItem key={c.id}>
                    <article className="grid gap-4 sm:grid-cols-[120px_1fr] lg:grid-cols-1">
                      <CoverImage src={cover?.src} alt={cover?.alt ?? c.title} seed={`challenge-${c.id}`} />
                      <div>
                        <Badge tone="muted">{timeLeft(c.endDate)}</Badge>
                        <h3 className="mt-2 text-body-sm font-semibold text-white">{c.title}</h3>
                        <p className="mt-1 text-body-sm text-fog">{c.description}</p>
                        {c.rules && <p className="mt-2 text-caption text-fog">How: {c.rules}</p>}
                        <p className="mt-1 text-caption text-fog">Until {formatDate(c.endDate)}</p>
                      </div>
                    </article>
                  </TileItem>
                )
              })}
            </TileGrid>
          ) : (
            <EmptyState image={IMAGES.emptyStates.generic?.src} title="No challenges right now" body="New goals appear here." />
          )}
          <Button to="/practice" className="mt-8">Go to the Practice Arena</Button>
        </section>

        <section>
          <SectionHeader title="Your achievements" />
          {achievements === null ? null : achievements.length ? (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {achievements.map((a) => (
                <li key={a.id} className="bg-graphite p-4 shadow-subtle">
                  <p className="text-body-sm font-semibold text-white">{a.title ?? a.name}</p>
                  {a.description && <p className="mt-1 text-body-sm text-fog">{a.description}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState compact image={IMAGES.emptyStates.practice?.src} title="No achievements yet"
              body="Practice streaks and milestones show up here." />
          )}
        </section>
      </div>
    </PageShell>
  )
}

export default ChallengesPage
