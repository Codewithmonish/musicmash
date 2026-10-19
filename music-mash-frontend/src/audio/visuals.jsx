import { useEffect, useMemo, useRef, useState } from 'react'
import { FiPause, FiPlay } from 'react-icons/fi'
import { peaks } from './wav'
import { formatDuration } from '../utils/music'

const WHITE = '#ffffff'
const FOG = '#999999'
const MID_GRAY = '#666666'

/** Run `draw` every animation frame while `active`. */
const useAnimationFrame = (active, draw) => {
  const drawRef = useRef(draw)
  drawRef.current = draw
  useEffect(() => {
    if (!active) return undefined
    let frame
    const loop = () => {
      drawRef.current()
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [active])
}

/** Size a canvas to its CSS box at the device pixel ratio; returns the 2D context. */
const prepare = (canvas) => {
  const ratio = window.devicePixelRatio || 1
  const { width, height } = canvas.getBoundingClientRect()
  if (canvas.width !== Math.round(width * ratio)) {
    canvas.width = Math.round(width * ratio)
    canvas.height = Math.round(height * ratio)
  }
  const ctx = canvas.getContext('2d')
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
  return { ctx, width, height }
}

/** RMS level of the analyser's current buffer, in dBFS (−∞..0). */
export const levelDb = (analyser, buffer) => {
  analyser.getFloatTimeDomainData(buffer)
  let sum = 0
  for (let i = 0; i < buffer.length; i += 1) sum += buffer[i] * buffer[i]
  return 20 * Math.log10(Math.sqrt(sum / buffer.length) || 1e-9)
}

/**
 * Live input level: a horizontal meter from −60 to 0 dBFS with a 1.5 s peak hold. The last
 * 6 dB turn white-on-red as a clipping warning, labelled in text as well.
 */
export const LevelMeter = ({ getAnalyser, active }) => {
  const bar = useRef(null)
  const peakMark = useRef(null)
  const label = useRef(null)
  const state = useRef({ peak: -60, peakAt: 0, buffer: null })

  useAnimationFrame(active, () => {
    const analyser = getAnalyser()
    if (!analyser || !bar.current) return
    state.current.buffer ??= new Float32Array(analyser.fftSize)
    const db = Math.max(-60, levelDb(analyser, state.current.buffer))
    const now = performance.now()
    if (db > state.current.peak || now - state.current.peakAt > 1500) {
      state.current.peak = db
      state.current.peakAt = now
    }
    const pct = ((db + 60) / 60) * 100
    bar.current.style.width = `${pct}%`
    bar.current.style.background = db > -6 ? '#d03b3b' : WHITE
    peakMark.current.style.left = `${((state.current.peak + 60) / 60) * 100}%`
    label.current.textContent = db > -6 ? 'Too loud: move back or turn the input down' : `${Math.round(db)} dBFS`
  })

  return (
    <div>
      <div className="relative h-2 w-full overflow-hidden bg-obsidian" role="meter" aria-label="Input level" aria-valuemin={-60} aria-valuemax={0}>
        <div ref={bar} className="h-full w-0 bg-white" />
        <div ref={peakMark} className="absolute top-0 h-full w-0.5 bg-fog" style={{ left: 0 }} />
      </div>
      <p ref={label} className="mt-2 text-caption text-fog" aria-live="off">{active ? '' : 'Input level'}</p>
    </div>
  )
}

/** Live scrolling waveform: newest audio on the right, white bars on Obsidian. */
export const LiveWaveform = ({ getAnalyser, active, height = 120 }) => {
  const canvas = useRef(null)
  const history = useRef([])
  const buffer = useRef(null)

  useEffect(() => {
    if (active) history.current = []
  }, [active])

  useAnimationFrame(active, () => {
    const analyser = getAnalyser()
    if (!analyser || !canvas.current) return
    buffer.current ??= new Float32Array(analyser.fftSize)
    analyser.getFloatTimeDomainData(buffer.current)
    let max = 0
    for (let i = 0; i < buffer.current.length; i += 1) max = Math.max(max, Math.abs(buffer.current[i]))
    const { ctx, width, height: h } = prepare(canvas.current)
    const barWidth = 3
    const bars = Math.floor(width / barWidth)
    history.current.push(Math.min(1, max * 1.6))
    if (history.current.length > bars) history.current.splice(0, history.current.length - bars)
    ctx.clearRect(0, 0, width, h)
    ctx.fillStyle = MID_GRAY
    ctx.fillRect(0, h / 2 - 0.5, width, 1)
    ctx.fillStyle = WHITE
    history.current.forEach((v, i) => {
      const barHeight = Math.max(1, v * (h - 8))
      ctx.fillRect(width - (history.current.length - i) * barWidth, (h - barHeight) / 2, barWidth - 1, barHeight)
    })
  })

  return <canvas ref={canvas} className="w-full" style={{ height }} aria-label="Live waveform of the microphone input" role="img" />
}

/**
 * Recorded waveform with playback: play/pause, a white played portion over Fog, click or
 * arrow keys to seek.
 */
export const WaveformPlayer = ({ buffer, url, height = 96 }) => {
  const canvas = useRef(null)
  const audio = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [position, setPosition] = useState(0)
  const bars = useMemo(() => (buffer ? peaks(buffer.getChannelData(0), 240) : null), [buffer])
  const duration = buffer?.duration ?? 0

  useEffect(() => {
    if (!canvas.current || !bars) return
    const { ctx, width, height: h } = prepare(canvas.current)
    const barWidth = width / bars.length
    const playedUntil = duration ? (position / duration) * width : 0
    ctx.clearRect(0, 0, width, h)
    bars.forEach((v, i) => {
      const barHeight = Math.max(2, v * (h - 4))
      ctx.fillStyle = i * barWidth < playedUntil ? WHITE : FOG
      ctx.fillRect(i * barWidth, (h - barHeight) / 2, Math.max(1, barWidth - 1), barHeight)
    })
  }, [bars, position, duration])

  useAnimationFrame(playing, () => setPosition(audio.current?.currentTime ?? 0))

  const toggle = () => {
    if (!audio.current) return
    if (playing) audio.current.pause()
    else audio.current.play()
  }
  const seekTo = (time) => {
    if (!audio.current) return
    audio.current.currentTime = Math.max(0, Math.min(duration, time))
    setPosition(audio.current.currentTime)
  }

  return (
    <div className="flex items-center gap-4">
      <button type="button" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-white text-obsidian hover:bg-silver">
        {playing ? <FiPause /> : <FiPlay className="ml-0.5" />}
      </button>
      <div className="min-w-0 flex-1">
        <canvas
          ref={canvas}
          className="w-full cursor-pointer"
          style={{ height }}
          role="slider"
          tabIndex={0}
          aria-label="Playback position"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(position)}
          aria-valuetext={`${formatDuration(position)} of ${formatDuration(duration)}`}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            seekTo(((e.clientX - rect.left) / rect.width) * duration)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') seekTo(position + 2)
            if (e.key === 'ArrowLeft') seekTo(position - 2)
          }}
        />
        <div className="mt-1 flex justify-between text-caption text-fog">
          <span>{formatDuration(position)}</span><span>{formatDuration(duration)}</span>
        </div>
      </div>
      <audio ref={audio} src={url} preload="auto" onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setPosition(duration) }} className="hidden" />
    </div>
  )
}
