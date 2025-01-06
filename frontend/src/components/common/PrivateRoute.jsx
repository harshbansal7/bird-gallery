import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export function AdminRoute({ children }) {
  const { user } = useAuth()
  
  // You'll need to implement a way to check if user is admin
  // This could be stored in user metadata or checked via an API call
  if (!user?.isAdmin) {
    return <Navigate to="/" />
  }
  
  return children
} 