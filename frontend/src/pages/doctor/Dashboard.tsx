import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'
import { format, isToday } from 'date-fns'
import { Calendar, Clock, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react'

const urgencyColor: Record<string, string> = {
  LOW: 'var(--success)', MEDIUM: 'var(--warning)', HIGH: 'var(--danger)',
}
const urgencyBg: Record<string, string> = {
  LOW: 'var(--success-bg)', MEDIUM: 'var(--warning-bg)', HIGH: 'var(--danger-bg)',
}

const DoctorDashboard = () => {
  const { user } = useAuth()

  const { data, isLoading } = useQuery({
    queryKey: ['doctor-appointments'],
    queryFn: () => api.get('/doctors/me/appointments').then(r => r.data.data),
  })

  const appointments = data || []
  const todayAppts = appointments.filter((a: any) => isToday(new Date(a.scheduledAt)))
  const upcoming = appointments.filter((a: any) => a.status === 'CONFIRMED')
  const completed = appointments.filter((a: any) => a.status === 'COMPLETED')

  const stats = [
    { label: "Today", value: todayAppts.length, icon: <Calendar size={20} />, color: 'var(--primary)', bg: 'var(--primary-glow)' },
    { label: 'Upcoming', value: upcoming.length, icon: <Clock size={20} />, color: 'var(--success)', bg: 'var(--success-bg)' },
    { label: 'Completed', value: completed.length, icon: <CheckCircle size={20} />, color: 'var(--purple)', bg: 'var(--purple-bg)' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
          Welcome, Dr. {user?.name?.split(' ').slice(-1)[0]} 👨‍⚕️
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>Here's your schedule overview</p>
      </div>

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

      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Today's Schedule</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{format(new Date(), 'EEEE, MMMM d')}</p>
          </div>
          <Link to="/doctor/appointments" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--primary)', fontWeight: 500, textDecoration: 'none' }}>
            View all <ArrowRight size={14} />
          </Link>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-subtle)' }}>Loading...</div>
        ) : todayAppts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 14 }}>No appointments today</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {todayAppts.map((appt: any) => {
              const urgBg = appt.urgencyLevel ? urgencyBg[appt.urgencyLevel] : 'var(--surface-3)'
              const urgCol = appt.urgencyLevel ? urgencyColor[appt.urgencyLevel] : 'var(--text-subtle)'
              return (
                <div key={appt.id} style={{
                  padding: '16px', borderRadius: 10,
                  background: 'var(--surface-2)', border: `1px solid ${appt.urgencyLevel === 'HIGH' ? 'var(--danger)' : 'var(--border-light)'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: urgBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: urgCol, flexShrink: 0 }}>
                        {appt.patient.user.name[0]}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{appt.patient.user.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{format(new Date(appt.scheduledAt), 'h:mm a')}</div>
                      </div>
                    </div>
                    {appt.urgencyLevel && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700, background: urgBg, color: urgCol, border: `1px solid ${urgCol}` }}>
                        <AlertTriangle size={11} /> {appt.urgencyLevel} URGENCY
                      </span>
                    )}
                  </div>

                  {appt.chiefComplaint && (
                    <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Chief Complaint  </span>
                      <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{appt.chiefComplaint}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    {appt.status === 'CONFIRMED' && (
                      <>
                        <Link to={`/doctor/appointments/${appt.id}/detail`} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center', padding: '7px 12px', fontSize: 12, textDecoration: 'none' }}>
                          Pre-Visit Briefing
                        </Link>
                        <Link to={`/doctor/appointments/${appt.id}/post-visit`} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '7px 12px', fontSize: 12, textDecoration: 'none' }}>
                          Add Notes
                        </Link>
                      </>
                    )}
                    {appt.status === 'COMPLETED' && (
                      <Link to={`/doctor/appointments/${appt.id}/detail`} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center', padding: '7px 12px', fontSize: 12, textDecoration: 'none' }}>
                        View Record
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default DoctorDashboard
