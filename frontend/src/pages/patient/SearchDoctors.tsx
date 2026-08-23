import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import { Search, Stethoscope, Clock } from 'lucide-react'

const SearchDoctors = () => {
  const [specialisation, setSpecialisation] = useState('')
  const [name, setName] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['doctors', specialisation, name],
    queryFn: () => api.get('/doctors', { params: { specialisation, name } }).then(r => r.data.data),
  })

  const doctors = data || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Find a Doctor</h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>Search by specialisation or name</p>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
          <input
            placeholder="Specialisation (e.g. Cardiology)"
            value={specialisation}
            onChange={e => setSpecialisation(e.target.value)}
            className="input"
            style={{ paddingLeft: 36 }}
          />
        </div>
        <input
          placeholder="Doctor name"
          value={name}
          onChange={e => setName(e.target.value)}
          className="input"
          style={{ flex: 1 }}
        />
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-subtle)' }}>Searching...</div>
      ) : doctors.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <Stethoscope size={24} color="var(--text-subtle)" />
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No doctors found</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {doctors.map((doctor: any) => (
            <div key={doctor.id} className="card" style={{ padding: 20 }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: '0 0 3px' }}>Dr. {doctor.user.name}</h3>
                  <span style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 500 }}>{doctor.specialisation}</span>
                </div>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Stethoscope size={18} color="var(--primary)" />
                </div>
              </div>

              {doctor.qualifications && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{doctor.qualifications}</p>
              )}
              {doctor.bio && (
                <p style={{ fontSize: 12, color: 'var(--text-subtle)', marginBottom: 10, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>{doctor.bio}</p>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                <Clock size={12} color="var(--text-subtle)" />
                <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>{doctor.slotDurationMins} min slots</span>
              </div>

              <Link to={`/patient/book/${doctor.id}`} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}>
                Book Appointment
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default SearchDoctors
