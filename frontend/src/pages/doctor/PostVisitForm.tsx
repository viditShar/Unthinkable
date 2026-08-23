import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { ChevronLeft, FileText, Pill, AlertTriangle } from 'lucide-react'

const PostVisitForm = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [doctorNotes, setDoctorNotes] = useState('')
  const [prescription, setPrescription] = useState('')
  const [loading, setLoading] = useState(false)

  const { data: appt } = useQuery({
    queryKey: ['appointment', id],
    queryFn: () => api.get(`/appointments/${id}`).then(r => r.data.data),
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!doctorNotes.trim()) { toast.error('Clinical notes are required'); return }
    setLoading(true)
    try {
      await api.post(`/doctors/me/appointments/${id}/post-visit`, { doctorNotes, prescription })
      toast.success('Notes saved. Patient summary generated and sent.')
      queryClient.invalidateQueries({ queryKey: ['doctor-appointments'] })
      navigate('/doctor/appointments')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save notes')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <button onClick={() => navigate('/doctor/appointments')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, padding: '0 0 20px' }}>
        <ChevronLeft size={15} /> Back to Appointments
      </button>

      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>Post-Visit Notes</h1>
      {appt && (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 24px' }}>
          Patient: {appt.patient.user.name} · {format(new Date(appt.scheduledAt), 'MMM d, yyyy h:mm a')}
        </p>
      )}

      {/* Pre-visit AI summary (reference panel) */}
      {appt?.preVisitSummary && (
        <div style={{ padding: '16px 18px', background: 'var(--warning-bg)', border: '1px solid var(--warning)', borderRadius: 10, marginBottom: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--warning)', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={14} /> Pre-Visit AI Summary
          </p>
          {appt.urgencyLevel && (
            <span style={{ display: 'inline-flex', padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: 'var(--warning)', color: '#fff', marginBottom: 8 }}>
              {appt.urgencyLevel} Urgency
            </span>
          )}
          {appt.chiefComplaint && <p style={{ fontSize: 13, color: 'var(--text)', margin: '0 0 6px' }}><strong>Chief Complaint:</strong> {appt.chiefComplaint}</p>}
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>{appt.preVisitSummary}</p>
          {appt.suggestedQuestions && (
            <div style={{ marginTop: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--warning)', margin: '0 0 4px' }}>Suggested Questions:</p>
              {JSON.parse(appt.suggestedQuestions).map((q: string, i: number) => (
                <p key={i} style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0' }}>• {q}</p>
              ))}
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="card" style={{ padding: 20 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>
            <FileText size={15} color="var(--primary)" /> Clinical Notes *
          </label>
          <textarea rows={6} value={doctorNotes} onChange={e => setDoctorNotes(e.target.value)}
            placeholder="Enter diagnosis, findings, observations..."
            className="input" style={{ resize: 'none', lineHeight: 1.6 }} required
          />
        </div>

        <div className="card" style={{ padding: 20 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
            <Pill size={15} color="var(--success)" /> Prescription
          </label>
          <p style={{ fontSize: 12, color: 'var(--text-subtle)', margin: '0 0 10px' }}>
            One per line: "Medication Name - frequency"<br />
            e.g. "Paracetamol 500mg - twice daily"
          </p>
          <textarea rows={4} value={prescription} onChange={e => setPrescription(e.target.value)}
            placeholder={'Paracetamol 500mg - twice daily\nAmoxicillin 250mg - three times daily for 5 days'}
            className="input" style={{ resize: 'none', lineHeight: 1.6 }}
          />
        </div>

        <div style={{ padding: '12px 16px', background: 'var(--primary-glow)', border: '1px solid var(--primary)', borderRadius: 8, fontSize: 13, color: 'var(--primary-text)' }}>
          AI will convert your notes into a patient-friendly summary and email it. Medication reminders will be scheduled automatically.
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 13 }}>
          {loading ? 'Saving & Generating Summary...' : 'Save Notes & Generate Summary'}
        </button>
      </form>
    </div>
  )
}

export default PostVisitForm
