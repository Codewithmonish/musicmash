import { useEffect, useRef, useState } from 'react'
import { FiMic, FiMicOff } from 'react-icons/fi'
import Button from '../ui/Button'
import { detectPitch, noteFromFrequency, tuningBand } from '../../audio/pitch'

const UPDATE_MS = 50          // 20 readings per second
const SMOOTHING = 5           // median of the last 5 readings, to steady the needle

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]

/**
 * Live tuner: microphone -> AnalyserNode -> YIN (src/audio/pitch.js) -> note name + cents.
 * The needle spans −50..+50 cents with the same bands as the pitch chart: ±20 in tune,
 * 20–35 close, >35 off. Band colours always come with a text label.
 */
const Tuner = () => {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState(null)
  const [reading, setReading] = useState(null)   // { name, cents, frequency }
  const audio = useRef({})

  const stop = () => {
    const { timer, stream, context } = audio.current
    clearInterval(timer)
    stream?.getTracks().forEach((t) => t.stop())
    context?.close()
    audio.current = {}
    setListening(false)
    setReading(null)
  }

  const start = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      })
      const context = new (window.AudioContext || window.webkitAudioContext)()
      const analyser = context.createAnalyser()
      analyser.fftSize = 4096   // ~85 ms at 48 kHz: enough periods for low notes
      context.createMediaStreamSource(stream).connect(analyser)
      const buffer = new Float32Array(analyser.fftSize)
      const recent = []
      const timer = setInterval(() => {
        analyser.getFloatTimeDomainData(buffer)
        const pitch = detectPitch(buffer, context.sampleRate)
        if (!pitch || pitch.clarity < 0.85) {
          recent.length = 0
          setReading(null)
          return
        }
        recent.push(pitch.frequency)
        if (recent.length > SMOOTHING) recent.shift()
        const frequency = median(recent)
        setReading({ ...noteFromFrequency(frequency), frequency })
      }, UPDATE_MS)
      audio.current = { stream, context, timer }
      setListening(true)
    } catch (e) {
      setError(e?.name === 'NotAllowedError' ? 'Microphone access was blocked.' : 'No microphone could be opened.')
    }
  }

  useEffect(() => stop, [])

  const band = reading ? tuningBand(reading.cents) : null
  const needle = reading ? Math.max(-50, Math.min(50, reading.cents)) : 0

  return (
    <div className="bg-graphite p-6 shadow-subtle">
      <h3 className="text-subheading font-semibold">Tuner</h3>
      <p className="text-caption text-fog">Play one note at a time. ±20¢ counts as in tune.</p>

      <div className="mt-6 text-center" aria-live="polite">
        <p className="text-display font-thin text-white">{reading ? reading.name : '—'}</p>
        <p className="mt-2 text-body-sm text-fog">
          {reading ? `${reading.cents > 0 ? '+' : ''}${reading.cents.toFixed(0)}¢ · ${reading.frequency.toFixed(1)} Hz` : listening ? 'Listening…' : 'Off'}
        </p>
      </div>

      {/* Needle: −50 .. +50 cents */}
      <div className="relative mx-auto mt-6 h-12 max-w-sm" aria-hidden="true">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 bg-obsidian" />
        <div className="absolute top-1/2 h-1 -translate-y-1/2 bg-status-good/60" style={{ left: '30%', width: '40%' }} />
        {[-50, -35, -20, 0, 20, 35, 50].map((c) => (
          <span key={c} className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-mid-gray" style={{ left: `${50 + c}%` }} />
        ))}
        <span className="absolute top-0 h-12 w-1 -translate-x-1/2 rounded-full transition-[left] duration-100"
          style={{ left: `${50 + needle}%`, background: band?.color ?? '#666666' }} />
      </div>
      <div className="mx-auto mt-1 flex max-w-sm justify-between text-caption text-fog" aria-hidden="true">
        <span>−50¢ flat</span><span>0</span><span>sharp +50¢</span>
      </div>
      <p className="mt-4 flex h-6 items-center justify-center gap-2 text-body-sm font-semibold text-white">
        {band && <><span className="h-2 w-2 rounded-full" style={{ background: band.color }} aria-hidden="true" />{band.label}</>}
      </p>

      {error && <p role="alert" className="mt-2 text-center text-body-sm text-white"><span className="text-status-critical">●</span> {error}</p>}
      <Button className="mt-6 w-full" size="lg" variant={listening ? 'subtle' : 'primary'} icon={listening ? FiMicOff : FiMic}
        onClick={listening ? stop : start}>
        {listening ? 'Stop tuner' : 'Start tuner'}
      </Button>
    </div>
  )
}

export default Tuner
