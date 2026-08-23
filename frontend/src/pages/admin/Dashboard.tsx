import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import { Users, Stethoscope, Calendar, TrendingUp, UserPlus, ArrowRight } from 'lucide-react'

const AdminDashboard = () => {
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then(r => r.data.data),
  })

  const cards = [
    { label: 'Total Doctors', value: stats?.totalDoctors ?? '—', icon: <Stethoscope size={20} />, color: 'var(--primary)', bg: 'var(--primary-glow)', to: '/admin/doctors' },
    { label: 'Total Patients', value: stats?.totalPatients ?? '—', icon: <Users size={20} />, color: 'var(--success)', bg: 'var(--success-bg)' },
    { label: 'Total Appointments', value: stats?.totalAppointments ?? '—', icon: <Calendar size={20} />, color: 'var(--purple)', bg: 'var(--purple-bg)' },
    { label: "Today's Appointments", value: stats?.todayAppointments ?? '—', icon: <TrendingUp size={20} />, color: 'var(--warning)', bg: 'var(--warning-bg)' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Dashboard</h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>System overview</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {cards.map(c => (
          <div key={c.label} className="card" style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.color }}>
                {c.icon}
              </div>
              {c.to && (
                <Link to={c.to} style={{ color: 'var(--text-subtle)', display: 'flex' }}>
                  <ArrowRight size={14} />
                </Link>
              )}
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{c.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="card" style={{ padding: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: '0 0 16px' }}>Quick Actions</h2>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link to="/admin/doctors" style={{ textDecoration: 'none', flex: 1 }}>
            <div style={{
              padding: '16px 20px', borderRadius: 10,
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 12,
              transition: 'border-color 0.15s',
              cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'}
            >
              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Stethoscope size={17} color="var(--primary)" />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Manage Doctors</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>View profiles & leave</div>
              </div>
            </div>
          </Link>

          <Link to="/admin/doctors/create" style={{ textDecoration: 'none', flex: 1 }}>
            <div style={{
              padding: '16px 20px', borderRadius: 10,
              background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
              display: 'flex', alignItems: 'center', gap: 12,
              cursor: 'pointer',
              boxShadow: '0 4px 14px var(--primary-glow)',
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserPlus size={17} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Add New Doctor</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>Create doctor profile</div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
