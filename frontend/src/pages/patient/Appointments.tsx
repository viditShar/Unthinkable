import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import { format } from 'date-fns'
import { Calendar, ChevronRight } from 'lucide-react'

const statusClass: Record<string, string> = {
  CONFIRMED: 'badge badge-success',
  PENDING: 'badge badge-warning',
  CANCELLED: 'badge badge-danger',
  COMPLETED: 'badge badge-primary',
  RESCHEDULED: 'badge badge-purple',
}

const filters = ['', 'CONFIRMED', 'COMPLETED', 'CANCELLED']

const PatientAppointments = () => {
  const [filter, setFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['patient-appointments', filter],
    queryFn: () => api.get('/patients/me/appointments', { params: filter ? { status: filter } : {} }).then(r => r.data.data),
  })

  const appointments = data || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: 0 }}>My Appointments</h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>Track and manage your visits</p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {filters.map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: '6px 16px', borderRadius: 99, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none',
            background: filter === s ? 'var(--primary)' : 'var(--surface-2)',
            color: filter === s ? '#fff' : 'var(--text-muted)',
            transition: 'all 0.15s',
          }}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-subtle)' }}>Loading...</div>
      ) : appointments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <Calendar size={24} color="var(--text-subtle)" />
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 8px' }}>No appointments found</p>
          <Link to="/patient/doctors" style={{ color: 'var(--primary)', fontSize: 13, textDecoration: 'none' }}>Book one now →</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {appointments.map((appt: any) => (
            <Link key={appt.id} to={`/patient/appointments/${appt.id}`} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'border-color 0.15s' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'}
              >
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '0 0 2px' }}>Dr. {appt.doctor.user.name}</p>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 3px' }}>{appt.doctor.specialisation}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-subtle)', margin: 0 }}>
                    {format(new Date(appt.scheduledAt), 'EEEE, MMM d yyyy · h:mm a')}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className={statusClass[appt.status] || 'badge badge-gray'}>{appt.status}</span>
                  <ChevronRight size={15} color="var(--text-subtle)" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default PatientAppointments
