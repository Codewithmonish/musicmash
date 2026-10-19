import { useEffect, useState } from 'react'
import PageShell from '../../components/layout/PageShell'
import PageBanner from '../../components/layout/PageBanner'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import SectionHeader from '../../components/ui/SectionHeader'
import Avatar from '../../components/ui/Avatar'
import Skeleton from '../../components/ui/Skeleton'
import { TileGrid, TileItem } from '../../components/ui/TrackCard'
import { notify } from '../../components/ui/Toast'
import { IMAGES } from '../../utils/images'
import { formatDate, titleCase } from '../../utils/music'
import { cn } from '../../utils/cn'
import api from '../../services/api'

/** A musician tile: flat initial avatar, name, follower count and a follow toggle. */
const MusicianCard = ({ musician, onToggle, busy }) => (
  <article className="flex flex-col gap-3">
    <Avatar name={musician.username} className="aspect-square h-auto w-full" textClassName="text-display font-thin" />
    <div>
      <p className="truncate text-body-sm font-semibold text-white">{musician.username}</p>
      <p className="text-body-sm text-fog">
        {musician.followersCount} {musician.followersCount === 1 ? 'follower' : 'followers'}
        {musician.role !== 'USER' && ` · ${titleCase(musician.role)}`}
      </p>
    </div>
    <Button size="sm" variant={musician.isFollowing ? 'subtle' : 'primary'} onClick={() => onToggle(musician)} disabled={busy}>
      {musician.isFollowing ? 'Following' : 'Follow'}
    </Button>
  </article>
)

const SocialPage = () => {
  const [musicians, setMusicians] = useState(null)
  const [notifications, setNotifications] = useState(null)
  const [busy, setBusy] = useState(null)

  useEffect(() => {
    api.get('/social/discover').then((r) => setMusicians(r.data)).catch(() => setMusicians([]))
    api.get('/notifications').then((r) => setNotifications(r.data)).catch(() => setNotifications([]))
  }, [])

  const toggleFollow = async (musician) => {
    setBusy(musician.id)
    try {
      if (musician.isFollowing) await api.delete(`/social/unfollow/${musician.id}`)
      else await api.post(`/social/follow/${musician.id}`)
      setMusicians((list) => list.map((m) => (m.id === musician.id
        ? { ...m, isFollowing: !m.isFollowing, followersCount: m.followersCount + (m.isFollowing ? -1 : 1) } : m)))
    } catch {
      notify.error('That did not work', 'Please try again.')
    } finally {
      setBusy(null)
    }
  }

  const markRead = async (id) => {
    await api.put(`/notifications/${id}/read`).catch(() => {})
    setNotifications((list) => list.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
  }

  return (
    <PageShell>
      <PageBanner image={IMAGES.scenes.social} title="Community" description="Find musicians to follow and keep up with what is new." />
      <div className="page space-y-16 py-10">
        <section>
          <SectionHeader title="Discover musicians" />
          {musicians === null ? (
            <TileGrid>{Array.from({ length: 6 }, (_, i) => <TileItem key={i}><Skeleton className="aspect-square" /></TileItem>)}</TileGrid>
          ) : musicians.length ? (
            <TileGrid>
              {musicians.map((m) => <TileItem key={m.id}><MusicianCard musician={m} onToggle={toggleFollow} busy={busy === m.id} /></TileItem>)}
            </TileGrid>
          ) : (
            <EmptyState image={IMAGES.emptyStates.social?.src} title="No other musicians yet" body="As people join, they show up here." />
          )}
        </section>

        <section>
          <SectionHeader title="Notifications" />
          {notifications === null ? <Skeleton className="h-20" /> : notifications.length ? (
            <ul className="divide-y divide-graphite">
              {notifications.map((n) => (
                <li key={n.id} className={cn('flex flex-wrap items-start justify-between gap-3 py-4', n.isRead && 'opacity-60')}>
                  <div>
                    <p className="flex items-center gap-2 text-body-sm font-semibold text-white">
                      {!n.isRead && <span className="h-2 w-2 rounded-full bg-signal" aria-label="Unread" />}{n.title}
                      {n.type && <Badge tone="muted">{titleCase(n.type)}</Badge>}
                    </p>
                    <p className="mt-1 text-body-sm text-fog">{n.message}</p>
                    <p className="mt-1 text-caption text-fog">{formatDate(n.createdAt)}</p>
                  </div>
                  {!n.isRead && <Button size="sm" variant="ghost" onClick={() => markRead(n.id)}>Mark as read</Button>}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState compact image={IMAGES.emptyStates.social?.src} title="No notifications" body="Streak milestones and community news appear here." />
          )}
        </section>
      </div>
    </PageShell>
  )
}

export default SocialPage
