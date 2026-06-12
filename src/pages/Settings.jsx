import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FiMail, FiLock, FiUser, FiSave, FiAlertCircle, FiCheck, FiHelpCircle, FiGlobe, FiCreditCard, FiZap, FiClock, FiArrowRight, FiRefreshCw, FiXCircle } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { useResetTutorial } from '../components/Tutorial'
import { LanguageSelectorCompact } from '../components/LanguageSelector'
import { createPortalSession, checkRefundEligibility, requestRefund, cancelRenewal, reactivateSubscription, renounceAccess, cancelTrial, terminateSubscription } from '../services/stripe'
import { getDaysUntilExpiration } from '../config/subscriptions'

const Settings = () => {
  const { user, userData, updateUserEmail, getCurrentPlan, getSubscription, isFreeUser, getSubStatus, getDaysLeft } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const resetTutorial = useResetTutorial()
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'subscription')
  
  // Email change state
  const [newEmail, setNewEmail] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  
  // Cancellation state
  const [cancellationInfo, setCancellationInfo] = useState(null)
  const [cancellationLoading, setCancellationLoading] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showTerminateModal, setShowTerminateModal] = useState(false)

  const currentPlan = getCurrentPlan()
  const subscription = getSubscription()
  const subscriptionStatus = getSubStatus()
  const daysLeft = getDaysLeft()

  // Fetch cancellation eligibility on mount
  useEffect(() => {
    if (!isFreeUser() && subscription?.stripeSubscriptionId) {
      checkRefundEligibility()
        .then(info => setCancellationInfo(info))
        .catch(err => console.error('Error checking refund eligibility:', err))
    }
  }, [subscription])

  const handleManageSubscription = async () => {
    if (!subscription?.stripeCustomerId) {
      navigate('/pricing')
      return
    }

    setPortalLoading(true)
    try {
      await createPortalSession(user.uid)
    } catch (error) {
      console.error('Portal error:', error)
      toast.error(t('subscription.portalError', 'Erreur lors de l\'ouverture du portail'))
    } finally {
      setPortalLoading(false)
    }
  }

  const handleRequestRefund = async () => {
    setCancellationLoading(true)
    try {
      const result = await requestRefund()
      toast.success(result.message)
      setShowCancelModal(false)
      // Refresh the page to update subscription status
      window.location.reload()
    } catch (error) {
      console.error('Refund error:', error)
      toast.error(error.message || 'Erreur lors de la demande de remboursement')
    } finally {
      setCancellationLoading(false)
    }
  }

  const handleCancelRenewal = async () => {
    setCancellationLoading(true)
    try {
      const result = await cancelRenewal()
      toast.success(result.message)
      setShowCancelModal(false)
      setCancellationInfo(prev => ({ ...prev, cancelAtPeriodEnd: true, canCancelRenewal: false }))
    } catch (error) {
      console.error('Cancel renewal error:', error)
      toast.error(error.message || t('subscription.cancellation.errorCancelRenewal', 'Erreur lors de l\'annulation du renouvellement'))
    } finally {
      setCancellationLoading(false)
    }
  }

  const handleCancelTrial = async () => {
    if (!confirm(t('subscription.trial.confirmCancel', 'Êtes-vous sûr de vouloir résilier votre essai gratuit ? Vous reviendrez au forfait gratuit et ne pourrez plus bénéficier d\'un nouvel essai.'))) {
      return
    }

    setCancellationLoading(true)
    try {
      const result = await cancelTrial()
      toast.success(result.message)
      setShowCancelModal(false)
      // Refresh page to update subscription status
      window.location.reload()
    } catch (error) {
      console.error('Cancel trial error:', error)
      toast.error(error.message || t('subscription.trial.errorCancel', 'Erreur lors de la résiliation de l\'essai'))
    } finally {
      setCancellationLoading(false)
    }
  }

  const handleReactivate = async () => {
    setCancellationLoading(true)
    try {
      const result = await reactivateSubscription()
      toast.success(result.message)
      setCancellationInfo(prev => ({ ...prev, cancelAtPeriodEnd: false, canCancelRenewal: true }))
    } catch (error) {
      console.error('Reactivate error:', error)
      toast.error(error.message || t('subscription.cancellation.errorReactivate', 'Erreur lors de la réactivation'))
    } finally {
      setCancellationLoading(false)
    }
  }

  const handleTerminateNow = async () => {
    setCancellationLoading(true)
    try {
      const result = await terminateSubscription()
      toast.success(result.message)
      setShowTerminateModal(false)
      window.location.reload()
    } catch (error) {
      console.error('Terminate error:', error)
      toast.error(error.message || t('subscription.cancellation.errorTerminate', 'Erreur lors de la résiliation'))
    } finally {
      setCancellationLoading(false)
    }
  }

  const handleRenounceAccess = async () => {
    if (!confirm(t('subscription.confirmRenounce', 'Êtes-vous sûr de vouloir renoncer à votre accès gratuit ? Vous reviendrez au forfait gratuit.'))) {
      return
    }

    setCancellationLoading(true)
    try {
      const result = await renounceAccess()
      toast.success(result.message || t('subscription.accessRenounced', 'Vous avez renoncé à votre accès gratuit'))
      // Refresh the page to update subscription status
      window.location.reload()
    } catch (error) {
      console.error('Renounce error:', error)
      toast.error(error.message || t('subscription.renounceError', 'Erreur lors de la renonciation'))
    } finally {
      setCancellationLoading(false)
    }
  }

  const handleEmailChange = async (e) => {
    e.preventDefault()
    
    // Validation
    if (!newEmail || !confirmEmail || !password) {
      toast.error(t('settings.email.fillAllFields'))
      return
    }
    
    if (newEmail !== confirmEmail) {
      toast.error(t('settings.email.emailsMismatch'))
      return
    }
    
    if (newEmail === user?.email) {
      toast.error(t('settings.email.sameEmail'))
      return
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmail)) {
      toast.error(t('settings.email.invalidFormat'))
      return
    }
    
    setLoading(true)
    
    try {
      await updateUserEmail(newEmail, password)
      setShowSuccess(true)
      toast.success(t('settings.email.verificationSent', { email: newEmail }))
      
      // Reset form
      setNewEmail('')
      setConfirmEmail('')
      setPassword('')
      
      // Hide success after 5 seconds
      setTimeout(() => setShowSuccess(false), 5000)
    } catch (error) {
      console.error('Email update error:', error)
      
      // Handle specific errors
      if (error.code === 'auth/wrong-password') {
        toast.error(t('settings.email.wrongPassword'))
      } else if (error.code === 'auth/email-already-in-use') {
        toast.error(t('settings.email.emailInUse'))
      } else if (error.code === 'auth/invalid-email') {
        toast.error(t('settings.email.invalidFormat'))
      } else if (error.code === 'auth/requires-recent-login') {
        toast.error(t('settings.email.sessionExpired'))
      } else if (error.code === 'auth/operation-not-allowed') {
        toast.error(t('settings.email.operationNotAllowed'))
      } else {
        toast.error(error.message || t('settings.email.updateError'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">{t('settings.title')}</h1>
        <p className="text-gray-600 mt-2">{t('settings.description')}</p>
      </div>

      {/* Current Account Info */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <FiUser className="text-indigo-500" />
          {t('settings.currentInfo')}
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-500 mb-1">{t('settings.displayName')}</p>
            <p className="text-lg font-medium text-gray-800">{userData?.displayName || t('settings.notDefined')}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-500 mb-1">{t('settings.currentEmail')}</p>
            <p className="text-lg font-medium text-gray-800">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Preferences Section */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <FiGlobe className="text-green-500" />
          {t('settings.preferences')}
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {/* Language */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-500 mb-2">{t('settings.language')}</p>
            <LanguageSelectorCompact className="w-full" />
          </div>
          
          {/* Tutorial */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-500 mb-2">{t('settings.tutorial')}</p>
            <button
              onClick={resetTutorial}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium"
            >
              <FiHelpCircle />
              {t('settings.restartTutorial')}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('subscription')}
              className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
                activeTab === 'subscription'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FiCreditCard className="inline-block mr-2" />
              {t('subscription.mySubscription', 'Mon abonnement')}
            </button>
            <button
              onClick={() => setActiveTab('email')}
              className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
                activeTab === 'email'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FiMail className="inline-block mr-2" />
              {t('settings.email.changeEmail')}
            </button>
          </nav>
        </div>

        {/* Subscription Tab */}
        {activeTab === 'subscription' && (
          <div className="p-6">
            {/* Current Plan */}
            <div className={`rounded-2xl p-6 mb-6 ${
              isFreeUser() 
                ? 'bg-gray-50 border-2 border-gray-200' 
                : subscriptionStatus === 'expiring_soon'
                ? 'bg-amber-50 border-2 border-amber-300'
                : 'bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200'
            }`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FiZap className={`text-xl ${isFreeUser() ? 'text-gray-400' : 'text-purple-500'}`} />
                    <h3 className="text-xl font-bold text-gray-800">
                      {t(currentPlan.nameKey, currentPlan.name)}
                    </h3>
                  </div>
                  
                  {/* Status Badge */}
                  <div className="flex items-center gap-2 mb-4">
                    {subscriptionStatus === 'active' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                        <FiCheck /> {t('subscription.status.active', 'Actif')}
                      </span>
                    )}
                    {subscriptionStatus === 'expiring_soon' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm">
                        <FiClock /> {t('subscription.status.expiringSoon', 'Expire bientôt')}
                      </span>
                    )}
                    {subscriptionStatus === 'expired' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                        <FiAlertCircle /> {t('subscription.status.expired', 'Expiré')}
                      </span>
                    )}
                    {subscriptionStatus === 'free' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                        {t('subscription.status.free', 'Gratuit')}
                      </span>
                    )}
                  </div>

                  {/* Expiration info */}
                  {daysLeft !== null && daysLeft > 0 && (
                    <p className="text-gray-600">
                      <FiClock className="inline mr-1" />
                      {t('subscription.expiresIn', 'Expire dans {{days}} jours', { days: daysLeft })}
                    </p>
                  )}

                  {/* Features list */}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      {currentPlan.features.quiz ? (
                        <FiCheck className="text-green-500" />
                      ) : (
                        <span className="text-gray-300">✕</span>
                      )}
                      <span className={currentPlan.features.quiz ? 'text-gray-700' : 'text-gray-400'}>
                        {t('subscription.features.quiz', 'Quiz')} 
                        {currentPlan.features.maxParticipants !== -1 && ` (${currentPlan.features.maxParticipants} participants max)`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {currentPlan.features.questionnaire ? (
                        <FiCheck className="text-green-500" />
                      ) : (
                        <span className="text-gray-300">✕</span>
                      )}
                      <span className={currentPlan.features.questionnaire ? 'text-gray-700' : 'text-gray-400'}>
                        {t('subscription.features.questionnaire', 'Questionnaires')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {currentPlan.features.events ? (
                        <FiCheck className="text-green-500" />
                      ) : (
                        <span className="text-gray-300">✕</span>
                      )}
                      <span className={currentPlan.features.events ? 'text-gray-700' : 'text-gray-400'}>
                        {t('subscription.features.events', 'Événements')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Price */}
                {!isFreeUser() && (
                  <div className="text-right">
                    <div className="text-3xl font-bold text-gray-800">{currentPlan.price}€</div>
                    <div className="text-gray-500 text-sm">
                      /{currentPlan.period === 'month' ? t('subscription.month', 'mois') : t('subscription.year', 'an')}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Warning for expiring/expired */}
            {subscriptionStatus === 'expiring_soon' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                <FiAlertCircle className="text-amber-500 text-xl flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800">{t('subscription.expiringSoonWarning', 'Votre abonnement expire bientôt')}</p>
                  <p className="text-sm text-amber-700">
                    {t('subscription.expiringSoonDesc', 'Renouvelez pour conserver l\'accès à vos données.')}
                  </p>
                </div>
              </div>
            )}

            {subscriptionStatus === 'expired' && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                <FiAlertCircle className="text-red-500 text-xl flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800">{t('subscription.expiredWarning', 'Votre abonnement a expiré')}</p>
                  <p className="text-sm text-red-700">
                    {t('subscription.expiredDesc', 'Vos questionnaires et événements seront supprimés dans 30 jours si vous ne renouvelez pas.')}
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4">
              {isFreeUser() ? (
                <button
                  onClick={() => navigate('/pricing')}
                  className="flex-1 btn bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 flex items-center justify-center gap-2"
                >
                  <FiZap />
                  {t('subscription.upgradeToPro', 'Passer au forfait Pro')}
                </button>
              ) : (
                <>
                  <button
                    onClick={handleManageSubscription}
                    disabled={portalLoading}
                    className="flex-1 btn bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center justify-center gap-2"
                  >
                    {portalLoading ? (
                      <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <FiCreditCard />
                        {t('subscription.managePayment', 'Gérer le paiement')}
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => navigate('/pricing')}
                    className="flex-1 btn bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 flex items-center justify-center gap-2"
                  >
                    <FiArrowRight />
                    {t('subscription.changePlan', 'Changer de forfait')}
                  </button>
                </>
              )}
            </div>

            {/* Admin-Granted Access Section */}
            {!isFreeUser() && subscription?.isAdminGranted && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <FiZap className="text-green-500 text-xl flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-800">
                        {t('subscription.adminGranted.title', 'Accès offert par l\'administrateur')}
                      </p>
                      <p className="text-sm text-green-700 mt-1">
                        {t('subscription.adminGranted.description', 'Vous bénéficiez d\'un accès gratuit offert par un administrateur. Cet accès peut être révoqué à tout moment.')}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <FiXCircle className="text-gray-500 text-xl flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-800">
                        {t('subscription.adminGranted.renounceTitle', 'Renoncer à cet accès')}
                      </p>
                      <p className="text-sm text-gray-600">
                        {t('subscription.adminGranted.renounceDesc', 'Si vous n\'avez plus besoin de cet accès, vous pouvez y renoncer et revenir au forfait gratuit.')}
                      </p>
                      <button
                        onClick={handleRenounceAccess}
                        disabled={cancellationLoading}
                        className="mt-3 btn bg-gray-500 text-white hover:bg-gray-600 text-sm flex items-center gap-2"
                      >
                        {cancellationLoading ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <FiXCircle />
                            {t('subscription.adminGranted.renounceBtn', 'Renoncer à mon accès')}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Cancellation Section */}
            {!isFreeUser() && cancellationInfo && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="font-semibold text-gray-700 mb-4">
                  {t('subscription.cancellation.title', 'Annulation')}
                </h4>
                
                {/* Status info */}
                {cancellationInfo.cancelAtPeriodEnd ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <FiAlertCircle className="text-amber-500 text-xl flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-amber-800">
                          {t('subscription.cancellation.willNotRenew', 'Votre abonnement ne sera pas renouvelé')}
                        </p>
                        <p className="text-sm text-amber-700">
                          {t('subscription.cancellation.activeUntil', 'Il reste actif jusqu\'à la fin de la période en cours.')}
                        </p>
                        <button
                          onClick={handleReactivate}
                          disabled={cancellationLoading}
                          className="mt-3 btn bg-amber-500 text-white hover:bg-amber-600 text-sm flex items-center gap-2"
                        >
                          {cancellationLoading ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <FiRefreshCw />
                              {t('subscription.cancellation.reactivate', 'Réactiver le renouvellement')}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Trial cancellation option - show for users in trial period */}
                    {(subscription?.isTrialing || subscription?.status === 'trialing') && (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <FiClock className="text-green-500 text-xl flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-green-800">
                              {t('subscription.trial.active', 'Essai gratuit en cours')}
                            </p>
                            <p className="text-sm text-green-700">
                              {subscription?.trialEnd && (
                                <>
                                  {t('subscription.trial.endsOn', 'Fin de l\'essai le {{date}}', {
                                    date: new Date(subscription.trialEnd.toDate ? subscription.trialEnd.toDate() : subscription.trialEnd).toLocaleDateString()
                                  })}
                                  {' - '}
                                  {t('subscription.trial.cancelAnytime', 'Résiliable à tout moment sans frais')}
                                </>
                              )}
                            </p>
                            <button
                              onClick={handleCancelTrial}
                              disabled={cancellationLoading}
                              className="mt-3 btn bg-red-500 text-white hover:bg-red-600 text-sm flex items-center gap-2"
                            >
                              {cancellationLoading ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <>
                                  <FiXCircle />
                                  {t('subscription.trial.cancelBtn', 'Résilier l\'essai gratuit')}
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Refund option (within 30 min) - only show if NOT in trial */}
                    {cancellationInfo.canRefund && !subscription?.isTrialing && subscription?.status !== 'trialing' && (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <FiCheck className="text-green-500 text-xl flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-green-800">
                              {t('subscription.cancellation.refundAvailable', 'Remboursement disponible')}
                            </p>
                            <p className="text-sm text-green-700">
                              {t('subscription.cancellation.refundTimeLeft', 'Il vous reste {{minutes}} minutes pour demander un remboursement complet.', 
                                { minutes: Math.max(0, 30 - (cancellationInfo.minutesSinceStart || 0)) })}
                            </p>
                            <button
                              onClick={() => setShowCancelModal(true)}
                              className="mt-3 btn bg-green-500 text-white hover:bg-green-600 text-sm"
                            >
                              {t('subscription.cancellation.requestRefund', 'Demander un remboursement')}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Cancel renewal option (48h before) - only show if NOT in trial */}
                    {cancellationInfo.canCancelRenewal && !cancellationInfo.canRefund && !subscription?.isTrialing && subscription?.status !== 'trialing' && (
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <FiXCircle className="text-gray-500 text-xl flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-gray-800">
                              {t('subscription.cancellation.cancelRenewal', 'Annuler le renouvellement')}
                            </p>
                            <p className="text-sm text-gray-600">
                              {t('subscription.cancellation.cancelRenewalDesc', 
                                'Votre abonnement restera actif jusqu\'à la fin de la période. Aucun remboursement ne sera effectué.')}
                            </p>
                            <button
                              onClick={() => setShowCancelModal(true)}
                              className="mt-3 btn bg-gray-500 text-white hover:bg-gray-600 text-sm"
                            >
                              {t('subscription.cancellation.cancelRenewalBtn', 'Ne pas renouveler')}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    
                  </div>
                )}

                {/* Résiliation immédiate du forfait - toujours possible (hors essai) */}
                {!subscription?.isTrialing && subscription?.status !== 'trialing' && (
                  <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <FiAlertCircle className="text-red-500 text-xl flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-800">
                          {t('subscription.cancellation.terminateTitle', 'Résilier mon forfait')}
                        </p>
                        <p className="text-sm text-red-700">
                          {t('subscription.cancellation.terminateDesc', 'La résiliation est immédiate : vous perdez aussitôt les avantages du forfait et aucun remboursement n\'est possible.')}
                        </p>
                        <button
                          onClick={() => setShowTerminateModal(true)}
                          className="mt-3 btn bg-red-600 text-white hover:bg-red-700 text-sm flex items-center gap-2"
                        >
                          <FiXCircle />
                          {t('subscription.cancellation.terminateBtn', 'Résilier immédiatement')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Email Change Form */}
        {activeTab === 'email' && (
          <div className="p-6">
            {showSuccess && (
              <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <FiCheck className="text-green-600 text-xl" />
                </div>
                <div>
                  <p className="font-medium text-green-800">{t('settings.email.verificationSentTitle')}</p>
                  <p className="text-sm text-green-600">{t('settings.email.verificationSentDesc')}</p>
                </div>
              </div>
            )}

            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
              <FiMail className="text-blue-500 text-xl flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-blue-800">{t('settings.email.howItWorks')}</p>
                <p className="text-sm text-blue-700">
                  {t('settings.email.step1')}<br/>
                  {t('settings.email.step2')}<br/>
                  {t('settings.email.step3')}
                </p>
              </div>
            </div>

            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <FiAlertCircle className="text-amber-500 text-xl flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">{t('settings.email.important')}</p>
                <p className="text-sm text-amber-700">
                  {t('settings.email.importantDesc')}
                </p>
              </div>
            </div>

            <form onSubmit={handleEmailChange} className="space-y-6">
              {/* New Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('settings.email.newEmail')}
                </label>
                <div className="relative">
                  <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="nouveau@email.com"
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Confirm Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('settings.email.confirmNewEmail')}
                </label>
                <div className="relative">
                  <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    placeholder="nouveau@email.com"
                    className={`w-full pl-12 pr-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                      confirmEmail && confirmEmail !== newEmail
                        ? 'border-red-300 bg-red-50'
                        : confirmEmail && confirmEmail === newEmail
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-200'
                    }`}
                    disabled={loading}
                  />
                </div>
                {confirmEmail && confirmEmail !== newEmail && (
                  <p className="mt-1 text-sm text-red-500">{t('settings.email.emailsMismatch')}</p>
                )}
              </div>

              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('settings.email.currentPassword')}
                </label>
                <div className="relative">
                  <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    disabled={loading}
                  />
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  {t('settings.email.passwordHelp')}
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !newEmail || !confirmEmail || !password || newEmail !== confirmEmail}
                className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                  loading || !newEmail || !confirmEmail || !password || newEmail !== confirmEmail
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:shadow-lg hover:scale-[1.02]'
                }`}
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {t('settings.email.updating')}
                  </>
                ) : (
                  <>
                    <FiSave />
                    {t('settings.email.updateEmail')}
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Cancellation Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full animate-scale-in shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiXCircle className="text-red-500 text-3xl" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">
                {cancellationInfo?.canRefund 
                  ? t('subscription.cancellation.confirmRefund', 'Confirmer le remboursement')
                  : t('subscription.cancellation.confirmCancel', 'Confirmer l\'annulation')}
              </h3>
            </div>
            
            {/* Legal notice */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-sm text-gray-600 space-y-2">
              {cancellationInfo?.canRefund ? (
                <>
                  <p>
                    <strong>Remboursement :</strong> Votre abonnement sera immédiatement annulé et vous serez remboursé intégralement.
                  </p>
                  <p>
                    Vous reviendrez au plan gratuit avec une limite de 5 participants par quiz.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    <strong>Important :</strong> Conformément aux CGU, aucun remboursement ne sera effectué.
                  </p>
                  <p>
                    Votre abonnement restera actif jusqu'à la fin de la période en cours ({daysLeft} jours restants).
                  </p>
                  <p>
                    Vos données (questionnaires et événements) seront supprimées 30 jours après l'expiration si vous ne renouvelez pas.
                  </p>
                </>
              )}
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={cancellationLoading}
                className="flex-1 btn btn-ghost py-3"
              >
                {t('common.cancel', 'Annuler')}
              </button>
              <button
                onClick={cancellationInfo?.canRefund ? handleRequestRefund : handleCancelRenewal}
                disabled={cancellationLoading}
                className="flex-1 btn bg-red-500 text-white hover:bg-red-600 py-3 flex items-center justify-center gap-2"
              >
                {cancellationLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <FiXCircle />
                    {t('common.confirm', 'Confirmer')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terminate Plan Confirmation Modal */}
      {showTerminateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full animate-scale-in shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiAlertCircle className="text-red-500 text-3xl" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">
                {t('subscription.cancellation.terminateConfirmTitle', 'Résilier le forfait ?')}
              </h3>
            </div>
            <div className="bg-red-50 rounded-xl p-4 mb-6 text-sm text-red-700 space-y-2">
              <p><strong>{t('subscription.cancellation.terminateWarn1', 'La perte des avantages du forfait est immédiate.')}</strong></p>
              <p>{t('subscription.cancellation.terminateWarn2', 'Aucun remboursement n\'est possible, conformément aux conditions d\'utilisation.')}</p>
              <p>{t('subscription.cancellation.terminateWarn3', 'Vous reviendrez immédiatement au forfait gratuit.')}</p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setShowTerminateModal(false)}
                disabled={cancellationLoading}
                className="flex-1 btn btn-ghost py-3"
              >
                {t('common.cancel', 'Annuler')}
              </button>
              <button
                onClick={handleTerminateNow}
                disabled={cancellationLoading}
                className="flex-1 btn bg-red-600 text-white hover:bg-red-700 py-3 flex items-center justify-center gap-2"
              >
                {cancellationLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <FiXCircle />
                    {t('subscription.cancellation.terminateBtn', 'Résilier immédiatement')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Settings
