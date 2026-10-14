import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiPlay, FiCheck, FiX, FiMusic, FiStar, FiMessageSquare, FiShield, FiRadio } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import Navbar from '../../components/layout/Navbar'
import AmbientBackground from '../../components/ui/AmbientBackground'
import EqualizerBars from '../../components/ui/EqualizerBars'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import api from '../../services/api'

const JudgeDashboard = () => {
  const [performances, setPerformances] = useState([])
  const [loading, setLoading] = useState(true)
  const [evaluatingId, setEvaluatingId] = useState(null)
  
  const [evaluationForm, setEvaluationForm] = useState({
    pitchScore: 85,
    rhythmScore: 88,
    techniqueScore: 90,
    creativityScore: 85,
    overallScore: 87,
    feedback: ''
  })

  useEffect(() => {
    fetchPendingPerformances()
  }, [])

  const fetchPendingPerformances = async () => {
    setLoading(true)
    try {
      const response = await api.get('/performances')
      setPerformances(response.data || [])
    } catch (error) {
      console.error('Failed to fetch performances:', error)
    } finally {
      setLoading(false)
    }
  }

  const startEvaluation = (perf) => {
    setEvaluatingId(perf.id)
    setEvaluationForm({
      pitchScore: 85,
      rhythmScore: 88,
      techniqueScore: 90,
      creativityScore: 85,
      overallScore: 87,
      feedback: ''
    })
  }

  const submitEvaluation = async (performanceId, action) => {
    try {
      if (action === 'approve') {
        await api.post(`/performances/${performanceId}/submit`, evaluationForm)
        toast.success('Performance evaluated and approved!')
      } else {
        toast.success('Performance review recorded.')
      }
      setEvaluatingId(null)
      fetchPendingPerformances()
    } catch (error) {
      console.error(error)
      toast.error('Failed to save evaluation.')
    }
  }

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
            <span className="px-3 py-1 rounded-full bg-secondary/15 border border-secondary/30 text-secondary text-xs font-mono font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <FiShield className="animate-pulse" /> EXPERT JUDGE ARENA
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-bold text-white tracking-tight">
            Judge <span className="gradient-text">Evaluation Studio</span>
          </h1>
          <p className="text-muted text-xs sm:text-sm mt-1">Review student & competitor performance submissions with certified criteria scoring.</p>
        </motion.div>

        {performances.length === 0 ? (
          /* Empty State - REAL DATA ONLY */
          <Card hover={false} className="text-center py-16 px-4 border-white/10">
            <FiMusic className="text-4xl text-primary-light mx-auto mb-4" />
            <h3 className="font-display text-xl font-bold text-white mb-2">No Submissions Pending Review</h3>
            <p className="text-muted text-sm max-w-md mx-auto">
              When musicians submit performance tracks from the Studio, they will appear here for judge evaluation and scoring.
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            {performances.map((perf) => (
              <Card key={perf.id} hover={false} className="border-white/10">
                {evaluatingId === perf.id ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between pb-4 border-b border-white/10">
                      <div>
                        <h3 className="font-display font-bold text-xl text-white">{perf.title}</h3>
                        <p className="text-xs text-muted">Evaluating Track • {perf.instrument}</p>
                      </div>
                      <EqualizerBars count={5} className="h-6 gap-1" />
                    </div>

                    {/* Criteria Sliders */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <div className="flex justify-between text-xs font-mono text-muted mb-1">
                          <span>Pitch Accuracy</span>
                          <span className="text-accent font-bold">{evaluationForm.pitchScore}/100</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={evaluationForm.pitchScore}
                          onChange={(e) => setEvaluationForm({ ...evaluationForm, pitchScore: parseInt(e.target.value) })}
                          className="w-full accent-accent"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-mono text-muted mb-1">
                          <span>Rhythm & Timing</span>
                          <span className="text-primary-light font-bold">{evaluationForm.rhythmScore}/100</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={evaluationForm.rhythmScore}
                          onChange={(e) => setEvaluationForm({ ...evaluationForm, rhythmScore: parseInt(e.target.value) })}
                          className="w-full accent-primary"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-mono text-muted mb-1">
                          <span>Technique & Articulation</span>
                          <span className="text-secondary font-bold">{evaluationForm.techniqueScore}/100</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={evaluationForm.techniqueScore}
                          onChange={(e) => setEvaluationForm({ ...evaluationForm, techniqueScore: parseInt(e.target.value) })}
                          className="w-full accent-secondary"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-mono text-muted mb-1">
                          <span>Overall Musical Expression</span>
                          <span className="text-warning font-bold">{evaluationForm.overallScore}/100</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={evaluationForm.overallScore}
                          onChange={(e) => setEvaluationForm({ ...evaluationForm, overallScore: parseInt(e.target.value) })}
                          className="w-full accent-warning"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-2">
                        Judge Constructive Feedback
                      </label>
                      <textarea
                        value={evaluationForm.feedback}
                        onChange={(e) => setEvaluationForm({ ...evaluationForm, feedback: e.target.value })}
                        placeholder="Provide detailed feedback on tone, timing, posture, and technical areas..."
                        className="input-field w-full h-28 text-xs resize-none"
                      />
                    </div>

                    <div className="flex gap-4 pt-4 border-t border-white/10">
                      <Button onClick={() => setEvaluatingId(null)} variant="secondary" className="flex-1 uppercase text-xs">
                        Cancel
                      </Button>
                      <Button onClick={() => submitEvaluation(perf.id, 'approve')} variant="accent" className="flex-1 uppercase text-xs font-bold">
                        Publish Judge Evaluation
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center text-accent text-2xl">
                        <FiMusic />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-lg text-white">{perf.title}</h3>
                        <div className="text-xs text-muted flex items-center gap-2 mt-1">
                          <span>🎹 {perf.instrument}</span>
                          <span>• Category: {perf.category || 'General'}</span>
                          <span>• Status: {perf.status}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Button onClick={() => startEvaluation(perf)} variant="accent" icon={FiStar} className="uppercase text-xs font-bold">
                        Evaluate Submission
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default JudgeDashboard
