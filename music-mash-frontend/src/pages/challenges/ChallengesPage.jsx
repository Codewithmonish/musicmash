import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FiAward, FiTarget, FiLock, FiCheck, FiStar, FiZap } from 'react-icons/fi'
import Navbar from '../../components/layout/Navbar'
import AmbientBackground from '../../components/ui/AmbientBackground'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import api from '../../services/api'
import toast from 'react-hot-toast'

const ChallengesPage = () => {
  const [challenges, setChallenges] = useState([])
  const [achievements, setAchievements] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('challenges')

  useEffect(() => {
    fetchChallengesData()
  }, [])

  const fetchChallengesData = async () => {
    setLoading(true)
    try {
      const [challengesRes, achievementsRes] = await Promise.allSettled([
        api.get('/api/challenges'),
        api.get('/api/achievements/user')
      ])

      if (challengesRes.status === 'fulfilled') {
        setChallenges(challengesRes.value.data || [])
      }

      if (achievementsRes.status === 'fulfilled') {
        setAchievements(achievementsRes.value.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch challenges data:', error)
    } finally {
      setLoading(false)
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
              <FiZap className="animate-pulse" /> MILESTONES & REWARDS
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-bold text-white tracking-tight">
            Challenges & <span className="gradient-text">Achievements</span>
          </h1>
          <p className="text-muted text-xs sm:text-sm mt-1">Complete daily goals and unlock milestone badges based on real practice & performance activity.</p>
        </motion.div>

        {/* Tab Selection */}
        <div className="flex gap-4 mb-8 max-w-md">
          <Button
            onClick={() => setActiveTab('challenges')}
            variant={activeTab === 'challenges' ? 'accent' : 'secondary'}
            icon={FiTarget}
            className="flex-1 text-xs uppercase font-bold"
          >
            Daily Challenges
          </Button>
          <Button
            onClick={() => setActiveTab('achievements')}
            variant={activeTab === 'achievements' ? 'primary' : 'secondary'}
            icon={FiAward}
            className="flex-1 text-xs uppercase font-bold"
          >
            Earned Badges
          </Button>
        </div>

        {/* Challenges Section */}
        {activeTab === 'challenges' && (
          <div>
            {challenges.length === 0 ? (
              <Card hover={false} className="text-center py-16 px-4 border-white/10">
                <FiTarget className="text-4xl text-accent mx-auto mb-4" />
                <h3 className="font-display text-lg font-bold text-white mb-1">No Active Challenges</h3>
                <p className="text-muted text-sm">Check back tomorrow for new daily practice challenges!</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {challenges.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card hover className="h-full flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
                            <FiTarget className="text-lg" />
                          </div>
                          <span className="text-xs font-mono font-bold text-primary-light">
                            +{item.xpReward || 100} XP
                          </span>
                        </div>

                        <h3 className="font-display font-bold text-xl text-white mb-2">{item.title}</h3>
                        <p className="text-muted text-xs leading-relaxed mb-4">{item.description}</p>
                      </div>

                      <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                        <span className="text-[10px] font-mono text-muted uppercase">Status: Active</span>
                        <span className="text-xs font-mono font-semibold text-accent">Reward Ready</span>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Achievements Section */}
        {activeTab === 'achievements' && (
          <div>
            {achievements.length === 0 ? (
              <Card hover={false} className="text-center py-16 px-4 border-white/10">
                <FiAward className="text-4xl text-warning mx-auto mb-4" />
                <h3 className="font-display text-lg font-bold text-white mb-1">No Milestones Unlocked Yet</h3>
                <p className="text-muted text-sm max-w-md mx-auto">
                  Complete practice sessions, maintain streaks, or submit your first performance to unlock badges!
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {achievements.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card hover className="text-center h-full border border-primary/30 shadow-glow-purple">
                      <div className="text-5xl mb-3">{item.iconUrl || '🏆'}</div>
                      <h3 className="font-display font-bold text-lg text-white mb-1">{item.title}</h3>
                      <p className="text-muted text-xs leading-relaxed mb-3">{item.description}</p>
                      <div className="text-[10px] font-mono text-success font-semibold">
                        Unlocked {new Date(item.earnedAt).toLocaleDateString()}
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ChallengesPage
