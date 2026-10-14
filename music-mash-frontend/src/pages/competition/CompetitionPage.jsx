import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiAward, FiClock, FiUsers, FiPlusCircle, FiCheckCircle, FiDisc, FiTrendingUp, FiX, FiFilter } from 'react-icons/fi'
import Navbar from '../../components/layout/Navbar'
import AmbientBackground from '../../components/ui/AmbientBackground'
import EqualizerBars from '../../components/ui/EqualizerBars'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import api from '../../services/api'
import toast from 'react-hot-toast'

const CompetitionPage = () => {
  const [competitions, setCompetitions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)

  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    category: 'CLASSICAL',
    instrument: 'PIANO',
    prize: 'Grand Trophy & Verified Badge',
    maxParticipants: 50
  })

  useEffect(() => {
    fetchCompetitions()
  }, [])

  const fetchCompetitions = async () => {
    setLoading(true)
    try {
      const response = await api.get('/competitions')
      setCompetitions(response.data || [])
    } catch (error) {
      console.error('Failed to fetch competitions:', error)
      toast.error('Could not connect to competition service')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (competitionId) => {
    try {
      await api.post(`/competitions/${competitionId}/register`)
      toast.success('Registered for competition!')
      fetchCompetitions()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to register for competition')
    }
  }

  const handleCreateCompetition = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      await api.post('/competitions', createForm)
      toast.success('Competition created successfully!')
      setShowCreateModal(false)
      fetchCompetitions()
    } catch (error) {
      console.error(error)
      toast.error('Failed to create competition')
    } finally {
      setCreating(false)
    }
  }

  const getInstrumentEmoji = (instrument) => {
    const emojis = {
      PIANO: '🎹',
      GUITAR: '🎸',
      DRUMS: '🥁',
      VIOLIN: '🎻',
      VOCALS: '🎤',
      SAXOPHONE: '🎷',
      FLUTE: '🪈'
    }
    return emojis[instrument] || '🎵'
  }

  const filteredCompetitions = competitions.filter((comp) => {
    if (filterStatus === 'ALL') return true
    return comp.status === filterStatus
  })

  return (
    <div className="min-h-screen bg-[#06060A] text-foreground pt-24 pb-20 px-4 relative overflow-hidden">
      <AmbientBackground />
      <Navbar />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary-light text-xs font-mono font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <FiAward className="animate-pulse" /> MUSIC TOURNAMENTS
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-5xl font-bold text-white tracking-tight">
              Live <span className="gradient-text">Competitions</span>
            </h1>
            <p className="text-muted text-xs sm:text-sm mt-1">Compete against global musicians, receive judge ratings, and climb rankings.</p>
          </div>

          <Button
            onClick={() => setShowCreateModal(true)}
            variant="accent"
            icon={FiPlusCircle}
            className="uppercase tracking-wider text-xs font-bold"
          >
            Host Competition
          </Button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {['ALL', 'OPEN', 'ACTIVE', 'JUDGING', 'COMPLETED'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-semibold uppercase transition-all whitespace-nowrap ${
                filterStatus === status
                  ? 'bg-gradient-to-r from-primary/30 to-accent/20 border border-primary/40 text-white shadow-glow-purple'
                  : 'bg-white/5 border border-white/10 text-muted hover:text-white'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Competitions Grid */}
        {filteredCompetitions.length === 0 ? (
          /* Empty State - Real Data Only */
          <Card hover={false} className="text-center py-16 px-4 border-white/10">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent text-3xl shadow-glow-cyan">
              <FiAward />
            </div>
            <h3 className="font-display text-xl font-bold text-white mb-2">No Active Competitions Found</h3>
            <p className="text-muted text-sm max-w-md mx-auto mb-6">
              There are currently no competitions matching this filter. Host a competition or check back soon for upcoming tournaments!
            </p>
            <Button onClick={() => setShowCreateModal(true)} variant="primary" icon={FiPlusCircle} className="uppercase text-xs">
              Host First Competition
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCompetitions.map((comp, index) => (
              <motion.div
                key={comp.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
              >
                <Card hover className="h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-4xl">{getInstrumentEmoji(comp.instrument)}</span>
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                          comp.status === 'OPEN'
                            ? 'bg-success/20 text-success border border-success/30'
                            : comp.status === 'ACTIVE'
                            ? 'bg-warning/20 text-warning border border-warning/30'
                            : 'bg-muted/20 text-muted border border-white/10'
                        }`}
                      >
                        {comp.status}
                      </span>
                    </div>

                    <h3 className="font-display font-bold text-xl text-white mb-2">{comp.title}</h3>
                    <p className="text-muted text-xs leading-relaxed mb-4 line-clamp-2">{comp.description}</p>

                    <div className="space-y-2 mb-6 text-xs text-muted">
                      <div className="flex items-center gap-2">
                        <FiAward className="text-accent" />
                        <span>Prize: <strong className="text-white">{comp.prize || 'Trophy & Verified Badge'}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FiUsers className="text-primary-light" />
                        <span>Participants: <strong className="text-white">{comp.currentParticipants || 0} / {comp.maxParticipants || 100}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FiClock className="text-warning" />
                        <span>End Date: <strong className="text-white">{comp.endDate ? new Date(comp.endDate).toLocaleDateString() : 'Active'}</strong></span>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleRegister(comp.id)}
                    variant="accent"
                    className="w-full uppercase text-xs font-bold"
                  >
                    Register & Enter
                  </Button>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Create Competition Modal */}
        <AnimatePresence>
          {showCreateModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#06060A]/90 backdrop-blur-xl z-50 flex items-center justify-center p-4"
              onClick={() => setShowCreateModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="max-w-lg w-full glass-card-glow p-8 relative"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-display text-2xl font-bold text-white">Host New Competition</h3>
                  <button onClick={() => setShowCreateModal(false)} className="text-muted hover:text-white">
                    <FiX className="text-xl" />
                  </button>
                </div>

                <form onSubmit={handleCreateCompetition} className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-1">Competition Title</label>
                    <Input
                      placeholder="e.g. Classical Piano Showcase 2026"
                      value={createForm.title}
                      onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-1">Target Instrument</label>
                    <select
                      value={createForm.instrument}
                      onChange={(e) => setCreateForm({ ...createForm, instrument: e.target.value })}
                      className="input-field w-full text-xs"
                    >
                      <option value="PIANO">Piano</option>
                      <option value="GUITAR">Guitar</option>
                      <option value="VOCALS">Vocals</option>
                      <option value="DRUMS">Drums</option>
                      <option value="VIOLIN">Violin</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-1">Prize Reward</label>
                    <Input
                      placeholder="e.g. $500 Cash + Gold Badge"
                      value={createForm.prize}
                      onChange={(e) => setCreateForm({ ...createForm, prize: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-1">Description & Rules</label>
                    <textarea
                      placeholder="Competition guidelines and submission requirements..."
                      value={createForm.description}
                      onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                      className="input-field w-full h-24 text-xs resize-none"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button type="button" onClick={() => setShowCreateModal(false)} variant="secondary" className="flex-1 uppercase text-xs">
                      Cancel
                    </Button>
                    <Button type="submit" variant="accent" disabled={creating} className="flex-1 uppercase text-xs font-bold">
                      {creating ? 'Creating...' : 'Publish Tournament'}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default CompetitionPage
