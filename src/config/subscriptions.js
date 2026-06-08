// Subscription Plans Configuration
export const SUBSCRIPTION_PLANS = {
  // Free tier
  FREE: {
    id: 'free',
    name: 'Gratuit',
    nameKey: 'subscription.plans.free',
    price: 0,
    duration: null, // unlimited
    features: {
      quiz: true,
      questionnaire: false,
      events: false,
      maxParticipants: 5
    }
  },
  
  // Monthly plans
  QUIZ_MONTHLY: {
    id: 'quiz_monthly',
    name: 'Quiz & Questionnaire - Mensuel',
    nameKey: 'subscription.plans.quizMonthly',
    price: 5,
    duration: 30, // days
    period: 'month',
    stripePriceId: 'price_1So5fbFUHZNGkycvj1SeVPme',
    features: {
      quiz: true,
      questionnaire: true,
      events: false,
      maxParticipants: -1 // unlimited
    }
  },
  
  EVENTS_MONTHLY: {
    id: 'events_monthly',
    name: 'Événements - Mensuel',
    nameKey: 'subscription.plans.eventsMonthly',
    price: 5,
    duration: 30,
    period: 'month',
    stripePriceId: 'price_1So5tsFUHZNGkycvv4oI3oVp',
    features: {
      quiz: false,
      questionnaire: false,
      events: true,
      maxParticipants: -1
    }
  },
  
  COMPLETE_MONTHLY: {
    id: 'complete_monthly',
    name: 'Complet - Mensuel',
    nameKey: 'subscription.plans.completeMonthly',
    price: 8,
    duration: 30,
    period: 'month',
    stripePriceId: 'price_1So5zHFUHZNGkycvvGFZnXkM',
    features: {
      quiz: true,
      questionnaire: true,
      events: true,
      maxParticipants: -1
    }
  },
  
  // Yearly plans
  QUIZ_YEARLY: {
    id: 'quiz_yearly',
    name: 'Quiz & Questionnaire - Annuel',
    nameKey: 'subscription.plans.quizYearly',
    price: 50,
    duration: 365,
    period: 'year',
    stripePriceId: 'price_1So63jFUHZNGkycvkKpee5lP',
    features: {
      quiz: true,
      questionnaire: true,
      events: false,
      maxParticipants: -1
    }
  },
  
  EVENTS_YEARLY: {
    id: 'events_yearly',
    name: 'Événements - Annuel',
    nameKey: 'subscription.plans.eventsYearly',
    price: 50,
    duration: 365,
    period: 'year',
    stripePriceId: 'price_1So6BiFUHZNGkycveqg4kajB',
    features: {
      quiz: false,
      questionnaire: false,
      events: true,
      maxParticipants: -1
    }
  },
  
  COMPLETE_YEARLY: {
    id: 'complete_yearly',
    name: 'Complet - Annuel',
    nameKey: 'subscription.plans.completeYearly',
    price: 80,
    duration: 365,
    period: 'year',
    stripePriceId: 'price_1So6WZFUHZNGkycvLfrhentB',
    features: {
      quiz: true,
      questionnaire: true,
      events: true,
      maxParticipants: -1
    }
  },
  
  // Admin granted access
  ADMIN_GRANTED_MONTHLY: {
    id: 'admin_granted_monthly',
    name: 'Accès offert - 1 mois',
    nameKey: 'subscription.plans.adminGrantedMonthly',
    price: 0,
    duration: 30,
    period: 'month',
    features: {
      quiz: true,
      questionnaire: true,
      events: true,
      maxParticipants: -1
    }
  },
  
  ADMIN_GRANTED_YEARLY: {
    id: 'admin_granted_yearly',
    name: 'Accès offert - 1 an',
    nameKey: 'subscription.plans.adminGrantedYearly',
    price: 0,
    duration: 365,
    period: 'year',
    features: {
      quiz: true,
      questionnaire: true,
      events: true,
      maxParticipants: -1
    }
  }
}

// Get plan by ID
export const getPlanById = (planId) => {
  return Object.values(SUBSCRIPTION_PLANS).find(plan => plan.id === planId) || SUBSCRIPTION_PLANS.FREE
}

// Check if user has access to a feature
export const hasFeatureAccess = (subscription, feature) => {
  if (!subscription || !subscription.planId) {
    // Default to free plan
    return SUBSCRIPTION_PLANS.FREE.features[feature] || false
  }
  
  // Check if subscription is expired
  if (subscription.expiresAt) {
    const expiryDate = subscription.expiresAt.toDate ? subscription.expiresAt.toDate() : new Date(subscription.expiresAt)
    if (expiryDate < new Date()) {
      // If Stripe says active and we have a subscription ID, trust Stripe over expiresAt
      if (subscription.status === 'active' && subscription.stripeSubscriptionId) {
        const plan = getPlanById(subscription.planId)
        return plan.features[feature] || false
      }
      // Check if in grace period (past_due with grace period still active)
      if (subscription.status === 'past_due' && subscription.gracePeriodEnd) {
        const gracePeriodEnd = subscription.gracePeriodEnd.toDate 
          ? subscription.gracePeriodEnd.toDate() 
          : new Date(subscription.gracePeriodEnd)
        if (gracePeriodEnd > new Date()) {
          // Still in grace period - grant access
          const plan = getPlanById(subscription.planId)
          return plan.features[feature] || false
        }
      }
      return SUBSCRIPTION_PLANS.FREE.features[feature] || false
    }
  }
  
  const plan = getPlanById(subscription.planId)
  return plan.features[feature] || false
}

// Get max participants for user
export const getMaxParticipants = (subscription) => {
  if (!subscription || !subscription.planId) {
    return SUBSCRIPTION_PLANS.FREE.features.maxParticipants
  }
  
  // Check if subscription is expired
  if (subscription.expiresAt) {
    const expiryDate = subscription.expiresAt.toDate ? subscription.expiresAt.toDate() : new Date(subscription.expiresAt)
    if (expiryDate < new Date()) {
      // If Stripe says active, trust it
      if (subscription.status === 'active' && subscription.stripeSubscriptionId) {
        const plan = getPlanById(subscription.planId)
        return plan.features.maxParticipants
      }
      // Check grace period for past_due
      if (subscription.status === 'past_due' && subscription.gracePeriodEnd) {
        const gracePeriodEnd = subscription.gracePeriodEnd.toDate 
          ? subscription.gracePeriodEnd.toDate() 
          : new Date(subscription.gracePeriodEnd)
        if (gracePeriodEnd > new Date()) {
          const plan = getPlanById(subscription.planId)
          return plan.features.maxParticipants
        }
      }
      return SUBSCRIPTION_PLANS.FREE.features.maxParticipants
    }
  }
  
  const plan = getPlanById(subscription.planId)
  return plan.features.maxParticipants
}

// Check if subscription is active
export const isSubscriptionActive = (subscription) => {
  if (!subscription || !subscription.planId || subscription.planId === 'free') {
    return false
  }
  
  // past_due with grace period is still considered active
  if (subscription.status === 'past_due' && subscription.gracePeriodEnd) {
    const gracePeriodEnd = subscription.gracePeriodEnd.toDate 
      ? subscription.gracePeriodEnd.toDate() 
      : new Date(subscription.gracePeriodEnd)
    if (gracePeriodEnd > new Date()) {
      return true
    }
  }
  
  // If Stripe says active and we have a valid paid plan, trust it
  // (safety net for missing/cleared expiresAt)
  if (subscription.status === 'active' && subscription.stripeSubscriptionId) {
    return true
  }
  
  if (subscription.expiresAt) {
    const expiryDate = subscription.expiresAt.toDate ? subscription.expiresAt.toDate() : new Date(subscription.expiresAt)
    return expiryDate > new Date()
  }
  
  return false
}

// Get days until expiration
export const getDaysUntilExpiration = (subscription) => {
  if (!subscription || !subscription.expiresAt) {
    return null
  }
  
  const expiryDate = subscription.expiresAt.toDate ? subscription.expiresAt.toDate() : new Date(subscription.expiresAt)
  const now = new Date()
  const diffTime = expiryDate - now
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return diffDays
}

// Get subscription status
export const getSubscriptionStatus = (subscription) => {
  if (!subscription || !subscription.planId || subscription.planId === 'free') {
    return 'free'
  }
  
  // Check for payment failure / past_due status
  if (subscription.status === 'past_due' || subscription.paymentFailed) {
    if (subscription.gracePeriodEnd) {
      const gracePeriodEnd = subscription.gracePeriodEnd.toDate 
        ? subscription.gracePeriodEnd.toDate() 
        : new Date(subscription.gracePeriodEnd)
      if (gracePeriodEnd > new Date()) {
        return 'past_due'
      }
    }
    return 'payment_failed'
  }
  
  // If Stripe says active and we have a subscription ID, trust it
  if (subscription.status === 'active' && subscription.stripeSubscriptionId) {
    const daysLeft = getDaysUntilExpiration(subscription)
    if (daysLeft === null) return 'active'
    if (daysLeft <= 0) return 'active' // Stripe is authoritative
    if (daysLeft <= 7) return 'expiring_soon'
    return 'active'
  }
  
  const daysLeft = getDaysUntilExpiration(subscription)
  
  if (daysLeft === null) return 'free'
  if (daysLeft <= 0) return 'expired'
  if (daysLeft <= 7) return 'expiring_soon'
  return 'active'
}
