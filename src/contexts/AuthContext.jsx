import { createContext, useContext, useEffect, useState } from 'react'
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  verifyBeforeUpdateEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendEmailVerification
} from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { auth, db } from '../config/firebase'
import { 
  SUBSCRIPTION_PLANS, 
  getPlanById, 
  hasFeatureAccess, 
  getMaxParticipants,
  isSubscriptionActive,
  getSubscriptionStatus,
  getDaysUntilExpiration
} from '../config/subscriptions'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)

  // Register new user - Now auto-validated with free plan
  const register = async (email, password, displayName, addressData = {}, firstName = '', lastName = '') => {
    let userCredential;
    
    try {
      userCredential = await createUserWithEmailAndPassword(auth, email, password)
    } catch (authError) {
      console.error('Auth creation error:', authError)
      throw authError
    }
    
    // Create user document in Firestore with FREE subscription FIRST
    // This ensures the document exists before any other operation
    try {
      console.log('[register] Creating Firestore document for user:', userCredential.user.uid)
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email,
        displayName,
        firstName: firstName || displayName.split(' ')[0] || '',
        lastName: lastName || displayName.split(' ').slice(1).join(' ') || '',
        role: 'user',
        validated: true, // Auto-validated now
        emailVerified: false,
        // Address information
        address: {
          streetName: addressData.streetName || '',
          streetNumber: addressData.streetNumber || '',
          postalCode: addressData.postalCode || '',
          city: addressData.city || '',
          addressName: addressData.addressName || ''
        },
        // Subscription - starts with FREE plan
        subscription: {
          planId: 'free',
          status: 'active',
          startedAt: serverTimestamp(),
          expiresAt: null, // Free plan never expires
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          cancelAtPeriodEnd: false
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      console.log('[register] Firestore document created successfully')
    } catch (firestoreError) {
      console.error('[register] Firestore document creation error:', firestoreError)
      // Document creation failed, but user is created in Auth
      // We should still try to send verification email
    }
    
    // Send email verification immediately after account creation
    // Firebase should be ready since we just created the account
    let emailSent = false
    
    try {
      // Send verification email - use simple call without options first
      console.log('[register] Attempting to send verification email to:', userCredential.user.email)
      await sendEmailVerification(userCredential.user)
      emailSent = true
      console.log('[register] Verification email sent successfully')
    } catch (emailError) {
      console.error('[register] First email attempt failed:', emailError.code, emailError.message)
      
      // If first attempt fails, wait and retry once
      if (emailError.code !== 'auth/too-many-requests') {
        try {
          console.log('[register] Retrying after 2 seconds...')
          await new Promise(resolve => setTimeout(resolve, 2000))
          await sendEmailVerification(userCredential.user)
          emailSent = true
          console.log('[register] Verification email sent on retry')
        } catch (retryError) {
          console.error('[register] Retry email failed:', retryError.code, retryError.message)
        }
      }
    }
    
    if (!emailSent) {
      console.warn('Could not send verification email after 2 attempts')
      // On retourne quand même le user mais avec un flag
      userCredential.user.emailSentFailed = true
    }
    
    return { user: userCredential.user, emailSent }
  }

  // Resend email verification
  const resendVerificationEmail = async () => {
    // Get current user directly from auth (more reliable than state)
    const currentUser = auth.currentUser
    
    if (!currentUser) {
      console.error('No current user in auth')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    
    // Try to reload user to get fresh status
    try {
      await currentUser.reload()
    } catch (reloadError) {
      console.error('User reload error:', reloadError)
      // Continue anyway - we'll try to send the email
    }
    
    // Check if already verified after reload
    if (currentUser.emailVerified) {
      // Already verified - update state with extracted properties
      setUser({
        uid: currentUser.uid,
        email: currentUser.email,
        emailVerified: currentUser.emailVerified,
        displayName: currentUser.displayName,
        photoURL: currentUser.photoURL,
        phoneNumber: currentUser.phoneNumber,
        providerId: currentUser.providerId,
        metadata: currentUser.metadata,
        reload: () => currentUser.reload()
      })
      return false
    }
    
    // Send verification email
    try {
      await sendEmailVerification(currentUser)
      return true
    } catch (emailError) {
      console.error('Send verification email error:', emailError)
      
      if (emailError.code === 'auth/too-many-requests') {
        throw { code: 'auth/too-many-requests', message: 'Trop de tentatives' }
      }
      
      // Re-throw with more details
      throw emailError
    }
  }

  // Check if email is verified - use auth.currentUser for most accurate status
  const isEmailVerified = () => {
    // Check auth.currentUser first (most accurate)
    const currentUser = auth.currentUser
    console.log('[isEmailVerified] auth.currentUser:', currentUser?.email, 'emailVerified:', currentUser?.emailVerified)
    console.log('[isEmailVerified] state user:', user?.email, 'emailVerified:', user?.emailVerified)
    
    if (currentUser) {
      const result = currentUser.emailVerified === true
      console.log('[isEmailVerified] Returning from auth.currentUser:', result)
      return result
    }
    // Fallback to state
    const result = user?.emailVerified === true
    console.log('[isEmailVerified] Returning from state:', result)
    return result
  }

  // Login
  const login = async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    return userCredential.user
  }

  // Logout
  const logout = async () => {
    await signOut(auth)
    setUser(null)
    setUserData(null)
  }

  // Reset password
  const resetPassword = (email) => {
    return sendPasswordResetEmail(auth, email)
  }

  // Reauthenticate user with password
  const reauthenticate = async (password) => {
    if (!user || !user.email) {
      throw new Error('Utilisateur non connecté')
    }
    const credential = EmailAuthProvider.credential(user.email, password)
    await reauthenticateWithCredential(user, credential)
    return true
  }

  // Update user email - sends verification to new email first
  const updateUserEmail = async (newEmail, password) => {
    if (!user) {
      throw new Error('Utilisateur non connecté')
    }
    
    // Reauthenticate first
    await reauthenticate(password)
    
    // Send verification email to new address
    // Email will only be changed after user clicks the verification link
    await verifyBeforeUpdateEmail(user, newEmail)
    
    // Note: Firestore will be updated after email verification
    // We store the pending email for reference
    await updateDoc(doc(db, 'users', user.uid), {
      pendingEmail: newEmail,
      updatedAt: serverTimestamp()
    })
    
    return true
  }

  // Fetch user data from Firestore
  const fetchUserData = async (uid) => {
    const userDoc = await getDoc(doc(db, 'users', uid))
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() }
    }
    return null
  }

  // Check if user is admin
  const isAdmin = () => {
    return userData?.role === 'admin'
  }

  // Check if user is validated
  const isValidated = () => {
    return userData?.validated === true
  }

  // Subscription helper functions
  const getSubscription = () => {
    // Les admins ont toujours un accès complet
    if (userData?.role === 'admin') {
      return { planId: 'ADMIN_GRANTED_YEARLY', status: 'active', expiresAt: null }
    }
    return userData?.subscription || { planId: 'FREE', status: 'active' }
  }

  const getCurrentPlan = () => {
    const subscription = getSubscription()
    return getPlanById(subscription.planId)
  }

  const canAccessFeature = (feature) => {
    // Les admins ont accès à tout
    if (userData?.role === 'admin') return true
    const subscription = getSubscription()
    return hasFeatureAccess(subscription, feature)
  }

  const canAccessQuiz = () => canAccessFeature('quiz')
  const canAccessQuestionnaire = () => canAccessFeature('questionnaire')
  const canAccessEvents = () => canAccessFeature('events')

  const getParticipantLimit = () => {
    // Les admins ont des participants illimités
    if (userData?.role === 'admin') return -1
    const subscription = getSubscription()
    return getMaxParticipants(subscription)
  }

  const isSubscribed = () => {
    const subscription = getSubscription()
    return isSubscriptionActive(subscription)
  }

  const getSubStatus = () => {
    const subscription = getSubscription()
    return getSubscriptionStatus(subscription)
  }

  const getDaysLeft = () => {
    const subscription = getSubscription()
    return getDaysUntilExpiration(subscription)
  }

  const isPro = () => {
    const plan = getCurrentPlan()
    return plan.period === 'month'
  }

  const isProPlus = () => {
    const plan = getCurrentPlan()
    return plan.period === 'year'
  }

  const isFreeUser = () => {
    const subscription = getSubscription()
    return !subscription.planId || subscription.planId === 'free' || getSubStatus() === 'expired'
  }

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          setUser(firebaseUser)
          try {
            const data = await fetchUserData(firebaseUser.uid)
            
            // Sync email from Firebase Auth to Firestore if different
            if (data && firebaseUser.email && firebaseUser.email !== data.email) {
              await updateDoc(doc(db, 'users', firebaseUser.uid), {
                email: firebaseUser.email,
                pendingEmail: null,
                updatedAt: serverTimestamp()
              })
              data.email = firebaseUser.email
              data.pendingEmail = null
            }
            
            setUserData(data)
          } catch (firestoreError) {
            console.error('Firestore error:', firestoreError)
            setUserData(null)
          }
        } else {
          setUser(null)
          setUserData(null)
        }
      } catch (error) {
        console.error('Auth state error:', error)
      } finally {
        setLoading(false)
      }
    })

    return unsubscribe
  }, [])

  // Refresh user data
  const refreshUserData = async () => {
    // Get current user from auth (not from state)
    const currentUser = auth.currentUser
    console.log('[refreshUserData] Starting... currentUser:', currentUser?.email)
    
    if (!currentUser) {
      console.log('[refreshUserData] No current user in auth')
      return null
    }
    
    try {
      // Reload user to get latest emailVerified status
      console.log('[refreshUserData] Calling reload()...')
      await currentUser.reload()
      
      // Get fresh reference after reload
      const freshUser = auth.currentUser
      console.log('[refreshUserData] After reload - emailVerified:', freshUser?.emailVerified)
      
      // Update state with refreshed user - extract key properties manually
      // because Object.assign doesn't work well with Firebase User objects
      setUser({
        uid: freshUser.uid,
        email: freshUser.email,
        emailVerified: freshUser.emailVerified,
        displayName: freshUser.displayName,
        photoURL: freshUser.photoURL,
        phoneNumber: freshUser.phoneNumber,
        providerId: freshUser.providerId,
        metadata: freshUser.metadata,
        // Keep a reference to reload if needed
        reload: () => freshUser.reload()
      })
      
      const data = await fetchUserData(currentUser.uid)
      
      // Si le document n'existe pas, le créer maintenant
      if (!data) {
        console.log('[refreshUserData] User document does not exist, creating it now...')
        const displayName = currentUser.displayName || currentUser.email.split('@')[0]
        const nameParts = displayName.split(' ')
        const firstName = nameParts[0] || ''
        const lastName = nameParts.slice(1).join(' ') || ''
        
        const newUserData = {
          email: currentUser.email,
          displayName: displayName,
          firstName: firstName,
          lastName: lastName,
          role: 'user',
          validated: true, // Auto-validated
          emailVerified: currentUser.emailVerified,
          address: {
            streetName: '',
            streetNumber: '',
            postalCode: '',
            city: '',
            addressName: ''
          },
          subscription: {
            planId: 'free',
            status: 'active',
            startedAt: serverTimestamp(),
            expiresAt: null,
            stripeCustomerId: null,
            stripeSubscriptionId: null,
            cancelAtPeriodEnd: false
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }
        
        try {
          await setDoc(doc(db, 'users', currentUser.uid), newUserData)
          console.log('[refreshUserData] User document created successfully')
          
          // Récupérer les données fraîchement créées
          const freshData = await fetchUserData(currentUser.uid)
          setUserData(freshData)
          
          const result = { 
            data: freshData, 
            emailVerified: freshUser.emailVerified === true,
            validated: freshData?.validated === true 
          }
          console.log('[refreshUserData] Returning result after document creation:', result)
          return result
        } catch (createError) {
          console.error('[refreshUserData] Failed to create user document:', createError)
        }
      }
      
      // Check if email or emailVerified has changed
      const updates = {}
      
      // Update email in Firestore if changed (after user verified new email)
      if (currentUser.email && data && currentUser.email !== data.email) {
        updates.email = currentUser.email
        updates.pendingEmail = null // Clear pending email
      }
      
      // Update emailVerified in Firestore if changed
      if (currentUser.emailVerified && data && !data.emailVerified) {
        updates.emailVerified = true
      }
      
      // Apply updates if any
      if (Object.keys(updates).length > 0) {
        updates.updatedAt = serverTimestamp()
        await updateDoc(doc(db, 'users', currentUser.uid), updates)
        
        // Update local data
        if (updates.email) data.email = updates.email
        if (updates.emailVerified) data.emailVerified = true
        if (updates.pendingEmail === null) data.pendingEmail = null
      }
      
      setUserData(data)
      
      // Log détaillé pour debug
      console.log('[refreshUserData] data:', data)
      console.log('[refreshUserData] data?.validated:', data?.validated)
      console.log('[refreshUserData] freshUser.emailVerified:', freshUser.emailVerified)
      
      // Retourner un objet avec le statut emailVerified pour éviter les problèmes de timing
      const result = { 
        data, 
        emailVerified: freshUser.emailVerified === true,
        validated: data?.validated === true 
      }
      console.log('[refreshUserData] Returning result:', result)
      return result
    } catch (error) {
      console.error('Refresh user data error:', error)
      // If token is expired, the user needs to re-login
      if (error.code === 'auth/user-token-expired') {
        await signOut(auth)
        setUser(null)
        setUserData(null)
      }
      return null
    }
  }

  const value = {
    user,
    userData,
    loading,
    register,
    login,
    logout,
    resetPassword,
    reauthenticate,
    updateUserEmail,
    resendVerificationEmail,
    isAdmin,
    isValidated,
    isEmailVerified,
    refreshUserData,
    // Subscription functions
    getSubscription,
    getCurrentPlan,
    canAccessFeature,
    canAccessQuiz,
    canAccessQuestionnaire,
    canAccessEvents,
    getParticipantLimit,
    isSubscribed,
    getSubStatus,
    getDaysLeft,
    isPro,
    isProPlus,
    isFreeUser
  }

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p>Chargement...</p>
          </div>
        </div>
      ) : children}
    </AuthContext.Provider>
  )
}
