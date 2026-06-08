import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { FiLock, FiZap } from 'react-icons/fi'

/**
 * SubscriptionGuard - Protège les fonctionnalités selon l'abonnement
 * @param {string} feature - 'quiz' | 'questionnaire' | 'events'
 * @param {ReactNode} children - Contenu à afficher si accès autorisé
 * @param {string} fallbackMessage - Message personnalisé si bloqué
 */
export default function SubscriptionGuard({ 
  feature, 
  children, 
  fallbackMessage,
  showUpgradeButton = true 
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { canAccessFeature, isFreeUser, getCurrentPlan } = useAuth()

  const hasAccess = canAccessFeature(feature)

  if (hasAccess) {
    return children
  }

  // Blocked view
  const featureNames = {
    quiz: t('subscription.features.quiz', 'Quiz'),
    questionnaire: t('subscription.features.questionnaire', 'Questionnaires'),
    events: t('subscription.features.events', 'Événements')
  }

  const currentPlan = getCurrentPlan()

  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <FiLock className="text-3xl text-white" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-800 mb-3">
          {t('subscription.accessRestricted', 'Accès restreint')}
        </h2>
        
        <p className="text-gray-600 mb-6">
          {fallbackMessage || t('subscription.upgradeRequired', 
            'Votre abonnement {{plan}} ne vous permet pas d\'accéder aux {{feature}}.', 
            { 
              plan: currentPlan.name || t('subscription.plans.free', 'Gratuit'),
              feature: featureNames[feature] || feature 
            }
          )}
        </p>

        {isFreeUser() && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
            <p className="text-sm text-amber-800">
              <strong>{t('subscription.freeLimit', 'Compte gratuit :')}</strong>{' '}
              {t('subscription.freeLimitDesc', 'Vous avez accès aux quiz avec un maximum de 5 participants.')}
            </p>
          </div>
        )}

        {showUpgradeButton && (
          <button
            onClick={() => navigate('/pricing')}
            className="btn bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 flex items-center justify-center gap-2 w-full"
          >
            <FiZap />
            {t('subscription.upgradePlan', 'Passer au forfait Pro')}
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Hook pour vérifier l'accès à une fonctionnalité
 */
export const useSubscriptionAccess = (feature) => {
  const { canAccessFeature, isFreeUser, getCurrentPlan, getParticipantLimit } = useAuth()
  
  return {
    hasAccess: canAccessFeature(feature),
    isFree: isFreeUser(),
    plan: getCurrentPlan(),
    maxParticipants: getParticipantLimit()
  }
}

/**
 * Composant pour limiter les participants selon l'abonnement
 */
export function ParticipantLimitGuard({ currentCount, children, onLimitReached }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { getParticipantLimit, isFreeUser } = useAuth()
  
  const limit = getParticipantLimit()
  const isUnlimited = limit === -1
  const isAtLimit = !isUnlimited && currentCount >= limit

  if (isAtLimit && onLimitReached) {
    onLimitReached()
  }

  if (isAtLimit && isFreeUser()) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
        <p className="text-amber-800 mb-3">
          {t('subscription.participantLimit', 'Limite de {{limit}} participants atteinte.', { limit })}
        </p>
        <button
          onClick={() => navigate('/pricing')}
          className="btn btn-sm bg-amber-500 text-white hover:bg-amber-600"
        >
          {t('subscription.unlockUnlimited', 'Débloquer illimité')}
        </button>
      </div>
    )
  }

  return children
}
