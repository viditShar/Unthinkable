import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { ChevronLeft } from 'lucide-react'

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
type FormErrors = Partial<Record<'name' | 'email' | 'password' | 'specialisation', string>>

const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="card" style={{ padding: 20 }}>
    <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '0 0 16px', paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>{title}</h3>
    {children}
  </div>
)

const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
  <div>
    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 }}>{label}</label>
    {children}
    {error && <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>⚠ {error}</p>}
  </div>
)

const CreateDoctor = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', specialisation: '', qualifications: '', bio: '', slotDurationMins: 30 })
  const [errors, setErrors] = useState<FormErrors>({})
  const [workingHours, setWorkingHours] = useState<Record<string, { start: string; end: string; active: boolean }>>({
    mon: { start: '09:00', end: '17:00', active: true },
    tue: { start: '09:00', end: '17:00', active: true },
    wed: { start: '09:00', end: '17:00', active: true },
    thu: { start: '09:00', end: '17:00', active: true },
    fri: { start: '09:00', end: '13:00', active: true },
    sat: { start: '09:00', end: '13:00', active: false },
    sun: { start: '09:00', end: '13:00', active: false },
  })

  const validate = () => {
    const e: FormErrors = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!emailRegex.test(form.email)) e.email = 'Invalid email address'
    if (form.password && form.password.length < 6) e.password = 'Minimum 6 characters'
    if (!form.specialisation.trim()) e.specialisation = 'Specialisation is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const set = (field: string, val: any) => setForm(p => ({ ...p, [field]: val }))
  const clearErr = (field: keyof FormErrors) => { if (errors[field]) setErrors(p => ({ ...p, [field]: undefined })) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const wh: Record<string, { start: string; end: string }> = {}
      DAYS.forEach(d => { if (workingHours[d].active) wh[d] = { start: workingHours[d].start, end: workingHours[d].end } })
      await api.post('/admin/doctors', { ...form, workingHours: wh })
      toast.success('Doctor created successfully')
      navigate('/admin/doctors')
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to create doctor'
      if (msg.toLowerCase().includes('email')) setErrors(p => ({ ...p, email: 'Email already in use' }))
      else toast.error(msg)
    } finally { setLoading(false) }
  }

  const inputStyle = (hasErr: boolean) => ({
    background: hasErr ? 'var(--danger-bg)' : 'var(--surface-2)',
    borderColor: hasErr ? 'var(--danger)' : 'var(--border)',
  } as React.CSSProperties)

  return (
    <div style={{ maxWidth: 600 }}>
      <button onClick={() => navigate('/admin/doctors')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, padding: '0 0 20px' }}>
        <ChevronLeft size={15} /> Back to Doctors
      </button>

      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: '0 0 24px' }}>Create Doctor Profile</h1>

      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <SectionCard title="Account Information">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Full Name *" error={errors.name}>
                <input value={form.name} onChange={e => { set('name', e.target.value); clearErr('name') }} className="input" style={inputStyle(!!errors.name)} placeholder="Jane Doe" />
              </Field>
            </div>
            <Field label="Email *" error={errors.email}>
              <input type="email" value={form.email} onChange={e => { set('email', e.target.value); clearErr('email') }} className="input" style={inputStyle(!!errors.email)} placeholder="doctor@clinic.com" />
            </Field>
            <Field label="Phone">
              <input type="text" value={form.phone} onChange={e => set('phone', e.target.value)} className="input" placeholder="+91 98765 43210" />
            </Field>
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Password — optional, defaults to Doctor@123" error={errors.password}>
                <input type="password" value={form.password} onChange={e => { set('password', e.target.value); clearErr('password') }} className="input" style={inputStyle(!!errors.password)} placeholder="Leave blank to use default" />
                {!errors.password && form.password.length > 0 && form.password.length < 6 && (
                  <p style={{ fontSize: 12, color: 'var(--warning)', marginTop: 4 }}>⚠ Must be at least 6 characters</p>
                )}
              </Field>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Professional Information">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Specialisation *" error={errors.specialisation}>
              <input value={form.specialisation} onChange={e => { set('specialisation', e.target.value); clearErr('specialisation') }} className="input" style={inputStyle(!!errors.specialisation)} placeholder="e.g. Cardiology, General Medicine" />
            </Field>
            <Field label="Qualifications">
              <input value={form.qualifications} onChange={e => set('qualifications', e.target.value)} className="input" placeholder="e.g. MBBS, MD" />
            </Field>
            <Field label="Bio">
              <textarea value={form.bio} onChange={e => set('bio', e.target.value)} rows={3} className="input" style={{ resize: 'none' }} placeholder="Brief description of experience and expertise..." />
            </Field>
            <Field label="Slot Duration">
              <select value={form.slotDurationMins} onChange={e => set('slotDurationMins', Number(e.target.value))} className="input" style={{ width: 'auto' }}>
                {[15, 20, 30, 45, 60].map(n => <option key={n} value={n}>{n} minutes</option>)}
              </select>
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="Working Hours">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {DAYS.map(day => (
              <div key={day} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, width: 70, cursor: 'pointer' }}>
                  <input type="checkbox" checked={workingHours[day].active} onChange={e => setWorkingHours(p => ({ ...p, [day]: { ...p[day], active: e.target.checked } }))} style={{ accentColor: 'var(--primary)', width: 15, height: 15 }} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', textTransform: 'capitalize' }}>{day}</span>
                </label>
                {workingHours[day].active ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="time" value={workingHours[day].start} onChange={e => setWorkingHours(p => ({ ...p, [day]: { ...p[day], start: e.target.value } }))} className="input" style={{ width: 'auto', padding: '7px 10px' }} />
                    <span style={{ fontSize: 13, color: 'var(--text-subtle)' }}>to</span>
                    <input type="time" value={workingHours[day].end} onChange={e => setWorkingHours(p => ({ ...p, [day]: { ...p[day], end: e.target.value } }))} className="input" style={{ width: 'auto', padding: '7px 10px' }} />
                  </div>
                ) : (
                  <span style={{ fontSize: 13, color: 'var(--text-subtle)' }}>Day off</span>
                )}
              </div>
            ))}
          </div>
        </SectionCard>

        <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 13, fontSize: 14 }}>
          {loading ? 'Creating...' : 'Create Doctor Profile'}
        </button>
      </form>
    </div>
  )
}

export default CreateDoctor
