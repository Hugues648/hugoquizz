import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useSiteConfig } from '../contexts/SiteConfigContext'
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowLeft } from 'react-icons/fi'
import toast from 'react-hot-toast'
import LocalizedLink from '../components/LocalizedLink'
import { languages } from '../config/i18n'

const SUPPORTED_LANGS = languages.map(l => l.code)

const Login = () => {
  const { t, i18n } = useTranslation()
  const { getLogo, siteName } = useSiteConfig()
  const { lang } = useParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resetMode, setResetMode] = useState(false)

  const { login, resetPassword } = useAuth()
  const navigate = useNavigate()
  
  // Déterminer la langue actuelle
  const currentLang = lang || i18n.language?.split('-')[0] || 'fr'
  const validLang = SUPPORTED_LANGS.includes(currentLang) ? currentLang : 'fr'

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!email || !password) {
      toast.error(t('auth.errors.fillAllFields'))
      return
    }

    setLoading(true)

    try {
      await login(email, password)
      toast.success(t('auth.success.loginSuccess'))
      navigate(`/${validLang}/dashboard`)
    } catch (error) {
      console.error('Login error:', error)
      if (error.code === 'auth/user-not-found') {
        toast.error(t('auth.errors.userNotFound'))
      } else if (error.code === 'auth/wrong-password') {
        toast.error(t('auth.errors.wrongPassword'))
      } else if (error.code === 'auth/invalid-credential') {
        toast.error(t('auth.errors.invalidCredential'))
      } else {
        toast.error(t('auth.errors.connectionError'))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    
    if (!email) {
      toast.error(t('auth.errors.enterEmail'))
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast.error(t('auth.errors.invalidEmailFormat'))
      return
    }

    setLoading(true)

    try {
      await resetPassword(email)
      toast.success('📧 ' + t('auth.success.resetEmailSent'))
      setResetMode(false)
    } catch (error) {
      console.error('Reset error:', error)
      if (error.code === 'auth/user-not-found') {
        toast.error(t('auth.errors.noAccountForEmail'))
      } else if (error.code === 'auth/invalid-email') {
        toast.error(t('auth.errors.invalidEmailFormat'))
      } else if (error.code === 'auth/too-many-requests') {
        toast.error(t('auth.errors.tooManyAttempts'))
      } else {
        toast.error(t('auth.errors.resetError'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-pink-500/20 rounded-full blur-3xl animate-pulse-soft" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse-soft stagger-2" />
        <div className="absolute top-1/2 right-1/4 text-6xl opacity-20 animate-float">🎯</div>
        <div className="absolute bottom-1/3 left-1/4 text-5xl opacity-20 animate-float stagger-2">✨</div>
      </div>
      
      <div className="w-full max-w-md relative z-10">
        {/* Back Link */}
        <LocalizedLink 
          to="/" 
          className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors"
        >
          <FiArrowLeft />
          {t('auth.backToHome')}
        </LocalizedLink>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 animate-scale-in">
          {/* Logo */}
          <div className="text-center mb-8">
            {getLogo('loginPage') || getLogo('header') ? (
              <img 
                src={getLogo('loginPage') || getLogo('header')} 
                alt="Logo" 
                className="w-20 h-20 object-contain mx-auto mb-4"
              />
            ) : (
              <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-pink-500/30 animate-bounce-in">
                <span className="text-4xl">🎯</span>
              </div>
            )}
            <h1 className="text-3xl font-bold text-gray-800">
              {resetMode ? t('auth.forgotPasswordTitle') : t('auth.loginTitle')}
            </h1>
            <p className="text-gray-500 mt-2">
              {resetMode 
                ? t('auth.resetPasswordDesc')
                : t('auth.welcomeTo') + ` ${siteName}`
              }
            </p>
          </div>

          {/* Form */}
          <form onSubmit={resetMode ? handleResetPassword : handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('auth.email')}
              </label>
              <div className="relative">
                <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-11"
                  placeholder={t('auth.emailPlaceholder')}
                  required
                />
              </div>
            </div>

            {/* Password (not in reset mode) */}
            {!resetMode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('auth.password')}
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
                  {t('auth.forgotPassword')}
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn bg-gradient-to-r from-pink-500 to-rose-500 text-white py-4 flex items-center justify-center gap-2 rounded-2xl shadow-lg shadow-pink-500/30 hover:shadow-xl hover:shadow-pink-500/40 font-bold text-lg"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : resetMode ? (
                t('auth.sendResetLink')
              ) : (
                t('auth.loginButton')
              )}
            </button>

            {/* Back to login from reset mode */}
            {resetMode && (
              <button
                type="button"
                onClick={() => setResetMode(false)}
                className="w-full btn btn-ghost"
              >
                {t('auth.backToLogin')}
              </button>
            )}
          </form>

          {/* Register Link */}
          {!resetMode && (
            <p className="text-center mt-6 text-gray-600">
              {t('auth.noAccount')}{' '}
              <LocalizedLink to="/register" className="text-purple-600 hover:text-purple-700 font-semibold">
                {t('auth.registerButton')}
              </LocalizedLink>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default Login
