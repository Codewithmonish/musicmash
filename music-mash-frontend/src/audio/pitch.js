/**
 * Real-time pitch detection in plain JavaScript (no library): the YIN algorithm
 * (de Cheveigné & Kawahara, 2002), the same family as the pYIN tracker the AI service uses.
 *
 * 1. Difference function d(τ) = Σ (x[i] − x[i+τ])² for each lag τ.
 * 2. Cumulative mean normalised difference d'(τ) = d(τ) · τ / Σ_{j≤τ} d(j).
 * 3. The first τ where d' dips below THRESHOLD (then its local minimum) is the period.
 * 4. Parabolic interpolation around that τ gives sub-sample precision.
 * Returns { frequency (Hz), clarity (0..1, 1 − d') } or null when no clear pitch is found.
 */
const THRESHOLD = 0.15

export const detectPitch = (buffer, sampleRate, { minHz = 50, maxHz = 1600, minRms = 0.01 } = {}) => {
  // Skip near-silence: no pitch to report.
  let energy = 0
  for (let i = 0; i < buffer.length; i += 1) energy += buffer[i] * buffer[i]
  if (Math.sqrt(energy / buffer.length) < minRms) return null

  const maxLag = Math.min(Math.floor(sampleRate / minHz), Math.floor(buffer.length / 2))
  const minLag = Math.max(2, Math.floor(sampleRate / maxHz))
  const window = buffer.length - maxLag
  const cmnd = new Float32Array(maxLag + 1)
  cmnd[0] = 1
  let runningSum = 0
  for (let lag = 1; lag <= maxLag; lag += 1) {
    let sum = 0
    for (let i = 0; i < window; i += 1) {
      const delta = buffer[i] - buffer[i + lag]
      sum += delta * delta
    }
    runningSum += sum
    cmnd[lag] = runningSum > 0 ? (sum * lag) / runningSum : 1
  }

  let lag = -1
  for (let t = minLag; t <= maxLag; t += 1) {
    if (cmnd[t] < THRESHOLD) {
      while (t + 1 <= maxLag && cmnd[t + 1] < cmnd[t]) t += 1
      lag = t
      break
    }
  }
  if (lag === -1) return null

  // Parabolic interpolation for a fractional lag.
  const a = cmnd[lag - 1] ?? cmnd[lag]
  const b = cmnd[lag]
  const c = cmnd[lag + 1] ?? cmnd[lag]
  const denominator = a - 2 * b + c
  const shift = denominator !== 0 ? (a - c) / (2 * denominator) : 0
  return { frequency: sampleRate / (lag + shift), clarity: Math.max(0, Math.min(1, 1 - b)) }
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

/** Nearest equal-tempered note (A4 = 440 Hz) and the deviation from it in cents (−50..+50). */
export const noteFromFrequency = (frequency) => {
  const midiFloat = 69 + 12 * Math.log2(frequency / 440)
  const midi = Math.round(midiFloat)
  return {
    midi,
    name: `${NOTE_NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`,
    cents: (midiFloat - midi) * 100,
  }
}

/** Same bands as the reference-free pitch chart: ≤20¢ in tune, 20–35¢ close, >35¢ off. */
export const tuningBand = (cents) => {
  const off = Math.abs(cents)
  if (off <= 20) return { key: 'good', label: 'In tune', color: '#0ca30c' }
  if (off <= 35) return { key: 'warning', label: cents > 0 ? 'A little sharp' : 'A little flat', color: '#fab219' }
  return { key: 'critical', label: cents > 0 ? 'Sharp' : 'Flat', color: '#d03b3b' }
}
