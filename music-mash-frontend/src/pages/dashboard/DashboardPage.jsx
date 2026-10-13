import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FiMusic, FiTrendingUp, FiAward, FiUpload, FiZap, FiTarget, 
  FiActivity, FiRadio, FiShield, FiClock, FiPlusCircle, FiChevronRight, 
  FiCpu, FiCheckCircle, FiAlertCircle, FiStar, FiPlay 
} from 'react-icons/fi'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import Navbar from '../../components/layout/Navbar'
import AmbientBackground from '../../components/ui/AmbientBackground'
import EqualizerBars from '../../components/ui/EqualizerBars'
import RadialProgress from '../../components/ui/RadialProgress'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'

const DashboardPage = () => {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [performances, setPerformances] = useState([])
  const [practiceStats, setPracticeStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    setError(null)
    try {
      // Parallel API calls with graceful fallback for modules under construction
      const [profileRes, performancesRes, practiceStatsRes] = await Promise.allSettled([
        api.get('/api/profile/me'),
        api.get('/api/performances'),
        api.get('/api/practice/stats')
      ])

      if (profileRes.status === 'fulfilled') {
        setProfile(profileRes.value.data)
      }
      
      if (performancesRes.status === 'fulfilled') {
        setPerformances(performancesRes.value.data || [])
      }

      if (practiceStatsRes.status === 'fulfilled') {
        setPracticeStats(practiceStatsRes.value.data)
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
      setError('Unable to load some command center metrics. Connecting to server...')
    } finally {
      setLoading(false)
    }
  }

  // Calculate real metrics from database values
  const totalPerformances = performances.length
  const approvedPerformances = performances.filter(p => p.status === 'APPROVED').length
  const latestPerformance = performances.length > 0 ? performances[0] : null
  
  // Real XP and Level calculation (or 0 if new)
  const currentXP = practiceStats?.totalXp || (approvedPerformances * 100) || 0
  const currentLevel = practiceStats?.level || Math.floor(currentXP / 250) + 1
  const xpForNextLevel = currentLevel * 250
  const xpProgress = Math.min(100, Math.round(((currentXP % 250) / 250) * 100))
  const streakDays = practiceStats?.streak || 0

  return (
    <div className="min-h-screen bg-[#06060A] text-foreground relative overflow-hidden">
      <AmbientBackground />
      <Navbar />

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20">
        {/* Banner Section - Command Center Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative glass-card-glow mb-10 overflow-hidden"
        >
          {/* Subtle equalizer accent in header background */}
          <div className="absolute right-6 top-6 opacity-20 hidden md:block">
            <EqualizerBars count={12} className="h-20 gap-1.5" />
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent text-xs font-mono font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
                  COMMAND CENTER ONLINE
                </span>
                <span className="text-xs text-muted font-mono">
                  {profile?.instrument ? `• ${profile.instrument}` : ''}
                </span>
              </div>

              <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2">
                Welcome, <span className="gradient-text">{profile?.displayName || user?.username}</span>
              </h1>
              <p className="text-muted text-sm sm:text-base max-w-2xl">
                {profile?.bio || 'Track your performance evaluations, AI coaching recommendations, and musical progression.'}
              </p>
            </div>

            {/* Quick Command Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <Link to="/upload">
                <Button variant="accent" icon={FiUpload} className="text-xs uppercase tracking-wider">
                  Upload Track
                </Button>
              </Link>
              <Link to="/practice">
                <Button variant="secondary" icon={FiTarget} className="text-xs uppercase tracking-wider">
                  Practice Arena
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Real Metrics Command Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {/* Level & XP Card */}
          <Card hover variant="gradient" className="flex items-center gap-5">
            <RadialProgress progress={xpProgress} size={84} strokeWidth={6} label={`LVL ${currentLevel}`} sublabel={`${currentXP} XP`} />
            <div>
              <div className="text-xs uppercase tracking-widest text-muted font-mono font-semibold mb-1">Skill Tier</div>
              <div className="text-lg font-bold font-display text-white">{profile?.experienceLevel || 'BEGINNER'}</div>
              <div className="text-xs text-accent font-medium mt-1">
                {250 - (currentXP % 250)} XP to Level {currentLevel + 1}
              </div>
            </div>
          </Card>

          {/* Practice Streak Card */}
          <Card hover className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted font-mono font-semibold mb-1">Practice Streak</div>
              <div className="text-3xl font-display font-black text-white flex items-baseline gap-1">
                {streakDays} <span className="text-sm font-normal text-muted">Days</span>
              </div>
              <div className="text-xs text-muted mt-1 flex items-center gap-1">
                <FiZap className="text-warning" />
                {streakDays > 0 ? 'Streak Active!' : 'Practice today to start streak'}
              </div>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-warning/10 border border-warning/20 flex items-center justify-center text-warning text-2xl shadow-glow-purple">
              🔥
            </div>
          </Card>

          {/* Performance Count */}
          <Card hover className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted font-mono font-semibold mb-1">Performances</div>
              <div className="text-3xl font-display font-black text-white">{totalPerformances}</div>
              <div className="text-xs text-success mt-1 flex items-center gap-1">
                <FiCheckCircle /> {approvedPerformances} Approved
              </div>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary-light text-2xl">
              <FiMusic />
            </div>
          </Card>

          {/* Competition / Ranking Status */}
          <Card hover className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted font-mono font-semibold mb-1">Global Standing</div>
              <div className="text-lg font-bold font-display text-white">
                {practiceStats?.rank ? `#${practiceStats.rank}` : 'Unranked'}
              </div>
              <div className="text-xs text-muted mt-1 flex items-center gap-1">
                <FiTrendingUp className="text-accent" />
                Submit tracks to rank
              </div>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent text-2xl">
              <FiAward />
            </div>
          </Card>
        </div>

        {/* Main Dashboard Layout (2 Columns: Recent Activity & AI Coach) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Left Column: Recent Performances & Journey (2 Cols) */}
          <div className="lg:col-span-2 space-y-8">
            {/* Recent Performances Panel */}
            <Card hover={false} className="border-white/10">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/20 text-primary-light">
                    <FiMusic className="text-xl" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-bold text-white">Recent Tracks</h2>
                    <p className="text-xs text-muted">Your recorded musical submissions</p>
                  </div>
                </div>
                <Link to="/upload" className="text-xs font-semibold text-accent hover:underline flex items-center gap-1">
                  New Upload <FiChevronRight />
                </Link>
              </div>

              {performances.length > 0 ? (
                <div className="space-y-4">
                  {performances.slice(0, 4).map((perf) => (
                    <div
                      key={perf.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-primary/30 transition-all duration-300 gap-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center text-accent">
                          <FiPlay className="text-lg ml-0.5" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-white text-base">{perf.title}</h4>
                          <div className="text-xs text-muted flex items-center gap-3 mt-1">
                            <span>🎹 {perf.instrument}</span>
                            <span>• {perf.category || 'General'}</span>
                            <span>• {new Date(perf.submittedAt || perf.createdAt || Date.now()).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                            perf.status === 'APPROVED'
                              ? 'bg-success/20 text-success border border-success/30'
                              : perf.status === 'SUBMITTED' || perf.status === 'PENDING'
                              ? 'bg-warning/20 text-warning border border-warning/30'
                              : 'bg-muted/20 text-muted border border-white/10'
                          }`}
                        >
                          {perf.status}
                        </span>

                        <Link
                          to={`/ai-analysis/${perf.id}`}
                          className="btn-outline py-1.5 px-3 text-xs"
                        >
                          View Analysis
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Encouragement Empty State - NO FAKE DATA */
                <div className="text-center py-14 px-4 bg-white/5 rounded-xl border border-dashed border-white/10">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary-light text-2xl shadow-glow-purple">
                    <FiMusic />
                  </div>
                  <h3 className="font-display text-lg font-bold text-white mb-1">No Performances Recorded Yet</h3>
                  <p className="text-muted text-sm max-w-md mx-auto mb-6">
                    Upload audio or video recordings of your performance to receive real-time AI feedback and professional judge evaluations.
                  </p>
                  <Link to="/upload">
                    <Button variant="primary" icon={FiPlusCircle} className="text-xs uppercase tracking-wider">
                      Record Your First Performance
                    </Button>
                  </Link>
                </div>
              )}
            </Card>

            {/* Quick Practice & Goal Section */}
            <Card hover={false} className="border-white/10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-accent/20 text-accent">
                    <FiTarget className="text-xl" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-bold text-white">Daily Musical Focus</h2>
                    <p className="text-xs text-muted">Recommended practice for skill progression</p>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-gradient-to-r from-surface to-primary/10 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-accent bg-accent/15 px-2.5 py-1 rounded-md mb-2 inline-block">
                    {profile?.instrument ? `${profile.instrument} TECHNIQUE` : 'FUNDAMENTAL PRACTICE'}
                  </span>
                  <h4 className="font-display text-lg font-bold text-white">Rhythm & Timing Consistency</h4>
                  <p className="text-xs text-muted mt-1 max-w-xl">
                    Focus on maintaining steady tempo with metronome backing. Practice for 15 minutes in the Practice Arena.
                  </p>
                </div>
                <Link to="/practice" className="shrink-0">
                  <Button variant="accent" className="text-xs uppercase">
                    Start Arena
                  </Button>
                </Link>
              </div>
            </Card>
          </div>

          {/* Right Column: AI Coach & Achievements Sidebar */}
          <div className="space-y-8">
            {/* AI Coach Assistant Panel */}
            <Card hover={false} variant="glow" className="relative overflow-hidden">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10">
                <div className="p-2 rounded-xl bg-secondary/20 text-secondary">
                  <FiCpu className="text-xl animate-spin-slow" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
                    AI Music Coach <FiStar className="text-accent text-sm" />
                  </h3>
                  <p className="text-xs text-muted">Automated Audio & Pitch Insights</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-xs leading-relaxed text-muted">
                  <p className="text-white font-medium mb-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-success" />
                    Coach System Status: Ready
                  </p>
                  {performances.length > 0 ? (
                    `Your latest performance "${latestPerformance?.title}" is indexed for evaluation. Check back for pitch & tempo analysis.`
                  ) : (
                    'Record your first audio track to generate automated pitch detection, rhythm timing score, and personalized practice drills.'
                  )}
                </div>

                <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 space-y-2">
                  <div className="text-xs font-semibold text-primary-light uppercase tracking-wider">AI Recommendation</div>
                  <div className="text-xs text-white">
                    {profile?.instrument ? `Master scales in C Major for ${profile.instrument}.` : 'Set your primary instrument in your profile to unlock customized drills.'}
                  </div>
                </div>

                <Link to="/upload" className="block text-center text-xs font-semibold text-accent hover:underline pt-2">
                  Submit Audio for AI Analysis →
                </Link>
              </div>
            </Card>

            {/* Achievements Progress */}
            <Card hover={false} className="border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
                  <FiAward className="text-warning" /> Milestones & Badges
                </h3>
                <Link to="/challenges" className="text-xs text-muted hover:text-white">View All</Link>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 opacity-60">
                  <div className="text-2xl">🎻</div>
                  <div>
                    <div className="text-xs font-bold text-white">First Stage</div>
                    <div className="text-[10px] text-muted">Submit your first performance</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 opacity-60">
                  <div className="text-2xl">🔥</div>
                  <div>
                    <div className="text-xs font-bold text-white">7-Day Streak</div>
                    <div className="text-[10px] text-muted">Practice 7 consecutive days</div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

export default DashboardPage
