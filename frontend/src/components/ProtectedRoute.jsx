import { Navigate } from 'react-router-dom'

export default function ProtectedRoute({ children }) {
  const student = JSON.parse(localStorage.getItem('examguard_student') || 'null')
  if (!student) return <Navigate to="/login" replace />
  return children
}
