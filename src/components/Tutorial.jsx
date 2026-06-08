import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FiX, FiChevronRight, FiChevronLeft, FiCheck } from 'react-icons/fi'

const getTutorialSteps = (t) => [
  {
    target: '[data-tutorial="dashboard"]',
    title: t('tutorial.steps.dashboard.title', 'Votre tableau de bord'),
    content: t('tutorial.steps.dashboard.content', 'Ici vous retrouvez tous vos quiz, questionnaires et événements.'),
    position: 'bottom'
  },
  {
    target: '[data-tutorial="create-quiz"]',
    title: t('tutorial.steps.createQuiz.title', 'Créer un quiz'),
    content: t('tutorial.steps.createQuiz.content', 'Cliquez ici pour créer un nouveau quiz interactif avec des questions et un minuteur.'),
    position: 'bottom'
  },
  {
    target: '[data-tutorial="create-event"]',
    title: t('tutorial.steps.createEvent.title', 'Créer un événement'),
    content: t('tutorial.steps.createEvent.content', 'Gérez vos mariages, anniversaires et fêtes avec liste d\'invités, QR codes et plan de salle.'),
    position: 'bottom'
  },
  {
    target: '[data-tutorial="settings"]',
    title: t('tutorial.steps.settings.title', 'Paramètres'),
    content: t('tutorial.steps.settings.content', 'Personnalisez votre profil, changez la langue et gérez vos préférences.'),
    position: 'left'
  },
  {
    target: '[data-tutorial="chatbot"]',
    title: t('tutorial.steps.chatbot.title', 'Besoin d\'aide ?'),
    content: t('tutorial.steps.chatbot.content', 'Notre assistant intelligent est toujours là pour répondre à vos questions !'),
    position: 'top'
  }
]

export default function Tutorial({ onComplete }) {
  const { t } = useTranslation()
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(true)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  
  const TUTORIAL_STEPS = getTutorialSteps(t)
  
  useEffect(() => {
    // Check if tutorial was already completed
    const completed = localStorage.getItem('tutorial_completed')
    if (completed) {
      setIsVisible(false)
      return
    }
    
    updatePosition()
    window.addEventListener('resize', updatePosition)
    return () => window.removeEventListener('resize', updatePosition)
  }, [currentStep])
  
  const updatePosition = () => {
    const step = TUTORIAL_STEPS[currentStep]
    if (!step) return
    
    const target = document.querySelector(step.target)
    if (target) {
      const rect = target.getBoundingClientRect()
      const pos = calculatePosition(rect, step.position)
      setPosition(pos)
      
      // Highlight target
      target.style.position = 'relative'
      target.style.zIndex = '1001'
      target.style.boxShadow = '0 0 0 4px rgba(139, 92, 246, 0.5)'
      target.style.borderRadius = '8px'
    }
  }
  
  const calculatePosition = (rect, placement) => {
    const tooltipWidth = 320
    const tooltipHeight = 220 // Estimation de la hauteur du tooltip
    const padding = 16
    const viewportHeight = window.innerHeight
    const viewportWidth = window.innerWidth
    
    let top, left
    let finalPlacement = placement
    
    // Calculer la position initiale basée sur le placement demandé
    switch (placement) {
      case 'bottom':
        top = rect.bottom + padding
        left = rect.left
        // Si ça dépasse en bas, passer en haut
        if (top + tooltipHeight > viewportHeight - padding) {
          finalPlacement = 'top'
          top = rect.top - tooltipHeight - padding
        }
        break
      case 'top':
        top = rect.top - tooltipHeight - padding
        left = rect.left
        // Si ça dépasse en haut, passer en bas
        if (top < padding) {
          finalPlacement = 'bottom'
          top = rect.bottom + padding
        }
        break
      case 'left':
        top = rect.top
        left = rect.left - tooltipWidth - padding
        // Si ça dépasse à gauche, passer à droite
        if (left < padding) {
          finalPlacement = 'right'
          left = rect.right + padding
        }
        break
      case 'right':
        top = rect.top
        left = rect.right + padding
        // Si ça dépasse à droite, passer à gauche
        if (left + tooltipWidth > viewportWidth - padding) {
          finalPlacement = 'left'
          left = rect.left - tooltipWidth - padding
        }
        break
      default:
        top = viewportHeight / 2 - tooltipHeight / 2
        left = viewportWidth / 2 - tooltipWidth / 2
    }
    
    // Ajuster horizontalement pour rester dans l'écran
    left = Math.max(padding, Math.min(left, viewportWidth - tooltipWidth - padding))
    
    // Ajuster verticalement pour rester dans l'écran
    if (top < padding) {
      top = padding
    }
    if (top + tooltipHeight > viewportHeight - padding) {
      top = viewportHeight - tooltipHeight - padding
    }
    
    // Si toujours hors écran (élément trop bas), centrer verticalement
    if (top < padding || top + tooltipHeight > viewportHeight) {
      top = Math.max(padding, (viewportHeight - tooltipHeight) / 2)
    }
    
    return { top, left }
  }
  
  const handleNext = () => {
    // Remove highlight from current target
    const currentTarget = document.querySelector(TUTORIAL_STEPS[currentStep]?.target)
    if (currentTarget) {
      currentTarget.style.boxShadow = ''
      currentTarget.style.zIndex = ''
    }
    
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }
  
  const handlePrev = () => {
    if (currentStep > 0) {
      const currentTarget = document.querySelector(TUTORIAL_STEPS[currentStep]?.target)
      if (currentTarget) {
        currentTarget.style.boxShadow = ''
        currentTarget.style.zIndex = ''
      }
      setCurrentStep(currentStep - 1)
    }
  }
  
  const handleComplete = () => {
    localStorage.setItem('tutorial_completed', 'true')
    setIsVisible(false)
    // Clean up all highlights
    TUTORIAL_STEPS.forEach(step => {
      const target = document.querySelector(step.target)
      if (target) {
        target.style.boxShadow = ''
        target.style.zIndex = ''
      }
    })
    onComplete?.()
  }
  
  const handleSkip = () => {
    handleComplete()
  }
  
  if (!isVisible) return null
  
  const step = TUTORIAL_STEPS[currentStep]
  
  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-[1000]" onClick={handleSkip} />
      
      {/* Tooltip */}
      <div
        className="fixed z-[1002] w-80 max-h-[80vh] bg-white rounded-2xl shadow-2xl overflow-hidden animate-fade-in transition-all duration-300"
        style={{ 
          top: position.top, 
          left: position.left,
          maxWidth: 'calc(100vw - 32px)'
        }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm opacity-80">
              {t('tutorial.step')} {currentStep + 1} {t('tutorial.of')} {TUTORIAL_STEPS.length}
            </span>
            <button
              onClick={handleSkip}
              className="p-1 hover:bg-white/20 rounded"
            >
              <FiX size={18} />
            </button>
          </div>
          <h3 className="font-bold text-lg">{step.title}</h3>
        </div>
        
        {/* Content */}
        <div className="p-4">
          <p className="text-gray-600">{step.content}</p>
        </div>
        
        {/* Footer */}
        <div className="px-4 pb-4 flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="text-gray-400 hover:text-gray-600 text-sm"
          >
            {t('tutorial.skip')}
          </button>
          
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <FiChevronLeft />
              </button>
            )}
            
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              {currentStep === TUTORIAL_STEPS.length - 1 ? (
                <>
                  <FiCheck /> {t('tutorial.finish')}
                </>
              ) : (
                <>
                  {t('tutorial.next')} <FiChevronRight />
                </>
              )}
            </button>
          </div>
        </div>
        
        {/* Progress dots */}
        <div className="flex justify-center gap-1 pb-4">
          {TUTORIAL_STEPS.map((_, idx) => (
            <div
              key={idx}
              className={`w-2 h-2 rounded-full transition-colors ${
                idx === currentStep ? 'bg-purple-600' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>
    </>
  )
}

// Hook to reset tutorial
export const useResetTutorial = () => {
  return () => {
    localStorage.removeItem('tutorial_completed')
    window.location.reload()
  }
}
