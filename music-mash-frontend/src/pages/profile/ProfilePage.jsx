import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FiMusic, FiAward, FiTrendingUp, FiEdit, FiSave, FiUser, FiZap, FiDisc, FiCheckCircle } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import Navbar from '../../components/layout/Navbar'
import AmbientBackground from '../../components/ui/AmbientBackground'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import toast from 'react-hot-toast'

const ProfilePage = () => {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [performancesCount, setPerformancesCount] = useState(0)
  const [practiceStats, setPracticeStats] = useState(null)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    country: '',
    experienceLevel: 'BEGINNER',
    primaryInstrument: 'GUITAR',
    secondaryInstrument: '',
    musicGenres: ''
  })

  useEffect(() => {
    fetchProfileData()
  }, [])

  const fetchProfileData = async () => {
    setLoading(true)
    try {
      const [profileRes, perfRes, statsRes] = await Promise.allSettled([
        api.get('/profile/me'),
        api.get('/performances'),
        api.get('/practice/stats')
      ])

      if (profileRes.status === 'fulfilled') {
        const p = profileRes.value.data
        setProfile(p)
        setFormData({
          displayName: p.displayName || '',
          bio: p.bio || '',
          country: p.country || '',
          experienceLevel: p.experienceLevel || 'BEGINNER',
          primaryInstrument: p.primaryInstrument || 'GUITAR',
          secondaryInstrument: p.secondaryInstrument || '',
          musicGenres: p.musicGenres || ''
        })
      }

      if (perfRes.status === 'fulfilled') {
        setPerformancesCount(perfRes.value.data?.length || 0)
      }

      if (statsRes.status === 'fulfilled') {
        setPracticeStats(statsRes.value.data)
      }
    } catch (error) {
      console.error('Failed to fetch profile data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put('/profile', formData)
      toast.success('Command Studio profile updated!')
      setEditing(false)
      fetchProfileData()
    } catch (error) {
      toast.error('Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  const currentLevel = practiceStats?.level || 1
  const totalXp = practiceStats?.totalXp || 0

  return (
    <div className="min-h-screen bg-[#06060A] text-foreground pt-24 pb-20 px-4 relative overflow-hidden">
      <AmbientBackground />
      <Navbar />

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Profile Header */}
        <Card hover={false} variant="glow" className="mb-8 p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary via-secondary to-accent p-[1px] shadow-glow-purple">
                <div className="w-full h-full bg-[#0F101A] rounded-[15px] flex items-center justify-center font-display font-black text-accent text-3xl">
                  {profile?.displayName?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase()}
                </div>
              </div>
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
                  {profile?.displayName || user?.username}
                </h1>
                <p className="text-xs font-mono text-muted">{user?.email || `@${user?.username}`}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="px-3 py-1 bg-accent/15 border border-accent/30 rounded-full text-xs font-mono font-bold text-accent">
                    {profile?.primaryInstrument || 'Instrument Not Set'}
                  </span>
                  <span className="px-3 py-1 bg-primary/15 border border-primary/30 rounded-full text-xs font-mono text-bold text-primary-light">
                    Level {currentLevel} Tier
                  </span>
                </div>
              </div>
            </div>

            <Button onClick={() => setEditing(!editing)} variant="secondary" icon={editing ? FiSave : FiEdit} className="uppercase text-xs font-bold">
              {editing ? 'Cancel' : 'Edit Studio Profile'}
            </Button>
          </div>

          {/* Edit Form Drawer */}
          {editing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-8 pt-6 border-t border-white/10 space-y-4"
            >
              <div>
                <label className="block text-xs font-mono font-bold uppercase text-muted mb-1">Stage Handle</label>
                <Input
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="w-full text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase text-muted mb-1">Bio & Musical Aspirations</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="input-field w-full h-24 text-xs resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase text-muted mb-1">Country</label>
                <Input
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full text-xs"
                />
              </div>

              <Button onClick={handleSave} disabled={saving} variant="accent" icon={FiCheckCircle} className="w-full uppercase text-xs font-bold mt-2">
                {saving ? 'Saving...' : 'Save Profile Changes'}
              </Button>
            </motion.div>
          )}
        </Card>

        {/* Real User Stats Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <Card hover>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/20 text-primary-light flex items-center justify-center text-xl">
                <FiMusic />
              </div>
              <div>
                <div className="text-2xl font-bold font-display text-white">{performancesCount}</div>
                <div className="text-xs uppercase font-mono text-muted">Submissions</div>
              </div>
            </div>
          </Card>

          <Card hover>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-accent/20 text-accent flex items-center justify-center text-xl">
                <FiZap />
              </div>
              <div>
                <div className="text-2xl font-bold font-display text-white">{totalXp} XP</div>
                <div className="text-xs uppercase font-mono text-muted">Earned Practice XP</div>
              </div>
            </div>
          </Card>

          <Card hover>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-warning/20 text-warning flex items-center justify-center text-xl">
                🔥
              </div>
              <div>
                <div className="text-2xl font-bold font-display text-white">{practiceStats?.streak || 0} Days</div>
                <div className="text-xs uppercase font-mono text-muted">Practice Streak</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage
