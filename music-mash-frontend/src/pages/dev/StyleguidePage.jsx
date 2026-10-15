import { useState } from 'react'
import { FiSearch, FiUpload, FiArrowRight } from 'react-icons/fi'
import PageShell from '../../components/layout/PageShell'
import PromoBanner from '../../components/layout/PromoBanner'
import Wordmark from '../../components/brand/Wordmark'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import TrackCard, { TileGrid, TileItem } from '../../components/ui/TrackCard'
import SectionHeader from '../../components/ui/SectionHeader'
import Modal from '../../components/ui/Modal'
import { notify } from '../../components/ui/Toast'
import Skeleton, { TrackCardSkeleton } from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'
import EqualizerBars from '../../components/ui/EqualizerBars'
import ProgressRing from '../../components/ui/ProgressRing'
import GeneratedCover from '../../components/ui/GeneratedCover'
import Avatar from '../../components/ui/Avatar'
import { IMAGES } from '../../utils/images'

// Dev-only gallery of every token and component (route /styleguide, not in production builds).

const COLORS = [
  ['obsidian', '#121212', 'Page background'], ['graphite', '#303030', 'Inputs, panels'],
  ['mid-gray', '#666666', 'Hover tier, dividers'], ['fog', '#999999', 'Muted text'],
  ['silver', '#cccccc', 'Hairlines on light'], ['bone', '#f2f2f2', 'Light band'],
  ['white', '#ffffff', 'Text, primary buttons'], ['signal', '#699fff', 'Links, live dot'],
]
const STATUS = [['status-good', '#0ca30c'], ['status-warning', '#fab219'], ['status-critical', '#d03b3b']]
const TYPE = [
  ['display', '60 / 1.00 · 100', 'text-display font-thin'], ['heading', '36 / 1.33 · 100', 'text-heading font-thin'],
  ['heading-sm', '28 / 1.29 · 600', 'text-heading-sm font-semibold'], ['subheading', '22 / 1.27 · 600', 'text-subheading font-semibold'],
  ['body', '17 / 1.41 · 400', 'text-body'], ['body-sm', '14 / 1.43 · 400', 'text-body-sm'], ['caption', '12 / 1.41 · 400', 'text-caption'],
]

const Block = ({ title, children }) => (
  <section className="border-t border-graphite py-12">
    <h2 className="mb-6 text-caption font-semibold uppercase tracking-widest text-fog">{title}</h2>
    {children}
  </section>
)

const StyleguidePage = () => {
  const [modalOpen, setModalOpen] = useState(false)
  const tiles = IMAGES.covers.slice(0, 6)
  return (
    <PageShell banner={<PromoBanner linkTo="/styleguide" linkLabel="Link">Promo banner with the live dot.</PromoBanner>}>
      <div className="page py-12">
        <h1 className="text-display font-thin">Styleguide</h1>
        <p className="mt-4 text-body text-fog">Every MusicMash token and component. Dev builds only.</p>

        <Block title="Brand">
          <Wordmark />
        </Block>

        <Block title="Colour">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {COLORS.map(([name, hex, role]) => (
              <div key={name}>
                <div className="h-16 rounded shadow-[inset_0_0_0_1px_#303030]" style={{ background: hex }} />
                <p className="mt-2 text-body-sm font-semibold">{name}</p>
                <p className="text-caption text-fog">{hex} · {role}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-body-sm text-fog">Status colours: data only (chart bands, problem sections), always with a label.</p>
          <div className="mt-3 flex gap-4">
            {STATUS.map(([name, hex]) => <Badge key={name} dot={name.split('-')[1]}>{name} {hex}</Badge>)}
          </div>
        </Block>

        <Block title="Type (Inter as the Söhne substitute)">
          <div className="space-y-4">
            {TYPE.map(([name, spec, cls]) => (
              <div key={name} className="grid gap-2 sm:grid-cols-[160px_1fr] sm:items-baseline">
                <span className="text-caption text-fog">{name} · {spec}</span>
                <span className={`${cls} truncate`}>See your pitch. Fix your timing.</span>
              </div>
            ))}
          </div>
        </Block>

        <Block title="Buttons">
          <div className="flex flex-wrap items-center gap-4">
            <Button>Get started</Button>
            <Button icon={FiUpload}>Upload your own</Button>
            <Button variant="subtle">Secondary</Button>
            <Button variant="ghost">Sign in</Button>
            <Button size="sm">Small</Button>
            <Button size="lg" iconRight={FiArrowRight}>Large</Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className="on-light mt-6 flex flex-wrap gap-4 bg-bone p-6">
            <Button variant="inverse">On the light band</Button>
          </div>
        </Block>

        <Block title="Inputs">
          <div className="grid max-w-xl gap-4">
            <Input placeholder="Search for musicians, performances, genres" icon={FiSearch} aria-label="Search" />
            <Input label="Email" type="email" placeholder="you@example.com" hint="We never share it." />
            <Input label="Password" type="password" error="At least 6 characters." defaultValue="abc" />
          </div>
        </Block>

        <Block title="Badges and cards">
          <div className="flex flex-wrap gap-3">
            <Badge>Intermediate</Badge><Badge tone="muted">120 BPM</Badge><Badge tone="light">New</Badge><Badge dot="live">Live</Badge>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Card>Panel card: Graphite, inset hairline, 16px padding.</Card>
            <Card variant="bare" className="text-fog">Bare card: no background at all.</Card>
          </div>
        </Block>

        <Block title="Track cards">
          <SectionHeader title="Trending on MusicMash" description="1:1 art, 16px gap, 6 → 3 → 2 columns." action={{ label: 'See all', to: '/styleguide' }} />
          <TileGrid>
            {tiles.map((cover, i) => (
              <TileItem key={cover.src}><TrackCard title={`Performance ${i + 1}`} subtitle="demo_player" image={cover.src} alt={cover.alt} to="/styleguide" /></TileItem>
            ))}
          </TileGrid>
          <p className="mt-8 mb-4 text-body-sm text-fog">Generated fallback covers (no thumbnail):</p>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
            {[1, 2, 3, 4, 5, 6].map((id) => <GeneratedCover key={id} seed={`performance-${id}`} className="aspect-square w-full rounded" />)}
          </div>
        </Block>

        <Block title="Loading, empty, progress">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-6">{[1, 2, 3].map((i) => <TrackCardSkeleton key={i} />)}</div>
          <Skeleton className="mt-6 h-10 max-w-md" />
          <div className="mt-8 flex flex-wrap items-center gap-10">
            <ProgressRing progress={72} label="72" sublabel="Intonation" />
            <EqualizerBars count={5} label="Processing" />
            <Avatar name="MusicMash" />
            <Avatar name="Ada" className="h-20 w-20" textClassName="text-heading font-thin" />
          </div>
          <EmptyState className="mt-8" image={IMAGES.emptyStates.performances?.src} imageAlt={IMAGES.emptyStates.performances?.alt}
            title="No performances yet" body="Record or upload a take and it shows up here with its measured scores."
            action={{ label: 'Open the studio', to: '/upload' }} />
        </Block>

        <Block title="Modal and toasts">
          <div className="flex flex-wrap gap-4">
            <Button onClick={() => setModalOpen(true)}>Open modal</Button>
            <Button variant="subtle" onClick={() => notify({ title: '7-day streak', body: 'You practised every day this week.', image: IMAGES.covers[0]?.src })}>Achievement toast</Button>
            <Button variant="subtle" onClick={() => notify.error('Upload failed', 'The file is not a WAV or MP3.')}>Error toast</Button>
          </div>
          <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Achievement unlocked"
            image={IMAGES.covers[1]?.src} imageAlt={IMAGES.covers[1]?.alt}
            actions={<><Button onClick={() => setModalOpen(false)}>Keep practising</Button><Button variant="ghost" onClick={() => setModalOpen(false)}>Close</Button></>}>
            Your first session with an intonation score above 80.
          </Modal>
        </Block>
      </div>
    </PageShell>
  )
}

export default StyleguidePage
