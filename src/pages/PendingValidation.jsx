import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { FiLogOut, FiRefreshCw, FiMail, FiCheck } from 'react-icons/fi'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'

const PendingValidation = () => {
  const { t } = useTranslation()
  const { user, logout, refreshUserData, resendVerificationEmail, isEmailVerified } = useAuth()
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true) // Start with checking = true
  const [resending, setResending] = useState(false)

  // Vérifier le statut au chargement de la page
  useEffect(() => {
    console.log('[PendingValidation] useEffect - user:', user?.email, 'emailVerified:', user?.emailVerified)
    
    if (!user) {
      console.log('[PendingValidation] No user, redirecting to login')
      navigate('/login')
      return
    }

    // Vérifier immédiatement et rafraîchir les données
    const checkStatus = async () => {
      console.log('[PendingValidation] checkStatus starting...')
      setChecking(true)
      try {
        const result = await refreshUserData()
        console.log('[PendingValidation] refreshUserData result:', result)
        
        // Utiliser le résultat directement au lieu de isEmailVerified()
        if (result?.emailVerified && result?.validated) {
          console.log('[PendingValidation] Email verified and validated! Redirecting to dashboard...')
          navigate('/dashboard', { replace: true })
          return
        }
      } catch (e) {
        console.error('[PendingValidation] Error refreshing user data:', e)
      }
      console.log('[PendingValidation] Email not verified, showing form')
      setChecking(false)
    }
    
    checkStatus()
  }, []) // Exécuter une seule fois au montage

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/')
    } catch (error) {
      toast.error(t('messages.error.logoutError'))
    }
  }

  const handleRefresh = async () => {
    setChecking(true)
    const result = await refreshUserData()
    console.log('[PendingValidation] handleRefresh result:', result)
    console.log('[PendingValidation] result.emailVerified:', result?.emailVerified)
    console.log('[PendingValidation] result.validated:', result?.validated)
    
    if (result?.emailVerified && result?.validated) {
      console.log('[PendingValidation] Both conditions met, redirecting...')
      toast.success(t('messages.success.emailVerified'))
      // Forcer un vrai refresh de la page pour éviter les problèmes de state
      window.location.href = '/dashboard'
      return
    }
    
    // Si email vérifié mais pas validated, afficher un message
    if (result?.emailVerified && !result?.validated) {
      console.log('[PendingValidation] Email verified but NOT validated')
      toast.error(t('messages.error.emailVerifiedNotValidated'))
    } else if (!result?.emailVerified) {
      console.log('[PendingValidation] Email NOT verified')
      toast.error(t('messages.error.emailNotVerified'))
    }
    
    setChecking(false)
  }

  const handleResendEmail = async () => {
    setResending(true)
    try {
      const sent = await resendVerificationEmail()
      if (sent) {
        toast.success(t('messages.success.verificationEmailSent'))
      } else {
        toast.success(t('messages.success.emailAlreadyVerified'))
        await handleRefresh()
      }
    } catch (error) {
      console.error('Resend error:', error)
      if (error.code === 'auth/too-many-requests') {
        toast.error(t('messages.error.tooManyAttempts'))
      } else if (error.code === 'auth/user-token-expired' || error.code === 'auth/requires-recent-login') {
        toast.error(t('messages.error.sessionExpired'))
        await logout()
        navigate('/login')
      } else if (error.message?.includes('Session expirée')) {
        toast.error(error.message)
        await logout()
        navigate('/login')
      } else {
        console.error('Full error details:', JSON.stringify(error, null, 2))
        toast.error(`${t('common.error')}: ${error.code || error.message || t('messages.error.generic')}`)
      }
    } finally {
      setResending(false)
    }
  }

  // Pendant la vérification initiale, afficher le spinner
  if (checking) {
    return <LoadingSpinner fullScreen text={t('common.checking')} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-3xl shadow-2xl p-8 animate-fade-in">
          
          {/* Progress Steps - Simplifié */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center">
              {/* Step 1: Email Verification */}
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-indigo-500 text-white animate-pulse">
                  <FiMail className="text-xl" />
                </div>
                <span className="text-xs mt-2 font-medium text-indigo-600">{t('common.verification')}</span>
              </div>
              
              {/* Connector */}
              <div className="w-16 h-1 mx-2 rounded bg-gray-200" />
              
              {/* Step 2: Access */}
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gray-200 text-gray-400">
                  <FiCheck className="text-xl" />
                </div>
                <span className="text-xs mt-2 font-medium text-gray-400">{t('common.access')}</span>
              </div>
            </div>
          </div>

          {/* Email Verification Content */}
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiMail className="text-indigo-500 text-4xl" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              {t('pendingValidation.title')}
            </h1>
            <p className="text-gray-600">
              {t('pendingValidation.emailSentTo')} <strong>{user?.email}</strong>
            </p>
          </div>

          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-indigo-800">
              {t('pendingValidation.checkInbox')}
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-green-800">
              {t('pendingValidation.accessGranted')}
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleRefresh}
              disabled={checking}
              className="w-full btn btn-primary flex items-center justify-center gap-2"
            >
              <FiRefreshCw className={checking ? 'animate-spin' : ''} />
              {t('pendingValidation.iVerified')}
            </button>
            <button
              onClick={handleResendEmail}
              disabled={resending}
              className="w-full btn btn-ghost flex items-center justify-center gap-2 text-indigo-600"
            >
              {resending ? (
                <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <FiMail />
              )}
              {t('pendingValidation.resendEmail')}
            </button>
          </div>

          {/* Logout Button */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <button
              onClick={handleLogout}
              className="w-full btn btn-ghost flex items-center justify-center gap-2 text-gray-500"
            >
              <FiLogOut />
              {t('pendingValidation.logout')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PendingValidation
