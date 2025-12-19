import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { FiMail, FiLock, FiUser, FiEye, FiEyeOff, FiArrowLeft, FiCheck } from 'react-icons/fi'
import toast from 'react-hot-toast'

const Register = () => {
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const validateForm = () => {
    if (!formData.displayName || !formData.email || !formData.password || !formData.confirmPassword) {
      toast.error('Veuillez remplir tous les champs')
      return false
    }

    if (formData.password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères')
      return false
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas')
      return false
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)

    try {
      await register(formData.email, formData.password, formData.displayName)
      toast.success('Compte créé avec succès !')
      navigate('/pending')
    } catch (error) {
      console.error('Register error:', error)
      if (error.code === 'auth/email-already-in-use') {
        toast.error('Cet email est déjà utilisé')
      } else if (error.code === 'auth/invalid-email') {
        toast.error('Email invalide')
      } else if (error.code === 'auth/weak-password') {
        toast.error('Mot de passe trop faible')
      } else {
        toast.error('Erreur lors de l\'inscription')
      }
    } finally {
      setLoading(false)
    }
  }

  const passwordRequirements = [
    { met: formData.password.length >= 6, text: 'Au moins 6 caractères' },
    { met: /[A-Z]/.test(formData.password), text: 'Une majuscule' },
    { met: /[0-9]/.test(formData.password), text: 'Un chiffre' },
  ]

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
            <h1 className="text-2xl font-bold text-gray-800">Créer un compte</h1>
            <p className="text-gray-500 mt-2">Rejoignez HugoQuiz</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom d'affichage
              </label>
              <div className="relative">
                <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleChange}
                  className="input pl-11"
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adresse email
              </label>
              <div className="relative">
                <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input pl-11"
                  placeholder="votre@email.com"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
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
              {/* Password Requirements */}
              {formData.password && (
                <div className="mt-2 space-y-1">
                  {passwordRequirements.map((req, index) => (
                    <div key={index} className={`flex items-center gap-2 text-xs ${req.met ? 'text-green-600' : 'text-gray-400'}`}>
                      <FiCheck className={req.met ? 'text-green-600' : 'text-gray-300'} />
                      {req.text}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="input pl-11"
                  placeholder="••••••••"
                  required
                />
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="mt-1 text-xs text-red-500">Les mots de passe ne correspondent pas</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn btn-primary py-4 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Créer mon compte'
              )}
            </button>
          </form>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-sm text-amber-800">
              ⚠️ Après inscription, votre compte devra être validé par un administrateur avant de pouvoir accéder à l'application.
            </p>
          </div>

          {/* Login Link */}
          <p className="text-center mt-6 text-gray-600">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-purple-600 hover:text-purple-700 font-semibold">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Register
