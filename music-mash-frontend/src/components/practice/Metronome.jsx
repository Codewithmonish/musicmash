import { motion } from 'framer-motion'
import { FiMinus, FiPlus, FiPlay, FiSquare } from 'react-icons/fi'
import Button from '../ui/Button'
import useMetronome, { parseTimeSignature } from '../../audio/useMetronome'
import { cn } from '../../utils/cn'

export const MIN_BPM = 40
export const MAX_BPM = 220
export const TIME_SIGNATURES = ['2/4', '3/4', '4/4', '5/4', '6/8', '7/8']
const clampBpm = (value) => Math.max(MIN_BPM, Math.min(MAX_BPM, Math.round(Number(value) || MIN_BPM)))

/** Beat dots: the current beat is white and pulses; beat 1 is wider (the accent). */
export const BeatPulse = ({ beatsPerBar, beat }) => (
  <div className="flex items-center gap-2" aria-hidden="true">
    {Array.from({ length: beatsPerBar }, (_, i) => (
      <motion.span
        key={i}
        animate={{ scale: beat === i ? 1.25 : 1, opacity: beat === i ? 1 : 0.35 }}
        transition={{ duration: 0.08 }}
        className={cn('h-3 rounded-full bg-white', i === 0 ? 'w-6' : 'w-3')}
      />
    ))}
  </div>
)

/** Standalone metronome: BPM 40-220, time signature, accented beat 1, visual pulse. */
const Metronome = ({ bpm, setBpm, timeSignature, setTimeSignature }) => {
  const { beatsPerBar, beatUnit } = parseTimeSignature(timeSignature)
  const { running, beat, start, stop } = useMetronome({ bpm, beatsPerBar, beatUnit })

  return (
    <div className="bg-graphite p-6 shadow-subtle">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-subheading font-semibold">Metronome</h3>
          <p className="text-caption text-fog">Scheduled on the audio clock, so it never drifts.</p>
        </div>
        <span aria-live="polite" className="sr-only">{running ? `Metronome running at ${bpm} BPM` : 'Metronome stopped'}</span>
      </div>

      <div className="mt-6 flex items-center justify-center gap-4">
        <button type="button" onClick={() => setBpm(clampBpm(bpm - 1))} aria-label="Slower"
          className="flex h-10 w-10 items-center justify-center rounded bg-obsidian hover:bg-mid-gray"><FiMinus /></button>
        <div className="text-center">
          <input type="number" min={MIN_BPM} max={MAX_BPM} value={bpm} aria-label="Beats per minute"
            onChange={(e) => setBpm(clampBpm(e.target.value))}
            className="w-28 bg-transparent text-center text-display font-thin text-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
          <p className="text-caption text-fog">BPM</p>
        </div>
        <button type="button" onClick={() => setBpm(clampBpm(bpm + 1))} aria-label="Faster"
          className="flex h-10 w-10 items-center justify-center rounded bg-obsidian hover:bg-mid-gray"><FiPlus /></button>
      </div>

      <input type="range" min={MIN_BPM} max={MAX_BPM} value={bpm} onChange={(e) => setBpm(clampBpm(e.target.value))}
        aria-label="Tempo" className="mt-4 w-full accent-white" />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Time signature">
          {TIME_SIGNATURES.map((signature) => (
            <button key={signature} type="button" role="radio" aria-checked={timeSignature === signature}
              onClick={() => setTimeSignature(signature)}
              className={cn('h-8 rounded px-3 text-body-sm', timeSignature === signature ? 'bg-white font-semibold text-obsidian' : 'bg-obsidian text-fog hover:text-white')}>
              {signature}
            </button>
          ))}
        </div>
        <BeatPulse beatsPerBar={beatsPerBar} beat={beat} />
      </div>

      <Button className="mt-6 w-full" size="lg" icon={running ? FiSquare : FiPlay} onClick={running ? stop : () => start()}>
        {running ? 'Stop' : 'Start'}
      </Button>
    </div>
  )
}

export default Metronome
