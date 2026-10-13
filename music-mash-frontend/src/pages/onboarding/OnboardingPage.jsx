import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FiMusic, FiMic, FiGlobe, FiTarget, FiArrowRight, FiCheckCircle } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import Navbar from '../../components/layout/Navbar'
import AmbientBackground from '../../components/ui/AmbientBackground'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'

const INSTRUMENTS = [
  { id: 'VOCALS', label: 'Vocals', emoji: '🎤' },
  { id: 'GUITAR', label: 'Guitar', emoji: '🎸' },
  { id: 'PIANO', label: 'Piano', emoji: '🎹' },
  { id: 'DRUMS', label: 'Drums', emoji: '🥁' },
  { id: 'VIOLIN', label: 'Violin', emoji: '🎻' },
  { id: 'BASS', label: 'Bass', emoji: '🎸' },
  { id: 'SAXOPHONE', label: 'Saxophone', emoji: '🎷' },
  { id: 'FLUTE', label: 'Flute', emoji: '🪈' },
  { id: 'OTHER', label: 'Other', emoji: '🎵' }
]

const EXPERIENCE_LEVELS = [
  { id: 'BEGINNER', label: 'Beginner', description: 'Starting my musical journey' },
  { id: 'INTERMEDIATE', label: 'Intermediate', description: 'Confident with fundamentals & songs' },
  { id: 'ADVANCED', label: 'Advanced', description: 'High technical precision & repertoire' },
  { id: 'PROFESSIONAL', label: 'Professional', description: 'Active performer or instructor' }
]

const GENRES = [
  'Pop', 'Rock', 'Jazz', 'Classical', 'Hip Hop', 'R&B', 
  'Country', 'Electronic', 'Blues', 'Folk', 'Metal', 'Indie'
]

const GOALS = [
  'Improve Pitch & Rhythm Accuracy', 'Receive AI & Judge Feedback', 
  'Compete on Leaderboards', 'Record & Showcase Tracks', 
  'Master Instrument Technique', 'Daily Practice Consistency'
]

const OnboardingPage = () => {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    displayName: user?.username || '',
    bio: '',
    country: '',
    experienceLevel: 'BEGINNER',
    primaryInstrument: 'GUITAR',
    secondaryInstrument: '',
    musicGenres: ['Rock'],
    goals: ['Receive AI & Judge Feedback']
  })

  const handleGenreToggle = (genre) => {
    setFormData(prev => ({
      ...prev,
      musicGenres: prev.musicGenres.includes(genre)
        ? prev.musicGenres.filter(g => g !== genre)
        : [...prev.musicGenres, genre]
    }))
  }

  const handleGoalToggle = (goal) => {
    setFormData(prev => ({
      ...prev,
      goals: prev.goals.includes(goal)
        ? prev.goals.filter(g => g !== goal)
        : [...prev.goals, goal]
    }))
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await api.put('/api/profile', {
        displayName: formData.displayName,
        bio: formData.bio,
        country: formData.country,
        experienceLevel: formData.experienceLevel,
        primaryInstrument: formData.primaryInstrument,
        secondaryInstrument: formData.secondaryInstrument,
        musicGenres: formData.musicGenres.join(','),
        goals: formData.goals.join(',')
      })
      toast.success('Command Center Profile Initialized!')
      navigate('/dashboard')
    } catch (error) {
      console.error(error)
      toast.error('Failed to save profile setup.')
    } finally {
      setLoading(false)
    }
  }

  const nextStep = () => {
    if (step < 4) setStep(step + 1)
  }

  const prevStep = () => {
    if (step > 1) setStep(step - 1)
  }

  return (
    <div className="min-h-screen bg-[#06060A] text-foreground pt-24 pb-20 px-4 relative overflow-hidden">
      <AmbientBackground />
      <Navbar />
      
      <div className="max-w-2xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-accent bg-accent/10 px-3 py-1 rounded-full border border-accent/20">
            Musician Onboarding
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white mt-3 mb-2">
            Configure Your <span className="gradient-text">Command Studio</span>
          </h1>
          <p className="text-muted text-xs sm:text-sm">Step {step} of 4 • Set your preferences for AI coaching & competitions</p>
          
          {/* Futuristic Step Progress Bar */}
          <div className="w-full bg-white/5 border border-white/10 rounded-full h-2 mt-6 overflow-hidden">
            <motion.div
              className="bg-gradient-to-r from-primary via-secondary to-accent h-2 rounded-full shadow-glow-purple"
              initial={{ width: '25%' }}
              animate={{ width: `${step * 25}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </motion.div>

        <Card variant="glow" className="p-8">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-2">
                    Stage Name / Display Handle
                  </label>
                  <Input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    className="w-full"
                    placeholder="e.g. Jimi Hendrix"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-2">
                    Musician Bio & Aspirations
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="input-field w-full h-28 resize-none"
                    placeholder="Describe your musical background, inspirations, or favorite styles..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-2">
                    Country / Region
                  </label>
                  <Input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full"
                    placeholder="e.g. United States, India, UK..."
                  />
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-3">
                    Select Skill Tier
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {EXPERIENCE_LEVELS.map((level) => {
                      const selected = formData.experienceLevel === level.id
                      return (
                        <button
                          key={level.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, experienceLevel: level.id })}
                          className={`p-4 rounded-xl text-left border transition-all duration-300 ${
                            selected
                              ? 'bg-primary/20 border-primary shadow-glow-purple text-white'
                              : 'bg-white/5 border-white/10 hover:border-white/20 text-muted'
                          }`}
                        >
                          <div className="font-bold text-white text-sm flex items-center justify-between">
                            {level.label}
                            {selected && <FiCheckCircle className="text-accent" />}
                          </div>
                          <div className="text-xs text-muted/80 mt-1">{level.description}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-3">
                    Primary Instrument
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-3 gap-3">
                    {INSTRUMENTS.map((inst) => {
                      const selected = formData.primaryInstrument === inst.id
                      return (
                        <button
                          key={inst.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, primaryInstrument: inst.id })}
                          className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${
                            selected
                              ? 'bg-accent/20 border-accent text-white shadow-glow-cyan'
                              : 'bg-white/5 border-white/10 text-muted hover:border-white/20'
                          }`}
                        >
                          <span className="text-2xl mb-1">{inst.emoji}</span>
                          <span className="text-xs font-semibold">{inst.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-3">
                    Favorite Musical Genres
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {GENRES.map((genre) => {
                      const selected = formData.musicGenres.includes(genre)
                      return (
                        <button
                          key={genre}
                          type="button"
                          onClick={() => handleGenreToggle(genre)}
                          className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                            selected
                              ? 'bg-secondary/20 border-secondary text-white shadow-glow-magenta'
                              : 'bg-white/5 border-white/10 text-muted hover:border-white/20'
                          }`}
                        >
                          {genre}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-3">
                    Secondary Instrument (Optional)
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {INSTRUMENTS.slice(0, 6).map((inst) => {
                      const selected = formData.secondaryInstrument === inst.id
                      return (
                        <button
                          key={inst.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, secondaryInstrument: inst.id })}
                          className={`p-2.5 rounded-xl border flex flex-col items-center transition-all ${
                            selected
                              ? 'bg-primary/20 border-primary text-white'
                              : 'bg-white/5 border-white/10 text-muted hover:border-white/20'
                          }`}
                        >
                          <span className="text-xl">{inst.emoji}</span>
                          <span className="text-[11px] font-medium mt-1">{inst.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-3">
                    Select Your Music Goals
                  </label>
                  <div className="space-y-3">
                    {GOALS.map((goal) => {
                      const selected = formData.goals.includes(goal)
                      return (
                        <button
                          key={goal}
                          type="button"
                          onClick={() => handleGoalToggle(goal)}
                          className={`w-full p-4 rounded-xl border text-left flex items-center justify-between transition-all ${
                            selected
                              ? 'bg-accent/15 border-accent text-white shadow-glow-cyan'
                              : 'bg-white/5 border-white/10 text-muted hover:border-white/20'
                          }`}
                        >
                          <span className="text-sm font-medium">{goal}</span>
                          {selected && <FiCheckCircle2 className="text-accent text-lg" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between mt-10 pt-6 border-t border-white/10">
            <Button
              onClick={prevStep}
              disabled={step === 1}
              variant="secondary"
              size="md"
            >
              Back
            </Button>
            
            {step < 4 ? (
              <Button onClick={nextStep} variant="primary" size="md" icon={FiArrowRight}>
                Next Step
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading} variant="accent" size="md" icon={FiCheckCircle2}>
                {loading ? 'Saving Profile...' : 'Complete Setup'}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

export default OnboardingPage
