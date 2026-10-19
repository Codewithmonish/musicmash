import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import Button from '../ui/Button'
import { IMAGES } from '../../utils/images'

const SLIDES = [
  {
    headline: ['Hear yourself', 'the way a teacher does.'],
    body: 'Record a take and see your pitch, timing and tempo measured, note by note.',
  },
  {
    headline: ['Practise with', 'real tools.'],
    body: 'A metronome, a live tuner and exercises scored on what you actually played.',
  },
  {
    headline: ['Step onto', 'the stage.'],
    body: 'Enter competitions, take on challenges and climb the leaderboard.',
  },
]
const INTERVAL_MS = 7000

/**
 * Full-bleed editorial hero (DESIGN.md "Hero Section"): photo with a dark scrim, left-aligned
 * 60px / weight-100 headline, white "Get started" button, pagination dots bottom right.
 * Advances every 7 s; pauses on hover/focus; no auto-advance with reduced motion.
 */
const HeroCarousel = ({ ctaTo }) => {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const reduceMotion = useReducedMotion()
  const photos = IMAGES.hero
  const slide = SLIDES[index]

  const next = useCallback(() => setIndex((i) => (i + 1) % SLIDES.length), [])
  useEffect(() => {
    if (paused || reduceMotion) return undefined
    const timer = setTimeout(next, INTERVAL_MS)
    return () => clearTimeout(timer)
  }, [index, paused, reduceMotion, next])

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Highlights"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="relative h-[86svh] min-h-[560px] max-h-[820px] w-full overflow-hidden bg-obsidian"
    >
      <AnimatePresence initial={false}>
        <motion.img
          key={index}
          src={photos[index]?.src}
          alt={photos[index]?.alt ?? ''}
          width="1920"
          height="1080"
          fetchpriority={index === 0 ? 'high' : 'auto'}
          initial={{ opacity: 0, scale: reduceMotion ? 1 : 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 h-full w-full object-cover"
        />
      </AnimatePresence>
      <div className="hero-scrim absolute inset-0" aria-hidden="true" />

      <div className="page relative flex h-full flex-col justify-end pb-24 sm:justify-center sm:pb-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-xl"
            aria-live="polite"
          >
            <h1 className="text-[44px] font-thin leading-none text-white sm:text-display">
              {slide.headline[0]}<br />{slide.headline[1]}
            </h1>
            <p className="mt-6 max-w-md text-body text-white">{slide.body}</p>
            <Button to={ctaTo} size="lg" className="mt-8">Get started</Button>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="absolute bottom-8 right-4 flex items-center gap-2 sm:right-8" role="group" aria-label="Choose slide">
        {SLIDES.map((s, i) => (
          <button
            key={s.headline[0]}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Slide ${i + 1} of ${SLIDES.length}`}
            aria-current={i === index ? 'true' : undefined}
            className="flex h-6 w-6 items-center justify-center"
          >
            <span className={`h-2 w-2 rounded-full transition-colors ${i === index ? 'bg-white' : 'bg-fog/40 hover:bg-fog'}`} />
          </button>
        ))}
      </div>
    </section>
  )
}

export default HeroCarousel
