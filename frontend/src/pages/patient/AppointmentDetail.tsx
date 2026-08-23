import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { Calendar, User, AlertTriangle, FileText, ChevronLeft, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

const urgencyStyle: Record<string, { bg: string; color: string }> = {
  LOW:    { bg: 'var(--success-bg)', color: 'var(--success)' },
  MEDIUM: { bg: 'var(--warning-bg)', color: 'var(--warning)' },
  HIGH:   { bg: 'var(--danger-bg)',  color: 'var(--danger)'  },
}

const AppointmentDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['appointment', id],
    queryFn: () => api.get(`/appointments/${id}`).then(r => r.data.data),
  })

  const handleCancel = async () => {
    if (!confirm('Cancel this appointment?')) return
    try {
      await api.patch(`/appointments/${id}/cancel`)
      toast.success('Appointment cancelled')
      queryClient.invalidateQueries({ queryKey: ['patient-appointments'] })
      navigate('/patient/appointments')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to cancel')
    }
  }

  if (isLoading) return <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-subtle)' }}>Loading...</div>
  if (!data) return <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>Appointment not found</div>

  const appt = data
  const urgency = appt.urgencyLevel ? urgencyStyle[appt.urgencyLevel] : null

  return (
    <div style={{ maxWidth: 640 }}>
      <button onClick={() => navigate('/patient/appointments')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, padding: '0 0 20px' }}>
        <ChevronLeft size={15} /> Back to Appointments
      </button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Appointment Details</h1>
        {['CONFIRMED', 'PENDING'].includes(appt.status) && (
          <button onClick={handleCancel} className="btn btn-danger" style={{ padding: '7px 14px', fontSize: 13 }}>
            <X size={13} /> Cancel
          </button>
        )}
      </div>

      {/* Info card */}
      <div className="card" style={{ padding: 20, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={16} color="var(--primary)" />
          </div>
          <div>
            <p style={{ fontSize: 11, color: 'var(--text-subtle)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Date & Time</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{format(new Date(appt.scheduledAt), 'EEEE, MMMM d yyyy · h:mm a')}</p>
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--border)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={16} color="var(--success)" />
          </div>
          <div>
            <p style={{ fontSize: 11, color: 'var(--text-subtle)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Doctor</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Dr. {appt.doctor.user.name}</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{appt.doctor?.specialisation || ''}</p>
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--border)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Status:</p>
          <span className={`badge ${appt.status === 'CONFIRMED' ? 'badge-success' : appt.status === 'COMPLETED' ? 'badge-primary' : appt.status === 'CANCELLED' ? 'badge-danger' : 'badge-warning'}`}>
            {appt.status}
          </span>
        </div>
      </div>

      {/* Pre-visit summary */}
      {(appt.symptoms || appt.preVisitSummary) && (
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={15} color="var(--warning)" /> Pre-Visit Summary
          </h3>

          {appt.symptoms && (
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 11, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 5px' }}>Your Symptoms</p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.6, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 8 }}>{appt.symptoms}</p>
            </div>
          )}

          {urgency && (
            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600, background: urgency.bg, color: urgency.color, marginBottom: 10 }}>
              Urgency: {appt.urgencyLevel}
            </span>
          )}
          {appt.chiefComplaint && (
            <p style={{ fontSize: 13, color: 'var(--text)', margin: '0 0 8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Chief Complaint: </span>{appt.chiefComplaint}
            </p>
          )}
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
            {appt.preVisitSummary
              ? <div className="markdown"><ReactMarkdown>{appt.preVisitSummary}</ReactMarkdown></div>
              : <span style={{ fontStyle: 'italic', color: 'var(--text-subtle)' }}>AI summary could not be generated.</span>}
          </p>
        </div>
      )}

      {/* Post-visit summary */}
      {(appt.postVisitSummary || appt.doctorNotes || appt.prescription) && (
        <div className="card" style={{ padding: 20, borderColor: appt.postVisitSummary ? 'var(--primary)' : 'var(--border)', background: appt.postVisitSummary ? 'var(--primary-glow)' : 'var(--surface)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={15} color="var(--primary)" /> Post-Visit Summary
          </h3>

          {appt.postVisitSummary ? (
            <div className="markdown" style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.7, marginBottom: 12 }}>
              <ReactMarkdown>{appt.postVisitSummary}</ReactMarkdown>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--text-subtle)', margin: '0 0 12px', fontStyle: 'italic' }}>
              AI summary could not be generated.
            </p>
          )}

          {appt.prescription && (
            <div style={{ padding: '12px 14px', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <p style={{ fontSize: 11, color: 'var(--text-subtle)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 5 }}>
                Prescription
              </p>
              <p style={{ fontSize: 13, color: 'var(--text)', margin: 0, whiteSpace: 'pre-line' }}>{appt.prescription}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AppointmentDetail
