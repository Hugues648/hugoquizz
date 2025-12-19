import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from './LoadingSpinner'

const AdminRoute = () => {
  const { user, userData, loading, isAdmin } = useAuth()
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

  // Not an admin
  if (!isAdmin()) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

export default AdminRoute
