import { useCallback, useEffect, useRef, useState } from 'react'
import { ANALYSIS_RATE, decodeBlob, encodeWav, resampleMono } from './wav'

/**
 * Microphone recording with live analysis.
 *
 * - getUserMedia -> MediaStreamSource -> AnalyserNode: the analyser feeds the live level
 *   meter and waveform (read it with getAnalyser()).
 * - MediaRecorder captures the take; on stop it is decoded, resampled to 22.05 kHz mono and
 *   re-encoded as WAV, the format the backend accepts and the rate the AI service analyses at.
 * - Browser audio processing (echo cancellation, noise suppression, auto gain) is switched off,
 *   because it would change the very pitch and dynamics we want to measure.
 *
 * Returns { status, error, seconds, result, start, stop, reset, getAnalyser }.
 * status: idle | requesting | recording | processing | done | error.
 * result: { blob (WAV), url, buffer (AudioBuffer), duration } after a successful stop.
 */
const useRecorder = () => {
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [seconds, setSeconds] = useState(0)
  const [result, setResult] = useState(null)
  const media = useRef({})

  const cleanup = useCallback(() => {
    const { stream, context, timer } = media.current
    clearInterval(timer)
    stream?.getTracks().forEach((track) => track.stop())
    if (context && context.state !== 'closed') context.close()
    media.current = {}
  }, [])

  useEffect(() => cleanup, [cleanup])
  useEffect(() => () => result?.url && URL.revokeObjectURL(result.url), [result])

  const start = useCallback(async () => {
    setError(null)
    setResult(null)
    setSeconds(0)
    setStatus('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      })
      const context = new (window.AudioContext || window.webkitAudioContext)()
      const analyser = context.createAnalyser()
      analyser.fftSize = 2048
      context.createMediaStreamSource(stream).connect(analyser)

      const chunks = []
      const recorder = new MediaRecorder(stream)
      recorder.ondataavailable = (event) => event.data.size && chunks.push(event.data)
      recorder.onstop = async () => {
        setStatus('processing')
        try {
          const recorded = new Blob(chunks, { type: recorder.mimeType })
          const buffer = await decodeBlob(recorded)
          // 22.05 kHz mono WAV: what the AI service analyses, at half the size of 44.1/48 kHz.
          const blob = encodeWav(await resampleMono(buffer), ANALYSIS_RATE)
          setResult({ blob, url: URL.createObjectURL(blob), buffer, duration: buffer.duration })
          setStatus('done')
        } catch {
          setError('The recording could not be processed. Please try again.')
          setStatus('error')
        } finally {
          cleanup()
        }
      }

      const startedAt = performance.now()
      const timer = setInterval(() => setSeconds((performance.now() - startedAt) / 1000), 200)
      media.current = { stream, context, analyser, recorder, timer }
      recorder.start()
      setStatus('recording')
    } catch (e) {
      cleanup()
      setError(e?.name === 'NotAllowedError'
        ? 'Microphone access was blocked. Allow it in your browser settings to record.'
        : 'No microphone could be opened.')
      setStatus('error')
    }
  }, [cleanup])

  const stop = useCallback(() => {
    const { recorder } = media.current
    if (recorder && recorder.state !== 'inactive') recorder.stop()
  }, [])

  const reset = useCallback(() => {
    cleanup()
    setResult(null)
    setSeconds(0)
    setError(null)
    setStatus('idle')
  }, [cleanup])

  const getAnalyser = useCallback(() => media.current.analyser ?? null, [])

  return { status, error, seconds, result, start, stop, reset, getAnalyser }
}

export default useRecorder
