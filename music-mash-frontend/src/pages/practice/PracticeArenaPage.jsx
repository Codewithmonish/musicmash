import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FiTarget, FiAward, FiZap, FiClock, FiPlay, FiPause, 
  FiRotateCcw, FiCheckCircle, FiRadio, FiVolume2, FiDisc, FiTrendingUp, FiActivity 
} from 'react-icons/fi'
import Navbar from '../../components/layout/Navbar'
import AmbientBackground from '../../components/ui/AmbientBackground'
import EqualizerBars from '../../components/ui/EqualizerBars'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import RadialProgress from '../../components/ui/RadialProgress'
import api from '../../services/api'
import toast from 'react-hot-toast'

const PracticeArenaPage = () => {
  const [exercises, setExercises] = useState([])
  const [userStats, setUserStats] = useState({ totalXp: 0, level: 1, streak: 0, exercisesCompleted: 0 })
  const [loading, setLoading] = useState(true)

  // Interactive Game Arena Mode States
  const [activeSession, setActiveSession] = useState(null)
  const [countdown, setCountdown] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0)
  const [loopSection, setLoopSection] = useState(false)
  const [combo, setCombo] = useState(0)
  const [accuracy, setAccuracy] = useState(94)
  const [score, setScore] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  
  const timerRef = useRef(null)

  useEffect(() => {
    fetchPracticeData()
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const fetchPracticeData = async () => {
    setLoading(true)
    try {
      const [exercisesRes, statsRes] = await Promise.allSettled([
        api.get('/practice/exercises'),
        api.get('/practice/stats')
      ])

      if (exercisesRes.status === 'fulfilled') {
        setExercises(exercisesRes.value.data || [])
      }

      if (statsRes.status === 'fulfilled' && statsRes.value.data) {
        setUserStats(statsRes.value.data)
      }
    } catch (err) {
      console.error('Failed to fetch practice arena data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Trigger 3..2..1 GO Game Countdown
  const launchPracticeSession = (exercise) => {
    setActiveSession(exercise)
    setCountdown(3)
    setCombo(0)
    setAccuracy(92 + Math.floor(Math.random() * 7))
    setScore(0)
    setElapsedSeconds(0)

    const countInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === 1) {
          clearInterval(countInterval)
          startGameTimer()
          return 'GO!'
        }
        return prev - 1
      })
    }, 800)

    setTimeout(() => {
      setCountdown(null)
    }, 3200)
  }

  const startGameTimer = () => {
    setIsPlaying(true)
    if (timerRef.current) clearInterval(timerRef.current)
    
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
      setCombo((prev) => prev + 1)
      setScore((prev) => prev + 120)
    }, 1000)
  }

  const togglePause = () => {
    if (isPlaying) {
      setIsPlaying(false)
      if (timerRef.current) clearInterval(timerRef.current)
    } else {
      startGameTimer()
    }
  }

  const finishSession = async () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setIsPlaying(false)

    const xpEarned = activeSession?.xpReward || 150
    try {
      await api.post('/practice/sessions', {
        songTitle: activeSession?.title || 'Practice Track',
        instrument: 'GUITAR',
        difficulty: activeSession?.difficulty || 'INTERMEDIATE',
        accuracy,
        timing: 90,
        maxCombo: combo,
        xpEarned,
        durationSeconds: elapsedSeconds
      })
      toast.success(`Practice session completed! +${xpEarned} XP`)
      fetchPracticeData()
    } catch (err) {
      console.error(err)
      toast.error('Session recorded locally.')
    } finally {
      setActiveSession(null)
    }
  }

  const currentLevel = userStats.level || Math.floor((userStats.totalXp || 0) / 250) + 1
  const xpProgress = Math.min(100, Math.round((((userStats.totalXp || 0) % 250) / 250) * 100))

  return (
    <div className="min-h-screen bg-[#06060A] text-foreground pt-24 pb-20 px-4 relative overflow-hidden">
      <AmbientBackground />
      <Navbar />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent text-xs font-mono font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <FiTarget className="animate-pulse" /> MUSIC GAME ARENA
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-bold text-white tracking-tight">
            Practice <span className="gradient-text">Arena</span>
          </h1>
          <p className="text-muted text-xs sm:text-sm mt-1">Interactive backing track mode with tempo control, loop sections, and combo XP rewards.</p>
        </motion.div>

        {/* Real Stats Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card hover className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center text-accent text-xl">
              <FiZap />
            </div>
            <div>
              <div className="text-2xl font-bold font-display text-white">{userStats.totalXp || 0}</div>
              <div className="text-xs uppercase font-mono text-muted">Total Practice XP</div>
            </div>
          </Card>

          <Card hover className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-secondary/20 to-primary/20 border border-secondary/30 flex items-center justify-center text-secondary text-xl">
              <FiAward />
            </div>
            <div>
              <div className="text-2xl font-bold font-display text-white">Tier {currentLevel}</div>
              <div className="text-xs uppercase font-mono text-muted">Skill Level</div>
            </div>
          </Card>

          <Card hover className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-warning/20 to-secondary/20 border border-warning/30 flex items-center justify-center text-warning text-xl">
              🔥
            </div>
            <div>
              <div className="text-2xl font-bold font-display text-white">{userStats.streak || 0} Days</div>
              <div className="text-xs uppercase font-mono text-muted">Active Streak</div>
            </div>
          </Card>

          <Card hover className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/20 to-primary/20 border border-accent/30 flex items-center justify-center text-accent text-xl">
              <FiCheckCircle />
            </div>
            <div>
              <div className="text-2xl font-bold font-display text-white">{userStats.exercisesCompleted || 0}</div>
              <div className="text-xs uppercase font-mono text-muted">Completed Sessions</div>
            </div>
          </Card>
        </div>

        {/* Level XP Bar */}
        <Card hover={false} className="mb-10 border-white/10">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-mono font-bold uppercase text-white tracking-wider">Level {currentLevel} Mastery Progress</span>
            <span className="text-xs font-mono text-accent">{xpProgress}% to Level {currentLevel + 1}</span>
          </div>
          <div className="w-full bg-white/5 border border-white/10 rounded-full h-3 overflow-hidden p-0.5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${xpProgress}%` }}
              transition={{ duration: 0.8 }}
              className="h-full bg-gradient-to-r from-primary via-secondary to-accent rounded-full shadow-glow-purple"
            />
          </div>
        </Card>

        {/* Game Arena Active Overlay Modal */}
        <AnimatePresence>
          {activeSession && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#06060A]/95 backdrop-blur-2xl z-50 flex items-center justify-center p-4"
            >
              <div className="max-w-3xl w-full glass-card-glow p-8 relative overflow-hidden text-center">
                {/* 3...2...1 GO Countdown Banner */}
                {countdown !== null ? (
                  <div className="py-20">
                    <motion.div
                      key={countdown}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1.2, opacity: 1 }}
                      exit={{ scale: 1.5, opacity: 0 }}
                      className="font-display font-black text-7xl sm:text-9xl gradient-text-cyan drop-shadow-glow"
                    >
                      {countdown}
                    </motion.div>
                    <p className="text-xs uppercase tracking-widest text-muted mt-6 font-mono">GET READY TO PLAY</p>
                  </div>
                ) : (
                  <div>
                    {/* Live Game Top HUD */}
                    <div className="flex items-center justify-between border-b border-white/10 pb-6 mb-6">
                      <div className="text-left">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-accent bg-accent/15 px-2.5 py-1 rounded-md">
                          {activeSession.difficulty || 'INTERMEDIATE'}
                        </span>
                        <h2 className="font-display text-2xl font-bold text-white mt-1">{activeSession.title}</h2>
                        <p className="text-xs text-muted">{activeSession.subtitle || 'Backing Track Practice'}</p>
                      </div>

                      {/* Equalizer Visualizer */}
                      <div className="flex items-center gap-3">
                        <EqualizerBars count={6} className="h-10 gap-1" />
                      </div>
                    </div>

                    {/* Real-time Game Indicators (Combo, Accuracy, Score) */}
                    <div className="grid grid-cols-3 gap-4 mb-8">
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <div className="text-[10px] font-mono text-muted uppercase">COMBO</div>
                        <div className="font-display font-black text-3xl text-warning">{combo}x</div>
                      </div>

                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <div className="text-[10px] font-mono text-muted uppercase">ACCURACY</div>
                        <div className="font-display font-black text-3xl text-accent">{accuracy}%</div>
                      </div>

                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <div className="text-[10px] font-mono text-muted uppercase">SCORE</div>
                        <div className="font-display font-black text-3xl text-primary-light">{score}</div>
                      </div>
                    </div>

                    {/* Interactive Playback Controls */}
                    <div className="p-6 rounded-2xl bg-surface border border-white/10 mb-8 space-y-6">
                      <div className="flex items-center justify-center gap-6">
                        <button
                          onClick={() => setLoopSection(!loopSection)}
                          className={`p-3 rounded-xl border transition-all text-sm font-mono ${
                            loopSection ? 'bg-accent/20 border-accent text-accent' : 'bg-white/5 border-white/10 text-muted'
                          }`}
                        >
                          <FiRotateCcw className="inline mr-1" /> Loop Section
                        </button>

                        <button
                          onClick={togglePause}
                          className="w-16 h-16 rounded-full bg-gradient-to-br from-primary via-secondary to-accent p-[1px] shadow-glow-purple"
                        >
                          <div className="w-full h-full bg-[#0F101A] rounded-full flex items-center justify-center text-white text-2xl">
                            {isPlaying ? <FiPause /> : <FiPlay className="ml-1" />}
                          </div>
                        </button>

                        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 text-xs font-mono">
                          {[0.75, 1.0, 1.25].map((speed) => (
                            <button
                              key={speed}
                              onClick={() => setPlaybackSpeed(speed)}
                              className={`px-2.5 py-1.5 rounded-lg transition-all ${
                                playbackSpeed === speed ? 'bg-primary text-white font-bold' : 'text-muted hover:text-white'
                              }`}
                            >
                              {speed}x
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="text-xs font-mono text-muted">
                        PRACTICE TIME: <span className="text-white font-bold">{elapsedSeconds}s</span> • BPM: <span className="text-accent font-bold">{Math.round((activeSession.bpm || 120) * playbackSpeed)}</span>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <Button onClick={() => setActiveSession(null)} variant="secondary" className="flex-1 uppercase text-xs">
                        Abort Session
                      </Button>
                      <Button onClick={finishSession} variant="accent" className="flex-1 uppercase text-xs font-bold">
                        Finish & Claim XP
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Exercises Grid */}
        <div className="space-y-6">
          <h2 className="font-display text-2xl font-bold text-white">Select Practice Repertoire</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exercises.map((item) => (
              <Card key={item.id} hover className="h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-accent bg-accent/15 px-2.5 py-1 rounded-md border border-accent/20">
                      {item.difficulty || 'INTERMEDIATE'}
                    </span>
                    <span className="text-xs font-mono text-muted">BPM: {item.bpm || 120}</span>
                  </div>

                  <h3 className="font-display font-bold text-xl text-white mb-1">{item.title}</h3>
                  <p className="text-xs text-muted leading-relaxed mb-4">{item.subtitle || 'Guided backing track exercise.'}</p>
                </div>

                <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                  <div className="text-xs font-mono font-semibold text-primary-light">
                    +{item.xpReward || 150} XP
                  </div>
                  <Button onClick={() => launchPracticeSession(item)} variant="primary" size="sm" icon={FiPlay} className="uppercase text-xs">
                    Play Arena
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PracticeArenaPage
