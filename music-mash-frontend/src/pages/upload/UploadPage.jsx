import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiMic, FiSquare, FiUpload, FiRotateCcw } from 'react-icons/fi'
import PageShell from '../../components/layout/PageShell'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import EqualizerBars from '../../components/ui/EqualizerBars'
import { notify } from '../../components/ui/Toast'
import useRecorder from '../../audio/useRecorder'
import { decodeBlob } from '../../audio/wav'
import { LevelMeter, LiveWaveform, WaveformPlayer } from '../../audio/visuals'
import { startAnalysis, uploadAudio } from '../../audio/analysisApi'
import { IMAGES } from '../../utils/images'
import { INSTRUMENTS, GENRES, formatDuration } from '../../utils/music'
import { cn } from '../../utils/cn'
import api from '../../services/api'

const DIFFICULTIES = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']
const MAX_BYTES = 100 * 1024 * 1024

const Select = ({ label, value, onChange, options }) => (
  <label className="flex flex-col gap-2">
    <span className="text-body-sm font-semibold text-white">{label}</span>
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="rounded bg-graphite px-4 py-3 text-body-sm text-white shadow-subtle focus:bg-mid-gray focus:outline-none">
      {options.map(([id, text]) => <option key={id} value={id}>{text}</option>)}
    </select>
  </label>
)

/**
 * Studio: record (live level meter + live waveform) or upload a take, review it as a playable
 * waveform, add details, then upload -> create the performance -> start the real AI analysis.
 */
const UploadPage = () => {
  const navigate = useNavigate()
  const recorder = useRecorder()
  const fileInput = useRef(null)
  const [uploaded, setUploaded] = useState(null)   // { file, url, buffer, duration }
  const [fileError, setFileError] = useState(null)
  const [details, setDetails] = useState({ title: '', description: '', instrument: 'VOCALS', category: 'POP', difficulty: 'BEGINNER', submitForJudging: false })
  const [stage, setStage] = useState(null)         // null | uploading | creating | analysing
  const take = uploaded ?? recorder.result
  const recording = recorder.status === 'recording'
  const banner = IMAGES.scenes.studio

  const pickFile = async (file) => {
    setFileError(null)
    if (!file) return
    if (!/\.(wav|mp3)$/i.test(file.name)) return setFileError('Use a WAV or MP3 file.')
    if (file.size > MAX_BYTES) return setFileError('The file is larger than 100 MB.')
    try {
      const buffer = await decodeBlob(file)
      recorder.reset()
      setUploaded({ file, url: URL.createObjectURL(file), buffer, duration: buffer.duration })
      if (!details.title) setDetails((d) => ({ ...d, title: file.name.replace(/\.[^.]+$/, '') }))
    } catch {
      setFileError('That file could not be read as audio.')
    }
  }

  const discard = () => {
    if (uploaded?.url) URL.revokeObjectURL(uploaded.url)
    setUploaded(null)
    recorder.reset()
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!take) return
    try {
      setStage('uploading')
      const audioUrl = await uploadAudio(uploaded?.file ?? take.blob, uploaded?.file?.name ?? 'studio-take.wav')
      setStage('creating')
      const { data: performance } = await api.post('/performances', {
        title: details.title.trim() || 'Untitled take', description: details.description.trim(),
        instrument: details.instrument, category: details.category, difficulty: details.difficulty, audioUrl,
      })
      if (details.submitForJudging) await api.post(`/performances/${performance.id}/submit`)
      setStage('analysing')
      const analysisId = await startAnalysis({ audioUrl, performanceId: performance.id, instrument: details.instrument, category: details.category })
      notify({ title: 'Take uploaded', body: 'Measuring pitch and timing now.' })
      navigate(`/ai-analysis/${analysisId}`)
    } catch (error) {
      setStage(null)
      notify.error('Upload failed', error.response?.data?.message || error.response?.data?.detail || 'Please try again.')
    }
  }

  return (
    <PageShell>
      <section className="relative h-44 overflow-hidden sm:h-56">
        <img src={banner?.src} alt={banner?.alt ?? ''} width="1600" height="700" className="absolute inset-0 h-full w-full object-cover" />
        <div className="hero-scrim absolute inset-0" aria-hidden="true" />
        <div className="page relative flex h-full flex-col justify-end pb-6">
          <h1 className="text-heading font-thin text-white">Studio</h1>
          <p className="mt-1 text-body-sm text-fog">Record a take or upload one. It is measured the moment you submit.</p>
        </div>
      </section>

      <div className="page grid gap-10 py-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* Capture */}
        <section aria-label="Recording" className="bg-graphite p-6 shadow-subtle">
          {!take ? (
            <>
              <div className="flex flex-col items-center gap-6 py-6 text-center">
                <button
                  type="button"
                  onClick={recording ? recorder.stop : recorder.start}
                  disabled={recorder.status === 'requesting' || recorder.status === 'processing'}
                  aria-label={recording ? 'Stop recording' : 'Start recording'}
                  className="flex h-28 w-28 items-center justify-center rounded bg-white text-obsidian transition-transform hover:scale-[1.03] disabled:opacity-50"
                >
                  {recording ? <FiSquare className="h-10 w-10" fill="currentColor" /> : <FiMic className="h-10 w-10" />}
                </button>
                <div aria-live="polite">
                  {recording ? (
                    <p className="flex items-center gap-2 text-body text-white">
                      <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-signal" aria-hidden="true" />
                      Recording · {formatDuration(recorder.seconds)}
                    </p>
                  ) : recorder.status === 'processing' ? (
                    <p className="flex items-center gap-2 text-body-sm text-fog"><EqualizerBars count={4} className="h-3" /> Preparing your take</p>
                  ) : (
                    <p className="text-body-sm text-fog">Press to record. Use headphones if you play along to anything.</p>
                  )}
                  {recorder.error && <p role="alert" className="mt-2 text-body-sm text-white"><span className="text-status-critical">●</span> {recorder.error}</p>}
                </div>
              </div>

              <div className={cn('space-y-4 transition-opacity', recording ? 'opacity-100' : 'opacity-40')}>
                <LiveWaveform getAnalyser={recorder.getAnalyser} active={recording} />
                <LevelMeter getAnalyser={recorder.getAnalyser} active={recording} />
              </div>

              <div className="mt-8 flex flex-col items-center gap-3 border-t border-mid-gray/40 pt-6 sm:flex-row sm:justify-center">
                <span className="text-body-sm text-fog">or</span>
                <Button variant="subtle" icon={FiUpload} onClick={() => fileInput.current?.click()} disabled={recording}
                  className="bg-obsidian hover:bg-mid-gray">Upload a WAV or MP3</Button>
                <input ref={fileInput} type="file" accept=".wav,.mp3,audio/wav,audio/mpeg" className="hidden"
                  onChange={(e) => pickFile(e.target.files?.[0])} />
              </div>
              {fileError && <p role="alert" className="mt-3 text-center text-body-sm text-white"><span className="text-status-critical">●</span> {fileError}</p>}
            </>
          ) : (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-subheading font-semibold">Your take</h2>
                <Badge tone="muted">{formatDuration(take.duration)}</Badge>
              </div>
              <WaveformPlayer buffer={take.buffer} url={take.url} />
              <Button variant="ghost" icon={FiRotateCcw} onClick={discard} className="mt-6" disabled={Boolean(stage)}>
                Discard and start again
              </Button>
            </div>
          )}
        </section>

        {/* Details */}
        <form onSubmit={submit} className="space-y-5" aria-label="Performance details">
          <h2 className="text-subheading font-semibold">Details</h2>
          <Input label="Title" value={details.title} maxLength={100} placeholder="e.g. Autumn Leaves, first chorus"
            onChange={(e) => setDetails((d) => ({ ...d, title: e.target.value }))} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Instrument" value={details.instrument} onChange={(v) => setDetails((d) => ({ ...d, instrument: v }))}
              options={INSTRUMENTS.map((i) => [i.id, i.label])} />
            <Select label="Style" value={details.category} onChange={(v) => setDetails((d) => ({ ...d, category: v }))}
              options={GENRES.map((g) => [g.id, g.label])} />
          </div>
          <Select label="Difficulty" value={details.difficulty} onChange={(v) => setDetails((d) => ({ ...d, difficulty: v }))}
            options={DIFFICULTIES.map((d) => [d, d.charAt(0) + d.slice(1).toLowerCase()])} />
          <Input as="textarea" rows={3} label="Notes (optional)" value={details.description} maxLength={500}
            onChange={(e) => setDetails((d) => ({ ...d, description: e.target.value }))} />
          <label className="flex cursor-pointer items-start gap-3 text-body-sm text-white">
            <input type="checkbox" checked={details.submitForJudging} className="mt-1 h-4 w-4 accent-white"
              onChange={(e) => setDetails((d) => ({ ...d, submitForJudging: e.target.checked }))} />
            <span>Submit for judging<span className="block text-caption text-fog">Judges review it; approved performances appear on the home page.</span></span>
          </label>
          <Button type="submit" size="lg" className="w-full" disabled={!take || Boolean(stage) || !details.title.trim()}>
            {stage ? <><EqualizerBars count={4} className="h-3" barClassName="bg-obsidian" />
              {{ uploading: 'Uploading', creating: 'Saving', analysing: 'Starting analysis' }[stage]}</> : 'Upload and analyse'}
          </Button>
          {!take && <p className="text-caption text-fog">Record or upload a take first.</p>}
        </form>
      </div>
    </PageShell>
  )
}

export default UploadPage
