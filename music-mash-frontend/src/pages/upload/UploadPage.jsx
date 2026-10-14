import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FiUpload, FiMusic, FiVideo, FiX, FiMic, FiCircle, FiStopCircle, 
  FiRefreshCw, FiPlay, FiPause, FiCheckCircle, FiAlertTriangle, FiDisc, FiRadio 
} from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import Navbar from '../../components/layout/Navbar'
import AmbientBackground from '../../components/ui/AmbientBackground'
import EqualizerBars from '../../components/ui/EqualizerBars'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import api from '../../services/api'

const UploadPage = () => {
  const [dragActive, setDragActive] = useState(false)
  const [files, setFiles] = useState({ audio: null, video: null })
  const [uploading, setUploading] = useState(false)
  
  // Live Studio Recording States
  const [recordingMode, setRecordingMode] = useState(null) // 'audio' | 'video' | null
  const [recording, setRecording] = useState(false)
  const [recordSeconds, setRecordSeconds] = useState(0)
  const [permissionError, setPermissionError] = useState(null)
  
  const mediaRecorderRef = useRef(null)
  const mediaStreamRef = useRef(null)
  const chunksRef = useRef([])
  const videoPreviewRef = useRef(null)
  const timerIntervalRef = useRef(null)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'CLASSICAL',
    instrument: 'PIANO',
    difficulty: 'INTERMEDIATE'
  })

  const navigate = useNavigate()

  useEffect(() => {
    return () => {
      stopMediaStream()
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    }
  }, [])

  const stopMediaStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop())
      mediaStreamRef.current = null
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
  }

  // Format recording seconds into mm:ss
  const formatTime = (totalSec) => {
    const mins = Math.floor(totalSec / 60)
    const secs = totalSec % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Request browser permissions & start live stream recording
  const startRecordingStream = async (mode) => {
    setPermissionError(null)
    stopMediaStream()
    chunksRef.current = []
    setRecordSeconds(0)

    try {
      const constraints = mode === 'video' ? { audio: true, video: true } : { audio: true }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      mediaStreamRef.current = stream

      if (mode === 'video' && videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream
        videoPreviewRef.current.play()
      }

      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      recorder.onstop = () => {
        const mimeType = mode === 'video' ? 'video/webm' : 'audio/webm'
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const file = new File([blob], `studio-recording-${Date.now()}.webm`, { type: mimeType })
        
        if (mode === 'video') {
          setFiles((prev) => ({ ...prev, video: file }))
        } else {
          setFiles((prev) => ({ ...prev, audio: file }))
        }

        stopMediaStream()
        setRecording(false)
        setRecordingMode(null)
        toast.success(`${mode === 'video' ? 'Video' : 'Audio'} recording captured!`)
      }

      recorder.start(200)
      setRecordingMode(mode)
      setRecording(true)

      // Start recording timer
      timerIntervalRef.current = setInterval(() => {
        setRecordSeconds((prev) => prev + 1)
      }, 1000)

      toast.success(`Live studio ${mode} recording active...`)
    } catch (err) {
      console.error('Media devices permission denied:', err)
      setPermissionError(`Microphone/Camera access denied. Please grant browser permissions in address bar to record.`)
      toast.error('Permission denied for media recording device.')
      setRecording(false)
      setRecordingMode(null)
    }
  }

  const stopRecordingStream = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
    else if (e.type === 'dragleave') setDragActive(false)
  }

  const handleDrop = (e, type) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFiles({ ...files, [type]: e.dataTransfer.files[0] })
    }
  }

  const handleFileChange = (e, type) => {
    if (e.target.files && e.target.files[0]) {
      setFiles({ ...files, [type]: e.target.files[0] })
    }
  }

  const removeFile = (type) => {
    setFiles({ ...files, [type]: null })
  }

  const uploadFile = async (file, type) => {
    const data = new FormData()
    data.append('file', file)
    const endpoint = type === 'audio' ? '/upload/audio' : '/upload/video'
    const response = await api.post(endpoint, data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data.url
  }

  const handleSubmit = async (e, asDraft = false) => {
    e.preventDefault()
    if (!files.audio && !files.video && !asDraft) {
      toast.error('Please record or upload at least one audio or video track.')
      return
    }

    setUploading(true)
    try {
      let audioUrl = null
      let videoUrl = null

      if (files.audio) audioUrl = await uploadFile(files.audio, 'audio')
      if (files.video) videoUrl = await uploadFile(files.video, 'video')

      const performanceData = {
        title: formData.title || 'Untitled Studio Performance',
        description: formData.description,
        category: formData.category,
        instrument: formData.instrument,
        difficulty: formData.difficulty,
        fileUrl: audioUrl || videoUrl || '/uploads/sample.mp3',
        fileType: videoUrl ? 'VIDEO' : 'AUDIO',
        status: asDraft ? 'SUBMITTED' : 'SUBMITTED'
      }

      await api.post('/performances', performanceData)
      toast.success(asDraft ? 'Draft performance saved!' : 'Performance submitted to command center!')
      navigate('/dashboard')
    } catch (err) {
      console.error(err)
      toast.error('Failed to submit performance. Check backend connection.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#06060A] text-foreground pt-24 pb-20 px-4 relative overflow-hidden">
      <AmbientBackground />
      <Navbar />

      <div className="max-w-4xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent text-xs font-mono font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <FiRadio className="animate-pulse text-accent" /> PERFORMANCE STUDIO
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-bold text-white tracking-tight">
            Record & Upload <span className="gradient-text">Track</span>
          </h1>
          <p className="text-muted text-xs sm:text-sm mt-1">Capture live mic/camera performance or upload files for AI & Judge evaluation.</p>
        </motion.div>

        {/* Permission Warning Banner */}
        {permissionError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl bg-error/15 border border-error/30 text-error text-xs flex items-center gap-3"
          >
            <FiAlertTriangle className="text-xl shrink-0" />
            <span>{permissionError}</span>
          </motion.div>
        )}

        {/* Studio Recording Controls */}
        <Card hover={false} className="mb-8 border-white/10">
          <h3 className="font-display text-lg font-bold text-white mb-4 flex items-center gap-2">
            <FiMic className="text-accent" /> Live Studio Recording
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <Button
              type="button"
              onClick={() => (recording && recordingMode === 'audio' ? stopRecordingStream() : startRecordingStream('audio'))}
              variant={recording && recordingMode === 'audio' ? 'danger' : 'secondary'}
              className="py-4 flex items-center justify-center gap-3 text-xs uppercase tracking-wider"
              disabled={recording && recordingMode !== 'audio'}
            >
              {recording && recordingMode === 'audio' ? (
                <>
                  <FiStopCircle className="text-lg animate-pulse" /> Stop Audio Rec ({formatTime(recordSeconds)})
                </>
              ) : (
                <>
                  <FiMic className="text-lg text-accent" /> Record Microphone
                </>
              )}
            </Button>

            <Button
              type="button"
              onClick={() => (recording && recordingMode === 'video' ? stopRecordingStream() : startRecordingStream('video'))}
              variant={recording && recordingMode === 'video' ? 'danger' : 'secondary'}
              className="py-4 flex items-center justify-center gap-3 text-xs uppercase tracking-wider"
              disabled={recording && recordingMode !== 'video'}
            >
              {recording && recordingMode === 'video' ? (
                <>
                  <FiStopCircle className="text-lg animate-pulse" /> Stop Video Rec ({formatTime(recordSeconds)})
                </>
              ) : (
                <>
                  <FiVideo className="text-lg text-primary-light" /> Record Camera & Mic
                </>
              )}
            </Button>
          </div>

          {/* Live Recording Stream Preview Monitor */}
          {recording && (
            <div className="p-6 rounded-2xl bg-black/80 border border-primary/40 text-center relative overflow-hidden mb-4 shadow-glow-purple">
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-error/20 border border-error/40 px-3 py-1 rounded-full text-xs font-mono font-bold text-error">
                <span className="w-2.5 h-2.5 rounded-full bg-error animate-ping" />
                REC {formatTime(recordSeconds)}
              </div>
              
              {recordingMode === 'video' ? (
                <video ref={videoPreviewRef} className="w-full max-h-72 rounded-xl bg-surface object-cover mx-auto" muted />
              ) : (
                <div className="py-10 flex flex-col items-center">
                  <EqualizerBars count={10} className="h-16 gap-2 mb-4" />
                  <span className="text-xs font-mono text-accent">RECORDING AUDIO STREAM...</span>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Upload Form */}
        <Card hover={false} className="border-white/10">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Audio Track Dropzone */}
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-2">
                Audio Track File
              </label>
              <div
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                  dragActive ? 'border-primary bg-primary/10' : 'border-white/10 hover:border-primary/40 bg-white/5'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={(e) => handleDrop(e, 'audio')}
              >
                {files.audio ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-primary/15 border border-primary/30">
                    <div className="flex items-center gap-3">
                      <FiMusic className="text-accent text-xl" />
                      <div className="text-left">
                        <div className="text-xs font-bold text-white truncate max-w-xs">{files.audio.name}</div>
                        <div className="text-[10px] text-muted">{(files.audio.size / 1024 / 1024).toFixed(2)} MB</div>
                      </div>
                    </div>
                    <button type="button" onClick={() => removeFile('audio')} className="text-error p-2 hover:bg-error/20 rounded-lg">
                      <FiX />
                    </button>
                  </div>
                ) : (
                  <div>
                    <FiUpload className="text-3xl text-muted mx-auto mb-2" />
                    <p className="text-xs text-white font-medium mb-1">Drag and drop audio file (.mp3, .wav, .m4a, .webm)</p>
                    <input type="file" accept="audio/*" onChange={(e) => handleFileChange(e, 'audio')} className="hidden" id="audio-upload" />
                    <label htmlFor="audio-upload" className="text-xs text-accent hover:underline font-mono cursor-pointer inline-block mt-1">
                      Browse Files
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Video Track Dropzone */}
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-2">
                Video Performance File (Optional)
              </label>
              <div
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                  dragActive ? 'border-primary bg-primary/10' : 'border-white/10 hover:border-primary/40 bg-white/5'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={(e) => handleDrop(e, 'video')}
              >
                {files.video ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/15 border border-secondary/30">
                    <div className="flex items-center gap-3">
                      <FiVideo className="text-secondary text-xl" />
                      <div className="text-left">
                        <div className="text-xs font-bold text-white truncate max-w-xs">{files.video.name}</div>
                        <div className="text-[10px] text-muted">{(files.video.size / 1024 / 1024).toFixed(2)} MB</div>
                      </div>
                    </div>
                    <button type="button" onClick={() => removeFile('video')} className="text-error p-2 hover:bg-error/20 rounded-lg">
                      <FiX />
                    </button>
                  </div>
                ) : (
                  <div>
                    <FiVideo className="text-3xl text-muted mx-auto mb-2" />
                    <p className="text-xs text-white font-medium mb-1">Drag and drop video file (.mp4, .webm)</p>
                    <input type="file" accept="video/*" onChange={(e) => handleFileChange(e, 'video')} className="hidden" id="video-upload" />
                    <label htmlFor="video-upload" className="text-xs text-accent hover:underline font-mono cursor-pointer inline-block mt-1">
                      Browse Video Files
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Metadata Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-2">Track Title</label>
                <Input
                  placeholder="e.g. Moonlight Sonata Movement 1"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-2">Primary Instrument</label>
                <select
                  value={formData.instrument}
                  onChange={(e) => setFormData({ ...formData, instrument: e.target.value })}
                  className="input-field w-full text-xs"
                >
                  <option value="PIANO">Piano</option>
                  <option value="GUITAR">Guitar</option>
                  <option value="VOCALS">Vocals</option>
                  <option value="DRUMS">Drums</option>
                  <option value="VIOLIN">Violin</option>
                  <option value="SAXOPHONE">Saxophone</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-2">Genre Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="input-field w-full text-xs"
                >
                  <option value="CLASSICAL">Classical</option>
                  <option value="JAZZ">Jazz</option>
                  <option value="ROCK">Rock</option>
                  <option value="POP">Pop</option>
                  <option value="BLUES">Blues</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-2">Target Difficulty</label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                  className="input-field w-full text-xs"
                >
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                  <option value="PROFESSIONAL">Professional</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-2">Description & Notes</label>
              <textarea
                placeholder="Share details about your performance, piece title, practice focus..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input-field w-full h-24 resize-none text-xs"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-white/10">
              <Button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                variant="secondary"
                disabled={uploading}
                className="flex-1 uppercase text-xs"
              >
                Save Draft
              </Button>
              <Button
                type="submit"
                variant="accent"
                disabled={uploading}
                className="flex-1 uppercase text-xs font-bold"
              >
                {uploading ? 'Uploading Performance...' : 'Submit Performance'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}

export default UploadPage
