import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowLeft } from 'react-icons/fi'
import toast from 'react-hot-toast'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resetMode, setResetMode] = useState(false)

  const { login, resetPassword } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!email || !password) {
      toast.error('Veuillez remplir tous les champs')
      return
    }

    setLoading(true)

    try {
      await login(email, password)
      toast.success('Connexion réussie !')
      navigate('/dashboard')
    } catch (error) {
      console.error('Login error:', error)
      if (error.code === 'auth/user-not-found') {
        toast.error('Aucun compte trouvé avec cet email')
      } else if (error.code === 'auth/wrong-password') {
        toast.error('Mot de passe incorrect')
      } else if (error.code === 'auth/invalid-credential') {
        toast.error('Email ou mot de passe incorrect')
      } else {
        toast.error('Erreur de connexion')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    
    if (!email) {
      toast.error('Veuillez entrer votre email')
      return
    }

    setLoading(true)

    try {
      await resetPassword(email)
      toast.success('Email de réinitialisation envoyé !')
      setResetMode(false)
    } catch (error) {
      console.error('Reset error:', error)
      toast.error('Erreur lors de l\'envoi de l\'email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Link */}
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors"
        >
          <FiArrowLeft />
          Retour à l'accueil
        </Link>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 animate-fade-in">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-3xl">🎯</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">
              {resetMode ? 'Mot de passe oublié' : 'Connexion'}
            </h1>
            <p className="text-gray-500 mt-2">
              {resetMode 
                ? 'Entrez votre email pour réinitialiser' 
                : 'Bienvenue sur HugoQuiz'
              }
            </p>
          </div>

          {/* Form */}
          <form onSubmit={resetMode ? handleResetPassword : handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adresse email
              </label>
              <div className="relative">
                <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-11"
                  placeholder="votre@email.com"
                  required
                />
              </div>
            </div>

            {/* Password (not in reset mode) */}
            {!resetMode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mot de passe
                </label>
                <div className="relative">
                  <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input pl-11 pr-11"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>
            )}

            {/* Forgot Password Link */}
            {!resetMode && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setResetMode(true)}
                  className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                >
                  Mot de passe oublié ?
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn btn-primary py-4 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : resetMode ? (
                'Envoyer le lien'
              ) : (
                'Se connecter'
              )}
            </button>

            {/* Back to login from reset mode */}
            {resetMode && (
              <button
                type="button"
                onClick={() => setResetMode(false)}
                className="w-full btn btn-ghost"
              >
                Retour à la connexion
              </button>
            )}
          </form>

          {/* Register Link */}
          {!resetMode && (
            <p className="text-center mt-6 text-gray-600">
              Pas encore de compte ?{' '}
              <Link to="/register" className="text-purple-600 hover:text-purple-700 font-semibold">
                S'inscrire
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default Login
