import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { FiCheck, FiX, FiArrowRight } from 'react-icons/fi'
import confetti from 'canvas-confetti'

export function SubscriptionSuccess() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { refreshUserData } = useAuth()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const sessionId = searchParams.get('session_id')
    
    // Trigger confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    })

    // Refresh user data to get updated subscription
    const refreshData = async () => {
      try {
        await refreshUserData()
      } catch (error) {
        console.error('Error refreshing user data:', error)
      } finally {
        setLoading(false)
      }
    }

    refreshData()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 via-emerald-500 to-teal-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <FiCheck className="text-4xl text-white" />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-800 mb-3">
          {t('subscription.success.title', 'Paiement réussi !')}
        </h1>
        
        <p className="text-gray-600 mb-8">
          {t('subscription.success.message', 'Votre abonnement est maintenant actif. Profitez de toutes les fonctionnalités !')}
        </p>

        <button
          onClick={() => navigate('/dashboard')}
          className="w-full btn bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 flex items-center justify-center gap-2"
        >
          {t('subscription.success.goToDashboard', 'Accéder au tableau de bord')}
          <FiArrowRight />
        </button>
      </div>
    </div>
  )
}

export function SubscriptionCancel() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <FiX className="text-4xl text-white" />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-800 mb-3">
          {t('subscription.cancel.title', 'Paiement annulé')}
        </h1>
        
        <p className="text-gray-600 mb-8">
          {t('subscription.cancel.message', 'Votre paiement a été annulé. Vous pouvez réessayer à tout moment.')}
        </p>

        <div className="space-y-3">
          <button
            onClick={() => navigate('/pricing')}
            className="w-full btn bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
          >
            {t('subscription.cancel.tryAgain', 'Réessayer')}
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full btn btn-ghost text-gray-500"
          >
            {t('subscription.cancel.backToDashboard', 'Retour au tableau de bord')}
          </button>
        </div>
      </div>
    </div>
  )
}
