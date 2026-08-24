import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { format, addDays } from 'date-fns'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

interface Props {
  appointmentId: string
  doctorId: string
  onClose: () => void
  onSuccess: () => void
}

const RescheduleModal = ({ appointmentId, doctorId, onClose, onSuccess }: Props) => {
  const queryClient = useQueryClient()
  const [selectedDate, setSelectedDate] = useState(addDays(new Date(), 1))
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const dateStr = format(selectedDate, 'yyyy-MM-dd')

  const { data: slotsData, isLoading } = useQuery({
    queryKey: ['slots', doctorId, dateStr],
    queryFn: () => api.get(`/doctors/${doctorId}/slots`, { params: { date: dateStr } }).then(r => r.data.data),
  })

  const slots = slotsData || []

  const handleReschedule = async () => {
    if (!selectedSlot) return
    setLoading(true)
    try {
      const [hours, mins] = selectedSlot.split(':').map(Number)
      const newScheduledAt = new Date(selectedDate)
      newScheduledAt.setHours(hours, mins, 0, 0)
      await api.patch(`/appointments/${appointmentId}/reschedule`, { newScheduledAt })
      toast.success('Appointment rescheduled. Email and calendar updated.')
      queryClient.invalidateQueries({ queryKey: ['appointment', appointmentId] })
      queryClient.invalidateQueries({ queryKey: ['patient-appointments'] })
      queryClient.invalidateQueries({ queryKey: ['doctor-appointments'] })
      onSuccess()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reschedule')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(2px)',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="card" style={{ width: '100%', maxWidth: 460, padding: 24, margin: 16, position: 'relative' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Reschedule Appointment</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-subtle)', display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        {/* Date picker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button
            onClick={() => setSelectedDate(d => addDays(d, -1))}
            disabled={selectedDate <= addDays(new Date(), 0)}
            style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}
          >
            <ChevronLeft size={15} />
          </button>
          <span style={{ flex: 1, textAlign: 'center', fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>
            {format(selectedDate, 'EEEE, MMMM d yyyy')}
          </span>
          <button
            onClick={() => setSelectedDate(d => addDays(d, 1))}
            style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}
          >
            <ChevronRight size={15} />
          </button>
        </div>

        {/* Slots */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-subtle)', fontSize: 13 }}>Loading slots...</div>
        ) : slots.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-subtle)', fontSize: 13 }}>No slots available on this day</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
            {slots.map((slot: any) => (
              <button
                key={slot.time}
                disabled={!slot.available}
                onClick={() => setSelectedSlot(slot.time)}
                style={{
                  padding: '9px 0', borderRadius: 8, fontSize: 13, fontWeight: 500,
                  cursor: slot.available ? 'pointer' : 'not-allowed',
                  border: '1px solid',
                  borderColor: selectedSlot === slot.time ? 'var(--purple)' : slot.available ? 'var(--border)' : 'transparent',
                  background: selectedSlot === slot.time ? 'var(--purple)' : slot.available ? 'var(--surface-2)' : 'var(--surface-3)',
                  color: selectedSlot === slot.time ? '#fff' : slot.available ? 'var(--text)' : 'var(--text-subtle)',
                  transition: 'all 0.1s',
                }}
              >
                {slot.time}
              </button>
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
          <button
            onClick={handleReschedule}
            disabled={!selectedSlot || loading}
            className="btn"
            style={{ flex: 1, justifyContent: 'center', background: 'var(--purple)', color: '#fff', opacity: (!selectedSlot || loading) ? 0.5 : 1 }}
          >
            {loading ? 'Rescheduling...' : 'Confirm Reschedule'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default RescheduleModal
