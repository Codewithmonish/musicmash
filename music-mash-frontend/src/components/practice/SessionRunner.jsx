import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FiMic, FiSquare, FiRotateCcw, FiX } from 'react-icons/fi'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import Stat from '../ui/Stat'
import CoverImage from '../ui/CoverImage'
import EqualizerBars from '../ui/EqualizerBars'
import { BeatPulse } from './Metronome'
import useRecorder from '../../audio/useRecorder'
import useMetronome, { parseTimeSignature } from '../../audio/useMetronome'
import { LevelMeter, LiveWaveform } from '../../audio/visuals'
import { startAnalysis, uploadAudio, waitForAnalysis } from '../../audio/analysisApi'
import { formatDuration, instrumentLabel, titleCase } from '../../utils/music'
import api from '../../services/api'

const STEP_TEXT = {
  ready: 'Ready',
  countin: 'Count-in',
  recording: 'Recording',
  measuring: 'Measuring',
  saving: 'Saving',
  result: 'Done',
  error: 'Something went wrong',
}

/**
 * One scored practice attempt:
 *   count-in (one bar on the metronome) -> record for the exercise's length -> upload ->
 *   real AI analysis -> save the session (the server reads the analysis and awards XP) -> result.
 * Nothing here invents a score: if the analysis cannot measure something it says so.
 */
const SessionRunner = ({ exercise, instrument, onClose, onSaved }) => {
  const { beatsPerBar, beatUnit } = parseTimeSignature(exercise.timeSignature)
  const recorder = useRecorder()
  const metronome = useMetronome({ bpm: exercise.bpm, beatsPerBar, beatUnit })
  const [step, setStep] = useState('ready')
  const [clickDuringTake, setClickDuringTake] = useState(false)
  const [outcome, setOutcome] = useState(null)   // { analysis, session }
  const [error, setError] = useState(null)
  const processed = useRef(false)

  const begin = () => {
    processed.current = false
    setError(null)
    setOutcome(null)
    setStep('countin')
    metronome.start({
      bars: 1,
      onDone: () => {
        setStep('recording')
        recorder.start()
        if (clickDuringTake) metronome.start()
      },
    })
  }

  const cancel = () => {
    metronome.stop()
    recorder.reset()
    setStep('ready')
  }

  // Stop automatically at the exercise length.
  useEffect(() => {
    if (step === 'recording' && recorder.status === 'recording' && recorder.seconds >= exercise.durationSeconds) {
      recorder.stop()
    }
  }, [step, recorder, exercise.durationSeconds])

  const stopClick = metronome.stop
  useEffect(() => {
    if (recorder.status === 'error') {
      stopClick()
      setError(recorder.error)
      setStep('error')
    }
  }, [recorder.status, recorder.error, stopClick])

  // When the take is ready: upload, analyse, wait, save.
  useEffect(() => {
    if (recorder.status !== 'done' || !recorder.result || processed.current) return
    processed.current = true
    stopClick()
    const take = recorder.result
    const run = async () => {
      try {
        setStep('measuring')
        const audioUrl = await uploadAudio(take.blob, 'practice-take.wav')
        const analysisId = await startAnalysis({ audioUrl, instrument })
        const analysis = await waitForAnalysis(analysisId)
        setStep('saving')
        const { data: session } = await api.post('/practice/sessions', {
          exerciseId: exercise.id, analysisId, durationSeconds: Math.round(take.duration),
        })
        setOutcome({ analysis, analysisId, session })
        setStep('result')
        onSaved?.(session)
      } catch (e) {
        setError(e.response?.data?.message || e.response?.data?.detail || e.message || 'The attempt could not be scored.')
        setStep('error')
      }
    }
    run()
  }, [recorder.status, recorder.result, exercise.id, instrument, stopClick, onSaved])

  const remaining = Math.max(0, exercise.durationSeconds - recorder.seconds)
  const skill = outcome?.analysis?.skill_prediction
  const reasons = outcome?.analysis?.audio_features?.unavailable_reasons || {}

  return (
    <section aria-label={`Practice session: ${exercise.title}`} className="bg-graphite shadow-subtle">
      <div className="grid gap-6 p-4 sm:grid-cols-[160px_1fr] sm:p-6">
        <CoverImage src={exercise.coverImage} alt={exercise.title} seed={`exercise-${exercise.id}`} className="w-32 sm:w-full" />
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge>{titleCase(exercise.difficulty)}</Badge>
                <Badge tone="muted">{exercise.bpm} BPM · {exercise.timeSignature}</Badge>
                <Badge tone="muted">{formatDuration(exercise.durationSeconds)}</Badge>
                <Badge tone="muted">{titleCase(exercise.focus)}</Badge>
              </div>
              <h2 className="mt-3 text-subheading font-semibold">{exercise.title}</h2>
              <p className="mt-1 max-w-2xl text-body-sm text-fog">{exercise.description}</p>
            </div>
            <button type="button" onClick={() => { cancel(); onClose() }} aria-label="Close exercise"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-fog hover:bg-obsidian hover:text-white"><FiX /></button>
          </div>

          <p className="mt-4 text-caption text-fog" aria-live="polite">Step: <span className="text-white">{STEP_TEXT[step]}</span></p>
        </div>
      </div>

      <div className="border-t border-obsidian p-4 sm:p-6">
        <AnimatePresence mode="wait">
          <motion.div key={step === 'recording' || step === 'countin' ? 'live' : step}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            {step === 'ready' && (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex cursor-pointer items-start gap-3 text-body-sm text-white">
                  <input type="checkbox" checked={clickDuringTake} onChange={(e) => setClickDuringTake(e.target.checked)} className="mt-1 h-4 w-4 accent-white" />
                  <span>Keep the click during the take
                    <span className="block text-caption text-fog">Only with headphones: a click from speakers is recorded and measured as notes.</span>
                  </span>
                </label>
                <Button size="lg" icon={FiMic} onClick={begin}>Start: one bar count-in</Button>
              </div>
            )}

            {(step === 'countin' || step === 'recording') && (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <BeatPulse beatsPerBar={beatsPerBar} beat={metronome.beat} />
                    <p className="text-body text-white" aria-live="polite">
                      {step === 'countin'
                        ? `Count-in: ${metronome.beat >= 0 ? metronome.beat + 1 : 1} of ${beatsPerBar}`
                        : <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-signal" aria-hidden="true" />Recording · {formatDuration(remaining)} left</span>}
                    </p>
                  </div>
                  {step === 'recording' && <Button variant="subtle" icon={FiSquare} onClick={recorder.stop} className="bg-obsidian">Stop early</Button>}
                </div>
                <LiveWaveform getAnalyser={recorder.getAnalyser} active={recorder.status === 'recording'} height={90} />
                <LevelMeter getAnalyser={recorder.getAnalyser} active={recorder.status === 'recording'} />
              </div>
            )}

            {(step === 'measuring' || step === 'saving') && (
              <div className="flex items-center gap-4 py-4" role="status">
                <EqualizerBars count={5} className="h-6" />
                <p className="text-body-sm text-fog">{step === 'measuring' ? 'Measuring pitch and timing…' : 'Saving your session…'}</p>
              </div>
            )}

            {step === 'result' && outcome && (
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-3">
                  <Stat label="Intonation" value={skill?.intonation_score == null ? null : Math.round(skill.intonation_score)} unit="/ 100" reason={reasons.intonation_score} className="bg-obsidian" />
                  <Stat label="Rhythm" value={skill?.rhythm_score == null ? null : Math.round(skill.rhythm_score)} unit="/ 100" reason={reasons.rhythm_score} className="bg-obsidian" />
                  <Stat label="XP earned" value={outcome.session.xpEarned} unit={`of ${exercise.xpReward}`}
                    hint="Exercise XP × your overall score" className="bg-obsidian" />
                </div>
                {(skill?.weaknesses?.length > 0) && (
                  <ul className="space-y-2">{skill.weaknesses.slice(0, 2).map((w) => <li key={w} className="text-body-sm text-white">{w}</li>)}</ul>
                )}
                <div className="flex flex-wrap gap-3">
                  <Button icon={FiRotateCcw} onClick={begin}>Try again</Button>
                  <Button to={`/ai-analysis/${outcome.analysisId}`} variant="subtle" className="bg-obsidian">Full analysis</Button>
                </div>
              </div>
            )}

            {step === 'error' && (
              <div className="space-y-4">
                <p role="alert" className="text-body-sm text-white"><span className="text-status-critical">●</span> {error}</p>
                <Button icon={FiRotateCcw} onClick={() => { recorder.reset(); setStep('ready') }}>Try again</Button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
        <p className="mt-6 text-caption text-fog">
          Scored by the same analysis as the Studio, using the {instrumentLabel(instrument)} pitch range.
        </p>
      </div>
    </section>
  )
}

export default SessionRunner
