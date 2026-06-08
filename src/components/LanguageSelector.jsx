import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation } from 'react-router-dom'
import { FiGlobe, FiCheck, FiChevronDown } from 'react-icons/fi'
import { languages } from '../config/i18n'
import { getLanguageSwitchPath } from './LanguageWrapper'

// dropdownDirection: 'up' = opens upward, 'down' = opens downward
export default function LanguageSelector({ className = '', dropdownDirection = 'down' }) {
  const { i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  
  const currentLanguage = languages.find(l => l.code === i18n.language?.split('-')[0]) || languages[0]
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  // Change language by navigating to new URL (source of truth)
  const changeLanguage = (code) => {
    const newPath = getLanguageSwitchPath(location.pathname, code)
    navigate(newPath + location.search)
    setIsOpen(false)
  }
  
  // Determine dropdown position classes based on direction
  const dropdownPositionClass = dropdownDirection === 'up' 
    ? 'bottom-full mb-2' 
    : 'top-full mt-2'
  
  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <span className="text-lg">{currentLanguage.flag}</span>
        <span className="hidden sm:inline text-sm font-medium">{currentLanguage.name}</span>
        <FiChevronDown className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className={`absolute left-0 ${dropdownPositionClass} w-56 bg-white rounded-xl shadow-lg border z-50 py-2 max-h-96 overflow-y-auto`}>
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors ${
                currentLanguage.code === lang.code ? 'bg-purple-50' : ''
              }`}
            >
              <span className="text-lg">{lang.flag}</span>
              <span className="flex-1 text-left text-sm font-medium text-gray-700">{lang.name}</span>
              {currentLanguage.code === lang.code && (
                <FiCheck className="text-purple-600" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Compact version for mobile/footer
export function LanguageSelectorCompact({ className = '' }) {
  const { i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const currentLanguage = languages.find(l => l.code === i18n.language?.split('-')[0]) || languages[0]
  
  const handleChange = (e) => {
    const newPath = getLanguageSwitchPath(location.pathname, e.target.value)
    navigate(newPath + location.search)
  }
  
  return (
    <select
      value={currentLanguage.code}
      onChange={handleChange}
      className={`bg-transparent border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-purple-500 ${className}`}
    >
      {languages.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.flag} {lang.name}
        </option>
      ))}
    </select>
  )
}
