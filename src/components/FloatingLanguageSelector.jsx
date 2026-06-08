import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation } from 'react-router-dom'
import { FiGlobe, FiCheck } from 'react-icons/fi'
import { languages } from '../config/i18n'
import { getLanguageSwitchPath } from './LanguageWrapper'

/**
 * Floating Language Selector for public/shared pages
 * Always visible in the corner of the screen
 * Changes URL to switch language (URL is source of truth)
 * Dropdown direction adapts based on screen position
 */
export default function FloatingLanguageSelector({ position = 'bottom-right', className = '' }) {
  const { i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownDirection, setDropdownDirection] = useState('up') // 'up' or 'down'
  const dropdownRef = useRef(null)
  const buttonRef = useRef(null)
  
  const currentLanguage = languages.find(l => l.code === i18n.language?.split('-')[0]) || languages[0]
  
  // Position classes
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  }
  
  // Calculate dropdown direction based on button position
  const calculateDropdownDirection = () => {
    if (!buttonRef.current) return
    
    const rect = buttonRef.current.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const dropdownHeight = 200 // Approximate height of dropdown
    
    // If button is in the top half of the screen, show dropdown below
    if (rect.top < viewportHeight / 2) {
      setDropdownDirection('down')
    } else {
      // If button is in the bottom half, show dropdown above
      setDropdownDirection('up')
    }
  }
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  // Recalculate direction when opening dropdown
  const handleToggle = () => {
    if (!isOpen) {
      calculateDropdownDirection()
    }
    setIsOpen(!isOpen)
  }
  
  // Change language by navigating to new URL (source of truth)
  const changeLanguage = (code) => {
    const newPath = getLanguageSwitchPath(location.pathname, code)
    navigate(newPath + location.search)
    setIsOpen(false)
  }
  
  // Dynamic dropdown position classes
  const getDropdownPositionClass = () => {
    const isLeft = position.includes('left')
    const horizontalClass = isLeft ? 'left-0' : 'right-0'
    
    if (dropdownDirection === 'down') {
      return `top-full ${horizontalClass} mt-2`
    } else {
      return `bottom-full ${horizontalClass} mb-2`
    }
  }
  
  return (
    <div 
      ref={dropdownRef} 
      className={`fixed ${positionClasses[position]} z-50 ${className}`}
    >
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="flex items-center gap-2 px-3 py-2 bg-white/95 backdrop-blur-sm shadow-lg rounded-full border border-gray-200 hover:bg-white transition-all duration-200 hover:shadow-xl"
        aria-label="Change language"
      >
        <span className="text-lg">{currentLanguage.flag}</span>
        <FiGlobe className="text-gray-600 w-4 h-4" />
      </button>
      
      {isOpen && (
        <div className={`absolute ${getDropdownPositionClass()} w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 animate-fadeIn`}>
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors ${
                currentLanguage.code === lang.code ? 'bg-purple-50' : ''
              }`}
            >
              <span className="text-lg">{lang.flag}</span>
              <span className="flex-1 text-left text-sm font-medium text-gray-700">
                {lang.name}
              </span>
              {currentLanguage.code === lang.code && (
                <FiCheck className="text-purple-600 w-4 h-4" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
