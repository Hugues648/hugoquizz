import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { FiClock, FiLogOut, FiRefreshCw } from 'react-icons/fi'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'

const PendingValidation = () => {
  const { user, logout, refreshUserData, userData } = useAuth()
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)

  // Vérifier automatiquement le statut au chargement
  useEffect(() => {
    const checkValidation = async () => {
      if (!user) {
        navigate('/login')
        return
      }

      // Rafraîchir les données utilisateur
      await refreshUserData()
      setChecking(false)
    }

    checkValidation()
  }, [user])

  // Rediriger si l'utilisateur est validé
  useEffect(() => {
    if (!checking && userData?.validated) {
      navigate('/dashboard', { replace: true })
    }
  }, [checking, userData, navigate])

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/')
    } catch (error) {
      toast.error('Erreur lors de la déconnexion')
    }
  }

  const handleRefresh = async () => {
    setChecking(true)
    await refreshUserData()
    setChecking(false)
    // La redirection sera gérée par le useEffect
  }

  // Afficher le spinner pendant la vérification
  if (checking) {
    return <LoadingSpinner fullScreen text="Vérification du statut..." />
  }

  // Si déjà validé, ne rien afficher (la redirection est en cours)
  if (userData?.validated) {
    return <LoadingSpinner fullScreen text="Redirection..." />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center animate-fade-in">
          {/* Icon */}
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <FiClock className="text-amber-500 text-4xl" />
          </div>

          {/* Content */}
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            En attente de validation
          </h1>
          <p className="text-gray-600 mb-8">
            Votre compte a été créé avec succès ! Un administrateur doit maintenant valider votre compte avant que vous puissiez accéder à l'application.
          </p>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8">
            <p className="text-sm text-blue-800">
              💡 Vous recevrez un email une fois votre compte validé. En attendant, vous pouvez vérifier le statut de votre compte en cliquant sur "Vérifier".
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleRefresh}
              className="w-full btn btn-primary flex items-center justify-center gap-2"
            >
              <FiRefreshCw />
              Vérifier le statut
            </button>
            <button
              onClick={handleLogout}
              className="w-full btn btn-ghost flex items-center justify-center gap-2 text-gray-600"
            >
              <FiLogOut />
              Se déconnecter
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PendingValidation
