import { memo } from 'react'

/**
 * Deterministic fallback cover art for anything without a picture (e.g. a performance without
 * a thumbnail). The same seed always draws the same cover: a grayscale equalizer / waveform /
 * ring pattern with exactly one Signal Blue accent, so tiles are never empty and never fake.
 */

// Small, fast, deterministic PRNG (mulberry32) seeded from a string hash (FNV-1a).
const hash = (text) => {
  let h = 2166136261
  for (const ch of String(text)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return h >>> 0
}
const rng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) >>> 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const GRAYS = ['#303030', '#3d3d3d', '#666666', '#999999', '#cccccc']
const ACCENT = '#699fff'

const equalizer = (random) => {
  const bars = 9 + Math.floor(random() * 6)
  const accent = Math.floor(random() * bars)
  const width = 100 / bars
  return Array.from({ length: bars }, (_, i) => {
    const h = 18 + random() * 62
    return <rect key={i} x={i * width + width * 0.2} y={88 - h} width={width * 0.6} height={h}
      fill={i === accent ? ACCENT : GRAYS[1 + Math.floor(random() * 4)]} />
  })
}

const waveform = (random) => {
  const points = 48
  const accentStart = Math.floor(random() * (points - 8))
  const speed = 0.25 + random() * 0.1
  return Array.from({ length: points }, (_, i) => {
    const h = 4 + Math.abs(Math.sin(i * speed) * 34 + random() * 12)
    const x = 6 + i * (88 / points)
    return <rect key={i} x={x} y={50 - h / 2} width={1.1} height={h}
      fill={i >= accentStart && i < accentStart + 6 ? ACCENT : GRAYS[2 + Math.floor(random() * 3)]} />
  })
}

const rings = (random) => {
  const count = 5 + Math.floor(random() * 4)
  const accent = Math.floor(random() * count)
  const cx = 30 + random() * 40
  const cy = 30 + random() * 40
  return Array.from({ length: count }, (_, i) => (
    <circle key={i} cx={cx} cy={cy} r={8 + i * (9 + random() * 3)} fill="none"
      stroke={i === accent ? ACCENT : GRAYS[1 + (i % 4)]} strokeWidth={i === accent ? 1.6 : 0.8} />
  ))
}

const PATTERNS = [equalizer, waveform, rings]

const GeneratedCover = memo(({ seed, label, className }) => {
  const random = rng(hash(seed))
  const pattern = PATTERNS[Math.floor(random() * PATTERNS.length)]
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className={className}
      role="img" aria-label={label || 'Generated cover art'}>
      <rect width="100" height="100" fill="#1b1b1b" />
      {pattern(random)}
    </svg>
  )
})
GeneratedCover.displayName = 'GeneratedCover'

export default GeneratedCover
