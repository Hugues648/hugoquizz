import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import LoadingSpinner from './LoadingSpinner'
import { languages } from '../config/i18n'

const SUPPORTED_LANGS = languages.map(l => l.code)

const AdminRoute = () => {
  const { user, userData, loading, isAdmin } = useAuth()
  const location = useLocation()
  const { lang } = useParams()
  const { i18n } = useTranslation()
  
  // Déterminer la langue actuelle
  const currentLang = lang || i18n.language?.split('-')[0] || 'fr'
  const validLang = SUPPORTED_LANGS.includes(currentLang) ? currentLang : 'fr'

  if (loading) {
    return <LoadingSpinner fullScreen />
  }

  // Not logged in
  if (!user) {
    return <Navigate to={`/${validLang}/login`} state={{ from: location }} replace />
  }

  // Logged in but not validated
  if (!userData?.validated) {
    return <Navigate to={`/${validLang}/pending`} replace />
  }

  // Not an admin
  if (!isAdmin()) {
    return <Navigate to={`/${validLang}/dashboard`} replace />
  }

  return <Outlet />
}

export default AdminRoute
