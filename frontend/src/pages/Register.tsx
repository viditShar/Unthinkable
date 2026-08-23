import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import toast from 'react-hot-toast'
import { Stethoscope, Sun, Moon, UserRound } from 'lucide-react'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
type FormErrors = Partial<Record<'name' | 'email' | 'password', string>>

const Register = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' })
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const { theme, toggle } = useTheme()

  const validate = () => {
    const e: FormErrors = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!emailRegex.test(form.email)) e.email = 'Invalid email address'
    if (!form.password) e.password = 'Password is required'
    else if (form.password.length < 6) e.password = 'Minimum 6 characters'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const clear = (f: keyof FormErrors) => { if (errors[f]) setErrors(p => ({ ...p, [f]: undefined })) }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      await register(form)
      toast.success('Account created!')
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Registration failed'
      if (msg.toLowerCase().includes('email')) setErrors(p => ({ ...p, email: 'Email already registered' }))
      else toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const fields: { key: keyof typeof form; label: string; type: string; placeholder: string; required: boolean }[] = [
    { key: 'name',     label: 'Full Name',                        type: 'text',     placeholder: 'John Doe',          required: true },
    { key: 'email',    label: 'Email',                            type: 'email',    placeholder: 'you@example.com',   required: true },
    { key: 'phone',    label: 'Phone (optional)',                 type: 'text',     placeholder: '+91 98765 43210',   required: false },
    { key: 'password', label: 'Password',                         type: 'password', placeholder: 'At least 6 chars',  required: true },
  ]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 16 }}>
      <button onClick={toggle} style={{ position: 'fixed', top: 16, right: 16, width: 36, height: 36, borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>
        {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
      </button>

      <div style={{ width: '100%', maxWidth: 420 }}>
        <div className="card" style={{ padding: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px var(--primary-glow)' }}>
              <Stethoscope size={22} color="#fff" />
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>HealthCare</div>
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: '0 0 8px' }}>Create account</h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--primary-glow)', border: '1px solid var(--primary)', borderRadius: 8, marginBottom: 24 }}>
            <UserRound size={15} color="var(--primary)" style={{ flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: 'var(--primary-text)', margin: 0 }}>
              This creates a <strong>patient</strong> account. Doctors are added by the admin.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {fields.map(f => (
              <div key={f.key}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 5 }}>{f.label}</label>
                <input
                  type={f.type}
                  value={form[f.key]}
                  onChange={e => { setForm(p => ({ ...p, [f.key]: e.target.value })); clear(f.key as keyof FormErrors) }}
                  className={`input${errors[f.key as keyof FormErrors] ? ' error' : ''}`}
                  placeholder={f.placeholder}
                />
                {errors[f.key as keyof FormErrors] && (
                  <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>⚠ {errors[f.key as keyof FormErrors]}</p>
                )}
              </div>
            ))}

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 4, padding: 11 }}>
              {loading ? 'Creating account...' : 'Create patient account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginTop: 20 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Register
