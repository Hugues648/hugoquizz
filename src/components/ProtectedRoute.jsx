import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import LoadingSpinner from './LoadingSpinner'
import { auth } from '../config/firebase'
import { languages } from '../config/i18n'

const SUPPORTED_LANGS = languages.map(l => l.code)

const ProtectedRoute = () => {
  const { user, userData, loading } = useAuth()
  const location = useLocation()
  const { lang } = useParams()
  const { i18n } = useTranslation()
  
  // Déterminer la langue actuelle
  const currentLang = lang || i18n.language?.split('-')[0] || 'fr'
  const validLang = SUPPORTED_LANGS.includes(currentLang) ? currentLang : 'fr'

  // Log pour debug
  console.log('[ProtectedRoute] loading:', loading, 'user:', user?.email, 'userData:', userData?.email)
  console.log('[ProtectedRoute] user.emailVerified:', user?.emailVerified, 'userData.validated:', userData?.validated)
  console.log('[ProtectedRoute] auth.currentUser.emailVerified:', auth.currentUser?.emailVerified)

  if (loading) {
    return <LoadingSpinner fullScreen />
  }

  // Not logged in - redirect to localized login
  if (!user) {
    return <Navigate to={`/${validLang}/login`} state={{ from: location }} replace />
  }

  // Wait for userData to load before checking validation
  if (!userData) {
    return <LoadingSpinner fullScreen />
  }

  // Check email verification - use user state (updated by refreshUserData) as primary
  // auth.currentUser might not be updated yet
  const emailVerified = user?.emailVerified === true || auth.currentUser?.emailVerified === true
  const validated = userData?.validated === true
  
  console.log('[ProtectedRoute] Final check - emailVerified:', emailVerified, 'validated:', validated)
  
  // Email not verified OR not validated - redirect to localized pending
  if (!emailVerified || !validated) {
    return <Navigate to={`/${validLang}/pending`} replace />
  }

  return <Outlet />
}

export default ProtectedRoute
