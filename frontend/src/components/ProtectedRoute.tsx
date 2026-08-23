import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface Props {
  children: ReactNode
  role: 'PATIENT' | 'DOCTOR' | 'ADMIN'
}

const ProtectedRoute = ({ children, role }: Props) => {
  const { user } = useAuth()

  if (!user) return <Navigate to="/login" replace />
  if (user.role !== role) {
    const redirectMap = { PATIENT: '/patient', DOCTOR: '/doctor', ADMIN: '/admin' }
    return <Navigate to={redirectMap[user.role]} replace />
  }

  return <>{children}</>
}

export default ProtectedRoute
