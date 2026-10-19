import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import AuthLayout from '../../components/layout/AuthLayout'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import EqualizerBars from '../../components/ui/EqualizerBars'
import { IMAGES } from '../../utils/images'

const LoginPage = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    const result = await login(email, password)
    setLoading(false)
    if (result.success) {
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true })
    } else {
      setError(result.error || 'Email or password is incorrect.')
    }
  }

  return (
    <AuthLayout
      image={IMAGES.scenes.login}
      title="Sign in"
      subtitle="Welcome back. Your practice history is waiting."
      footer={<>New to MusicMash? <Link to="/register" className="link">Create an account</Link></>}
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <Input label="Email" type="email" autoComplete="email" required value={email}
          onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        <Input label="Password" type="password" autoComplete="current-password" required value={password}
          onChange={(e) => setPassword(e.target.value)} placeholder="Your password" />
        {error && (
          <p role="alert" className="flex items-center gap-2 text-body-sm text-white">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-status-critical" />{error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={loading || !email || !password}>
          {loading ? <><EqualizerBars count={3} className="h-3" barClassName="bg-obsidian" /> Signing in</> : 'Sign in'}
        </Button>
      </form>
    </AuthLayout>
  )
}

export default LoginPage
