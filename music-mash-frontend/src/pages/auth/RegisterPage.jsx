import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { motion } from 'framer-motion'
import { FiMail, FiLock, FiUser, FiDisc, FiArrowRight } from 'react-icons/fi'
import toast from 'react-hot-toast'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import Navbar from '../../components/layout/Navbar'
import AmbientBackground from '../../components/ui/AmbientBackground'
import EqualizerBars from '../../components/ui/EqualizerBars'

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'USER'
  })
  const [loading, setLoading] = useState(false)
  const { register, login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    const result = await register(formData)
    
    if (result.success) {
      toast.success('Account created! Initializing profile onboarding...')
      const loginResult = await login(formData.email, formData.password)
      if (loginResult.success) {
        navigate('/onboarding')
      } else {
        navigate('/login')
      }
    } else {
      toast.error(result.error || 'Registration failed')
    }
    
    setLoading(false)
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  return (
    <div className="min-h-screen bg-[#06060A] text-foreground flex items-center justify-center px-4 relative overflow-hidden">
      <AmbientBackground />
      <Navbar />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md mt-24 relative z-10"
      >
        <div className="glass-card-glow p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary via-secondary to-accent p-[1px] shadow-glow-purple">
              <div className="w-full h-full bg-[#0F101A] rounded-[15px] flex items-center justify-center">
                <FiDisc className="text-primary-light text-3xl animate-spin-slow" />
              </div>
            </div>
            <h1 className="font-display text-3xl font-bold text-white tracking-tight mb-2">
              Join <span className="gradient-text-cyan">Music Mash</span>
            </h1>
            <p className="text-muted text-xs">Create your profile to start recording & receiving AI feedback</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-2">
                Stage / Musician Name
              </label>
              <div className="relative">
                <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                <Input
                  type="text"
                  name="username"
                  placeholder="e.g. Hendrix24"
                  value={formData.username}
                  onChange={handleChange}
                  className="pl-11 w-full"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-2">
                Email Address
              </label>
              <div className="relative">
                <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                <Input
                  type="email"
                  name="email"
                  placeholder="musician@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="pl-11 w-full"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-2">
                Password
              </label>
              <div className="relative">
                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                <Input
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  className="pl-11 w-full"
                  required
                  minLength="6"
                />
              </div>
            </div>

            <Button type="submit" variant="primary" size="lg" className="w-full uppercase tracking-wider mt-2" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <EqualizerBars count={3} className="h-3 gap-0.5" /> Creating Account...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Initialize Musician Profile <FiArrowRight />
                </span>
              )}
            </Button>
          </form>

          {/* Footer */}
          <p className="text-center text-xs text-muted mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-accent font-semibold hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

export default RegisterPage
