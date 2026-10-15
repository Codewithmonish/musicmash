import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import AuthLayout from '../../components/layout/AuthLayout'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import EqualizerBars from '../../components/ui/EqualizerBars'
import { notify } from '../../components/ui/Toast'
import { IMAGES } from '../../utils/images'

const validate = ({ username, email, password }) => {
  const errors = {}
  if (username.trim().length < 3 || username.trim().length > 50) errors.username = 'Between 3 and 50 characters.'
  if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = 'Enter a valid email address.'
  if (password.length < 6) errors.password = 'At least 6 characters.'
  return errors
}

const RegisterPage = () => {
  const { register, login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [touched, setTouched] = useState({})
  const [serverError, setServerError] = useState(null)
  const [loading, setLoading] = useState(false)
  const errors = validate(form)

  const update = (field) => (event) => setForm((f) => ({ ...f, [field]: event.target.value }))
  const blur = (field) => () => setTouched((t) => ({ ...t, [field]: true }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    setTouched({ username: true, email: true, password: true })
    if (Object.keys(errors).length) return
    setLoading(true)
    setServerError(null)
    const result = await register({ ...form, username: form.username.trim(), role: 'USER' })
    if (!result.success) {
      setLoading(false)
      setServerError(result.error || 'The account could not be created.')
      return
    }
    const signedIn = await login(form.email, form.password)
    setLoading(false)
    notify({ title: 'Welcome to MusicMash', body: 'Tell us what you play and we will set up your practice.' })
    navigate(signedIn.success ? '/onboarding' : '/login')
  }

  return (
    <AuthLayout
      image={IMAGES.scenes.register}
      title="Create your account"
      subtitle="Free. Record, measure and practise from day one."
      footer={<>Already have an account? <Link to="/login" className="link">Sign in</Link></>}
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <Input label="Username" autoComplete="username" value={form.username} onChange={update('username')}
          onBlur={blur('username')} error={touched.username && errors.username} placeholder="How others see you" />
        <Input label="Email" type="email" autoComplete="email" value={form.email} onChange={update('email')}
          onBlur={blur('email')} error={touched.email && errors.email} placeholder="you@example.com" />
        <Input label="Password" type="password" autoComplete="new-password" value={form.password} onChange={update('password')}
          onBlur={blur('password')} error={touched.password && errors.password} hint="At least 6 characters." />
        {serverError && (
          <p role="alert" className="flex items-center gap-2 text-body-sm text-white">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-status-critical" />{serverError}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? <><EqualizerBars count={3} className="h-3" barClassName="bg-obsidian" /> Creating account</> : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  )
}

export default RegisterPage
