import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FiMusic, FiUser, FiLogOut, FiHome, FiTrendingUp, FiUpload, 
  FiAward, FiTarget, FiUsers, FiMenu, FiX, FiZap, FiBell, FiChevronDown, FiDisc 
} from 'react-icons/fi'
import EqualizerBars from '../ui/EqualizerBars'

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const navLinks = [
    { to: '/dashboard', icon: FiHome, label: 'Dashboard' },
    { to: '/upload', icon: FiUpload, label: 'Studio' },
    { to: '/practice', icon: FiTarget, label: 'Practice Arena' },
    { to: '/challenges', icon: FiZap, label: 'Challenges' },
    { to: '/social', icon: FiUsers, label: 'Community' },
    { to: '/competitions', icon: FiAward, label: 'Competitions' },
    { to: '/leaderboard', icon: FiTrendingUp, label: 'Rankings' },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10 bg-[#06060A]/85 backdrop-blur-xl"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to={isAuthenticated ? '/dashboard' : '/'} className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary via-secondary to-accent p-[1px] shadow-glow-purple group-hover:shadow-glow-cyan transition-all duration-500">
                <div className="w-full h-full bg-[#0F101A] rounded-[11px] flex items-center justify-center">
                  <FiDisc className="text-accent text-2xl group-hover:rotate-180 transition-transform duration-700" />
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1">
                <EqualizerBars count={3} className="h-3 gap-0.5" />
              </div>
            </div>
            <div>
              <span className="font-display font-bold text-xl tracking-tight text-white flex items-center gap-1.5">
                MUSIC<span className="gradient-text-cyan font-black">MASH</span>
              </span>
              <span className="text-[10px] tracking-widest text-muted/70 uppercase font-semibold block -mt-1">
                Command Studio
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          {isAuthenticated ? (
            <>
              <nav className="hidden xl:flex items-center gap-1 bg-surface/50 p-1.5 rounded-2xl border border-white/5">
                {navLinks.map((link) => {
                  const active = isActive(link.to)
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                        active
                          ? 'text-white font-semibold'
                          : 'text-muted hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {active && (
                        <motion.div
                          layoutId="nav-pill"
                          className="absolute inset-0 bg-gradient-to-r from-primary/30 via-secondary/20 to-accent/20 border border-primary/40 rounded-xl shadow-glow-purple"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                      <link.icon className={`relative z-10 text-base ${active ? 'text-accent' : 'text-muted'}`} />
                      <span className="relative z-10">{link.label}</span>
                    </Link>
                  )
                })}
              </nav>

              {/* User Menu & Actions */}
              <div className="hidden xl:flex items-center gap-4">
                <Link
                  to="/upload"
                  className="btn-accent text-xs uppercase tracking-wider py-2.5 px-4 flex items-center gap-2"
                >
                  <FiUpload className="text-sm" />
                  <span>Record</span>
                </Link>

                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-3 p-1.5 pr-3 rounded-2xl bg-surface/80 hover:bg-surface border border-white/10 hover:border-primary/40 transition-all duration-300"
                  >
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary p-[1px]">
                      <div className="w-full h-full bg-[#0F101A] rounded-[11px] flex items-center justify-center font-display font-bold text-accent">
                        {user?.username?.[0]?.toUpperCase()}
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-semibold text-white leading-tight">{user?.username}</div>
                      <div className="text-[10px] text-accent font-medium leading-tight">Musician</div>
                    </div>
                    <FiChevronDown className={`text-muted transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-3 w-56 glass rounded-2xl p-2 shadow-glass-card border border-white/15 overflow-hidden z-50"
                      >
                        <div className="px-3 py-2 bg-white/5 rounded-xl mb-1">
                          <div className="text-xs text-muted">Signed in as</div>
                          <div className="text-sm font-semibold text-white truncate">{user?.email || user?.username}</div>
                        </div>

                        <Link
                          to="/profile"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted hover:text-white hover:bg-primary/20 transition-all"
                        >
                          <FiUser className="text-primary-light" />
                          <span>Profile Studio</span>
                        </Link>
                        <Link
                          to="/social"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted hover:text-white hover:bg-primary/20 transition-all"
                        >
                          <FiBell className="text-accent" />
                          <span>Notifications</span>
                        </Link>
                        <div className="my-1 border-t border-white/10" />
                        <button
                          onClick={() => {
                            handleLogout()
                            setUserMenuOpen(false)
                          }}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-error hover:bg-error/15 transition-all w-full text-left"
                        >
                          <FiLogOut />
                          <span>Disconnect</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Mobile Menu Trigger */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="xl:hidden p-2.5 rounded-xl bg-surface border border-white/10 text-white hover:border-primary/50 transition-colors"
              >
                {mobileMenuOpen ? <FiX className="text-xl" /> : <FiMenu className="text-xl" />}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-4">
              <Link to="/login" className="text-sm font-semibold text-muted hover:text-white transition-colors px-4 py-2">
                Login
              </Link>
              <Link to="/register" className="btn-primary text-sm py-2.5 px-6">
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && isAuthenticated && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="xl:hidden glass border-t border-white/10 bg-[#07070D]/95 backdrop-blur-2xl"
          >
            <div className="px-4 py-6 space-y-2 max-h-[80vh] overflow-y-auto">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base transition-all ${
                    isActive(link.to)
                      ? 'bg-gradient-to-r from-primary/30 to-accent/20 border border-primary/40 text-white font-semibold'
                      : 'text-muted hover:text-white hover:bg-white/5'
                  }`}
                >
                  <link.icon className={isActive(link.to) ? 'text-accent' : ''} />
                  <span>{link.label}</span>
                </Link>
              ))}
              <div className="border-t border-white/10 pt-4 mt-4 space-y-2">
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted hover:text-white hover:bg-white/5"
                >
                  <FiUser />
                  <span>Profile Studio</span>
                </Link>
                <button
                  onClick={() => {
                    handleLogout()
                    setMobileMenuOpen(false)
                  }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-error hover:bg-error/15 w-full text-left"
                >
                  <FiLogOut />
                  <span>Disconnect</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}

export default Navbar
