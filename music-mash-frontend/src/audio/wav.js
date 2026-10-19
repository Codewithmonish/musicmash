/**
 * Encode audio as a 16-bit PCM mono WAV Blob (the backend accepts only WAV and MP3, while
 * browsers record WebM/Opus or MP4). No library: a WAV file is a 44-byte header + samples.
 */
export const encodeWav = (samples, sampleRate) => {
  const bytesPerSample = 2
  const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample)
  const view = new DataView(buffer)
  const writeText = (offset, text) => [...text].forEach((ch, i) => view.setUint8(offset + i, ch.charCodeAt(0)))

  writeText(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * bytesPerSample, true)
  writeText(8, 'WAVE')
  writeText(12, 'fmt ')
  view.setUint32(16, 16, true)              // fmt chunk size
  view.setUint16(20, 1, true)               // PCM
  view.setUint16(22, 1, true)               // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * bytesPerSample, true)
  view.setUint16(32, bytesPerSample, true)
  view.setUint16(34, 16, true)              // bits per sample
  writeText(36, 'data')
  view.setUint32(40, samples.length * bytesPerSample, true)

  for (let i = 0; i < samples.length; i += 1) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(44 + i * bytesPerSample, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return new Blob([buffer], { type: 'audio/wav' })
}

/** Average all channels of an AudioBuffer into one Float32Array. */
export const toMono = (audioBuffer) => {
  const { numberOfChannels, length } = audioBuffer
  if (numberOfChannels === 1) return audioBuffer.getChannelData(0)
  const mono = new Float32Array(length)
  for (let c = 0; c < numberOfChannels; c += 1) {
    const data = audioBuffer.getChannelData(c)
    for (let i = 0; i < length; i += 1) mono[i] += data[i] / numberOfChannels
  }
  return mono
}

/**
 * Peak envelope for drawing a waveform: `bars` values in 0..1 (max |sample| per slice),
 * normalised so the loudest bar is 1.
 */
export const peaks = (samples, bars = 200) => {
  const size = Math.max(1, Math.floor(samples.length / bars))
  const out = new Float32Array(bars)
  let loudest = 0
  for (let b = 0; b < bars; b += 1) {
    let max = 0
    for (let i = b * size; i < Math.min(samples.length, (b + 1) * size); i += 1) {
      const v = Math.abs(samples[i])
      if (v > max) max = v
    }
    out[b] = max
    if (max > loudest) loudest = max
  }
  return loudest > 0 ? out.map((v) => v / loudest) : out
}

/** Decode any recorded/uploaded audio Blob into an AudioBuffer. */
export const decodeBlob = async (blob) => {
  const context = new (window.AudioContext || window.webkitAudioContext)()
  try {
    return await context.decodeAudioData(await blob.arrayBuffer())
  } finally {
    context.close()
  }
}

/** The AI service analyses audio at 22 050 Hz, so uploads are resampled to it (half a 44.1/48 kHz file). */
export const ANALYSIS_RATE = 22050

/** Mono samples at ANALYSIS_RATE, rendered with an OfflineAudioContext (browser-quality resampling). */
export const resampleMono = async (audioBuffer, rate = ANALYSIS_RATE) => {
  if (audioBuffer.sampleRate === rate) return toMono(audioBuffer)
  const offline = new OfflineAudioContext(1, Math.ceil(audioBuffer.duration * rate), rate)
  const source = offline.createBufferSource()
  source.buffer = audioBuffer
  source.connect(offline.destination)   // 1 output channel: the input is downmixed to mono
  source.start()
  return (await offline.startRendering()).getChannelData(0)
}
