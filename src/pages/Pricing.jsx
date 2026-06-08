import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { SUBSCRIPTION_PLANS, getPlanById } from '../config/subscriptions'
import { redirectToCheckout, checkTrialEligibility } from '../services/stripe'
import { FiCheck, FiX, FiZap, FiStar, FiAward, FiArrowRight, FiGift, FiInfo } from 'react-icons/fi'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Pricing() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, userData, getCurrentPlan, isFreeUser, isSubscribed } = useAuth()
  const [loading, setLoading] = useState(null)
  const [billingPeriod, setBillingPeriod] = useState('monthly') // 'monthly' | 'yearly'
  const [trialEligibility, setTrialEligibility] = useState(null)
  const [checkingTrial, setCheckingTrial] = useState(false)
  const [showTrialModal, setShowTrialModal] = useState(false)
  const [selectedTrialPlan, setSelectedTrialPlan] = useState(null)

  const currentPlan = getCurrentPlan()

  // Check trial eligibility when user logs in
  useEffect(() => {
    const checkTrial = async () => {
      if (user && isFreeUser()) {
        setCheckingTrial(true)
        try {
          const result = await checkTrialEligibility()
          setTrialEligibility(result)
        } catch (error) {
          console.error('Error checking trial eligibility:', error)
          setTrialEligibility({ eligible: false, reason: 'error' })
        } finally {
          setCheckingTrial(false)
        }
      }
    }
    checkTrial()
  }, [user, isFreeUser])

  const handleSubscribe = async (plan, withTrial = false) => {
    if (!user) {
      toast.error(t('auth.loginRequired', 'Veuillez vous connecter'))
      navigate('/login')
      return
    }

    if (!plan.stripePriceId) {
      toast.error(t('subscription.planNotAvailable', 'Ce forfait n\'est pas encore disponible'))
      return
    }

    // If trial requested, verify eligibility first
    if (withTrial && !trialEligibility?.eligible) {
      toast.error(t('subscription.trialNotEligible', 'Vous n\'êtes pas éligible à l\'essai gratuit'))
      return
    }

    setLoading(plan.id)
    setShowTrialModal(false)

    try {
      await redirectToCheckout(
        user.uid,
        plan.stripePriceId,
        userData?.email || user.email,
        plan.id,
        withTrial
      )
    } catch (error) {
      console.error('Checkout error:', error)
      toast.error(t('subscription.checkoutError', 'Erreur lors de la redirection vers le paiement'))
    } finally {
      setLoading(null)
    }
  }

  const handleTrialClick = (plan) => {
    setSelectedTrialPlan(plan)
    setShowTrialModal(true)
  }

  const plans = {
    monthly: [
      {
        ...SUBSCRIPTION_PLANS.QUIZ_MONTHLY,
        icon: FiZap,
        color: 'purple',
        popular: false
      },
      {
        ...SUBSCRIPTION_PLANS.EVENTS_MONTHLY,
        icon: FiStar,
        color: 'pink',
        popular: false
      },
      {
        ...SUBSCRIPTION_PLANS.COMPLETE_MONTHLY,
        icon: FiAward,
        color: 'amber',
        popular: true
      }
    ],
    yearly: [
      {
        ...SUBSCRIPTION_PLANS.QUIZ_YEARLY,
        icon: FiZap,
        color: 'purple',
        popular: false,
        savings: 10 // 50€ vs 60€ (5€ x 12)
      },
      {
        ...SUBSCRIPTION_PLANS.EVENTS_YEARLY,
        icon: FiStar,
        color: 'pink',
        popular: false,
        savings: 10
      },
      {
        ...SUBSCRIPTION_PLANS.COMPLETE_YEARLY,
        icon: FiAward,
        color: 'amber',
        popular: true,
        savings: 26 // 70€ vs 96€ (8€ x 12)
      }
    ]
  }

  const features = {
    quiz: {
      free: '5 participants max',
      paid: 'Participants illimités'
    },
    questionnaire: {
      free: false,
      paid: true
    },
    events: {
      free: false,
      paid: true
    }
  }

  const colorClasses = {
    purple: {
      bg: 'bg-purple-500',
      gradient: 'from-purple-500 to-purple-600',
      light: 'bg-purple-50',
      border: 'border-purple-200',
      text: 'text-purple-600'
    },
    pink: {
      bg: 'bg-pink-500',
      gradient: 'from-pink-500 to-pink-600',
      light: 'bg-pink-50',
      border: 'border-pink-200',
      text: 'text-pink-600'
    },
    amber: {
      bg: 'bg-amber-500',
      gradient: 'from-amber-500 to-orange-500',
      light: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-600'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {t('subscription.title', 'Choisissez votre forfait')}
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            {t('subscription.subtitle', 'Débloquez toutes les fonctionnalités de HugoQuiz')}
          </p>
        </div>

        {/* Current Plan Badge */}
        {user && (
          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full">
              {t('subscription.currentPlan', 'Forfait actuel :')}
              <strong>{t(currentPlan.nameKey, currentPlan.name)}</strong>
            </span>
          </div>
        )}

        {/* Free Trial Banner */}
        {user && trialEligibility?.eligible && isFreeUser() && (
          <div className="max-w-3xl mx-auto mb-8">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-white">
                  <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                    <FiGift className="text-3xl" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{t('subscription.trial.banner', 'Essai gratuit de 14 jours !')}</h3>
                    <p className="text-white/80 text-sm">
                      {t('subscription.trial.bannerDesc', 'Testez toutes les fonctionnalités sans engagement. Annulable à tout moment.')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-white/80 text-sm">
                  <FiInfo className="w-4 h-4" />
                  {t('subscription.trial.cardRequired', 'Carte bancaire requise')}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Trial Not Eligible Notice */}
        {user && trialEligibility && !trialEligibility.eligible && isFreeUser() && (
          <div className="max-w-3xl mx-auto mb-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <div className="flex items-center gap-3 text-white/80 text-sm">
                <FiInfo className="w-5 h-5 flex-shrink-0" />
                <span>
                  {trialEligibility.reason === 'trial_already_used' 
                    ? t('subscription.trial.alreadyUsed', 'Vous avez déjà utilisé votre essai gratuit.')
                    : trialEligibility.reason === 'admin_granted_access'
                    ? t('subscription.trial.adminGranted', 'L\'essai gratuit n\'est pas disponible pour les comptes ayant bénéficié d\'un accès offert.')
                    : t('subscription.trial.notEligible', 'Vous n\'êtes pas éligible à l\'essai gratuit.')
                  }
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Billing Toggle */}
        <div className="flex justify-center mb-10">
          <div className="bg-white/20 backdrop-blur-sm rounded-full p-1 flex">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-6 py-2 rounded-full font-medium transition-all ${
                billingPeriod === 'monthly'
                  ? 'bg-white text-gray-800 shadow-lg'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              {t('subscription.monthly', 'Mensuel')}
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-6 py-2 rounded-full font-medium transition-all flex items-center gap-2 ${
                billingPeriod === 'yearly'
                  ? 'bg-white text-gray-800 shadow-lg'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              {t('subscription.yearly', 'Annuel')}
              <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                -17%
              </span>
            </button>
          </div>
        </div>

        {/* Free Plan Card */}
        <div className="max-w-sm mx-auto mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="text-center">
              <h3 className="text-xl font-bold text-white mb-2">
                {t('subscription.plans.free', 'Gratuit')}
              </h3>
              <div className="text-3xl font-bold text-white mb-4">0€</div>
              <ul className="text-white/80 text-sm space-y-2 mb-4">
                <li className="flex items-center gap-2">
                  <FiCheck className="text-green-400" />
                  {t('subscription.freeFeatures.quiz', 'Quiz (5 participants max)')}
                </li>
                <li className="flex items-center gap-2 opacity-50">
                  <FiX className="text-red-400" />
                  {t('subscription.freeFeatures.questionnaire', 'Questionnaires')}
                </li>
                <li className="flex items-center gap-2 opacity-50">
                  <FiX className="text-red-400" />
                  {t('subscription.freeFeatures.events', 'Événements')}
                </li>
              </ul>
              {isFreeUser() && (
                <span className="inline-block bg-white/20 text-white px-4 py-2 rounded-lg text-sm">
                  {t('subscription.currentPlanBadge', 'Votre forfait actuel')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Paid Plans Grid */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans[billingPeriod].map((plan) => {
            const colors = colorClasses[plan.color]
            const Icon = plan.icon
            const isCurrentPlan = currentPlan.id === plan.id
            const isUpgrade = !isFreeUser() && plan.price > currentPlan.price

            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl shadow-xl overflow-hidden transform transition-all hover:scale-105 ${
                  plan.popular ? 'ring-4 ring-amber-400 ring-opacity-50' : ''
                }`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold px-4 py-1 rounded-bl-lg">
                    {t('subscription.popular', 'POPULAIRE')}
                  </div>
                )}

                {/* Plan Header */}
                <div className={`bg-gradient-to-r ${colors.gradient} p-6 text-white`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <Icon className="text-2xl" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{t(plan.nameKey, plan.name)}</h3>
                      <p className="text-white/80 text-sm">
                        {billingPeriod === 'monthly' 
                          ? t('subscription.perMonth', 'par mois')
                          : t('subscription.perYear', 'par an')
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{plan.price}€</span>
                    {plan.savings && (
                      <span className="text-white/80 text-sm ml-2">
                        ({t('subscription.save', 'Économisez')} {plan.savings}€)
                      </span>
                    )}
                  </div>
                </div>

                {/* Features */}
                <div className="p-6">
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center gap-3">
                      {plan.features.quiz ? (
                        <FiCheck className="text-green-500 flex-shrink-0" />
                      ) : (
                        <FiX className="text-red-400 flex-shrink-0" />
                      )}
                      <span className={plan.features.quiz ? 'text-gray-700' : 'text-gray-400'}>
                        {plan.features.quiz 
                          ? t('subscription.unlimitedQuiz', 'Quiz illimités')
                          : t('subscription.noQuiz', 'Quiz non inclus')
                        }
                      </span>
                    </li>
                    <li className="flex items-center gap-3">
                      {plan.features.questionnaire ? (
                        <FiCheck className="text-green-500 flex-shrink-0" />
                      ) : (
                        <FiX className="text-red-400 flex-shrink-0" />
                      )}
                      <span className={plan.features.questionnaire ? 'text-gray-700' : 'text-gray-400'}>
                        {plan.features.questionnaire 
                          ? t('subscription.unlimitedQuestionnaire', 'Questionnaires illimités')
                          : t('subscription.noQuestionnaire', 'Questionnaires non inclus')
                        }
                      </span>
                    </li>
                    <li className="flex items-center gap-3">
                      {plan.features.events ? (
                        <FiCheck className="text-green-500 flex-shrink-0" />
                      ) : (
                        <FiX className="text-red-400 flex-shrink-0" />
                      )}
                      <span className={plan.features.events ? 'text-gray-700' : 'text-gray-400'}>
                        {plan.features.events 
                          ? t('subscription.unlimitedEvents', 'Événements illimités')
                          : t('subscription.noEvents', 'Événements non inclus')
                        }
                      </span>
                    </li>
                    <li className="flex items-center gap-3">
                      <FiCheck className="text-green-500 flex-shrink-0" />
                      <span className="text-gray-700">
                        {t('subscription.unlimitedParticipants', 'Participants illimités')}
                      </span>
                    </li>
                  </ul>

                  {/* CTA Buttons */}
                  {isCurrentPlan ? (
                    <button
                      disabled
                      className="w-full py-3 px-4 rounded-xl bg-gray-100 text-gray-500 font-medium cursor-not-allowed"
                    >
                      {t('subscription.currentPlanBadge', 'Votre forfait actuel')}
                    </button>
                  ) : (
                    <div className="space-y-2">
                      {/* Trial Button - Only for monthly plans and eligible users */}
                      {trialEligibility?.eligible && billingPeriod === 'monthly' && isFreeUser() && (
                        <button
                          onClick={() => handleTrialClick(plan)}
                          disabled={loading === plan.id}
                          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium hover:opacity-90 transition-all flex items-center justify-center gap-2"
                        >
                          {loading === plan.id ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <FiGift className="w-5 h-5" />
                              {t('subscription.startTrial', 'Essai gratuit 14 jours')}
                            </>
                          )}
                        </button>
                      )}
                      
                      {/* Regular Subscribe Button */}
                      <button
                        onClick={() => handleSubscribe(plan, false)}
                        disabled={loading === plan.id}
                        className={`w-full py-3 px-4 rounded-xl bg-gradient-to-r ${colors.gradient} text-white font-medium hover:opacity-90 transition-all flex items-center justify-center gap-2`}
                      >
                        {loading === plan.id ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            {isUpgrade 
                              ? t('subscription.upgrade', 'Upgrade')
                              : t('subscription.subscribe', 'S\'abonner')
                            }
                            <FiArrowRight />
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Trial Confirmation Modal */}
        {showTrialModal && selectedTrialPlan && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <FiGift className="text-2xl" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{t('subscription.trial.modalTitle', 'Essai gratuit de 14 jours')}</h3>
                    <p className="text-white/80 text-sm">{t(selectedTrialPlan.nameKey, selectedTrialPlan.name)}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <FiCheck className="text-green-500 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700 text-sm">
                      {t('subscription.trial.benefit1', 'Accès complet à toutes les fonctionnalités pendant 14 jours')}
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <FiCheck className="text-green-500 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700 text-sm">
                      {t('subscription.trial.benefit2', 'Annulable à tout moment avant la fin de l\'essai')}
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <FiInfo className="text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700 text-sm">
                      {t('subscription.trial.warning', 'Carte bancaire requise. Prélèvement automatique de {{price}}€/mois à J+15 si non résilié.', { price: selectedTrialPlan.price })}
                    </p>
                  </div>
                </div>
                
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-amber-800 text-sm font-medium">
                    ⚠️ {t('subscription.trial.uniqueOffer', 'L\'essai gratuit n\'est disponible qu\'une seule fois par utilisateur, quel que soit le forfait choisi.')}
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowTrialModal(false)}
                    className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-all"
                  >
                    {t('common.cancel', 'Annuler')}
                  </button>
                  <button
                    onClick={() => handleSubscribe(selectedTrialPlan, true)}
                    disabled={loading === selectedTrialPlan.id}
                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium hover:opacity-90 transition-all flex items-center justify-center gap-2"
                  >
                    {loading === selectedTrialPlan.id ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      t('subscription.trial.confirm', 'Démarrer l\'essai')
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FAQ or Trust badges */}
        <div className="mt-16 text-center">
          <div className="flex flex-wrap justify-center gap-8 text-white/80">
            <div className="flex items-center gap-2">
              <FiCheck className="text-green-400" />
              {t('subscription.guarantee.cancel', 'Annulation à tout moment')}
            </div>
            <div className="flex items-center gap-2">
              <FiCheck className="text-green-400" />
              {t('subscription.guarantee.secure', 'Paiement sécurisé')}
            </div>
            <div className="flex items-center gap-2">
              <FiCheck className="text-green-400" />
              {t('subscription.guarantee.support', 'Support inclus')}
            </div>
          </div>
          
          {/* Manage subscription link for paying users */}
          {!isFreeUser() && (
            <div className="mt-8">
              <button
                onClick={() => navigate('/settings?tab=subscription')}
                className="inline-flex items-center gap-2 text-white/60 hover:text-white/90 text-sm underline underline-offset-4 transition-colors"
              >
                {t('subscription.manageExisting', 'Gérer mon abonnement existant ou résilier')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
