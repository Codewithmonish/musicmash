import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FiAward, FiTrendingUp, FiZap, FiCheckCircle, FiDisc } from 'react-icons/fi'
import Navbar from '../../components/layout/Navbar'
import AmbientBackground from '../../components/ui/AmbientBackground'
import EqualizerBars from '../../components/ui/EqualizerBars'
import Card from '../../components/ui/Card'
import api from '../../services/api'

const LeaderboardPage = () => {
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  const fetchLeaderboard = async () => {
    setLoading(true)
    try {
      const response = await api.get('/leaderboard')
      setLeaderboard(response.data || [])
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#06060A] text-foreground pt-24 pb-20 px-4 relative overflow-hidden">
      <AmbientBackground />
      <Navbar />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent text-xs font-mono font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <FiTrendingUp className="animate-pulse" /> GLOBAL RANKINGS
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-bold text-white tracking-tight">
            Hall of <span className="gradient-text-cyan">Prestige</span>
          </h1>
          <p className="text-muted text-xs sm:text-sm mt-1">Real-time global musician rankings based on practice XP, competition scores, and performance mastery.</p>
        </motion.div>

        {leaderboard.length === 0 ? (
          /* Empty State - REAL DATA ONLY */
          <Card hover={false} className="text-center py-16 px-4 border-white/10">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary-light text-3xl shadow-glow-purple">
              <FiAward />
            </div>
            <h3 className="font-display text-xl font-bold text-white mb-2">No Rankings Yet</h3>
            <p className="text-muted text-sm max-w-md mx-auto">
              Be the first musician to log practice sessions or upload tracks to claim rank #1 on the global leaderboard!
            </p>
          </Card>
        ) : (
          <>
            {/* Top 3 Podium */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              {[
                leaderboard[1] ? { rank: 2, ...leaderboard[1], medal: '🥈', glow: 'border-secondary/40 shadow-glow-magenta' } : null,
                leaderboard[0] ? { rank: 1, ...leaderboard[0], medal: '🥇', glow: 'border-accent/40 shadow-glow-cyan' } : null,
                leaderboard[2] ? { rank: 3, ...leaderboard[2], medal: '🥉', glow: 'border-primary/40 shadow-glow-purple' } : null,
              ].filter(Boolean).map((entry, index) => (
                <motion.div
                  key={entry.rank}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card hover className={`text-center relative p-8 border ${entry.glow}`}>
                    <div className="absolute top-3 right-4 font-mono font-black text-xs text-muted">
                      RANK #{entry.rank}
                    </div>

                    <div className="text-5xl mb-3">{entry.medal}</div>
                    <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-primary via-secondary to-accent p-[1px]">
                      <div className="w-full h-full bg-[#0F101A] rounded-[15px] flex items-center justify-center font-display font-bold text-accent text-xl">
                        {entry.username?.[0]?.toUpperCase()}
                      </div>
                    </div>

                    <h3 className="font-display font-bold text-lg text-white mb-1">{entry.username}</h3>
                    <div className="text-xs text-accent font-mono mb-2">Tier {entry.level || 1} Musician</div>
                    <div className="text-2xl font-display font-black gradient-text">{entry.totalXp?.toLocaleString() || 0} XP</div>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Remaining Global Ranks */}
            {leaderboard.length > 3 && (
              <Card hover={false} className="border-white/10">
                <div className="space-y-3">
                  {leaderboard.slice(3).map((entry, index) => (
                    <motion.div
                      key={entry.userId || index}
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-primary/30 transition-all duration-300"
                    >
                      <div className="flex items-center gap-4">
                        <span className="font-mono font-bold text-base text-muted w-8 text-center">#{entry.rank || index + 4}</span>
                        <div className="w-10 h-10 rounded-xl bg-surface border border-white/10 flex items-center justify-center font-display font-bold text-white">
                          {entry.username?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm">{entry.username}</div>
                          <div className="text-xs text-muted">Tier {entry.level || 1} • 🔥 {entry.streak || 0} Day Streak</div>
                        </div>
                      </div>

                      <div className="font-display font-bold text-lg text-accent">
                        {entry.totalXp?.toLocaleString() || 0} XP
                      </div>
                    </motion.div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default LeaderboardPage
