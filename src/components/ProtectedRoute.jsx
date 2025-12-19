import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from './LoadingSpinner'

const ProtectedRoute = () => {
  const { user, userData, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <LoadingSpinner fullScreen />
  }

  // Not logged in
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Logged in but not validated
  if (!userData?.validated) {
    return <Navigate to="/pending" replace />
  }

  return <Outlet />
}

export default ProtectedRoute
