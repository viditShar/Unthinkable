import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'
import { Calendar, Clock, CheckCircle, Stethoscope, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    CONFIRMED: 'badge badge-success',
    PENDING: 'badge badge-warning',
    CANCELLED: 'badge badge-danger',
    COMPLETED: 'badge badge-primary',
  }
  return map[status] || 'badge badge-gray'
}

const PatientDashboard = () => {
  const { user } = useAuth()

  const { data, isLoading } = useQuery({
    queryKey: ['patient-appointments'],
    queryFn: () => api.get('/patients/me/appointments').then(r => r.data.data),
  })

  const appointments = data || []
  const upcoming = appointments.filter((a: any) => ['CONFIRMED', 'PENDING'].includes(a.status))
  const completed = appointments.filter((a: any) => a.status === 'COMPLETED')

  const stats = [
    { label: 'Total Appointments', value: appointments.length, icon: <Calendar size={20} />, color: 'var(--primary)', bg: 'var(--primary-glow)' },
    { label: 'Upcoming', value: upcoming.length, icon: <Clock size={20} />, color: 'var(--success)', bg: 'var(--success-bg)' },
    { label: 'Completed', value: completed.length, icon: <CheckCircle size={20} />, color: 'var(--purple)', bg: 'var(--purple-bg)' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
          Good day, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>Here's your health summary</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {stats.map(s => (
          <div key={s.label} className="card" style={{ padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, flexShrink: 0 }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Upcoming appointments */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Upcoming Appointments</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Your scheduled visits</p>
          </div>
          <Link to="/patient/doctors" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--primary)', fontWeight: 500, textDecoration: 'none' }}>
            Book new <ArrowRight size={14} />
          </Link>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-subtle)' }}>Loading...</div>
        ) : upcoming.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Stethoscope size={24} color="var(--text-subtle)" />
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>No upcoming appointments</p>
            <Link to="/patient/doctors" style={{ color: 'var(--primary)', fontSize: 13, marginTop: 8, display: 'inline-block', textDecoration: 'none' }}>Find a doctor →</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {upcoming.slice(0, 5).map((appt: any) => (
              <Link key={appt.id} to={`/patient/appointments/${appt.id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px', borderRadius: 10,
                  background: 'var(--surface-2)', border: '1px solid var(--border-light)',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-light)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Stethoscope size={16} color="var(--primary)" />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Dr. {appt.doctor.user.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{appt.doctor.specialisation}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 2 }}>
                        {format(new Date(appt.scheduledAt), 'EEE, MMM d · h:mm a')}
                      </div>
                    </div>
                  </div>
                  <span className={statusBadge(appt.status)}>{appt.status}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default PatientDashboard
