import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useSiteConfig } from '../contexts/SiteConfigContext'
import { FiMail, FiLock, FiUser, FiEye, FiEyeOff, FiArrowLeft, FiCheck, FiMapPin, FiHome, FiHash } from 'react-icons/fi'
import toast from 'react-hot-toast'
import LocalizedLink from '../components/LocalizedLink'
import { languages } from '../config/i18n'

const SUPPORTED_LANGS = languages.map(l => l.code)

// Belgian postal codes database (common ones)
const BELGIAN_POSTAL_CODES = {
  '1000': 'Bruxelles',
  '1020': 'Laeken',
  '1030': 'Schaerbeek',
  '1040': 'Etterbeek',
  '1050': 'Ixelles',
  '1060': 'Saint-Gilles',
  '1070': 'Anderlecht',
  '1080': 'Molenbeek-Saint-Jean',
  '1081': 'Koekelberg',
  '1082': 'Berchem-Sainte-Agathe',
  '1083': 'Ganshoren',
  '1090': 'Jette',
  '1140': 'Evere',
  '1150': 'Woluwe-Saint-Pierre',
  '1160': 'Auderghem',
  '1170': 'Watermael-Boitsfort',
  '1180': 'Uccle',
  '1190': 'Forest',
  '1200': 'Woluwe-Saint-Lambert',
  '1210': 'Saint-Josse-ten-Noode',
  '2000': 'Anvers',
  '2018': 'Anvers',
  '2020': 'Anvers',
  '2030': 'Anvers',
  '2050': 'Anvers',
  '2060': 'Anvers',
  '2100': 'Deurne',
  '2140': 'Borgerhout',
  '2170': 'Merksem',
  '2180': 'Ekeren',
  '2600': 'Berchem',
  '2610': 'Wilrijk',
  '2660': 'Hoboken',
  '3000': 'Louvain',
  '3001': 'Heverlee',
  '3010': 'Kessel-Lo',
  '3500': 'Hasselt',
  '3600': 'Genk',
  '4000': 'Liège',
  '4020': 'Liège',
  '4030': 'Grivegnée',
  '4040': 'Herstal',
  '4100': 'Seraing',
  '4420': 'Saint-Nicolas',
  '5000': 'Namur',
  '5100': 'Jambes',
  '6000': 'Charleroi',
  '6001': 'Marcinelle',
  '6010': 'Couillet',
  '6020': 'Dampremy',
  '6030': 'Marchienne-au-Pont',
  '6040': 'Jumet',
  '6041': 'Gosselies',
  '6042': 'Lodelinsart',
  '6044': 'Roux',
  '6060': 'Gilly',
  '6061': 'Montignies-sur-Sambre',
  '7000': 'Mons',
  '7010': 'Ghlin',
  '7011': 'Ghlin',
  '7012': 'Jemappes',
  '7100': 'La Louvière',
  '7140': 'Morlanwelz',
  '7500': 'Tournai',
  '8000': 'Bruges',
  '8200': 'Sint-Andries',
  '8310': 'Assebroek',
  '8400': 'Ostende',
  '8500': 'Courtrai',
  '9000': 'Gand',
  '9030': 'Mariakerke',
  '9040': 'Sint-Amandsberg',
  '9050': 'Gentbrugge',
  '9100': 'Saint-Nicolas',
  '9200': 'Dendermonde',
  '9300': 'Alost'
}

const Register = () => {
  const { t, i18n } = useTranslation()
  const { getLogo, siteName } = useSiteConfig()
  const { lang } = useParams()
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    // Address fields
    streetName: '',
    streetNumber: '',
    postalCode: '',
    addressName: '' // Nom à l'adresse
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [postalSuggestion, setPostalSuggestion] = useState(null)
  const [showPostalSuggestions, setShowPostalSuggestions] = useState(false)
  const postalInputRef = useRef(null)

  const { register } = useAuth()
  const navigate = useNavigate()
  
  // Déterminer la langue actuelle
  const currentLang = lang || i18n.language?.split('-')[0] || 'fr'
  const validLang = SUPPORTED_LANGS.includes(currentLang) ? currentLang : 'fr'

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    
    // Handle postal code suggestions
    if (name === 'postalCode') {
      if (value.length >= 2) {
        // Find matching postal codes
        const matches = Object.entries(BELGIAN_POSTAL_CODES)
          .filter(([code]) => code.startsWith(value))
          .slice(0, 5)
        
        if (matches.length > 0) {
          setPostalSuggestion(matches)
          setShowPostalSuggestions(true)
        } else {
          setShowPostalSuggestions(false)
        }
      } else {
        setShowPostalSuggestions(false)
      }
    }
  }
  
  // Select postal suggestion
  const selectPostalCode = (code, city) => {
    setFormData({ ...formData, postalCode: code })
    setPostalSuggestion([{ code, city }])
    setShowPostalSuggestions(false)
  }
  
  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (postalInputRef.current && !postalInputRef.current.contains(e.target)) {
        setShowPostalSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const validateForm = () => {
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.confirmPassword) {
      toast.error(t('auth.errors.fillAllFields'))
      return false
    }
    
    // Validate address fields
    if (!formData.streetName || !formData.streetNumber || !formData.postalCode || !formData.addressName) {
      toast.error(t('auth.errors.fillAddressFields'))
      return false
    }

    // Password validation: 8 characters, lowercase, uppercase, special character
    if (formData.password.length < 8) {
      toast.error(t('messages.validation.passwordMinLength'))
      return false
    }
    
    if (!/[a-z]/.test(formData.password)) {
      toast.error(t('messages.validation.passwordLowercase'))
      return false
    }
    
    if (!/[A-Z]/.test(formData.password)) {
      toast.error(t('messages.validation.passwordUppercase'))
      return false
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;'/`~]/.test(formData.password)) {
      toast.error(t('messages.validation.passwordSpecialChar'))
      return false
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error(t('auth.errors.passwordNoMatch'))
      return false
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)

    try {
      // Build address data
      const addressData = {
        streetName: formData.streetName,
        streetNumber: formData.streetNumber,
        postalCode: formData.postalCode,
        city: BELGIAN_POSTAL_CODES[formData.postalCode] || '',
        addressName: formData.addressName
      }
      
      // Combine firstName and lastName for displayName, but also send separately
      const displayName = `${formData.firstName} ${formData.lastName}`.trim()
      const result = await register(formData.email, formData.password, displayName, addressData, formData.firstName, formData.lastName)
      if (result.emailSent) {
        toast.success('📧 ' + t('auth.success.verificationSent') + ' ' + formData.email)
      } else {
        toast.success(t('messages.success.accountCreatedResend'))
      }
      navigate(`/${validLang}/pending`)
    } catch (error) {
      console.error('Register error:', error)
      if (error.code === 'auth/email-already-in-use') {
        toast.error(t('auth.errors.emailAlreadyUsed'))
      } else if (error.code === 'auth/invalid-email') {
        toast.error(t('auth.errors.invalidEmail'))
      } else if (error.code === 'auth/weak-password') {
        toast.error(t('auth.errors.weakPassword'))
      } else {
        toast.error(t('auth.errors.registerError'))
      }
    } finally {
      setLoading(false)
    }
  }

  const passwordRequirements = [
    { met: formData.password.length >= 8, text: 'Au moins 8 caractères' },
    { met: /[a-z]/.test(formData.password), text: 'Une lettre minuscule' },
    { met: /[A-Z]/.test(formData.password), text: 'Une lettre majuscule' },
    { met: /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;'/`~]/.test(formData.password), text: 'Un caractère spécial (ex: #, @, !)' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Link */}
        <LocalizedLink 
          to="/" 
          className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors"
        >
          <FiArrowLeft />
          {t('auth.backToHome')}
        </LocalizedLink>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 animate-fade-in">
          {/* Logo */}
          <div className="text-center mb-8">
            {getLogo('registerPage') || getLogo('header') ? (
              <img 
                src={getLogo('registerPage') || getLogo('header')} 
                alt="Logo" 
                className="w-16 h-16 object-contain mx-auto mb-4"
              />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-3xl">🎯</span>
              </div>
            )}
            <h1 className="text-2xl font-bold text-gray-800">{t('auth.registerTitle')}</h1>
            <p className="text-gray-500 mt-2">{t('auth.joinHugoQuiz', { siteName })}</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* First Name and Last Name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prénom
                </label>
                <div className="relative">
                  <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="input pl-11"
                    placeholder="Jean"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom
                </label>
                <div className="relative">
                  <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="input pl-11"
                    placeholder="Dupont"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('auth.email')}
              </label>
              <div className="relative">
                <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input pl-11"
                  placeholder={t('auth.emailPlaceholder')}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('auth.password')}
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
                {t('auth.confirmPassword')}
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
                <p className="mt-1 text-xs text-red-500">{t('auth.errors.passwordNoMatch')}</p>
              )}
            </div>

            {/* Address Section */}
            <div className="border-t border-gray-200 pt-5 mt-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <FiMapPin className="text-purple-500" />
                {t('auth.address.title')}
              </h3>
              
              {/* Street Name and Number */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('auth.address.street')}
                  </label>
                  <div className="relative">
                    <FiHome className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      name="streetName"
                      value={formData.streetName}
                      onChange={handleChange}
                      className="input pl-11"
                      placeholder="Rue de la Loi"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('auth.address.streetNumber')}
                  </label>
                  <div className="relative">
                    <FiHash className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      name="streetNumber"
                      value={formData.streetNumber}
                      onChange={handleChange}
                      className="input pl-11"
                      placeholder="42"
                      required
                    />
                  </div>
                </div>
              </div>
              
              {/* Postal Code */}
              <div className="mb-4" ref={postalInputRef}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('auth.address.postalCode')}
                </label>
                <div className="relative">
                  <FiMapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleChange}
                    className="input pl-11"
                    placeholder="1000"
                    required
                    autoComplete="off"
                  />
                  {/* Postal code suggestions */}
                  {showPostalSuggestions && postalSuggestion && postalSuggestion.length > 0 && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                      {postalSuggestion.map(([code, city]) => (
                        <button
                          key={code}
                          type="button"
                          onClick={() => selectPostalCode(code, city)}
                          className="w-full px-4 py-2 text-left hover:bg-purple-50 flex items-center gap-3 transition-colors"
                        >
                          <span className="font-medium text-purple-600">{code}</span>
                          <span className="text-gray-600">{city}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {formData.postalCode && BELGIAN_POSTAL_CODES[formData.postalCode] && (
                  <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                    <FiCheck /> {BELGIAN_POSTAL_CODES[formData.postalCode]}
                  </p>
                )}
                {formData.postalCode && formData.postalCode.length === 4 && !BELGIAN_POSTAL_CODES[formData.postalCode] && (
                  <p className="mt-1 text-xs text-amber-600">
                    {t('auth.address.postalNotRecognized')}
                  </p>
                )}
              </div>
              
              {/* Name at address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('auth.address.nameAtAddress')}
                </label>
                <div className="relative">
                  <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="addressName"
                    value={formData.addressName}
                    onChange={handleChange}
                    className="input pl-11"
                    placeholder={t('auth.displayNamePlaceholder')}
                    required
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">{t('auth.address.nameAtAddressHint')}</p>
              </div>
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
                t('auth.createAccount')
              )}
            </button>
          </form>

          {/* Login Link */}
          <p className="text-center mt-6 text-gray-600">
            {t('auth.hasAccount')}{' '}
            <LocalizedLink to="/login" className="text-purple-600 hover:text-purple-700 font-semibold">
              {t('auth.loginButton')}
            </LocalizedLink>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Register
