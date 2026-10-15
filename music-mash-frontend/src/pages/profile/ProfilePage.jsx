import { useEffect, useState } from 'react'
import { FiEdit2 } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import PageShell from '../../components/layout/PageShell'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Stat from '../../components/ui/Stat'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import EmptyState from '../../components/ui/EmptyState'
import SectionHeader from '../../components/ui/SectionHeader'
import Avatar from '../../components/ui/Avatar'
import Skeleton, { TrackCardSkeleton } from '../../components/ui/Skeleton'
import TrackCard, { TileGrid, TileItem } from '../../components/ui/TrackCard'
import { notify } from '../../components/ui/Toast'
import { IMAGES } from '../../utils/images'
import { EXPERIENCE_LEVELS, GENRES, INSTRUMENTS, formatDate, genreLabel, instrumentLabel, titleCase } from '../../utils/music'
import api from '../../services/api'

const ProfilePage = () => {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState(null)
  const [performances, setPerformances] = useState(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(null)

  useEffect(() => {
    api.get('/profile/me').then((r) => setProfile(r.data)).catch(() => setProfile({}))
    api.get('/practice/stats').then((r) => setStats(r.data)).catch(() => setStats(null))
    api.get('/performances').then((r) => setPerformances(r.data)).catch(() => setPerformances([]))
  }, [])

  const openEdit = () => {
    setForm({
      displayName: profile.displayName || '', bio: profile.bio || '', country: profile.country || '',
      experienceLevel: profile.experienceLevel || 'BEGINNER', primaryInstrument: profile.primaryInstrument || 'VOCALS',
      secondaryInstrument: profile.secondaryInstrument || '', musicGenres: profile.musicGenres || '',
    })
    setEditing(true)
  }

  const save = async (event) => {
    event.preventDefault()
    try {
      const { data } = await api.put('/profile', { ...form, secondaryInstrument: form.secondaryInstrument || null })
      setProfile(data)
      setEditing(false)
      notify.success('Profile saved')
    } catch {
      notify.error('Your profile could not be saved')
    }
  }

  const genres = (profile?.musicGenres || '').split(',').filter(Boolean)
  const banner = IMAGES.scenes.profile
  const name = profile?.displayName || user?.username || ''

  return (
    <PageShell>
      <section className="relative h-40 overflow-hidden sm:h-52">
        <img src={banner?.src} alt={banner?.alt ?? ''} width="1600" height="700" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-obsidian/40" aria-hidden="true" />
      </section>

      <div className="page relative -mt-14 space-y-16 pb-10 sm:-mt-16">
        <section className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-5">
            <Avatar name={name} className="h-28 w-28 shadow-[0_0_0_4px_#121212] sm:h-32 sm:w-32" textClassName="text-display font-thin" />
            <div className="pb-1">
              {profile === null ? <Skeleton className="h-8 w-48" /> : <h1 className="text-heading-sm font-semibold text-white">{name}</h1>}
              <p className="text-body-sm text-fog">@{user?.username}{profile?.country && ` · ${profile.country}`}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {user?.role && user.role !== 'USER' && <Badge>{titleCase(user.role)}</Badge>}
                {profile?.experienceLevel && <Badge tone="muted">{titleCase(profile.experienceLevel)}</Badge>}
                {profile?.primaryInstrument && <Badge tone="muted">{instrumentLabel(profile.primaryInstrument)}</Badge>}
                {profile?.secondaryInstrument && <Badge tone="muted">{instrumentLabel(profile.secondaryInstrument)}</Badge>}
              </div>
            </div>
          </div>
          <Button variant="subtle" icon={FiEdit2} onClick={openEdit} disabled={!profile}>Edit profile</Button>
        </section>

        {(profile?.bio || genres.length > 0) && (
          <section className="grid gap-8 lg:grid-cols-2">
            {profile?.bio && <p className="max-w-xl text-body text-white">{profile.bio}</p>}
            {genres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {genres.map((g) => {
                  const slug = GENRES.find((x) => x.id === g)?.slug
                  return (
                    <span key={g} className="flex items-center gap-2 rounded bg-graphite p-1 pr-3 text-body-sm text-white">
                      {slug && <img src={IMAGES.genres[slug]?.src} alt="" width="32" height="32" className="h-8 w-8 rounded object-cover" />}
                      {genreLabel(g)}
                    </span>
                  )
                })}
              </div>
            )}
          </section>
        )}

        <section aria-label="Practice stats" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats ? (
            <>
              <Stat label="Level" value={stats.level} hint={`${stats.totalXp} XP`} />
              <Stat label="Practice streak" value={stats.streak} unit={stats.streak === 1 ? 'day' : 'days'} />
              <Stat label="Time practised" value={stats.totalPracticeMinutes} unit="min" />
              <Stat label="Sessions scored" value={stats.exercisesCompleted} />
            </>
          ) : Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[96px]" />)}
        </section>

        <section>
          <SectionHeader title="Performances" action={{ label: 'Upload a new one', to: '/upload' }} />
          {performances === null ? (
            <TileGrid>{Array.from({ length: 6 }, (_, i) => <TileItem key={i}><TrackCardSkeleton /></TileItem>)}</TileGrid>
          ) : performances.length ? (
            <TileGrid>
              {performances.map((p) => (
                <TileItem key={p.id}>
                  <TrackCard title={p.title} image={p.thumbnailUrl} seed={`performance-${p.id}`}
                    subtitle={`${instrumentLabel(p.instrument)} · ${titleCase(p.status)}`} meta={formatDate(p.submittedAt)} />
                </TileItem>
              ))}
            </TileGrid>
          ) : (
            <EmptyState image={IMAGES.emptyStates.performances?.src} title="No performances yet"
              body="Record or upload a take and it appears on your profile." action={{ label: 'Open the studio', to: '/upload' }} />
          )}
        </section>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title="Edit profile" className="max-w-lg">
        {form && (
          <form onSubmit={save} className="space-y-4">
            <Input label="Display name" value={form.displayName} maxLength={60} onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))} />
            <Input label="Country" value={form.country} maxLength={60} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} />
            {[['primaryInstrument', 'Main instrument', INSTRUMENTS.map((i) => [i.id, i.label])],
              ['secondaryInstrument', 'Second instrument', [['', 'None'], ...INSTRUMENTS.map((i) => [i.id, i.label])]],
              ['experienceLevel', 'Experience', EXPERIENCE_LEVELS.map((l) => [l.id, l.label])]].map(([key, label, options]) => (
              <label key={key} className="flex flex-col gap-2">
                <span className="text-body-sm font-semibold text-white">{label}</span>
                <select value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="rounded bg-obsidian px-4 py-3 text-body-sm text-white focus:bg-mid-gray focus:outline-none">
                  {options.map(([id, text]) => <option key={id} value={id}>{text}</option>)}
                </select>
              </label>
            ))}
            <Input as="textarea" rows={3} label="Bio" value={form.bio} maxLength={500} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} />
            <div className="flex gap-3"><Button type="submit">Save</Button><Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button></div>
          </form>
        )}
      </Modal>
    </PageShell>
  )
}

export default ProfilePage
