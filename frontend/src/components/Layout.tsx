import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import {
  LogOut, Calendar, Users, Home, Stethoscope,
  UserPlus, Sun, Moon
} from 'lucide-react'

const getPageTitle = (pathname: string): string => {
  const routes: Record<string, string> = {
    '/patient':                    'Dashboard',
    '/patient/doctors':            'Find a Doctor',
    '/patient/appointments':       'My Appointments',
    '/doctor':                     'Dashboard',
    '/doctor/appointments':        'Appointments',
    '/admin':                      'Dashboard',
    '/admin/doctors':              'Manage Doctors',
    '/admin/doctors/create':       'Add Doctor',
  }
  // Exact match first
  if (routes[pathname]) return routes[pathname]
  // Dynamic routes
  if (pathname.startsWith('/patient/book/'))             return 'Book Appointment'
  if (pathname.startsWith('/patient/appointments/'))     return 'Appointment Details'
  if (pathname.includes('/post-visit'))                  return 'Post-Visit Notes'
  if (pathname.includes('/detail'))                      return 'Appointment Record'
  return 'Healthcare'
}

const Layout = () => {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => { logout(); navigate('/login') }

  const navConfig = {
    PATIENT: {
      sections: [
        {
          label: 'Menu',
          links: [
            { to: '/patient', label: 'Dashboard', icon: <Home size={17} /> },
            { to: '/patient/doctors', label: 'Find Doctors', icon: <Stethoscope size={17} /> },
            { to: '/patient/appointments', label: 'My Appointments', icon: <Calendar size={17} /> },
          ],
        },
      ],
    },
    DOCTOR: {
      sections: [
        {
          label: 'Menu',
          links: [
            { to: '/doctor', label: 'Dashboard', icon: <Home size={17} /> },
            { to: '/doctor/appointments', label: 'Appointments', icon: <Calendar size={17} /> },
          ],
        },
      ],
    },
    ADMIN: {
      sections: [
        {
          label: 'Menu',
          links: [
            { to: '/admin', label: 'Dashboard', icon: <Home size={17} /> },
          ],
        },
        {
          label: 'Doctors',
          links: [
            { to: '/admin/doctors', label: 'Manage Doctors', icon: <Users size={17} /> },
            { to: '/admin/doctors/create', label: 'Add Doctor', icon: <UserPlus size={17} /> },
          ],
        },
      ],
    },
  }

  const sections = user ? navConfig[user.role].sections : []
  const isActive = (to: string) => location.pathname === to

  const roleColors: Record<string, string> = {
    PATIENT: 'var(--success)',
    DOCTOR:  'var(--primary)',
    ADMIN:   'var(--purple)',
  }
  const roleColor = user ? roleColors[user.role] : 'var(--primary)'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: 240,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        height: '100vh',
      }}>
        {/* Logo */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36,
              background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px var(--primary-glow)',
            }}>
              <Stethoscope size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>HealthCare</div>
              <div style={{ fontSize: 11, color: 'var(--text-subtle)', textTransform: 'capitalize' }}>
                {user?.role?.toLowerCase()} Portal
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 12px', overflowY: 'auto' }}>
          {sections.map(section => (
            <div key={section.label} style={{ marginBottom: 20 }}>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                color: 'var(--text-subtle)', textTransform: 'uppercase',
                padding: '0 8px', marginBottom: 6,
              }}>
                {section.label}
              </div>
              {section.links.map(link => (
                <Link key={link.to} to={link.to} style={{ textDecoration: 'none' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 12px', borderRadius: 8, marginBottom: 2,
                    fontSize: 13, fontWeight: 500,
                    background: isActive(link.to) ? 'var(--primary-glow)' : 'transparent',
                    color: isActive(link.to) ? 'var(--primary)' : 'var(--text-muted)',
                    transition: 'all 0.15s',
                    borderLeft: isActive(link.to) ? `3px solid var(--primary)` : '3px solid transparent',
                  }}
                  onMouseEnter={e => {
                    if (!isActive(link.to)) {
                      (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'
                      ;(e.currentTarget as HTMLElement).style.color = 'var(--text)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive(link.to)) {
                      (e.currentTarget as HTMLElement).style.background = 'transparent'
                      ;(e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'
                    }
                  }}
                  >
                    {link.icon}
                    {link.label}
                  </div>
                </Link>
              ))}
            </div>
          ))}
        </nav>

        {/* User profile at bottom */}
        <div style={{ padding: '12px', borderTop: '1px solid var(--border)' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 10,
            background: 'var(--surface-2)', marginBottom: 8,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: `${roleColor}22`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, color: roleColor, flexShrink: 0,
            }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-subtle)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email}
              </div>
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-danger" style={{ width: '100%', justifyContent: 'center', padding: '8px 12px' }}>
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Top header */}
        <header style={{
          height: 60,
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 28px',
          position: 'sticky', top: 0, zIndex: 10,
        }}>
          <div>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
              {getPageTitle(location.pathname)}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Theme toggle */}
            <button
              onClick={toggle}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              style={{
                width: 36, height: 36, borderRadius: 8,
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--text-muted)',
                transition: 'all 0.15s',
              }}
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout
