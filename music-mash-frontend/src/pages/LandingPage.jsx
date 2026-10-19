import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { FiSearch, FiUpload, FiArrowRight } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import PageShell from '../components/layout/PageShell'
import PromoBanner from '../components/layout/PromoBanner'
import HeroCarousel from '../components/landing/HeroCarousel'
import DeviceMockup from '../components/landing/DeviceMockup'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import SectionHeader from '../components/ui/SectionHeader'
import TrackCard, { TileGrid, TileItem } from '../components/ui/TrackCard'
import { TrackCardSkeleton } from '../components/ui/Skeleton'
import { IMAGES } from '../utils/images'
import api from '../services/api'

const GENRES = [
  ['hiphop', 'Hip-hop', 'HIP_HOP'], ['jazz', 'Jazz', 'JAZZ'], ['classical', 'Classical', 'CLASSICAL'],
  ['rock', 'Rock', 'ROCK'], ['pop', 'Pop', 'POP'], ['electronic', 'Electronic', 'ELECTRONIC'],
  ['folk', 'Folk', 'FOLK'], ['rnb', 'R&B', 'R_AND_B'],
]
const titleCase = (value) => String(value || '').toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

const GenreTile = ({ slug, label, category }) => {
  const image = IMAGES.genres[slug]
  return (
    <Link to={`/competitions?category=${category}`}
      className="group relative block aspect-square overflow-hidden rounded bg-graphite">
      <img src={image?.src} alt={image?.alt ?? ''} width="600" height="600" loading="lazy"
        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]" />
      <span className="tile-scrim absolute inset-0" aria-hidden="true" />
      <span className="absolute bottom-3 left-3 text-body font-semibold text-white">{label}</span>
    </Link>
  )
}

/** Public home page: hero, search, latest approved performances, genres, product band. */
const LandingPage = () => {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const query = params.get('q') || ''
  const [search, setSearch] = useState(query)
  const [performances, setPerformances] = useState(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    setPerformances(null)
    setLoadError(false)
    api.get('/public/performances/latest', { params: { limit: 12, q: query || undefined } })
      .then((response) => setPerformances(response.data))
      .catch(() => {
        setPerformances([])
        setLoadError(true)
      })
  }, [query])

  const submitSearch = (event) => {
    event.preventDefault()
    setParams(search.trim() ? { q: search.trim() } : {})
    document.getElementById('trending')?.scrollIntoView({ behavior: 'smooth' })
  }

  const startTo = isAuthenticated ? '/dashboard' : '/register'
  const hasPerformances = performances && performances.length > 0

  return (
    <PageShell hero banner={
      <PromoBanner linkTo={startTo} linkLabel="Try it">New: compare your take with the original recording, section by section.</PromoBanner>
    }>
      <HeroCarousel ctaTo={startTo} />

      {/* Search + upload */}
      <section className="page py-12">
        <form onSubmit={submitSearch} role="search"
          className="mx-auto flex max-w-3xl flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <Input
            className="flex-1"
            icon={FiSearch}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search performances or musicians"
            aria-label="Search performances or musicians"
          />
          <span className="text-center text-body-sm text-fog">or</span>
          <Button icon={FiUpload} onClick={() => navigate('/upload')} size="lg">Upload your own</Button>
        </form>
      </section>

      {/* Trending: latest approved performances from the API */}
      <section id="trending" className="page scroll-mt-20 pb-16">
        <SectionHeader align="center"
          title={query ? `Performances matching “${query}”` : 'Trending on MusicMash'}
          description={query ? undefined : 'The latest performances approved by our judges.'} />

        {performances === null ? (
          <TileGrid>{Array.from({ length: 6 }, (_, i) => <TileItem key={i}><TrackCardSkeleton /></TileItem>)}</TileGrid>
        ) : hasPerformances ? (
          <TileGrid>
            {performances.map((p, i) => (
              <TileItem key={p.id}>
                <TrackCard title={p.title} subtitle={`${p.username} · ${titleCase(p.instrument)}`}
                  image={p.thumbnailUrl} seed={`performance-${p.id}`} eager={i < 6} />
              </TileItem>
            ))}
          </TileGrid>
        ) : (
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-body-sm text-fog">
              {loadError ? 'Performances could not be loaded right now.'
                : query ? 'No approved performances match that search yet.'
                  : 'No performances have been approved yet. Yours could be the first.'}
            </p>
          </div>
        )}

        <div className="mt-10 flex justify-center">
          <Button to="/competitions" iconRight={FiArrowRight}>Explore competitions</Button>
        </div>
      </section>

      {/* Explore by genre */}
      <section className="page pb-24">
        <SectionHeader title="Explore by genre" description="Find competitions in the styles you play." />
        <TileGrid className="lg:grid-cols-4">
          {GENRES.map(([slug, label, category]) => (
            <TileItem key={slug}><GenreTile slug={slug} label={label} category={category} /></TileItem>
          ))}
        </TileGrid>
      </section>

      {/* Light band: the product */}
      <section className="on-light bg-bone py-16 sm:py-24">
        <div className="page grid items-center gap-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <DeviceMockup />
          <div>
            <h2 className="text-heading font-thin text-obsidian">See your pitch.<br />Fix your timing.</h2>
            <p className="mt-4 max-w-md text-body text-obsidian">
              Every take is measured: how close each note is to pitch, in cents, and how close each
              note lands to the beat, in milliseconds. No made-up scores. Just what you played.
            </p>
            <ul className="mt-6 space-y-2 text-body-sm text-obsidian">
              <li>Pitch curve with every note named</li>
              <li>Timing against a steady beat grid</li>
              <li>Comparison with an original recording</li>
            </ul>
            <Button to={startTo} variant="inverse" size="lg" className="mt-8">Try it free</Button>
          </div>
        </div>
      </section>
    </PageShell>
  )
}

export default LandingPage
