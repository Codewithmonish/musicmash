import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FiUsers, FiSearch, FiUserPlus, FiUserCheck, FiBell, FiMessageCircle, FiRadio } from 'react-icons/fi'
import Navbar from '../../components/layout/Navbar'
import AmbientBackground from '../../components/ui/AmbientBackground'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import api from '../../services/api'
import toast from 'react-hot-toast'

const SocialPage = () => {
  const [activeTab, setActiveTab] = useState('discover')
  const [users, setUsers] = useState([])
  const [notifications, setNotifications] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSocialData()
  }, [])

  const fetchSocialData = async () => {
    setLoading(true)
    try {
      const [usersRes, notificationsRes] = await Promise.allSettled([
        api.get('/api/social/discover'),
        api.get('/api/notifications')
      ])

      if (usersRes.status === 'fulfilled') {
        setUsers(usersRes.value.data || [])
      }

      if (notificationsRes.status === 'fulfilled') {
        setNotifications(notificationsRes.value.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch social data:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleFollow = async (userId, isCurrentlyFollowing) => {
    try {
      if (isCurrentlyFollowing) {
        await api.delete(`/api/social/unfollow/${userId}`)
        toast.success('Unfollowed user')
      } else {
        await api.post(`/api/social/follow/${userId}`)
        toast.success('Started following musician!')
      }
      fetchSocialData()
    } catch (error) {
      toast.error('Action failed')
    }
  }

  const markNotificationRead = async (id) => {
    try {
      await api.put(`/api/notifications/${id}/read`)
      fetchSocialData()
    } catch (err) {
      console.error(err)
    }
  }

  const filteredUsers = users.filter((u) =>
    u.username?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const unreadCount = notifications.filter((n) => !n.isRead).length

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
              <FiUsers className="animate-pulse" /> MUSICIAN HUB
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-bold text-white tracking-tight">
            Community & <span className="gradient-text">Notifications</span>
          </h1>
          <p className="text-muted text-xs sm:text-sm mt-1">Discover fellow musicians, follow performers, and track real-time activity notifications.</p>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 max-w-md">
          <Button
            onClick={() => setActiveTab('discover')}
            variant={activeTab === 'discover' ? 'accent' : 'secondary'}
            icon={FiSearch}
            className="flex-1 text-xs uppercase font-bold"
          >
            Discover Musicians
          </Button>

          <Button
            onClick={() => setActiveTab('notifications')}
            variant={activeTab === 'notifications' ? 'primary' : 'secondary'}
            icon={FiBell}
            className="flex-1 text-xs uppercase font-bold relative"
          >
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 bg-error text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                {unreadCount}
              </span>
            )}
          </Button>
        </div>

        {/* Discover Tab */}
        {activeTab === 'discover' && (
          <div>
            <div className="max-w-md mb-8">
              <Input
                placeholder="Search musicians by stage handle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs"
              />
            </div>

            {filteredUsers.length === 0 ? (
              <Card hover={false} className="text-center py-16 px-4 border-white/10">
                <FiUsers className="text-4xl text-accent mx-auto mb-4" />
                <h3 className="font-display text-lg font-bold text-white mb-1">No Musicians Found</h3>
                <p className="text-muted text-sm">Create additional user accounts to test live following and activity feeds!</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredUsers.map((u, index) => (
                  <motion.div
                    key={u.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08 }}
                  >
                    <Card hover className="text-center flex flex-col justify-between h-full">
                      <div>
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary via-secondary to-accent p-[1px] mx-auto mb-4 shadow-glow-purple">
                          <div className="w-full h-full bg-[#0F101A] rounded-[15px] flex items-center justify-center font-display font-bold text-accent text-xl">
                            {u.username?.[0]?.toUpperCase()}
                          </div>
                        </div>

                        <h3 className="font-display font-bold text-lg text-white mb-1">{u.username}</h3>
                        <div className="text-xs text-accent font-mono mb-4">{u.role || 'USER'}</div>

                        <div className="flex justify-center gap-6 mb-6 text-xs text-muted">
                          <div>
                            <div className="font-bold text-white text-base">{u.followersCount || 0}</div>
                            <div>Followers</div>
                          </div>
                        </div>
                      </div>

                      <Button
                        onClick={() => toggleFollow(u.id, u.isFollowing)}
                        variant={u.isFollowing ? 'secondary' : 'accent'}
                        className="w-full uppercase text-xs font-bold"
                      >
                        {u.isFollowing ? (
                          <span className="flex items-center gap-2 justify-center">
                            <FiUserCheck /> Following
                          </span>
                        ) : (
                          <span className="flex items-center gap-2 justify-center">
                            <FiUserPlus /> Follow Musician
                          </span>
                        )}
                      </Button>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div>
            {notifications.length === 0 ? (
              <Card hover={false} className="text-center py-16 px-4 border-white/10">
                <FiBell className="text-4xl text-primary-light mx-auto mb-4" />
                <h3 className="font-display text-lg font-bold text-white mb-1">No Notifications Yet</h3>
                <p className="text-muted text-sm">Notifications will trigger when you join competitions, earn achievements, or gain followers.</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {notifications.map((n) => (
                  <Card
                    key={n.id}
                    hover
                    onClick={() => !n.isRead && markNotificationRead(n.id)}
                    className={`flex items-center justify-between cursor-pointer border ${
                      !n.isRead ? 'border-primary/50 bg-primary/10 shadow-glow-purple' : 'border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
                        <FiBell />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm">{n.title}</h4>
                        <p className="text-xs text-muted mt-0.5">{n.message}</p>
                        <span className="text-[10px] text-muted/70 font-mono mt-1 block">
                          {new Date(n.createdAt || Date.now()).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {!n.isRead && <span className="w-2.5 h-2.5 rounded-full bg-accent animate-ping" />}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default SocialPage
