import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiX, FiCommand } from 'react-icons/fi'

const SHORTCUTS = [
  // Navigation
  { keys: ['g', 'h'], action: 'goHome', path: '/', category: 'navigation' },
  { keys: ['g', 'd'], action: 'goDashboard', path: '/dashboard', category: 'navigation' },
  { keys: ['g', 's'], action: 'goSettings', path: '/settings', category: 'navigation' },
  
  // Actions
  { keys: ['n', 'q'], action: 'newQuiz', path: '/quiz/create', category: 'actions' },
  { keys: ['n', 'e'], action: 'newEvent', path: '/event/create', category: 'actions' },
  { keys: ['n', 'f'], action: 'newQuestionnaire', path: '/questionnaire/create', category: 'actions' },
  
  // UI
  { keys: ['/'], action: 'search', category: 'ui', handler: 'focusSearch' },
  { keys: ['?'], action: 'help', category: 'ui', handler: 'showHelp' },
  { keys: ['Escape'], action: 'close', category: 'ui', handler: 'closeModal' }
]

export default function KeyboardShortcuts() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)
  const [keyBuffer, setKeyBuffer] = useState([])
  const [lastKeyTime, setLastKeyTime] = useState(0)
  
  const handleKeyDown = useCallback((e) => {
    // Ignore if typing in input/textarea
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
      // Allow Escape to close modals even in inputs
      if (e.key === 'Escape') {
        setShowModal(false)
      }
      return
    }
    
    const now = Date.now()
    const key = e.key.toLowerCase()
    
    // Reset buffer if more than 500ms since last key
    if (now - lastKeyTime > 500) {
      setKeyBuffer([key])
    } else {
      setKeyBuffer(prev => [...prev, key])
    }
    setLastKeyTime(now)
    
    // Check for ? key to show help
    if (e.key === '?' || (e.shiftKey && e.key === '/')) {
      e.preventDefault()
      setShowModal(true)
      return
    }
    
    // Check for Escape
    if (e.key === 'Escape') {
      setShowModal(false)
      return
    }
    
    // Check for matches
    const currentBuffer = now - lastKeyTime > 500 ? [key] : [...keyBuffer, key]
    
    for (const shortcut of SHORTCUTS) {
      const matches = shortcut.keys.every((k, i) => currentBuffer[i] === k.toLowerCase())
      if (matches && currentBuffer.length === shortcut.keys.length) {
        e.preventDefault()
        
        if (shortcut.path) {
          navigate(shortcut.path)
        } else if (shortcut.handler === 'showHelp') {
          setShowModal(true)
        } else if (shortcut.handler === 'closeModal') {
          setShowModal(false)
        } else if (shortcut.handler === 'focusSearch') {
          const searchInput = document.querySelector('[data-search]')
          if (searchInput) searchInput.focus()
        }
        
        setKeyBuffer([])
        break
      }
    }
  }, [keyBuffer, lastKeyTime, navigate])
  
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
  
  const formatKeys = (keys) => {
    return keys.map((key, idx) => (
      <span key={idx}>
        <kbd className="px-2 py-1 bg-gray-100 rounded text-sm font-mono border border-gray-200">
          {key === '/' ? '/' : key === '?' ? '?' : key.toUpperCase()}
        </kbd>
        {idx < keys.length - 1 && <span className="mx-1 text-gray-400">+</span>}
      </span>
    ))
  }
  
  if (!showModal) return null
  
  const navigationShortcuts = SHORTCUTS.filter(s => s.category === 'navigation')
  const actionShortcuts = SHORTCUTS.filter(s => s.category === 'actions')
  const uiShortcuts = SHORTCUTS.filter(s => s.category === 'ui')
  
  return (
    <div 
      className="fixed inset-0 bg-black/50 z-[1100] flex items-center justify-center p-4"
      onClick={() => setShowModal(false)}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FiCommand className="text-purple-600" />
            {t('shortcuts.title')}
          </h2>
          <button
            onClick={() => setShowModal(false)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <FiX />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {/* Navigation */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
              {t('shortcuts.navigation')}
            </h3>
            <div className="space-y-2">
              {navigationShortcuts.map((shortcut, idx) => (
                <div key={idx} className="flex items-center justify-between py-2">
                  <span className="text-gray-700">{t(`shortcuts.${shortcut.action}`)}</span>
                  <div>{formatKeys(shortcut.keys)}</div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Actions */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
              {t('shortcuts.actions')}
            </h3>
            <div className="space-y-2">
              {actionShortcuts.map((shortcut, idx) => (
                <div key={idx} className="flex items-center justify-between py-2">
                  <span className="text-gray-700">{t(`shortcuts.${shortcut.action}`)}</span>
                  <div>{formatKeys(shortcut.keys)}</div>
                </div>
              ))}
            </div>
          </div>
          
          {/* UI */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
              Interface
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-700">{t('shortcuts.search')}</span>
                <div>{formatKeys(['/'])}</div>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-700">{t('shortcuts.help')}</span>
                <div>{formatKeys(['?'])}</div>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-700">{t('common.close')}</span>
                <div>{formatKeys(['Escape'])}</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 text-center text-sm text-gray-500">
          Appuyez sur <kbd className="px-2 py-0.5 bg-white rounded border">?</kbd> pour afficher ce menu
        </div>
      </div>
    </div>
  )
}

// Hook to programmatically show shortcuts modal
export const useShowShortcuts = () => {
  return () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '?', shiftKey: true }))
  }
}
