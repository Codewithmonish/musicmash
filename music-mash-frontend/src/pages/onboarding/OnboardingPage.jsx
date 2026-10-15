import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { FiCheck, FiArrowLeft, FiArrowRight } from 'react-icons/fi'
import PageShell from '../../components/layout/PageShell'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { notify } from '../../components/ui/Toast'
import { IMAGES } from '../../utils/images'
import { INSTRUMENTS, GENRES, EXPERIENCE_LEVELS } from '../../utils/music'
import { cn } from '../../utils/cn'
import api from '../../services/api'

const STEPS = ['Your instrument', 'Your styles', 'About you']

const SelectedMark = () => (
  <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded bg-white text-obsidian">
    <FiCheck aria-hidden="true" />
  </span>
)

/** Instrument photo tile: square image, label underneath; selected = white inset ring + check. */
const InstrumentTile = ({ instrument, role, hasSecond, onClick }) => {
  const image = IMAGES.instruments[instrument.id.toLowerCase()]
  return (
    <button type="button" onClick={onClick} aria-pressed={Boolean(role)}
      className="group flex flex-col gap-3 text-left">
      <span className={cn('relative block aspect-square w-full overflow-hidden rounded bg-graphite',
        role && 'shadow-[inset_0_0_0_3px_#ffffff]')}>
        <img src={image?.src} alt="" width="600" height="600" loading="lazy"
          className={cn('h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]',
            role && 'opacity-80')} />
        {role && <SelectedMark />}
      </span>
      <span className="text-body-sm font-semibold text-white">
        {instrument.label}
        {role === 'secondary' && <span className="font-normal text-fog"> · second</span>}
        {role === 'primary' && hasSecond && <span className="font-normal text-fog"> · main</span>}
      </span>
    </button>
  )
}

/** Genre photo chip: small square thumbnail + label in a Graphite pill-free 4px chip. */
const GenreChip = ({ genre, selected, onClick }) => {
  const image = IMAGES.genres[genre.slug]
  return (
    <button type="button" onClick={onClick} aria-pressed={selected}
      className={cn('flex items-center gap-3 rounded p-1.5 pr-4 transition-colors',
        selected ? 'bg-white text-obsidian' : 'bg-graphite text-white hover:bg-mid-gray')}>
      <img src={image?.src} alt="" width="48" height="48" loading="lazy" className="h-12 w-12 rounded object-cover" />
      <span className="text-body-sm font-semibold">{genre.label}</span>
      {selected && <FiCheck aria-hidden="true" />}
    </button>
  )
}

const OnboardingPage = () => {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    primaryInstrument: null, secondaryInstrument: null, musicGenres: [],
    displayName: '', experienceLevel: 'BEGINNER', country: '', bio: '',
  })

  // First click sets the main instrument, a click on another sets a second one; click again to clear.
  const pickInstrument = (id) => setForm((f) => {
    if (f.primaryInstrument === id) return { ...f, primaryInstrument: f.secondaryInstrument, secondaryInstrument: null }
    if (f.secondaryInstrument === id) return { ...f, secondaryInstrument: null }
    if (!f.primaryInstrument) return { ...f, primaryInstrument: id }
    return { ...f, secondaryInstrument: id }
  })
  const toggleGenre = (id) => setForm((f) => ({
    ...f, musicGenres: f.musicGenres.includes(id) ? f.musicGenres.filter((g) => g !== id) : [...f.musicGenres, id],
  }))

  const canContinue = [Boolean(form.primaryInstrument), form.musicGenres.length > 0, form.displayName.trim().length > 0][step]

  const finish = async () => {
    setSaving(true)
    try {
      await api.put('/profile', {
        displayName: form.displayName.trim(),
        bio: form.bio.trim(),
        country: form.country.trim(),
        experienceLevel: form.experienceLevel,
        primaryInstrument: form.primaryInstrument,
        secondaryInstrument: form.secondaryInstrument,
        musicGenres: form.musicGenres.join(','),
      })
      notify({ title: 'You are all set', body: 'Your practice library is tuned to your instrument.',
        image: IMAGES.instruments[form.primaryInstrument.toLowerCase()]?.src })
      navigate('/dashboard')
    } catch {
      notify.error('Your profile could not be saved', 'Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageShell footer={false}>
      <div className="page py-10 sm:py-16">
        <div className="mb-10 flex items-center gap-3 text-caption text-fog" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
          {STEPS.map((label, i) => (
            <span key={label} className="flex items-center gap-3">
              <span className={cn('h-1 w-10 rounded', i <= step ? 'bg-white' : 'bg-graphite')} aria-hidden="true" />
              <span className={cn('hidden sm:inline', i === step && 'text-white')}>{label}</span>
            </span>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.25 }}>
            {step === 0 && (
              <>
                <h1 className="text-heading font-thin">What do you play?</h1>
                <p className="mt-2 text-body-sm text-fog">Pick your main instrument. Pick a second one too if you like.</p>
                <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                  {INSTRUMENTS.map((instrument) => (
                    <InstrumentTile key={instrument.id} instrument={instrument} onClick={() => pickInstrument(instrument.id)}
                      hasSecond={Boolean(form.secondaryInstrument)}
                      role={form.primaryInstrument === instrument.id ? 'primary' : form.secondaryInstrument === instrument.id ? 'secondary' : null} />
                  ))}
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <h1 className="text-heading font-thin">What do you love to play?</h1>
                <p className="mt-2 text-body-sm text-fog">Choose as many styles as you like.</p>
                <div className="mt-8 flex flex-wrap gap-3">
                  {GENRES.map((genre) => (
                    <GenreChip key={genre.id} genre={genre} selected={form.musicGenres.includes(genre.id)} onClick={() => toggleGenre(genre.id)} />
                  ))}
                </div>
              </>
            )}

            {step === 2 && (
              <div className="max-w-xl">
                <h1 className="text-heading font-thin">About you</h1>
                <p className="mt-2 text-body-sm text-fog">This is what other musicians see on your profile.</p>
                <div className="mt-8 space-y-5">
                  <Input label="Display name" value={form.displayName} maxLength={60}
                    onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))} placeholder="e.g. Maya on keys" />
                  <fieldset>
                    <legend className="mb-2 text-body-sm font-semibold text-white">Experience</legend>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {EXPERIENCE_LEVELS.map((level) => (
                        <label key={level.id} className={cn('flex cursor-pointer flex-col rounded p-3 transition-colors',
                          form.experienceLevel === level.id ? 'bg-white text-obsidian' : 'bg-graphite text-white hover:bg-mid-gray')}>
                          <input type="radio" name="experience" value={level.id} className="sr-only"
                            checked={form.experienceLevel === level.id} onChange={() => setForm((f) => ({ ...f, experienceLevel: level.id }))} />
                          <span className="text-body-sm font-semibold">{level.label}</span>
                          <span className={cn('text-caption', form.experienceLevel === level.id ? 'text-mid-gray' : 'text-fog')}>{level.description}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <Input label="Country (optional)" value={form.country} maxLength={60}
                    onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} />
                  <Input as="textarea" rows={3} label="Bio (optional)" value={form.bio} maxLength={500}
                    onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} placeholder="What you play, what you are working on" />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-12 flex items-center justify-between border-t border-graphite pt-6">
          <Button variant="ghost" icon={FiArrowLeft} onClick={() => setStep((s) => s - 1)} disabled={step === 0}>Back</Button>
          {step < STEPS.length - 1 ? (
            <Button iconRight={FiArrowRight} onClick={() => setStep((s) => s + 1)} disabled={!canContinue}>Continue</Button>
          ) : (
            <Button onClick={finish} disabled={!canContinue || saving}>{saving ? 'Saving' : 'Finish'}</Button>
          )}
        </div>
      </div>
    </PageShell>
  )
}

export default OnboardingPage
