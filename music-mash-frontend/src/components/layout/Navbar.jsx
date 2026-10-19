import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { FiMenu, FiX, FiUpload } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../utils/cn'
import Wordmark from '../brand/Wordmark'
import Button from '../ui/Button'

const APP_LINKS = [
  { to: '/dashboard', label: 'Home' },
  { to: '/practice', label: 'Practice' },
  { to: '/upload', label: 'Studio' },
  { to: '/competitions', label: 'Competitions' },
  { to: '/challenges', label: 'Challenges' },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/social', label: 'Community' },
]

const navLinkClass = ({ isActive }) =>
  cn('text-body-sm transition-colors duration-150', isActive ? 'text-white font-semibold' : 'text-fog hover:text-white')

/**
 * Global navigation. Over a hero (transparent=true) it starts transparent and turns solid
 * Obsidian once the page scrolls; everywhere else it is solid from the start.
 */
const Navbar = ({ transparent = false, banner }) => {
  const { isAuthenticated, user, logout } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  useEffect(() => setMenuOpen(false), [location.pathname])

  const solid = !transparent || scrolled || menuOpen
  const canJudge = ['JUDGE', 'HOST', 'ADMIN'].includes(user?.role)
  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <header className={cn('fixed inset-x-0 top-0 z-40 transition-colors duration-200',
      solid ? 'bg-obsidian shadow-[inset_0_-1px_0_#303030]' : 'bg-transparent')}>
      {banner}
      <nav aria-label="Main" className="page flex h-16 items-center justify-between gap-6">
        <Wordmark to={isAuthenticated ? '/dashboard' : '/'} />

        {isAuthenticated ? (
          <>
            <div className="hidden items-center gap-6 lg:flex">
              {APP_LINKS.map((link) => <NavLink key={link.to} to={link.to} className={navLinkClass}>{link.label}</NavLink>)}
              {canJudge && <NavLink to="/judge" className={navLinkClass}>Judging</NavLink>}
            </div>
            <div className="hidden items-center gap-4 lg:flex">
              <Button to="/upload" size="sm" icon={FiUpload}>Upload</Button>
              <NavLink to="/profile" aria-label="Your profile"
                className="flex h-8 w-8 items-center justify-center rounded bg-graphite text-body-sm font-semibold text-white hover:bg-mid-gray">
                {(user?.username || '?').charAt(0).toUpperCase()}
              </NavLink>
              <button type="button" onClick={handleLogout} className="text-body-sm text-fog hover:text-white">Sign out</button>
            </div>
          </>
        ) : (
          <div className="hidden items-center gap-6 sm:flex">
            <Link to="/login" className="text-body-sm text-fog hover:text-white">Sign in</Link>
            <Button to="/register" size="sm">Create account</Button>
            <Link to="/competitions" className="text-body-sm text-fog hover:text-white">For performers</Link>
          </div>
        )}

        <button type="button" onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen} aria-controls="mobile-menu" aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          className={cn('flex h-10 w-10 items-center justify-center rounded text-white hover:bg-graphite',
            isAuthenticated ? 'lg:hidden' : 'sm:hidden')}>
          {menuOpen ? <FiX size={20} /> : <FiMenu size={20} />}
        </button>
      </nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div id="mobile-menu" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="border-t border-graphite bg-obsidian">
            <div className="page flex flex-col gap-1 py-4">
              {isAuthenticated ? (
                <>
                  {[...APP_LINKS, ...(canJudge ? [{ to: '/judge', label: 'Judging' }] : []), { to: '/profile', label: 'Profile' }].map((link) => (
                    <NavLink key={link.to} to={link.to}
                      className={({ isActive }) => cn('rounded px-3 py-3 text-body', isActive ? 'bg-graphite text-white' : 'text-fog hover:text-white')}>
                      {link.label}
                    </NavLink>
                  ))}
                  <button type="button" onClick={handleLogout} className="rounded px-3 py-3 text-left text-body text-fog hover:text-white">Sign out</button>
                </>
              ) : (
                <>
                  <Link to="/login" className="rounded px-3 py-3 text-body text-fog hover:text-white">Sign in</Link>
                  <Link to="/competitions" className="rounded px-3 py-3 text-body text-fog hover:text-white">For performers</Link>
                  <Button to="/register" className="mt-2">Create account</Button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

export default Navbar
