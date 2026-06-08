import { loadStripe } from '@stripe/stripe-js'
import { getFunctions, httpsCallable } from 'firebase/functions'
import app from '../config/firebase'

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder')

// Get functions with correct region
const functions = getFunctions(app, 'us-central1')

export const getStripe = () => stripePromise

// ==================== TRIAL ELIGIBILITY ====================

// Check if user is eligible for free trial
export const checkTrialEligibility = async () => {
  const checkTrial = httpsCallable(functions, 'checkTrialEligibility')
  const result = await checkTrial()
  return result.data
}

// Create checkout session (calls Firebase Cloud Function)
export const createCheckoutSession = async (userId, priceId, userEmail, planId, withTrial = false) => {
  const createSession = httpsCallable(functions, 'createCheckoutSessionCallable')
  
  const result = await createSession({
    userId,
    priceId,
    userEmail,
    planId,
    withTrial,
    successUrl: `${window.location.origin}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${window.location.origin}/subscription/cancel`,
  })
  
  return result.data
}

// Redirect to Stripe Checkout
export const redirectToCheckout = async (userId, priceId, userEmail, planId, withTrial = false) => {
  const { url } = await createCheckoutSession(userId, priceId, userEmail, planId, withTrial)
  
  if (url) {
    window.location.href = url
  } else {
    throw new Error('No checkout URL returned')
  }
}

// Create customer portal session (for managing subscriptions)
export const createPortalSession = async (userId) => {
  const createPortal = httpsCallable(functions, 'createPortalSessionCallable')
  
  const result = await createPortal({
    userId,
    returnUrl: `${window.location.origin}/settings`,
  })
  
  window.location.href = result.data.url
}

// ==================== CANCELLATION FUNCTIONS ====================

// Check refund/cancellation eligibility
export const checkRefundEligibility = async () => {
  const checkRefund = httpsCallable(functions, 'checkRefundEligibility')
  const result = await checkRefund()
  return result.data
}

// Request a refund (within 30 minutes)
export const requestRefund = async () => {
  const refund = httpsCallable(functions, 'requestRefund')
  const result = await refund()
  return result.data
}

// Cancel the renewal (at least 48 hours before)
export const cancelRenewal = async () => {
  const cancel = httpsCallable(functions, 'cancelRenewal')
  const result = await cancel()
  return result.data
}

// Cancel trial subscription immediately
export const cancelTrial = async () => {
  const cancel = httpsCallable(functions, 'cancelTrial')
  const result = await cancel()
  return result.data
}

// Reactivate subscription (undo cancellation)
export const reactivateSubscription = async () => {
  const reactivate = httpsCallable(functions, 'reactivateSubscription')
  const result = await reactivate()
  return result.data
}

// ==================== ADMIN-GRANTED ACCESS FUNCTIONS ====================

// Revoke admin-granted access (admin only)
export const revokeAccess = async (targetUserId) => {
  const revoke = httpsCallable(functions, 'revokeAccess')
  const result = await revoke({ targetUserId })
  return result.data
}

// Renounce admin-granted access (user themselves)
export const renounceAccess = async () => {
  const renounce = httpsCallable(functions, 'renounceAccess')
  const result = await renounce()
  return result.data
}

// ==================== ACCOUNT DELETION FUNCTIONS ====================

// Delete user account
export const deleteAccount = async () => {
  const deleteAcc = httpsCallable(functions, 'deleteAccount')
  const result = await deleteAcc()
  return result.data
}

// Check if account is deleted (for login validation)
export const checkAccountStatus = async (email) => {
  const checkStatus = httpsCallable(functions, 'checkAccountStatus')
  const result = await checkStatus({ email })
  return result.data
}

