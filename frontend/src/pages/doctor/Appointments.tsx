import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import { format } from 'date-fns'
import { Calendar, AlertTriangle, ChevronRight, RefreshCw } from 'lucide-react'
import RescheduleModal from '../../components/RescheduleModal'

const urgencyStyle: Record<string, { bg: string; color: string }> = {
  LOW:    { bg: 'var(--success-bg)', color: 'var(--success)' },
  MEDIUM: { bg: 'var(--warning-bg)', color: 'var(--warning)' },
  HIGH:   { bg: 'var(--danger-bg)',  color: 'var(--danger)'  },
}

const statusClass: Record<string, string> = {
  CONFIRMED: 'badge badge-success',
  COMPLETED: 'badge badge-primary',
  PENDING:   'badge badge-warning',
  CANCELLED: 'badge badge-danger',
}

const DoctorAppointments = () => {
  const [rescheduleAppt, setRescheduleAppt] = useState<any | null>(null)
  const [filter, setFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['doctor-appointments', filter],
    queryFn: () => api.get('/doctors/me/appointments', { params: filter ? { status: filter } : {} }).then(r => r.data.data),
  })

  const appointments = data || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Appointments</h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>All patient appointments</p>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {['', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: '6px 16px', borderRadius: 99, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none',
            background: filter === s ? 'var(--primary)' : 'var(--surface-2)',
            color: filter === s ? '#fff' : 'var(--text-muted)',
            transition: 'all 0.15s',
          }}>{s || 'All'}</button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-subtle)' }}>Loading...</div>
      ) : appointments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <Calendar size={24} color="var(--text-subtle)" />
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No appointments found</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {appointments.map((appt: any) => {
            const u = appt.urgencyLevel ? urgencyStyle[appt.urgencyLevel] : null
            return (
              <div key={appt.id} className="card" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: 'var(--text-muted)', flexShrink: 0 }}>
                      {appt.patient.user.name[0]}
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '0 0 2px' }}>{appt.patient.user.name}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-subtle)', margin: '0 0 4px' }}>{appt.patient.user.email}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{format(new Date(appt.scheduledAt), 'EEEE, MMM d · h:mm a')}</p>
                      {appt.chiefComplaint && <p style={{ fontSize: 11, color: 'var(--text-subtle)', margin: '3px 0 0' }}>Chief: {appt.chiefComplaint}</p>}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    {u && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: u.bg, color: u.color }}>
                        <AlertTriangle size={10} /> {appt.urgencyLevel}
                      </span>
                    )}
                    <span className={statusClass[appt.status] || 'badge badge-gray'}>{appt.status}</span>
                    {appt.status === 'CONFIRMED' && (
                      <>
                        <button
                          onClick={() => setRescheduleAppt(appt)}
                          className="btn btn-ghost"
                          style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          <RefreshCw size={11} /> Reschedule
                        </button>
                        <Link to={`/doctor/appointments/${appt.id}/detail`} className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                          Pre-Visit Briefing
                        </Link>
                        <Link to={`/doctor/appointments/${appt.id}/post-visit`} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                          Add Notes <ChevronRight size={12} />
                        </Link>
                      </>
                    )}
                    {appt.status === 'COMPLETED' && (
                      <Link to={`/doctor/appointments/${appt.id}/detail`} className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                        View Detail <ChevronRight size={12} />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {rescheduleAppt && (
        <RescheduleModal
          appointmentId={rescheduleAppt.id}
          doctorId={rescheduleAppt.doctor?.id || rescheduleAppt.doctorId}
          onClose={() => setRescheduleAppt(null)}
          onSuccess={() => setRescheduleAppt(null)}
        />
      )}
    </div>
  )
}

export default DoctorAppointments
