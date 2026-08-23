import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { format, addDays } from 'date-fns'
import { Calendar, User, ChevronLeft, ChevronRight } from 'lucide-react'

type Step = 'select-slot' | 'symptoms' | 'confirm'
const STEPS: Step[] = ['select-slot', 'symptoms', 'confirm']
const STEP_LABELS = ['Select Slot', 'Symptoms', 'Confirm']

const BookAppointment = () => {
  const { doctorId } = useParams()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('select-slot')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [symptoms, setSymptoms] = useState('')
  const [loading, setLoading] = useState(false)
  const [holdData, setHoldData] = useState<{ holdToken: string; appointmentId: string } | null>(null)

  const { data: doctor } = useQuery({
    queryKey: ['doctor', doctorId],
    queryFn: () => api.get(`/doctors/${doctorId}`).then(r => r.data.data),
  })

  const dateStr = format(selectedDate, 'yyyy-MM-dd')
  const { data: slotsData, isLoading: slotsLoading } = useQuery({
    queryKey: ['slots', doctorId, dateStr],
    queryFn: () => api.get(`/doctors/${doctorId}/slots`, { params: { date: dateStr } }).then(r => r.data.data),
    enabled: !!doctorId,
  })
  const slots = slotsData || []

  const holdSlot = async () => {
    if (!selectedSlot) return
    setLoading(true)
    try {
      const scheduledAt = new Date(`${dateStr}T${selectedSlot}:00.000Z`)
      const res = await api.post('/appointments/hold', { doctorId, scheduledAt })
      setHoldData(res.data.data)
      setStep('symptoms')
      toast.success('Slot held for 10 minutes')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not hold slot')
    } finally { setLoading(false) }
  }

  const confirmBooking = async () => {
    if (!holdData) return
    setLoading(true)
    try {
      await api.post('/appointments/confirm', { appointmentId: holdData.appointmentId, holdToken: holdData.holdToken, symptoms })
      toast.success('Appointment booked! Confirmation email sent.')
      navigate('/patient/appointments')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Booking failed')
    } finally { setLoading(false) }
  }

  if (!doctor) return <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-subtle)' }}>Loading...</div>

  const currentStepIdx = STEPS.indexOf(step)

  return (
    <div style={{ maxWidth: 600 }}>
      <button onClick={() => navigate('/patient/doctors')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, padding: '0 0 20px' }}>
        <ChevronLeft size={15} /> Back to Doctors
      </button>

      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>Book Appointment</h1>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 24px' }}>with Dr. {doctor.user.name} · {doctor.specialisation}</p>

      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28 }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, flexShrink: 0,
                background: currentStepIdx > i ? 'var(--success)' : step === s ? 'var(--primary)' : 'var(--surface-3)',
                color: currentStepIdx >= i ? '#fff' : 'var(--text-subtle)',
              }}>{currentStepIdx > i ? '✓' : i + 1}</div>
              <span style={{ fontSize: 12, fontWeight: step === s ? 600 : 400, color: step === s ? 'var(--text)' : 'var(--text-subtle)', whiteSpace: 'nowrap' }}>
                {STEP_LABELS[i]}
              </span>
            </div>
            {i < STEPS.length - 1 && <div style={{ flex: 1, height: 1, background: currentStepIdx > i ? 'var(--success)' : 'var(--border)', margin: '0 12px' }} />}
          </div>
        ))}
      </div>

      {/* Step 1 */}
      {step === 'select-slot' && (
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <button onClick={() => setSelectedDate(d => addDays(d, -1))} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ flex: 1, textAlign: 'center', fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>{format(selectedDate, 'EEEE, MMMM d yyyy')}</span>
            <button onClick={() => setSelectedDate(d => addDays(d, 1))} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <ChevronRight size={16} />
            </button>
          </div>

          {slotsLoading ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-subtle)', fontSize: 13 }}>Loading slots...</div>
          ) : slots.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-subtle)', fontSize: 13 }}>No slots available on this day</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {slots.map((slot: any) => (
                <button key={slot.time} disabled={!slot.available} onClick={() => setSelectedSlot(slot.time)} style={{
                  padding: '9px 0', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: slot.available ? 'pointer' : 'not-allowed', border: '1px solid',
                  borderColor: selectedSlot === slot.time ? 'var(--primary)' : slot.available ? 'var(--border)' : 'transparent',
                  background: selectedSlot === slot.time ? 'var(--primary)' : slot.available ? 'var(--surface-2)' : 'var(--surface-3)',
                  color: selectedSlot === slot.time ? '#fff' : slot.available ? 'var(--text)' : 'var(--text-subtle)',
                  transition: 'all 0.1s',
                }}>
                  {slot.time}
                </button>
              ))}
            </div>
          )}

          <button onClick={holdSlot} disabled={!selectedSlot || loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 20, padding: 11 }}>
            {loading ? 'Holding slot...' : 'Continue →'}
          </button>
        </div>
      )}

      {/* Step 2 */}
      {step === 'symptoms' && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: '0 0 6px' }}>Describe Your Symptoms</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px' }}>Our AI will generate a pre-visit summary for the doctor.</p>
          <textarea rows={6} value={symptoms} onChange={e => setSymptoms(e.target.value)}
            placeholder="Describe your symptoms, how long you've had them, severity, etc."
            className="input" style={{ resize: 'none', lineHeight: 1.6 }}
          />
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={() => setStep('select-slot')} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Back</button>
            <button onClick={() => setStep('confirm')} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>Continue →</button>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 'confirm' && holdData && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: '0 0 20px' }}>Confirm Booking</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 8 }}>
              <Calendar size={16} color="var(--primary)" />
              <div>
                <p style={{ fontSize: 11, color: 'var(--text-subtle)', margin: '0 0 2px' }}>Date & Time</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{format(selectedDate, 'MMMM d, yyyy')} at {selectedSlot}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 8 }}>
              <User size={16} color="var(--success)" />
              <div>
                <p style={{ fontSize: 11, color: 'var(--text-subtle)', margin: '0 0 2px' }}>Doctor</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Dr. {doctor.user.name} · {doctor.specialisation}</p>
              </div>
            </div>
            {symptoms && (
              <div style={{ padding: '12px 14px', background: 'var(--warning-bg)', border: '1px solid var(--warning)', borderRadius: 8 }}>
                <p style={{ fontSize: 11, color: 'var(--warning)', margin: '0 0 4px', fontWeight: 600 }}>Symptoms</p>
                <p style={{ fontSize: 13, color: 'var(--text)', margin: 0 }}>{symptoms}</p>
              </div>
            )}
          </div>

          <p style={{ fontSize: 12, color: 'var(--text-subtle)', marginBottom: 16 }}>⏱ Slot held for 10 minutes. Confirm before it expires.</p>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setStep('symptoms')} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Back</button>
            <button onClick={confirmBooking} disabled={loading} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', background: 'var(--success)' }}>
              {loading ? 'Booking...' : 'Confirm Booking ✓'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default BookAppointment
