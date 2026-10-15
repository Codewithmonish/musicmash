import api from '../services/api'

// Browsers disagree on WAV/MP3 MIME types (audio/x-wav, audio/wave, audio/mp3...); the backend
// accepts audio/wav and audio/mpeg, so the type is set from the file extension.
const typeFor = (fileName, fallback) =>
  /\.wav$/i.test(fileName) ? 'audio/wav' : /\.mp3$/i.test(fileName) ? 'audio/mpeg' : fallback

/** Upload an audio Blob/File through Spring; returns the "/uploads/<file>" reference. */
export const uploadAudio = async (file, name = 'recording.wav') => {
  const fileName = file.name || name
  const form = new FormData()
  form.append('file', new File([file], fileName, { type: typeFor(fileName, file.type || 'audio/wav') }))
  const { data } = await api.post('/upload/audio', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  return data.url
}

/** Start an AI analysis of an uploaded file; returns the analysis id. */
export const startAnalysis = async ({ audioUrl, performanceId, instrument, category }) => {
  const { data } = await api.post('/ai/analyze', { audioUrl, performanceId, instrument, category })
  return data.id
}

/**
 * Poll an analysis until COMPLETED (resolves with the full /result) or FAILED (rejects with
 * the service's error message). onStatus is called with each status while waiting.
 */
export const waitForAnalysis = async (analysisId, { onStatus, intervalMs = 1500, timeoutMs = 300000 } = {}) => {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    const { data } = await api.get(`/ai/status/${analysisId}`)
    onStatus?.(data.status)
    if (data.status === 'COMPLETED') return (await api.get(`/ai/result/${analysisId}`)).data
    if (data.status === 'FAILED') throw new Error(data.error_message || 'The analysis failed.')
    if (Date.now() > deadline) throw new Error('The analysis is taking longer than expected. Check back later.')
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
}
