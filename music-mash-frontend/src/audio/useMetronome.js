import { useCallback, useEffect, useRef, useState } from 'react'

const LOOKAHEAD_MS = 25          // how often the scheduler wakes up
const SCHEDULE_AHEAD_S = 0.1     // how far ahead clicks are put on the audio clock

/** Time signature string -> beats per bar and the length of one beat in quarter notes. */
export const parseTimeSignature = (signature) => {
  const [beats, unit] = String(signature || '4/4').split('/').map(Number)
  return { beatsPerBar: beats || 4, beatUnit: unit || 4 }
}

/**
 * Metronome on the Web Audio clock (lookahead scheduler, not setInterval clicks).
 *
 * A 25 ms timer only *schedules*: every click is an oscillator started at an exact
 * AudioContext time ~100 ms ahead, so timing stays sample-accurate even when the main thread
 * is busy. Beat 1 is accented (higher, louder). The visual beat follows the same scheduled
 * times via requestAnimationFrame.
 *
 * start({ bars, onDone }) can stop by itself after `bars` bars (used for the count-in).
 * Returns { running, beat, start, stop, context }.
 */
const useMetronome = ({ bpm, beatsPerBar = 4, beatUnit = 4, accent = true, volume = 0.6 }) => {
  const [running, setRunning] = useState(false)
  const [beat, setBeat] = useState(-1)
  const engine = useRef({})
  const settings = useRef({ bpm, beatsPerBar, beatUnit, accent, volume })
  settings.current = { bpm, beatsPerBar, beatUnit, accent, volume }

  const click = (ctx, time, isAccent) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = isAccent ? 1600 : 1000
    const level = settings.current.volume * (isAccent ? 1 : 0.6)
    gain.gain.setValueAtTime(0.0001, time)
    gain.gain.exponentialRampToValueAtTime(level, time + 0.002)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05)
    osc.connect(gain).connect(ctx.destination)
    osc.start(time)
    osc.stop(time + 0.06)
  }

  const stop = useCallback(() => {
    const e = engine.current
    clearInterval(e.timer)
    cancelAnimationFrame(e.frame)
    e.context?.close()
    engine.current = {}
    setRunning(false)
    setBeat(-1)
  }, [])

  const start = useCallback(({ bars = null, onDone } = {}) => {
    stop()
    const context = new (window.AudioContext || window.webkitAudioContext)()
    const e = { context, nextTime: context.currentTime + 0.1, beatIndex: 0, queue: [], totalBeats: 0 }
    engine.current = e

    const scheduler = () => {
      const { bpm: tempo, beatsPerBar: perBar, beatUnit: unit, accent: accented } = settings.current
      const secondsPerBeat = (60 / tempo) * (4 / unit)   // 6/8 at 120 = eighth notes at 120 quarter-note BPM
      while (e.nextTime < context.currentTime + SCHEDULE_AHEAD_S) {
        if (bars != null && e.totalBeats >= bars * perBar) {
          const finishAt = e.nextTime
          clearInterval(e.timer)
          setTimeout(() => {
            if (engine.current === e) stop()
            onDone?.(finishAt)
          }, Math.max(0, (finishAt - context.currentTime) * 1000))
          return
        }
        click(context, e.nextTime, accented && e.beatIndex === 0)
        e.queue.push({ time: e.nextTime, beat: e.beatIndex })
        e.nextTime += secondsPerBeat
        e.beatIndex = (e.beatIndex + 1) % perBar
        e.totalBeats += 1
      }
    }

    const draw = () => {
      while (e.queue.length && e.queue[0].time <= context.currentTime) setBeat(e.queue.shift().beat)
      e.frame = requestAnimationFrame(draw)
    }

    scheduler()
    e.timer = setInterval(scheduler, LOOKAHEAD_MS)
    e.frame = requestAnimationFrame(draw)
    setRunning(true)
  }, [stop])

  useEffect(() => stop, [stop])

  return { running, beat, start, stop }
}

export default useMetronome
