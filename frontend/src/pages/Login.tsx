import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import toast from 'react-hot-toast'
import { Stethoscope, Sun, Moon } from 'lucide-react'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const { theme, toggle } = useTheme()

  const validate = () => {
    const e: typeof errors = {}
    if (!email.trim()) e.email = 'Email is required'
    else if (!emailRegex.test(email)) e.email = 'Invalid email address'
    if (!password) e.password = 'Password is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      await login(email, password)
      toast.success('Welcome back!')
    } catch (err: any) {
      const code = err.response?.data?.code
      if (code === 'EMAIL_NOT_FOUND') setErrors(p => ({ ...p, email: 'No account with this email' }))
      else if (code === 'WRONG_PASSWORD') setErrors(p => ({ ...p, password: 'Incorrect password' }))
      else if (!err.response) toast.error('Cannot connect to server')
      else toast.error(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: 16,
    }}>
      {/* Theme toggle top-right */}
      <button onClick={toggle} style={{
        position: 'fixed', top: 16, right: 16,
        width: 36, height: 36, borderRadius: 8,
        background: 'var(--surface)', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', color: 'var(--text-muted)',
      }}>
        {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
      </button>

      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Card */}
        <div className="card" style={{ padding: 36 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px var(--primary-glow)',
            }}>
              <Stethoscope size={22} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>HealthCare</div>
              <div style={{ fontSize: 12, color: 'var(--text-subtle)' }}>Appointment Manager</div>
            </div>
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>Sign in</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 28 }}>Enter your credentials to continue</p>

          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); if (errors.email) setErrors(p => ({ ...p, email: undefined })) }}
                className={`input${errors.email ? ' error' : ''}`}
                placeholder="you@example.com"
              />
              {errors.email && <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>⚠ {errors.email}</p>}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); if (errors.password) setErrors(p => ({ ...p, password: undefined })) }}
                className={`input${errors.password ? ' error' : ''}`}
                placeholder="••••••••"
              />
              {errors.password && <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>⚠ {errors.password}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 4, padding: '11px' }}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginTop: 24 }}>
            New patient?{' '}
            <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>Create account</Link>
          </p>

          {/* Demo creds */}
          <div style={{
            marginTop: 20, padding: '12px 14px',
            background: 'var(--surface-2)', borderRadius: 8,
            border: '1px solid var(--border)',
          }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-subtle)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Demo</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0' }}>Admin: admin@healthcare.com / Admin@123</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0' }}>Doctor: dr.smith@healthcare.com / Doctor@123</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
