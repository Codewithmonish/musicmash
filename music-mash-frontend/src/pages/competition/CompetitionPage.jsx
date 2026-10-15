import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FiPlus } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import PageShell from '../../components/layout/PageShell'
import PageBanner from '../../components/layout/PageBanner'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import EmptyState from '../../components/ui/EmptyState'
import CoverImage from '../../components/ui/CoverImage'
import { TileGrid, TileItem } from '../../components/ui/TrackCard'
import { TrackCardSkeleton } from '../../components/ui/Skeleton'
import { notify } from '../../components/ui/Toast'
import { IMAGES, genreImage } from '../../utils/images'
import { GENRES, formatDate, genreLabel } from '../../utils/music'
import { cn } from '../../utils/cn'
import api from '../../services/api'

const daysLeft = (endDate) => Math.ceil((new Date(endDate) - Date.now()) / 86400000)

const CompetitionCard = ({ competition, joined, onJoin }) => {
  const image = genreImage(competition.category)
  const left = daysLeft(competition.endDate)
  const full = competition.currentParticipants >= competition.maxParticipants
  return (
    <article className="flex h-full flex-col gap-4">
      <div className="relative">
        <CoverImage src={image?.src} alt={image?.alt ?? competition.title} seed={`competition-${competition.id}`} />
        <div className="absolute left-3 top-3"><Badge tone="light" dot={competition.status === 'OPEN' ? 'live' : undefined}>{competition.status === 'OPEN' ? 'Open' : competition.status.toLowerCase()}</Badge></div>
      </div>
      <div className="flex flex-1 flex-col">
        <h3 className="text-body-sm font-semibold text-white">{competition.title}</h3>
        <p className="text-body-sm text-fog">{genreLabel(competition.category)} · hosted by {competition.host?.username}</p>
        <p className="mt-1 text-caption text-fog">
          {competition.currentParticipants}/{competition.maxParticipants} entrants · {left > 0 ? `${left} days left` : `ended ${formatDate(competition.endDate)}`}
        </p>
        {competition.prize && <p className="mt-1 text-caption text-fog">Prize: {competition.prize}</p>}
        <div className="mt-3">
          {joined ? <Badge dot="good">Registered</Badge> : (
            <Button size="sm" onClick={() => onJoin(competition)} disabled={full || left <= 0}>{full ? 'Full' : 'Register'}</Button>
          )}
        </div>
      </div>
    </article>
  )
}

const CompetitionPage = () => {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const category = params.get('category') || 'ALL'
  const [competitions, setCompetitions] = useState(null)
  const [joined, setJoined] = useState(new Set())
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', category: 'CLASSICAL', prize: '', maxParticipants: 50 })
  const canHost = ['HOST', 'ADMIN'].includes(user?.role)

  const load = async () => {
    try {
      const { data } = await api.get('/competitions')
      setCompetitions(data)
      // Registration status comes from each competition's participant list.
      const lists = await Promise.allSettled(data.map((c) => api.get(`/competitions/${c.id}/participants`)))
      setJoined(new Set(data.filter((c, i) => lists[i].status === 'fulfilled'
        && lists[i].value.data.some((p) => p.user?.id === user?.id)).map((c) => c.id)))
    } catch {
      setCompetitions([])
    }
  }
  useEffect(() => { if (user) load() }, [user])

  const join = async (competition) => {
    try {
      await api.post(`/competitions/${competition.id}/register`)
      notify({ title: 'You are in', body: competition.title, image: genreImage(competition.category)?.src })
      load()
    } catch (e) {
      notify.error('Could not register', e.response?.data?.message || 'Please try again.')
    }
  }

  const create = async (event) => {
    event.preventDefault()
    try {
      await api.post('/competitions', { ...form, maxParticipants: Number(form.maxParticipants), instrument: 'ALL' })
      setCreating(false)
      setForm({ title: '', description: '', category: 'CLASSICAL', prize: '', maxParticipants: 50 })
      notify.success('Competition created', 'It is open for 30 days.')
      load()
    } catch {
      notify.error('Could not create the competition')
    }
  }

  const categories = ['ALL', ...new Set((competitions ?? []).map((c) => c.category))]
  const visible = (competitions ?? []).filter((c) => category === 'ALL' || c.category === category)

  return (
    <PageShell>
      <PageBanner image={IMAGES.scenes.competitions} title="Competitions" description="Enter with a recorded take; judges score every entry.">
        {canHost && <Button icon={FiPlus} onClick={() => setCreating(true)}>New competition</Button>}
      </PageBanner>

      <div className="page py-10">
        {competitions?.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2" role="radiogroup" aria-label="Filter by style">
            {categories.map((id) => (
              <button key={id} type="button" role="radio" aria-checked={category === id}
                onClick={() => setParams(id === 'ALL' ? {} : { category: id })}
                className={cn('h-8 rounded px-3 text-body-sm', category === id ? 'bg-white font-semibold text-obsidian' : 'bg-graphite text-fog hover:text-white')}>
                {id === 'ALL' ? 'All' : genreLabel(id)}
              </button>
            ))}
          </div>
        )}

        {competitions === null ? (
          <TileGrid className="lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <TileItem key={i}><TrackCardSkeleton /></TileItem>)}</TileGrid>
        ) : visible.length ? (
          <TileGrid className="lg:grid-cols-4">
            {visible.map((c) => <TileItem key={c.id}><CompetitionCard competition={c} joined={joined.has(c.id)} onJoin={join} /></TileItem>)}
          </TileGrid>
        ) : (
          <EmptyState image={IMAGES.emptyStates.competitions?.src}
            title={competitions.length ? `No ${genreLabel(category)} competitions right now` : 'No competitions yet'}
            body={competitions.length ? 'Try another style, or check back soon.' : 'When a host opens a competition it appears here.'}
            action={competitions.length ? { label: 'Show all', onClick: () => setParams({}) } : { label: 'Practise meanwhile', to: '/practice' }} />
        )}
      </div>

      <Modal open={creating} onClose={() => setCreating(false)} title="New competition">
        <form onSubmit={create} className="space-y-4">
          <Input label="Title" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <Input as="textarea" rows={3} label="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <label className="flex flex-col gap-2">
            <span className="text-body-sm font-semibold text-white">Style</span>
            <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="rounded bg-obsidian px-4 py-3 text-body-sm text-white">
              {GENRES.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
            </select>
          </label>
          <Input label="Prize" value={form.prize} onChange={(e) => setForm((f) => ({ ...f, prize: e.target.value }))} />
          <Input label="Maximum entrants" type="number" min={2} max={1000} value={form.maxParticipants}
            onChange={(e) => setForm((f) => ({ ...f, maxParticipants: e.target.value }))} />
          <Button type="submit" disabled={!form.title.trim()}>Create</Button>
        </form>
      </Modal>
    </PageShell>
  )
}

export default CompetitionPage
