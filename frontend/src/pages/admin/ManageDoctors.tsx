import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { UserPlus, Stethoscope, PlusCircle, Trash2 } from 'lucide-react'

const ManageDoctors = () => {
  const queryClient = useQueryClient()
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null)
  const [leaveDate, setLeaveDate] = useState('')
  const [leaveReason, setLeaveReason] = useState('')
  const [addingLeave, setAddingLeave] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-doctors'],
    queryFn: () => api.get('/admin/doctors').then(r => r.data.data),
  })
  const doctors = data || []

  const handleAddLeave = async (doctorId: string) => {
    if (!leaveDate) { toast.error('Select a date'); return }
    setAddingLeave(true)
    try {
      const res = await api.post(`/admin/doctors/${doctorId}/leave`, { date: leaveDate, reason: leaveReason })
      toast.success(res.data.message || 'Leave added')
      setLeaveDate(''); setLeaveReason(''); setSelectedDoctor(null)
      queryClient.invalidateQueries({ queryKey: ['admin-doctors'] })
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add leave')
    } finally { setAddingLeave(false) }
  }

  const handleRemoveLeave = async (doctorId: string, leaveId: string) => {
    try {
      await api.delete(`/admin/doctors/${doctorId}/leave/${leaveId}`)
      toast.success('Leave removed')
      queryClient.invalidateQueries({ queryKey: ['admin-doctors'] })
    } catch { toast.error('Failed to remove leave') }
  }

  const handleDeleteDoctor = async (doctorId: string, doctorName: string) => {
    if (!confirm(`Remove Dr. ${doctorName} permanently?\n\nAll upcoming appointments will be cancelled and patients notified.`)) return
    setDeletingId(doctorId)
    try {
      const res = await api.delete(`/admin/doctors/${doctorId}`)
      toast.success(res.data.message || 'Doctor removed')
      queryClient.invalidateQueries({ queryKey: ['admin-doctors'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to remove doctor')
    } finally { setDeletingId(null) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Manage Doctors</h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>Doctor profiles and leave management</p>
        </div>
        <Link to="/admin/doctors/create" className="btn btn-primary" style={{ textDecoration: 'none' }}>
          <UserPlus size={15} /> Add Doctor
        </Link>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-subtle)' }}>Loading...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {doctors.map((doctor: any) => (
            <div key={doctor.id} className="card" style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Stethoscope size={20} color="var(--primary)" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: '0 0 2px' }}>Dr. {doctor.user.name}</h3>
                    <p style={{ fontSize: 13, color: 'var(--primary)', margin: '0 0 2px' }}>{doctor.specialisation}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-subtle)', margin: 0 }}>{doctor.user.email}</p>
                    {doctor.qualifications && <p style={{ fontSize: 12, color: 'var(--text-subtle)', margin: 0 }}>{doctor.qualifications}</p>}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => setSelectedDoctor(selectedDoctor === doctor.id ? null : doctor.id)} className="btn btn-ghost" style={{ padding: '7px 12px', fontSize: 13 }}>
                    <PlusCircle size={14} /> Add Leave
                  </button>
                  <button onClick={() => handleDeleteDoctor(doctor.id, doctor.user.name)} disabled={deletingId === doctor.id} className="btn btn-danger" style={{ padding: '7px 12px', fontSize: 13 }}>
                    <Trash2 size={14} />
                    {deletingId === doctor.id ? 'Removing...' : 'Remove'}
                  </button>
                </div>
              </div>

              {/* Add leave form */}
              {selectedDoctor === doctor.id && (
                <div style={{ marginTop: 14, padding: '14px 16px', background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: '0 0 12px' }}>Add Leave Day</p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input type="date" value={leaveDate} onChange={e => setLeaveDate(e.target.value)}
                      min={format(new Date(), 'yyyy-MM-dd')} className="input" style={{ width: 'auto', flex: '0 0 auto' }} />
                    <input value={leaveReason} onChange={e => setLeaveReason(e.target.value)}
                      placeholder="Reason (optional)" className="input" />
                    <button onClick={() => handleAddLeave(doctor.id)} disabled={addingLeave} className="btn btn-primary" style={{ flexShrink: 0 }}>
                      {addingLeave ? 'Adding...' : 'Add'}
                    </button>
                  </div>
                </div>
              )}

              {/* Leave days */}
              {doctor.leaveDays?.length > 0 && (
                <div style={{ marginTop: 12, paddingLeft: 56 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-subtle)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Leave Days</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {doctor.leaveDays.map((leave: any) => (
                      <div key={leave.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 99, fontSize: 12, background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid transparent' }}>
                        {format(new Date(leave.date), 'MMM d, yyyy')}
                        {leave.reason && ` · ${leave.reason}`}
                        <button onClick={() => handleRemoveLeave(doctor.id, leave.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', padding: 0, marginLeft: 2 }}>
                          <Trash2 size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ManageDoctors
