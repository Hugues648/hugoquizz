import { createContext, useContext, useEffect, useState } from 'react'
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../config/firebase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)

  // Register new user
  const register = async (email, password, displayName) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    
    // Create user document in Firestore
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      email,
      displayName,
      role: 'user',
      validated: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
    
    return userCredential.user
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

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          setUser(firebaseUser)
          try {
            const data = await fetchUserData(firebaseUser.uid)
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
    if (user) {
      const data = await fetchUserData(user.uid)
      setUserData(data)
      return data
    }
    return null
  }

  const value = {
    user,
    userData,
    loading,
    register,
    login,
    logout,
    resetPassword,
    isAdmin,
    isValidated,
    refreshUserData
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
