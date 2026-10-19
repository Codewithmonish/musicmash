/** Instruments, genres and formatting shared by pages. Ids match the Spring enums. */

// Instruments with a photo in /images/instruments/ (the Instrument enum has a few more).
export const INSTRUMENTS = [
  { id: 'VOCALS', label: 'Vocals' },
  { id: 'GUITAR', label: 'Guitar' },
  { id: 'PIANO', label: 'Piano' },
  { id: 'DRUMS', label: 'Drums' },
  { id: 'BASS', label: 'Bass' },
  { id: 'VIOLIN', label: 'Violin' },
  { id: 'CELLO', label: 'Cello' },
  { id: 'SAXOPHONE', label: 'Saxophone' },
  { id: 'TRUMPET', label: 'Trumpet' },
  { id: 'FLUTE', label: 'Flute' },
]

// PerformanceCategory values with a genre photo (slug = key in IMAGES.genres).
export const GENRES = [
  { id: 'HIP_HOP', label: 'Hip-hop', slug: 'hiphop' },
  { id: 'JAZZ', label: 'Jazz', slug: 'jazz' },
  { id: 'CLASSICAL', label: 'Classical', slug: 'classical' },
  { id: 'ROCK', label: 'Rock', slug: 'rock' },
  { id: 'POP', label: 'Pop', slug: 'pop' },
  { id: 'ELECTRONIC', label: 'Electronic', slug: 'electronic' },
  { id: 'FOLK', label: 'Folk', slug: 'folk' },
  { id: 'R_AND_B', label: 'R&B', slug: 'rnb' },
]

export const EXPERIENCE_LEVELS = [
  { id: 'BEGINNER', label: 'Beginner', description: 'Learning the basics' },
  { id: 'INTERMEDIATE', label: 'Intermediate', description: 'Comfortable with scales and pieces' },
  { id: 'ADVANCED', label: 'Advanced', description: 'Solid technique and repertoire' },
  { id: 'PROFESSIONAL', label: 'Professional', description: 'Performing or teaching' },
]

/** "HIP_HOP" -> "Hip Hop", "R_AND_B" -> "R And B" (use GENRES labels where possible). */
export const titleCase = (value) =>
  String(value || '').toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

export const instrumentLabel = (id) => INSTRUMENTS.find((i) => i.id === id)?.label ?? titleCase(id)
export const genreLabel = (id) => GENRES.find((g) => g.id === id)?.label ?? titleCase(id)

/** "2026-10-15T10:02:11" -> "15 Oct 2026". */
export const formatDate = (value) => {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Seconds -> "1:05". */
export const formatDuration = (seconds) => {
  const s = Math.max(0, Math.round(seconds || 0))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
