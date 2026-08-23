import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

// Auth Pages
import Login from './pages/Login'
import Register from './pages/Register'

// Patient Pages
import PatientDashboard from './pages/patient/Dashboard'
import SearchDoctors from './pages/patient/SearchDoctors'
import BookAppointment from './pages/patient/BookAppointment'
import PatientAppointments from './pages/patient/Appointments'
import AppointmentDetail from './pages/patient/AppointmentDetail'

// Doctor Pages
import DoctorDashboard from './pages/doctor/Dashboard'
import DoctorAppointments from './pages/doctor/Appointments'
import PostVisitForm from './pages/doctor/PostVisitForm'
import DoctorAppointmentDetail from './pages/doctor/AppointmentDetail'

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard'
import ManageDoctors from './pages/admin/ManageDoctors'
import CreateDoctor from './pages/admin/CreateDoctor'

import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'

function App() {
  const { user, loading } = useAuth()

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        border: '3px solid var(--border)',
        borderTopColor: 'var(--primary)',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  const getDefaultPath = () => {
    if (!user) return '/login'
    if (user.role === 'ADMIN') return '/admin'
    if (user.role === 'DOCTOR') return '/doctor'
    return '/patient'
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={!user ? <Login /> : <Navigate to={getDefaultPath()} />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to={getDefaultPath()} />} />

      {/* Patient routes */}
      <Route path="/patient" element={<ProtectedRoute role="PATIENT"><Layout /></ProtectedRoute>}>
        <Route index element={<PatientDashboard />} />
        <Route path="doctors" element={<SearchDoctors />} />
        <Route path="book/:doctorId" element={<BookAppointment />} />
        <Route path="appointments" element={<PatientAppointments />} />
        <Route path="appointments/:id" element={<AppointmentDetail />} />
      </Route>

      {/* Doctor routes */}
      <Route path="/doctor" element={<ProtectedRoute role="DOCTOR"><Layout /></ProtectedRoute>}>
        <Route index element={<DoctorDashboard />} />
        <Route path="appointments" element={<DoctorAppointments />} />
        <Route path="appointments/:id/post-visit" element={<PostVisitForm />} />
        <Route path="appointments/:id/detail" element={<DoctorAppointmentDetail />} />
      </Route>

      {/* Admin routes */}
      <Route path="/admin" element={<ProtectedRoute role="ADMIN"><Layout /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="doctors" element={<ManageDoctors />} />
        <Route path="doctors/create" element={<CreateDoctor />} />
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to={getDefaultPath()} />} />
      <Route path="*" element={<Navigate to={getDefaultPath()} />} />
    </Routes>
  )
}

export default App
