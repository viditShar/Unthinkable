import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import { format } from 'date-fns'
import { ChevronLeft, AlertTriangle, FileText, Pill, Calendar, Brain, HelpCircle, ClipboardList } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

const urgencyStyle: Record<string, { bg: string; color: string; border: string; label: string }> = {
  LOW:    { bg: 'var(--success-bg)', color: 'var(--success)', border: 'var(--success)', label: 'Low Urgency' },
  MEDIUM: { bg: 'var(--warning-bg)', color: 'var(--warning)', border: 'var(--warning)', label: 'Medium Urgency' },
  HIGH:   { bg: 'var(--danger-bg)',  color: 'var(--danger)',  border: 'var(--danger)',  label: '⚠ High Urgency — Prioritise' },
}

const DoctorAppointmentDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['appointment', id],
    queryFn: () => api.get(`/appointments/${id}`).then(r => r.data.data),
  })

  if (isLoading) return <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-subtle)' }}>Loading...</div>
  if (!data) return <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>Appointment not found</div>

  const appt = data
  const urgency = appt.urgencyLevel ? urgencyStyle[appt.urgencyLevel] : null
  const isCompleted = appt.status === 'COMPLETED'

  let suggestedQuestions: string[] = []
  if (appt.suggestedQuestions) {
    try { suggestedQuestions = JSON.parse(appt.suggestedQuestions) } catch {}
  }

  return (
    <div style={{ maxWidth: 700 }}>
      <button onClick={() => navigate('/doctor/appointments')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, padding: '0 0 20px' }}>
        <ChevronLeft size={15} /> Back to Appointments
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>
            {isCompleted ? 'Appointment Record' : 'Pre-Visit Briefing'}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
            {appt.patient.user.name} · {format(new Date(appt.scheduledAt), 'MMMM d, yyyy h:mm a')}
          </p>
        </div>
        {!isCompleted && appt.status === 'CONFIRMED' && (
          <Link to={`/doctor/appointments/${id}/post-visit`} className="btn btn-primary" style={{ textDecoration: 'none' }}>
            <FileText size={15} /> Add Notes
          </Link>
        )}
      </div>

      {/* Urgency banner — shown prominently at top */}
      {urgency && (
        <div style={{
          padding: '14px 18px', borderRadius: 10, marginBottom: 16,
          background: urgency.bg, border: `1.5px solid ${urgency.border}`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <AlertTriangle size={20} color={urgency.color} style={{ flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: urgency.color, margin: '0 0 2px' }}>{urgency.label}</p>
            {appt.chiefComplaint && (
              <p style={{ fontSize: 13, color: 'var(--text)', margin: 0 }}>
                <span style={{ color: 'var(--text-muted)' }}>Chief Complaint: </span>
                <strong>{appt.chiefComplaint}</strong>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Basic info */}
      <div className="card" style={{ padding: 18, marginBottom: 16, display: 'flex', gap: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Calendar size={15} color="var(--primary)" />
          <div>
            <p style={{ fontSize: 11, color: 'var(--text-subtle)', margin: '0 0 1px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Scheduled</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{format(new Date(appt.scheduledAt), 'EEE, MMM d · h:mm a')}</p>
          </div>
        </div>
        <div style={{ width: 1, background: 'var(--border)' }} />
        <div>
          <p style={{ fontSize: 11, color: 'var(--text-subtle)', margin: '0 0 1px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</p>
          <span className={`badge ${appt.status === 'COMPLETED' ? 'badge-primary' : appt.status === 'CONFIRMED' ? 'badge-success' : 'badge-danger'}`}>
            {appt.status}
          </span>
        </div>
        <div style={{ width: 1, background: 'var(--border)' }} />
        <div>
          <p style={{ fontSize: 11, color: 'var(--text-subtle)', margin: '0 0 1px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Patient</p>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: '0 0 1px' }}>{appt.patient.user.name}</p>
          <p style={{ fontSize: 11, color: 'var(--text-subtle)', margin: 0 }}>{appt.patient.user.email}</p>
        </div>
      </div>

      {/* Patient symptoms */}
      {appt.symptoms && (
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClipboardList size={15} color="var(--text-muted)" /> Patient-Reported Symptoms
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text)', margin: 0, lineHeight: 1.7, padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 8 }}>
            {appt.symptoms}
          </p>
        </div>
      )}

      {/* AI Pre-visit summary */}
      {appt.preVisitSummary ? (
        <div className="card" style={{ padding: 20, marginBottom: 16, borderColor: 'var(--warning)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Brain size={15} color="var(--warning)" /> AI Pre-Visit Summary
          </h3>
          <div className="markdown" style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 16 }}>
            <ReactMarkdown>{appt.preVisitSummary}</ReactMarkdown>
          </div>

          {suggestedQuestions.length > 0 && (
            <div style={{ padding: '12px 14px', background: 'var(--warning-bg)', borderRadius: 8, border: '1px solid var(--warning)' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--warning)', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <HelpCircle size={13} /> Suggested Questions to Ask the Patient
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {suggestedQuestions.map((q, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--warning)', flexShrink: 0, marginTop: 1 }}>{i + 1}.</span>
                    <p style={{ fontSize: 13, color: 'var(--text)', margin: 0, lineHeight: 1.5 }}>{q}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : appt.symptoms ? (
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: 'var(--text-subtle)', margin: 0, fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Brain size={14} /> AI pre-visit summary was not generated for this appointment.
          </p>
        </div>
      ) : null}

      {/* Post-visit section — only for completed appointments */}
      {isCompleted && (
        <>
          {appt.doctorNotes && (
            <div className="card" style={{ padding: 20, marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={15} color="var(--primary)" /> Clinical Notes
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text)', margin: 0, lineHeight: 1.7, whiteSpace: 'pre-line', padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 8 }}>
                {appt.doctorNotes}
              </p>
            </div>
          )}

          {appt.prescription && (
            <div className="card" style={{ padding: 20, marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Pill size={15} color="var(--success)" /> Prescription
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text)', margin: 0, whiteSpace: 'pre-line', padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 8 }}>
                {appt.prescription}
              </p>
            </div>
          )}

          {appt.postVisitSummary && (
            <div className="card" style={{ padding: 20, borderColor: 'var(--primary)', background: 'var(--primary-glow)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Brain size={15} color="var(--primary)" /> AI Patient-Friendly Summary (sent to patient)
              </h3>
              <div className="markdown" style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.7 }}>
                <ReactMarkdown>{appt.postVisitSummary}</ReactMarkdown>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default DoctorAppointmentDetail
