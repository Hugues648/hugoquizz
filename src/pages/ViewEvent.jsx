import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { jsPDF } from 'jspdf'
import { 
  getEventById, 
  getGiftsByEvent,
  getGiftSelectionsByGift,
  createGiftSelection,
  updateGiftSelection,
  getGiftSelectionsByGuestFingerprint,
  createEventVisitor,
  updateEventVisitor,
  createPendingGuest,
  getPendingGuestByFingerprint
} from '../services/firestore'
import { 
  FiGift, FiCalendar, FiExternalLink, FiCheck, FiUser, 
  FiMessageSquare, FiUsers, FiHeart, FiShare2, FiDownload,
  FiArrowRight, FiBook, FiChevronDown, FiDollarSign,
  FiVolume2, FiVolumeX
} from 'react-icons/fi'
import LoadingSpinner from '../components/LoadingSpinner'
import FloatingLanguageSelector from '../components/FloatingLanguageSelector'

// Relation keys for guest registration
const RELATION_KEYS = [
  'fatherGroom', 'motherGroom', 'brotherGroom', 'sisterGroom',
  'fatherBride', 'motherBride', 'brotherBride', 'sisterBride',
  'grandparent', 'uncle', 'aunt', 'cousin', 'nephew',
  'childhoodFriend', 'closeFriend', 'colleague', 'neighbor',
  'witness', 'bridesmaid', 'groomsman',
  'otherFamily', 'otherFriend', 'professional', 'other'
]

// Generate a unique browser fingerprint for visitor recognition
// Uses a persistent random ID stored in localStorage to avoid collisions
// between devices with identical hardware/browser (same phone model, etc.)
const generateFingerprint = () => {
  // Check for an existing persistent unique ID in localStorage
  const PERSISTENT_KEY = 'hugoquiz_browser_uid'
  let persistentId = localStorage.getItem(PERSISTENT_KEY)
  
  if (!persistentId) {
    // Generate a random unique ID for this browser instance
    persistentId = crypto.randomUUID ? crypto.randomUUID() : 
      (Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10) + '-' + Math.random().toString(36).slice(2, 10))
    localStorage.setItem(PERSISTENT_KEY, persistentId)
  }
  
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  ctx.textBaseline = 'top'
  ctx.font = '14px Arial'
  ctx.fillText('fingerprint', 2, 2)
  const canvasData = canvas.toDataURL()
  
  const fingerprint = [
    persistentId,
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    canvasData.slice(-50)
  ].join('|')
  
  // Simple hash
  let hash = 0
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

const EVENT_TYPES = {
  'mariage': { labelKey: 'home.eventTypes.wedding', emoji: '💒', gradient: 'from-pink-500 via-rose-400 to-red-400' },
  'anniversaire': { labelKey: 'home.eventTypes.birthday', emoji: '🎂', gradient: 'from-purple-500 via-pink-500 to-red-400' },
  'naissance': { labelKey: 'home.eventTypes.birth', emoji: '👶', gradient: 'from-blue-400 via-cyan-400 to-teal-400' },
  'bapteme': { labelKey: 'home.eventTypes.baptism', emoji: '⛪', gradient: 'from-indigo-400 via-purple-400 to-pink-400' },
  'cremaillere': { labelKey: 'home.eventTypes.housewarming', emoji: '🏠', gradient: 'from-amber-500 via-orange-400 to-red-400' },
  'noel': { labelKey: 'home.eventTypes.christmas', emoji: '🎄', gradient: 'from-green-500 via-emerald-400 to-teal-400' },
  'autre': { labelKey: 'events.view.event', emoji: '🎉', gradient: 'from-violet-500 via-purple-500 to-fuchsia-500' }
}

// Confetti component
const Confetti = ({ show }) => {
  if (!show) return null
  
  const colors = ['#ec4899', '#8b5cf6', '#fbbf24', '#10b981', '#f43f5e', '#06b6d4']
  const confetti = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    color: colors[Math.floor(Math.random() * colors.length)],
    delay: `${Math.random() * 2}s`,
    size: Math.random() * 8 + 6
  }))

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {confetti.map(c => (
        <div
          key={c.id}
          className="absolute top-0"
          style={{
            left: c.left,
            width: c.size,
            height: c.size,
            backgroundColor: c.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '0',
            animation: `confetti-fall 3s ease-out ${c.delay} forwards`
          }}
        />
      ))}
    </div>
  )
}

// Floating decorations
const FloatingDecorations = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
    <div className="absolute top-20 left-10 text-4xl animate-float opacity-20">🎁</div>
    <div className="absolute top-40 right-20 text-3xl animate-float stagger-2 opacity-20">💝</div>
    <div className="absolute bottom-40 left-20 text-3xl animate-float stagger-3 opacity-20">✨</div>
    <div className="absolute bottom-20 right-10 text-4xl animate-float stagger-4 opacity-20">🎀</div>
    <div className="absolute top-1/2 left-5 text-2xl animate-float stagger-5 opacity-15">🌟</div>
    <div className="absolute top-1/3 right-5 text-2xl animate-float opacity-15">💫</div>
  </div>
)

// Photo Slideshow component - Clean, minimal: just photos, no overlays
const PhotoSlideshow = ({ photos }) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [nextIndex, setNextIndex] = useState(null)
  const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0 })
  
  // Shuffle photos randomly on mount
  const shuffledPhotos = useMemo(() => {
    if (!photos || photos.length === 0) return []
    const shuffled = [...photos]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }, [photos])
  
  // Auto-advance with crossfade
  useEffect(() => {
    if (shuffledPhotos.length <= 1) return
    
    const timer = setTimeout(() => {
      const next = (currentIndex + 1) % shuffledPhotos.length
      setNextIndex(next)
      
      setTimeout(() => {
        setCurrentIndex(next)
        setNextIndex(null)
      }, 1200)
    }, 3500)
    
    return () => clearTimeout(timer)
  }, [currentIndex, shuffledPhotos.length])

  // Preload next image and measure dimensions
  useEffect(() => {
    if (!shuffledPhotos[currentIndex]) return
    const img = new Image()
    img.onload = () => {
      setImgDimensions({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.src = shuffledPhotos[currentIndex]
  }, [currentIndex, shuffledPhotos])
  
  if (!shuffledPhotos || shuffledPhotos.length === 0) return null

  // Compute the aspect ratio to size the container to the image's natural shape
  const aspectRatio = imgDimensions.width && imgDimensions.height
    ? imgDimensions.width / imgDimensions.height
    : 16 / 9 // fallback
  
  return (
    <div className="w-full flex justify-center my-4">
      <div 
        className="relative overflow-hidden rounded-2xl shadow-2xl"
        style={{ 
          width: '100%',
          maxWidth: '900px',
          aspectRatio: aspectRatio.toFixed(4),
          maxHeight: '75vh'
        }}
      >
        {/* Current photo */}
        <img
          src={shuffledPhotos[currentIndex]}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            animation: `kenBurns 8s ease-in-out infinite alternate`
          }}
        />

        {/* Next photo (crossfade in) */}
        {nextIndex !== null && (
          <img
            src={shuffledPhotos[nextIndex]}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ animation: 'photoFadeIn 1.2s ease-in-out forwards' }}
          />
        )}
      </div>
    </div>
  )
}

// Phase 2 wrapper component with background music
const Phase2Content = ({ event, visitorName, validPhotos, showTicket, success, error, showConfetti, generatingPdf, pdfDownloaded, generatePdf, setPhase, t }) => {
  const audioRef = useRef(null)
  const [musicPlaying, setMusicPlaying] = useState(false)
  
  // Setup background music
  useEffect(() => {
    if (!event.backgroundMusicUrl) return
    
    const audio = new Audio(event.backgroundMusicUrl)
    audio.loop = true
    audio.volume = 0.4
    audioRef.current = audio
    
    // Auto-play (with user interaction fallback)
    const playPromise = audio.play()
    if (playPromise !== undefined) {
      playPromise.then(() => {
        setMusicPlaying(true)
      }).catch(() => {
        // Autoplay blocked - will need user click
        setMusicPlaying(false)
      })
    }
    
    return () => {
      audio.pause()
      audio.src = ''
      audioRef.current = null
    }
  }, [event.backgroundMusicUrl])
  
  const toggleMusic = () => {
    if (!audioRef.current) return
    if (musicPlaying) {
      audioRef.current.pause()
      setMusicPlaying(false)
    } else {
      audioRef.current.play().then(() => setMusicPlaying(true)).catch(() => {})
    }
  }
  
  const goToPhase3 = () => {
    // Stop music when leaving
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
    }
    setPhase(3)
  }
  
  return (
    <div className="min-h-screen relative">
      <FloatingDecorations />
      <Confetti show={showConfetti} />
      
      {/* Music toggle button */}
      {event.backgroundMusicUrl && (
        <button
          onClick={toggleMusic}
          className="fixed top-4 right-4 z-50 w-12 h-12 bg-gray-900/80 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-gray-900 transition-all shadow-xl border border-gray-700"
          title={musicPlaying ? t('events.create.musicPlaying') : t('events.create.musicPaused')}
        >
          {musicPlaying ? (
            <FiVolume2 className="w-5 h-5 animate-pulse-soft" />
          ) : (
            <FiVolumeX className="w-5 h-5" />
          )}
        </button>
      )}
      
      <div className="max-w-4xl mx-auto px-4 py-8 relative z-10">
        {/* Welcome Header */}
        <div className="text-center mb-8 animate-slide-up">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
            {t('events.view.welcomeName', { name: visitorName })} 🎉
          </h1>
          <p className="text-gray-600">{t('events.view.toTheEvent')} <strong>{event.name}</strong></p>
        </div>

        {/* Messages */}
        {success && (
          <div className="mb-6 p-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl text-white shadow-lg animate-bounce-in flex items-center gap-3">
            <FiCheck className="w-6 h-6" />
            <p className="font-medium">{success}</p>
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-500 rounded-2xl text-white shadow-lg">{error}</div>
        )}

        {/* Photo Slideshow */}
        {validPhotos.length > 0 && (
          <div className="animate-slide-up stagger-1">
            <PhotoSlideshow photos={validPhotos} />
          </div>
        )}

        {/* Story Section */}
        {event.story && (
          <div className="bg-white rounded-3xl shadow-2xl p-8 mb-8 animate-slide-up stagger-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white">
                <FiBook className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">{t('events.view.ourStory')}</h2>
            </div>
            <div className="prose prose-pink max-w-none">
              <p className="text-gray-700 leading-relaxed whitespace-pre-line text-lg">{event.story}</p>
            </div>
          </div>
        )}

        {/* Invitation Download - only if showInvitationTicket is true */}
        {showTicket && (event.invitationImageUrl || event.invitationLetter) && (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl shadow-2xl p-8 mb-8 border border-amber-200 animate-slide-up stagger-3">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <FiDownload className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                {t('events.view.yourPersonalizedInvitation')}
              </h2>
              <p className="text-gray-600 mb-6">{t('events.view.downloadPdfWithName')}</p>
              
              <button
                onClick={generatePdf}
                disabled={generatingPdf}
                className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 flex items-center justify-center gap-3 mx-auto text-lg disabled:opacity-50"
              >
                {generatingPdf ? (
                  <>
                    <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                    {t('events.view.generating')}
                  </>
                ) : pdfDownloaded ? (
                  <>
                    <FiCheck className="w-6 h-6" />
                    {t('events.view.downloadAgain')}
                  </>
                ) : (
                  <>
                    <FiDownload className="w-6 h-6" />
                    {t('events.view.downloadMyInvitation')}
                  </>
                )}
              </button>
              
              {pdfDownloaded && (
                <p className="text-emerald-600 mt-4 flex items-center justify-center gap-2">
                  <FiCheck className="w-5 h-5" />
                  {t('events.view.invitationDownloadedSuccess')}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Continue to Gift List */}
        <div className="text-center animate-slide-up stagger-4">
          <button
            onClick={goToPhase3}
            className="px-10 py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 flex items-center justify-center gap-3 mx-auto text-lg"
          >
            <FiGift className="w-6 h-6" />
            {t('events.view.discoverGiftList')}
            <FiArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ViewEvent() {
  const { id } = useParams()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [event, setEvent] = useState(null)
  const [gifts, setGifts] = useState([])
  const [showReserveModal, setShowReserveModal] = useState(null)
  const [showConfetti, setShowConfetti] = useState(false)
  
  // 3-phase flow state
  const [phase, setPhase] = useState(1)
  const [visitorName, setVisitorName] = useState('')
  const [visitorId, setVisitorId] = useState(null)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [pdfDownloaded, setPdfDownloaded] = useState(false)
  const [checkingVisitor, setCheckingVisitor] = useState(true)
  
  // Guest registration form
  const [guestForm, setGuestForm] = useState({
    firstName: '',
    lastName: '',
    gender: 'homme',
    relation: '',
    ticketType: 'single',
    spouseFirstName: '',
    spouseLastName: '',
    spouseGender: 'femme'
  })
  
  // Stored visitor data for PDF generation
  const [storedVisitorData, setStoredVisitorData] = useState(null)
  
  const [reserveForm, setReserveForm] = useState({
    guestName: '',
    message: '',
    isAnonymous: false,
    quantity: 1
  })
  const [submitting, setSubmitting] = useState(false)
  
  // Money/Shared contribution state
  const [showContributeModal, setShowContributeModal] = useState(null)
  const [contributeForm, setContributeForm] = useState({
    amount: '',
    guestName: '',
    message: '',
    isAnonymous: false
  })
  const [existingContribution, setExistingContribution] = useState(null)
  const [expandedDescriptions, setExpandedDescriptions] = useState({})

  // Current visitor's browser fingerprint — used so an anonymous reserver can still
  // see their own name (only them and the organizer), while others see "anonyme".
  const myFingerprint = useMemo(() => generateFingerprint(), [])

  // Check if visitor already registered (using localStorage as primary, Firestore as fallback)
  useEffect(() => {
    const checkExistingVisitor = async () => {
      if (!id) return
      
      try {
        const storageKey = `hugoquiz_visitor_${id}`
        const storedData = localStorage.getItem(storageKey)
        
        // Primary: Trust localStorage if it exists for this event
        // Must have version flag (v2+) to ensure it's not from the buggy fingerprint era
        if (storedData) {
          try {
            const parsed = JSON.parse(storedData)
            // Check if we have valid data with version flag (v2 = fixed fingerprint)
            if (parsed.firstName && parsed.lastName && parsed.version >= 2) {
              // Visitor already passed phase 1
              setVisitorName(`${parsed.firstName} ${parsed.lastName}`)
              setVisitorId(parsed.visitorId)
              setReserveForm(prev => ({ ...prev, guestName: `${parsed.firstName} ${parsed.lastName}` }))
              setStoredVisitorData(parsed)
              // Skip to phase 2 after event loads
              setPhase(0) // Temporary, will be set properly after event loads
              setCheckingVisitor(false)
              return // Exit early, don't check Firestore
            } else if (!parsed.version) {
              // Old data from before the fix - clear it so user re-registers
              // This fixes the bug where users were identified as someone else
              console.log('Clearing old visitor data (pre-fix) for event:', id)
              localStorage.removeItem(storageKey)
            }
          } catch (parseErr) {
            console.warn('Invalid localStorage data, will check Firestore:', parseErr)
            localStorage.removeItem(storageKey)
          }
        }
        
        // Fallback: Check Firestore using fingerprint in case localStorage was cleared
        // Only trust this if the browser has the persistent UID that was used to create the fingerprint
        const persistentUid = localStorage.getItem('hugoquiz_browser_uid')
        if (persistentUid) {
          const fingerprint = generateFingerprint()
          const existingPending = await getPendingGuestByFingerprint(id, fingerprint)
          if (existingPending && existingPending.status !== 'rejected') {
            const fullName = `${existingPending.firstName} ${existingPending.lastName}`
            setVisitorName(fullName)
            setVisitorId(existingPending.id)
            setReserveForm(prev => ({ ...prev, guestName: fullName }))
            // Store full data in localStorage for future visits
            const visitorData = {
              version: 2,
              fingerprint,
              firstName: existingPending.firstName,
              lastName: existingPending.lastName,
              gender: existingPending.gender,
              ticketType: existingPending.ticketType,
              spouseFirstName: existingPending.spouseFirstName || '',
              spouseLastName: existingPending.spouseLastName || '',
              spouseGender: existingPending.spouseGender || '',
              visitorId: existingPending.id
            }
            localStorage.setItem(storageKey, JSON.stringify(visitorData))
            setStoredVisitorData(visitorData)
            setPhase(0) // Temporary, will be set properly after event loads
          }
        }
      } catch (err) {
        console.error('Error checking existing visitor:', err)
      } finally {
        setCheckingVisitor(false)
      }
    }
    
    checkExistingVisitor()
  }, [id])

  useEffect(() => {
    // Wait for visitor check to complete before loading event
    if (!checkingVisitor) {
      loadEvent()
    }
  }, [id, checkingVisitor])

  const loadEvent = async () => {
    try {
      const eventData = await getEventById(id)
      if (!eventData) {
        setError(t('events.view.notFound'))
        return
      }
      setEvent(eventData)
      
      const giftsData = await getGiftsByEvent(id)
      const giftsWithSelections = await Promise.all(
        giftsData.map(async (gift) => {
          const selections = await getGiftSelectionsByGift(gift.id)
          return { ...gift, selections }
        })
      )
      setGifts(giftsWithSelections)
      
      // Check if event has story/invitation - skip Phase 2 if nothing configured
      const hasPhase2Content = eventData.story || eventData.invitationImageUrl || 
                               eventData.invitationLetter || (eventData.galleryPhotos?.length > 0)
      
      // Store this for later use and set phase for returning visitors
      setEvent(prev => ({ ...prev, hasPhase2Content }))
      
      // If visitor already passed phase 1 (phase === 0), set correct phase
      setPhase(currentPhase => {
        if (currentPhase === 0) {
          return hasPhase2Content ? 2 : 3
        }
        return currentPhase
      })
    } catch (err) {
      console.error('Erreur chargement événement:', err)
      setError(t('events.view.loadError'))
    } finally {
      setLoading(false)
    }
  }

  // Handle guest registration (new Phase 1 form)
  const handleGuestRegistration = async () => {
    // Validation
    if (!guestForm.firstName.trim() || !guestForm.lastName.trim()) {
      setError(t('events.view.fillNameRequired'))
      return
    }
    
    if (!guestForm.relation) {
      setError(t('events.view.selectRelation'))
      return
    }
    
    if (guestForm.ticketType === 'couple' && (!guestForm.spouseFirstName.trim() || !guestForm.spouseLastName.trim())) {
      setError(t('events.view.fillSpouseRequired'))
      return
    }
    
    setError('')
    setSubmitting(true)
    
    try {
      const fingerprint = generateFingerprint()
      const fullName = `${guestForm.firstName.trim()} ${guestForm.lastName.trim()}`
      
      // Create pending guest record
      const pendingData = {
        eventId: id,
        firstName: guestForm.firstName.trim(),
        lastName: guestForm.lastName.trim(),
        gender: guestForm.gender,
        relation: guestForm.relation,
        ticketType: guestForm.ticketType,
        fingerprint
      }
      
      if (guestForm.ticketType === 'couple') {
        pendingData.spouseFirstName = guestForm.spouseFirstName.trim()
        pendingData.spouseLastName = guestForm.spouseLastName.trim()
        pendingData.spouseGender = guestForm.spouseGender
      }
      
      const pendingId = await createPendingGuest(pendingData)
      
      // Also create event visitor record for tracking
      const vId = await createEventVisitor({
        eventId: id,
        fullName
      })
      
      setVisitorId(vId)
      setVisitorName(fullName)
      setReserveForm(prev => ({ ...prev, guestName: fullName }))
      
      // Store full data in localStorage for future visits
      const storageKey = `hugoquiz_visitor_${id}`
      const visitorData = {
        version: 2,
        fingerprint,
        firstName: guestForm.firstName.trim(),
        lastName: guestForm.lastName.trim(),
        gender: guestForm.gender,
        ticketType: guestForm.ticketType,
        spouseFirstName: guestForm.ticketType === 'couple' ? guestForm.spouseFirstName.trim() : '',
        spouseLastName: guestForm.ticketType === 'couple' ? guestForm.spouseLastName.trim() : '',
        spouseGender: guestForm.ticketType === 'couple' ? guestForm.spouseGender : '',
        visitorId: pendingId
      }
      localStorage.setItem(storageKey, JSON.stringify(visitorData))
      setStoredVisitorData(visitorData)
      
      // Navigate to next phase
      const hasPhase2Content = event?.story || event?.invitationImageUrl || 
                               event?.invitationLetter || (event?.galleryPhotos?.length > 0)
      
      if (hasPhase2Content) {
        setPhase(2)
      } else {
        setPhase(3)
      }
      
      // Show confetti
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 3000)
    } catch (err) {
      console.error('Erreur inscription invité:', err)
      setError(t('events.view.registrationError'))
    } finally {
      setSubmitting(false)
    }
  }
  
  // Update spouse gender when main guest gender changes
  const handleGenderChange = (gender) => {
    const oppositeGender = gender === 'homme' ? 'femme' : 'homme'
    setGuestForm(prev => ({
      ...prev,
      gender,
      spouseGender: oppositeGender
    }))
  }

  const generatePdf = useCallback(async () => {
    if (!event) return
    
    setGeneratingPdf(true)
    
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      })
      
      const pageWidth = 210
      const pageHeight = 297
      const margin = 20
      
      // Target max image size ~1.5MB to ensure PDF stays under 2MB
      const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024
      
      // Helper function to estimate base64 size in bytes
      const getBase64Size = (dataUrl) => {
        const base64 = dataUrl.split(',')[1]
        return Math.ceil(base64.length * 3 / 4)
      }
      
      // Load image keeping original dimensions, compress to 85% only if needed
      const loadImageAsBase64 = async (url) => {
        return new Promise((resolve, reject) => {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          
          img.onload = () => {
            try {
              // Keep original dimensions
              const canvas = document.createElement('canvas')
              canvas.width = img.naturalWidth
              canvas.height = img.naturalHeight
              const ctx = canvas.getContext('2d')
              ctx.drawImage(img, 0, 0)
              
              // Try 100% quality first
              let dataUrl = canvas.toDataURL('image/jpeg', 1.0)
              let imageSize = getBase64Size(dataUrl)
              
              if (imageSize <= MAX_IMAGE_BYTES) {
                console.log(`Image at 100%: ${img.naturalWidth}x${img.naturalHeight}, ${(imageSize / 1024).toFixed(0)}KB`)
                resolve({ dataUrl, width: img.naturalWidth, height: img.naturalHeight })
                return
              }
              
              // If too large, compress to 85%
              dataUrl = canvas.toDataURL('image/jpeg', 0.85)
              imageSize = getBase64Size(dataUrl)
              console.log(`Image at 85%: ${img.naturalWidth}x${img.naturalHeight}, ${(imageSize / 1024).toFixed(0)}KB`)
              resolve({ dataUrl, width: img.naturalWidth, height: img.naturalHeight })
            } catch (e) {
              reject(e)
            }
          }
          
          img.onerror = () => reject(new Error('Failed to load image'))
          img.src = url
        })
      }
      
      // Page 1: Invitation Image
      if (event.invitationImageUrl) {
        try {
          const { dataUrl, width, height } = await loadImageAsBase64(event.invitationImageUrl)
          console.log('Image loaded successfully, dimensions:', width, 'x', height)
          
          // Calculate dimensions to fit page
          const imgRatio = width / height
          const pageRatio = pageWidth / pageHeight
          
          let imgWidth, imgHeight, x, y
          
          if (imgRatio > pageRatio) {
            imgWidth = pageWidth
            imgHeight = pageWidth / imgRatio
            x = 0
            y = (pageHeight - imgHeight) / 2
          } else {
            imgHeight = pageHeight
            imgWidth = pageHeight * imgRatio
            x = (pageWidth - imgWidth) / 2
            y = 0
          }
          
          doc.addImage(dataUrl, 'JPEG', x, y, imgWidth, imgHeight, undefined, 'FAST')
        } catch (imgError) {
          console.error('Error loading invitation image:', imgError)
          // Draw placeholder
          doc.setFillColor(255, 240, 245)
          doc.rect(0, 0, pageWidth, pageHeight, 'F')
          doc.setFontSize(24)
          doc.setTextColor(236, 72, 153)
          doc.text('Invitation', pageWidth / 2, pageHeight / 2, { align: 'center' })
        }
      } else {
        // No invitation image - create a nice title page
        doc.setFillColor(255, 240, 245)
        doc.rect(0, 0, pageWidth, pageHeight, 'F')
        
        const eventType = EVENT_TYPES[event.type] || EVENT_TYPES.autre
        
        doc.setFontSize(40)
        doc.setTextColor(236, 72, 153)
        doc.text(eventType.emoji, pageWidth / 2, 80, { align: 'center' })
        
        doc.setFontSize(32)
        doc.setTextColor(80, 80, 80)
        const titleLines = doc.splitTextToSize(event.name, pageWidth - 40)
        doc.text(titleLines, pageWidth / 2, 110, { align: 'center' })
        
        if (event.date) {
          doc.setFontSize(18)
          doc.setTextColor(120, 120, 120)
          const dateStr = new Date(event.date).toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })
          doc.text(dateStr, pageWidth / 2, 140, { align: 'center' })
        }
      }
      
      // Page 2: Personalized Letter
      if (event.invitationLetter) {
        doc.addPage()
        
        // Elegant background
        doc.setFillColor(255, 252, 250)
        doc.rect(0, 0, pageWidth, pageHeight, 'F')
        
        // Decorative border
        doc.setDrawColor(236, 72, 153)
        doc.setLineWidth(0.5)
        doc.rect(margin / 2, margin / 2, pageWidth - margin, pageHeight - margin)
        
        // Personalized greeting
        let yPos = margin + 20
        
        doc.setFontSize(22)
        doc.setTextColor(236, 72, 153)
        
        // Generate personalized greeting based on ticket type
        let greetingText = `Très cher(e) ${visitorName},`
        if (storedVisitorData) {
          if (storedVisitorData.ticketType === 'couple' && storedVisitorData.spouseFirstName) {
            // For couple: "Très chers [prénom femme] & [prénom homme],"
            const femaleFirst = storedVisitorData.gender === 'femme' 
              ? storedVisitorData.firstName 
              : storedVisitorData.spouseFirstName
            const maleFirst = storedVisitorData.gender === 'homme' 
              ? storedVisitorData.firstName 
              : storedVisitorData.spouseFirstName
            greetingText = `Très chers ${femaleFirst} & ${maleFirst},`
          } else {
            // For single: "Très cher(e) [prénom],"
            const isFemale = storedVisitorData.gender === 'femme'
            greetingText = `Très ${isFemale ? 'chère' : 'cher'} ${storedVisitorData.firstName},`
          }
        }
        doc.text(greetingText, margin + 5, yPos)
        
        yPos += 20
        
        // Letter content
        doc.setFontSize(12)
        doc.setTextColor(60, 60, 60)
        
        const letterLines = doc.splitTextToSize(event.invitationLetter, pageWidth - margin * 2 - 10)
        
        letterLines.forEach(line => {
          if (yPos > pageHeight - margin - 20) {
            doc.addPage()
            doc.setFillColor(255, 252, 250)
            doc.rect(0, 0, pageWidth, pageHeight, 'F')
            doc.setDrawColor(236, 72, 153)
            doc.setLineWidth(0.5)
            doc.rect(margin / 2, margin / 2, pageWidth - margin, pageHeight - margin)
            yPos = margin + 10
          }
          doc.text(line, margin + 5, yPos)
          yPos += 7
        })
        
        // Footer with hearts
        doc.setFontSize(14)
        doc.setTextColor(236, 72, 153)
        doc.text('💝', pageWidth / 2, pageHeight - margin, { align: 'center' })
      }
      
      // Save PDF
      const fileName = `invitation-${event.name.replace(/[^a-zA-Z0-9]/g, '-')}-${visitorName.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`
      doc.save(fileName)
      
      setPdfDownloaded(true)
      
      // Update visitor record
      if (visitorId) {
        await updateEventVisitor(visitorId, { pdfGenerated: true })
      }
      
      setSuccess(t('events.view.pdfDownloaded'))
      setTimeout(() => setSuccess(''), 5000)
    } catch (err) {
      console.error('Erreur génération PDF:', err)
      setError(t('events.view.pdfError'))
    } finally {
      setGeneratingPdf(false)
    }
  }, [event, visitorName, visitorId])

  const handleReserve = async (gift) => {
    if (!reserveForm.guestName.trim()) {
      setError(t('events.view.enterYourName'))
      return
    }

    // Validate quantity
    const quantity = Math.max(1, parseInt(reserveForm.quantity) || 1)
    const currentTotal = (gift.selections || []).reduce((sum, sel) => sum + (sel.quantity || 1), 0)
    const maxSel = gift.maxSelections || 0
    const remaining = maxSel > 0 ? maxSel - currentTotal : Infinity
    
    if (gift.allowMultiple && maxSel > 0 && quantity > remaining) {
      setError(t('events.view.onlyRemainingReservations', { count: remaining }))
      return
    }

    setSubmitting(true)
    setError('')

    try {
      await createGiftSelection({
        giftId: gift.id,
        eventId: id,
        guestName: reserveForm.guestName.trim(),
        message: reserveForm.message.trim() || null,
        isAnonymous: reserveForm.isAnonymous,
        quantity: gift.allowMultiple ? quantity : 1,
        fingerprint: generateFingerprint()
      })
      
      setShowReserveModal(null)
      setReserveForm(prev => ({ ...prev, message: '', isAnonymous: false, quantity: 1 }))
      
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 3000)
      
      setSuccess(t('events.view.reservationSuccess', { name: reserveForm.guestName }))
      setTimeout(() => setSuccess(''), 6000)
      
      await loadEvent()
    } catch (err) {
      console.error('Erreur réservation:', err)
      setError(t('events.view.reservationError'))
    } finally {
      setSubmitting(false)
    }
  }

  // Open contribution modal for money/shared gifts
  const openContributeModal = async (gift) => {
    setContributeForm({
      amount: '',
      guestName: visitorName || '',
      message: '',
      isAnonymous: false
    })
    setExistingContribution(null)
    
    // Check if this guest already contributed (by fingerprint)
    try {
      const fingerprint = generateFingerprint()
      const existing = await getGiftSelectionsByGuestFingerprint(gift.id, fingerprint)
      if (existing) {
        setExistingContribution(existing)
        setContributeForm({
          amount: existing.amount?.toString() || '',
          guestName: existing.guestName || visitorName || '',
          message: existing.message || '',
          isAnonymous: existing.isAnonymous || false
        })
      }
    } catch (err) {
      console.error('Error checking existing contribution:', err)
    }
    
    setShowContributeModal(gift)
  }

  // Handle money/shared contribution
  const handleContribute = async (gift) => {
    const amount = parseFloat(contributeForm.amount)
    if (!amount || amount <= 0) {
      setError(t('events.gifts.enterValidAmount'))
      return
    }
    if (!contributeForm.guestName.trim()) {
      setError(t('events.view.enterYourName'))
      return
    }

    // For shared gifts, check if target would be exceeded
    if (gift.giftType === 'shared' && gift.targetAmount) {
      const currentTotal = (gift.selections || []).reduce((sum, sel) => sum + (sel.amount || 0), 0)
      const existingAmount = existingContribution?.amount || 0
      const netNew = amount - existingAmount
      if (currentTotal + netNew > parseFloat(gift.targetAmount)) {
        const maxAllowed = parseFloat(gift.targetAmount) - currentTotal + existingAmount
        setError(t('events.gifts.remainingAmount') + `: ${maxAllowed.toFixed(2)}€`)
        return
      }
    }

    setSubmitting(true)
    setError('')

    try {
      const fingerprint = generateFingerprint()
      
      if (existingContribution) {
        // Update existing contribution
        await updateGiftSelection(existingContribution.id, {
          amount,
          guestName: contributeForm.guestName.trim(),
          message: contributeForm.message.trim() || null,
          isAnonymous: contributeForm.isAnonymous
        })
        setSuccess(t('events.gifts.contributionUpdated'))
      } else {
        // Create new contribution
        await createGiftSelection({
          giftId: gift.id,
          eventId: id,
          guestName: contributeForm.guestName.trim(),
          message: contributeForm.message.trim() || null,
          isAnonymous: contributeForm.isAnonymous,
          quantity: 1,
          amount,
          fingerprint
        })
        setSuccess(t('events.gifts.contributionSuccess'))
      }

      setShowContributeModal(null)
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 3000)
      setTimeout(() => setSuccess(''), 6000)
      
      await loadEvent()
    } catch (err) {
      console.error('Erreur contribution:', err)
      setError(t('events.view.reservationError'))
    } finally {
      setSubmitting(false)
    }
  }

  const shareEvent = async () => {
    const url = window.location.href
    const title = event?.name || 'Événement'
    
    if (navigator.share) {
      try {
        await navigator.share({ title, url })
      } catch (err) {}
    } else {
      navigator.clipboard.writeText(url)
      setSuccess(t('events.view.linkCopied'))
      setTimeout(() => setSuccess(''), 3000)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return null
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', { 
      weekday: 'long',
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce-in">🎁</div>
          <LoadingSpinner />
          <p className="mt-4 text-white/80">{t('events.view.loadingEvent')}</p>
        </div>
      </div>
    )
  }

  if (error && !event) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center max-w-md">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('events.view.oops')}</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link to="/" className="btn btn-primary inline-flex items-center gap-2">
            {t('events.view.backToHome')}
          </Link>
        </div>
      </div>
    )
  }

  const eventType = EVENT_TYPES[event?.type] || EVENT_TYPES.autre
  const reservedGifts = gifts.filter(g => {
    const totalQuantity = (g.selections || []).reduce((sum, sel) => sum + (sel.quantity || 1), 0)
    if (g.allowMultiple) {
      return g.maxSelections > 0 && totalQuantity >= g.maxSelections
    }
    return totalQuantity > 0
  }).length

  // ================================
  // PHASE 1: Guest Registration Form
  // ================================
  if (phase === 1) {
    // Show loading while checking existing visitor
    if (checkingVisitor) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4 animate-bounce-in">🎁</div>
            <LoadingSpinner />
            <p className="mt-4 text-white/80">{t('events.view.loadingEvent')}</p>
          </div>
        </div>
      )
    }
    
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4">
        <FloatingDecorations />
        <Confetti show={showConfetti} />
        
        <div className="max-w-lg w-full relative z-10">
          {/* Event Header Card */}
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden animate-slide-up mb-6">
            {event.imageUrl ? (
              <div className="relative h-48">
                <img 
                  src={event.imageUrl} 
                  alt={event.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{eventType.emoji}</span>
                    <span className="text-sm bg-white/20 px-2 py-1 rounded-full">{t(eventType.labelKey)}</span>
                  </div>
                  <h1 className="text-2xl font-bold">{event.name}</h1>
                </div>
              </div>
            ) : (
              <div className={`relative bg-gradient-to-br ${eventType.gradient} p-8 text-white`}>
                <div className="absolute top-4 right-4 text-5xl opacity-20">{eventType.emoji}</div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-3xl">{eventType.emoji}</span>
                  <span className="text-sm bg-white/20 px-3 py-1 rounded-full">{t(eventType.labelKey)}</span>
                </div>
                <h1 className="text-3xl font-bold">{event.name}</h1>
                {event.date && (
                  <p className="mt-2 text-white/80 flex items-center gap-2">
                    <FiCalendar className="w-4 h-4" />
                    {formatDate(event.date)}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Guest Registration Form */}
          <div className="bg-white rounded-3xl shadow-2xl p-8 animate-slide-up stagger-1">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <FiUser className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">{t('events.view.welcome')} 🎉</h2>
              <p className="text-gray-600 mt-2">{t('events.view.registerToAccess')}</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* First Name & Last Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('events.view.firstName')} *
                  </label>
                  <input
                    type="text"
                    value={guestForm.firstName}
                    onChange={(e) => setGuestForm(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder={t('events.view.firstNamePlaceholder')}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('events.view.lastName')} *
                  </label>
                  <input
                    type="text"
                    value={guestForm.lastName}
                    onChange={(e) => setGuestForm(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder={t('events.view.lastNamePlaceholder')}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all"
                  />
                </div>
              </div>
              
              {/* Gender */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('events.view.gender')} *
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      value="homme"
                      checked={guestForm.gender === 'homme'}
                      onChange={() => handleGenderChange('homme')}
                      className="w-4 h-4 text-pink-500 focus:ring-pink-500"
                    />
                    <span className="text-gray-700">{t('events.view.male')} 👨</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      value="femme"
                      checked={guestForm.gender === 'femme'}
                      onChange={() => handleGenderChange('femme')}
                      className="w-4 h-4 text-pink-500 focus:ring-pink-500"
                    />
                    <span className="text-gray-700">{t('events.view.female')} 👩</span>
                  </label>
                </div>
              </div>
              
              {/* Relation */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('events.view.relationWithOrganizer')} *
                </label>
                <div className="relative">
                  <select
                    value={guestForm.relation}
                    onChange={(e) => setGuestForm(prev => ({ ...prev, relation: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all appearance-none bg-white"
                  >
                    <option value="">{t('guests.selectRelation')}</option>
                    {RELATION_KEYS.map(key => (
                      <option key={key} value={key}>{t(`relations.${key}`)}</option>
                    ))}
                  </select>
                  <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
              
              {/* Invitation Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('events.view.invitationType')} *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setGuestForm(prev => ({ ...prev, ticketType: 'single' }))}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      guestForm.ticketType === 'single' 
                        ? 'border-pink-500 bg-pink-50 text-pink-700' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <FiUser className="w-6 h-6" />
                    <span className="font-medium">{t('events.view.singleInvitation')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGuestForm(prev => ({ ...prev, ticketType: 'couple' }))}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      guestForm.ticketType === 'couple' 
                        ? 'border-pink-500 bg-pink-50 text-pink-700' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <FiHeart className="w-6 h-6" />
                    <span className="font-medium">{t('events.view.coupleInvitation')}</span>
                  </button>
                </div>
              </div>
              
              {/* Spouse Information (if couple) */}
              {guestForm.ticketType === 'couple' && (
                <div className="p-4 bg-pink-50 rounded-xl border border-pink-200 space-y-4 animate-fadeIn">
                  <h3 className="font-semibold text-pink-800 flex items-center gap-2">
                    <FiHeart className="w-4 h-4" />
                    {t('events.view.spouseInfo')}
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('events.view.spouseFirstName')} *
                      </label>
                      <input
                        type="text"
                        value={guestForm.spouseFirstName}
                        onChange={(e) => setGuestForm(prev => ({ ...prev, spouseFirstName: e.target.value }))}
                        placeholder={t('events.view.firstNamePlaceholder')}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('events.view.spouseLastName')} *
                      </label>
                      <input
                        type="text"
                        value={guestForm.spouseLastName}
                        onChange={(e) => setGuestForm(prev => ({ ...prev, spouseLastName: e.target.value }))}
                        placeholder={t('events.view.lastNamePlaceholder')}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all"
                      />
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 flex items-center gap-2">
                    <span>{t('events.view.spouseGender')}:</span>
                    <span className="font-medium">
                      {guestForm.spouseGender === 'homme' ? `${t('events.view.male')} 👨` : `${t('events.view.female')} 👩`}
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={handleGuestRegistration}
                disabled={submitting}
                className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 flex items-center justify-center gap-2 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <LoadingSpinner size="small" />
                    {t('common.loading')}
                  </>
                ) : (
                  <>
                    {t('common.continue')}
                    <FiArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ================================
  // PHASE 2: Story + Invitation + Montage
  // ================================
  if (phase === 2) {
    const validPhotos = (event.galleryPhotos || []).filter(p => p && p.trim())
    const showTicket = event.showInvitationTicket !== false
    
    return (
      <Phase2Content 
        event={event}
        visitorName={visitorName}
        validPhotos={validPhotos}
        showTicket={showTicket}
        success={success}
        error={error}
        showConfetti={showConfetti}
        generatingPdf={generatingPdf}
        pdfDownloaded={pdfDownloaded}
        generatePdf={generatePdf}
        setPhase={setPhase}
        t={t}
      />
    )
  }

  // ================================
  // PHASE 3: Gift List (Original)
  // ================================
  return (
    <div className="min-h-screen relative">
      <FloatingLanguageSelector position="top-right" />
      <Confetti show={showConfetti} />
      <FloatingDecorations />
      
      <div className="max-w-5xl mx-auto px-4 py-8 relative z-10">
        {/* Hero Section */}
        <div className="relative rounded-3xl overflow-hidden mb-8 shadow-2xl animate-slide-up">
          {event.imageUrl ? (
            <div className="relative h-72 md:h-96">
              <img 
                src={event.imageUrl} 
                alt={event.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              <div className="absolute inset-0 pattern-confetti opacity-50" />
              
              <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md rounded-full text-sm font-medium">
                    <span className="text-xl">{eventType.emoji}</span>
                    {t(eventType.labelKey)}
                  </span>
                  {event.date && (
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md rounded-full text-sm">
                      <FiCalendar className="w-4 h-4" />
                      {formatDate(event.date)}
                    </span>
                  )}
                </div>
                <h1 className="text-4xl md:text-5xl font-bold mb-2 drop-shadow-lg">{event.name}</h1>
                {visitorName && (
                  <p className="text-white/90 text-lg">
                    {t('events.view.welcomeName', { name: visitorName })} 🎉
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className={`relative bg-gradient-to-br ${eventType.gradient} p-8 md:p-12 text-white overflow-hidden`}>
              <div className="absolute inset-0 pattern-confetti opacity-30" />
              <div className="relative z-10">
                <div className="flex flex-wrap items-center gap-3 mb-6">
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md rounded-full text-sm font-medium">
                    <span className="text-2xl">{eventType.emoji}</span>
                    {t(eventType.labelKey)}
                  </span>
                  {event.date && (
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md rounded-full text-sm">
                      <FiCalendar className="w-4 h-4" />
                      {formatDate(event.date)}
                    </span>
                  )}
                </div>
                <h1 className="text-4xl md:text-5xl font-bold drop-shadow-lg">{event.name}</h1>
                {visitorName && (
                  <p className="text-white/90 text-lg mt-2">
                    {t('events.view.welcomeName', { name: visitorName })} 🎉
                  </p>
                )}
              </div>
              <div className="absolute top-4 right-4 text-6xl opacity-20 animate-float">🎁</div>
            </div>
          )}
        </div>

        {/* Messages */}
        {success && (
          <div className="mb-6 p-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl text-white shadow-lg animate-bounce-in flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <FiCheck className="w-6 h-6" />
            </div>
            <p className="font-medium">{success}</p>
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-500 rounded-2xl text-white shadow-lg animate-slide-up">
            {error}
          </div>
        )}

        {/* Stats Card */}
        <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 mb-8 animate-slide-up stagger-1">
          <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
            <div className="flex gap-6">
              <div className="text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl flex items-center justify-center text-white mb-2 shadow-lg">
                  <FiGift className="w-6 h-6" />
                </div>
                <p className="text-2xl font-bold text-gray-800">{gifts.length}</p>
                <p className="text-xs text-gray-500">{t('events.gifts.gifts')}</p>
              </div>
              <div className="text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center text-white mb-2 shadow-lg">
                  <FiCheck className="w-6 h-6" />
                </div>
                <p className="text-2xl font-bold text-gray-800">{reservedGifts}</p>
                <p className="text-xs text-gray-500">{t('events.gifts.reserved')}</p>
              </div>
            </div>
            
            <button
              onClick={shareEvent}
              className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-full font-medium shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
            >
              <FiShare2 className="w-5 h-5" />
              {t('common.share')}
            </button>
          </div>
          
          {event.description && (
            <div className="p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl border border-pink-100">
              <p className="text-gray-700 whitespace-pre-line leading-relaxed">{event.description}</p>
            </div>
          )}
        </div>

        {/* Gift List Title */}
        <div className="flex items-center gap-4 mb-6 animate-slide-up stagger-2">
          <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
            <FiGift className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">{t('events.gifts.title')}</h2>
            <p className="text-white/70">{t('events.view.chooseGiftToOffer')}</p>
          </div>
        </div>

        {/* Gift Grid */}
        {gifts.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {gifts.map((gift, index) => {
              const giftType = gift.giftType || 'article'
              const totalQuantity = (gift.selections || []).reduce((sum, sel) => sum + (sel.quantity || 1), 0)
              const totalContributed = (gift.selections || []).reduce((sum, sel) => sum + (sel.amount || 0), 0)
              const maxSel = gift.maxSelections || 0
              const remaining = maxSel > 0 ? maxSel - totalQuantity : Infinity
              const targetAmount = parseFloat(gift.targetAmount) || 0
              const progressPercent = targetAmount > 0 ? Math.min(100, (totalContributed / targetAmount) * 100) : 0
              const isSharedComplete = giftType === 'shared' && targetAmount > 0 && totalContributed >= targetAmount
              const contributorsCount = (gift.selections || []).length

              // Article type: reserved logic
              const isFullyReserved = giftType === 'article' && (gift.allowMultiple 
                ? (maxSel > 0 && totalQuantity >= maxSel)
                : totalQuantity > 0)
              const canReserve = giftType === 'article' && (gift.allowMultiple 
                ? (maxSel === 0 || totalQuantity < maxSel)
                : totalQuantity === 0)

              return (
                <div 
                  key={gift.id}
                  className="card-gift animate-slide-up group"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* Ribbon for article reserved or shared complete */}
                  {(isFullyReserved || isSharedComplete) && (
                    <div className="ribbon">
                      <FiCheck className="inline w-3 h-3 mr-1" />
                      {isSharedComplete ? t('events.gifts.goalReached') : t('events.gifts.reserved')}
                    </div>
                  )}

                  {/* Gift type badge */}
                  {giftType !== 'article' && (
                    <div className="absolute top-4 right-4 z-10">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg ${
                        giftType === 'money' 
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-500' 
                          : 'bg-gradient-to-r from-teal-500 to-cyan-500'
                      }`}>
                        {giftType === 'money' ? '💰' : '🤝'}
                        {giftType === 'money' ? t('events.gifts.typeMoney') : t('events.gifts.typeShared')}
                      </span>
                    </div>
                  )}
                  
                  {gift.imageUrl ? (
                    <div className="relative h-52 overflow-hidden">
                      <img 
                        src={gift.imageUrl} 
                        alt={gift.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        onError={(e) => e.target.parentElement.style.display = 'none'}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                      {giftType === 'article' && gift.price && (
                        <div className="absolute top-4 left-4 gift-price">{gift.price}€</div>
                      )}
                      {giftType === 'shared' && targetAmount > 0 && (
                        <div className="absolute top-4 left-4 gift-price">{targetAmount}€</div>
                      )}
                    </div>
                  ) : (
                    <div className={`h-40 flex items-center justify-center ${
                      giftType === 'money' 
                        ? 'bg-gradient-to-br from-amber-50 to-yellow-100' 
                        : giftType === 'shared'
                        ? 'bg-gradient-to-br from-teal-50 to-cyan-100'
                        : 'bg-gradient-to-br from-pink-100 to-purple-100'
                    }`}>
                      <div className="text-6xl animate-float">
                        {giftType === 'money' ? '💰' : giftType === 'shared' ? '🤝' : '🎁'}
                      </div>
                    </div>
                  )}
                  
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h3 className="font-bold text-lg text-gray-800 group-hover:text-pink-600 transition-colors">
                        {gift.name}
                      </h3>
                      {giftType === 'article' && !gift.imageUrl && gift.price && (
                        <span className="gift-price text-sm">{gift.price}€</span>
                      )}
                      {giftType === 'shared' && !gift.imageUrl && targetAmount > 0 && (
                        <span className="gift-price text-sm">{targetAmount}€</span>
                      )}
                    </div>
                    
                    {gift.description && (
                      <div className="mb-4">
                        <p className={`text-sm text-gray-600 whitespace-pre-line ${expandedDescriptions[gift.id] ? '' : 'line-clamp-2'}`}>
                          {gift.description}
                        </p>
                        {gift.description.length > 80 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setExpandedDescriptions(prev => ({ ...prev, [gift.id]: !prev[gift.id] }))
                            }}
                            className="text-xs text-pink-500 hover:text-pink-600 font-medium mt-1 transition-colors"
                          >
                            {expandedDescriptions[gift.id] ? t('common.showLess', 'Voir moins') : t('common.showMore', 'Voir plus')}
                          </button>
                        )}
                      </div>
                    )}

                    {gift.notes && (
                      <div className="mb-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
                        <p className="text-xs text-amber-700 flex items-start gap-2">
                          <span className="text-base">💡</span>
                          {gift.notes}
                        </p>
                      </div>
                    )}

                    {/* === SHARED GIFT: Progress bar === */}
                    {giftType === 'shared' && targetAmount > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-xs mb-2">
                          <span className="font-semibold text-gray-700">
                            {t('events.gifts.progressLabel')}
                          </span>
                          <span className={`font-bold ${isSharedComplete ? 'text-emerald-600' : 'text-pink-600'}`}>
                            {totalContributed.toFixed(0)}€ / {targetAmount}€
                          </span>
                        </div>
                        <div className="gift-progress-bar">
                          <div 
                            className={`gift-progress-fill ${isSharedComplete ? 'complete' : ''}`}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <FiUsers className="w-3 h-3" />
                            {t('events.gifts.contributorsCount', { count: contributorsCount })}
                          </span>
                          {!isSharedComplete && targetAmount - totalContributed > 0 && (
                            <span className="text-xs text-gray-500">
                              {t('events.gifts.remainingAmount')}: {(targetAmount - totalContributed).toFixed(0)}€
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* === MONEY GIFT: Contributor count (amounts private) === */}
                    {giftType === 'money' && contributorsCount > 0 && (
                      <div className="mb-4 p-3 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-100">
                        <p className="text-xs text-amber-700 font-medium flex items-center gap-2">
                          <FiUsers className="w-3 h-3" />
                          {t('events.gifts.contributorsCount', { count: contributorsCount })}
                        </p>
                        <p className="text-xs text-amber-500 mt-1 italic">
                          {t('events.gifts.privateContribution')}
                        </p>
                      </div>
                    )}

                    {/* === ARTICLE: Reserved by list === */}
                    {giftType === 'article' && totalQuantity > 0 && (
                      <div className="mb-4 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
                        <p className="text-xs text-emerald-600 font-medium mb-2 flex items-center gap-1">
                          <FiUsers className="w-3 h-3" />
                          {t('events.gifts.reservedBy')} :
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {(() => {
                            const isMine = (sel) => sel.isAnonymous && sel.fingerprint && sel.fingerprint === myFingerprint
                            const visibleSelections = gift.selections.filter(sel => !sel.isAnonymous || isMine(sel))
                            const anonymousSelections = gift.selections.filter(sel => sel.isAnonymous && !isMine(sel))
                            const anonymousTotal = anonymousSelections.reduce((sum, sel) => sum + (sel.quantity || 1), 0)
                            return (
                              <>
                                {visibleSelections.map(sel => {
                                  const qty = sel.quantity || 1
                                  const mine = isMine(sel)
                                  return (
                                    <span key={sel.id} className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${mine ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                      {qty > 1 ? `${qty}× ` : ''}{sel.guestName}{mine ? ` (${t('events.view.you')})` : ''}
                                    </span>
                                  )
                                })}
                                {anonymousTotal > 0 && (
                                  <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                                    {anonymousTotal > 1 ? `${anonymousTotal}× ` : ''}anonyme{anonymousSelections.length > 1 ? 's' : ''}
                                  </span>
                                )}
                              </>
                            )
                          })()}
                        </div>
                        {gift.selections.some(sel => sel.isAnonymous && sel.fingerprint && sel.fingerprint === myFingerprint) && (
                          <p className="text-[11px] text-purple-500 mt-2 flex items-center gap-1">
                            🔒 {t('events.view.anonymousSelfNote')}
                          </p>
                        )}
                      </div>
                    )}

                    {/* === SHARED: Non-anonymous contributor names === */}
                    {giftType === 'shared' && contributorsCount > 0 && (
                      <div className="mb-4 p-3 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl border border-teal-100">
                        <p className="text-xs text-teal-600 font-medium mb-2 flex items-center gap-1">
                          <FiUsers className="w-3 h-3" />
                          {t('events.gifts.reservedBy')} :
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {(() => {
                            const isMine = (sel) => sel.isAnonymous && sel.fingerprint && sel.fingerprint === myFingerprint
                            const visibleSelections = gift.selections.filter(sel => !sel.isAnonymous || isMine(sel))
                            const anonymousCount = gift.selections.filter(sel => sel.isAnonymous && !isMine(sel)).length
                            return (
                              <>
                                {visibleSelections.map(sel => {
                                  const mine = isMine(sel)
                                  return (
                                    <span key={sel.id} className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${mine ? 'bg-purple-100 text-purple-700' : 'bg-teal-100 text-teal-700'}`}>
                                      {sel.guestName}{mine ? ` (${t('events.view.you')})` : ''}
                                    </span>
                                  )
                                })}
                                {anonymousCount > 0 && (
                                  <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                                    {anonymousCount > 1 ? `${anonymousCount}× ` : ''}anonyme{anonymousCount > 1 ? 's' : ''}
                                  </span>
                                )}
                              </>
                            )
                          })()}
                        </div>
                        {gift.selections.some(sel => sel.isAnonymous && sel.fingerprint && sel.fingerprint === myFingerprint) && (
                          <p className="text-[11px] text-purple-500 mt-2 flex items-center gap-1">
                            🔒 {t('events.view.anonymousSelfNote')}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      {gift.externalUrl && giftType !== 'money' && (
                        <a
                          href={gift.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 px-4 py-2.5 text-sm text-gray-600 hover:text-gray-900 border-2 border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all flex items-center justify-center gap-2 font-medium"
                        >
                          <FiExternalLink className="w-4 h-4" />
                          {t('common.view')}
                        </a>
                      )}
                      
                      {/* ARTICLE type: Reserve button */}
                      {giftType === 'article' && (
                        canReserve ? (
                          <div className="flex-1 flex flex-col items-stretch">
                            <button
                              onClick={() => {
                                setReserveForm(prev => ({ ...prev, quantity: 1 }))
                                setShowReserveModal({ ...gift, remaining })
                              }}
                              className="btn-gift px-4 py-2.5 flex items-center justify-center gap-2"
                            >
                              <FiHeart className="w-4 h-4 animate-heart-beat" />
                              <span>{t('events.view.iOfferIt')}</span>
                            </button>
                            {gift.allowMultiple && maxSel > 0 && (
                              <p className="text-xs text-gray-500 text-center mt-1">
                                {t('events.gifts.reservationsPossible', { count: remaining })}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="flex-1 gift-reserved-badge justify-center">
                            <FiCheck className="w-4 h-4" />
                            {t('events.gifts.reserved')}
                          </div>
                        )
                      )}

                      {/* MONEY type: External link + Contribute button (always open) */}
                      {giftType === 'money' && (
                        <>
                          {gift.externalUrl && (
                            <a
                              href={gift.externalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-yellow-500 rounded-xl hover:from-amber-600 hover:to-yellow-600 transition-all flex items-center justify-center gap-2 shadow-lg"
                            >
                              <FiExternalLink className="w-4 h-4" />
                              {t('events.gifts.sendMoney')}
                            </a>
                          )}
                          <button
                            onClick={() => openContributeModal(gift)}
                            className="flex-1 btn-gift px-4 py-2.5 flex items-center justify-center gap-2 !from-amber-500 !via-yellow-500 !to-orange-400"
                          >
                            <FiDollarSign className="w-4 h-4" />
                            <span>{t('events.gifts.yourContribution')}</span>
                          </button>
                        </>
                      )}

                      {/* SHARED type: Contribute button (if not complete) */}
                      {giftType === 'shared' && (
                        isSharedComplete ? (
                          <div className="flex-1 gift-reserved-badge justify-center !bg-gradient-to-r !from-teal-500 !to-emerald-500">
                            <FiCheck className="w-4 h-4" />
                            {t('events.gifts.goalReached')}
                          </div>
                        ) : (
                          <button
                            onClick={() => openContributeModal(gift)}
                            className="flex-1 btn-gift px-4 py-2.5 flex items-center justify-center gap-2 !from-teal-500 !via-cyan-500 !to-blue-400"
                          >
                            <FiHeart className="w-4 h-4 animate-heart-beat" />
                            <span>{t('events.gifts.yourContribution')}</span>
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-xl p-12 text-center animate-slide-up">
            <div className="text-7xl mb-4">🎁</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">{t('events.view.listEmpty')}</h3>
            <p className="text-gray-500">{t('events.view.noGiftsYet')}</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-12 mt-8">
          <p className="text-white/60 text-sm flex items-center justify-center gap-2">
            {t('common.madeWith')} <FiHeart className="w-4 h-4 text-pink-400 animate-heart-beat" /> {t('events.view.on')} 
            <Link to="/" className="font-semibold text-white hover:text-pink-300 transition-colors">HugoQuiz</Link>
          </p>
        </div>
      </div>

      {/* Reservation Modal */}
      {showReserveModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-full p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-scale-in">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <FiGift className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">{t('events.view.reserveThisGift')}</h3>
              <p className="text-gray-500 mt-1">{showReserveModal.name}</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <FiUser className="inline mr-2 text-pink-500" />
                  {t('events.view.yourName')}
                </label>
                <input
                  type="text"
                  value={reserveForm.guestName}
                  onChange={(e) => setReserveForm(prev => ({ ...prev, guestName: e.target.value }))}
                  placeholder="Marie Dupont"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all"
                  autoFocus
                />
              </div>
              
              <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl border border-purple-100">
                <input
                  type="checkbox"
                  id="isAnonymous"
                  checked={reserveForm.isAnonymous}
                  onChange={(e) => setReserveForm(prev => ({ ...prev, isAnonymous: e.target.checked }))}
                  className="w-5 h-5 text-purple-500 border-gray-300 rounded focus:ring-purple-500"
                />
                <label htmlFor="isAnonymous" className="text-sm text-purple-700">
                  <span className="font-medium">{t('events.view.stayAnonymous')}</span>
                  <br />
                  <span className="text-xs text-purple-500">{t('events.view.onlyOrganizerSees')}</span>
                </label>
              </div>
              
              {/* Quantity selector - only show for multiple reservations */}
              {showReserveModal.allowMultiple && showReserveModal.maxSelections > 0 && (
                <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
                  <label className="block text-sm font-semibold text-amber-700 mb-3">
                    <FiGift className="inline mr-2" />
                    {t('events.view.howManyReserve')}
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center border-2 border-amber-300 rounded-xl overflow-hidden bg-white">
                      <button
                        type="button"
                        onClick={() => setReserveForm(prev => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }))}
                        className="px-4 py-2 text-amber-600 hover:bg-amber-50 transition-colors font-bold text-lg"
                        disabled={reserveForm.quantity <= 1}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min="1"
                        max={showReserveModal.remaining}
                        value={reserveForm.quantity}
                        onChange={(e) => {
                          const val = Math.max(1, Math.min(showReserveModal.remaining, parseInt(e.target.value) || 1))
                          setReserveForm(prev => ({ ...prev, quantity: val }))
                        }}
                        className="w-16 text-center py-2 border-0 font-bold text-lg text-amber-700 focus:ring-0"
                      />
                      <button
                        type="button"
                        onClick={() => setReserveForm(prev => ({ ...prev, quantity: Math.min(showReserveModal.remaining, prev.quantity + 1) }))}
                        className="px-4 py-2 text-amber-600 hover:bg-amber-50 transition-colors font-bold text-lg"
                        disabled={reserveForm.quantity >= showReserveModal.remaining}
                      >
                        +
                      </button>
                    </div>
                    <span className="text-sm text-amber-600">
                      {t('events.view.outOf')} {showReserveModal.remaining} {t('events.view.available')}
                    </span>
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <FiMessageSquare className="inline mr-2 text-pink-500" />
                  {t('events.view.messageOptional')}
                </label>
                <textarea
                  value={reserveForm.message}
                  onChange={(e) => setReserveForm(prev => ({ ...prev, message: e.target.value }))}
                  placeholder={t('events.view.messagePlaceholder')}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">{t('events.view.visibleToOrganizerOnly')}</p>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => { setShowReserveModal(null); setError('') }}
                className="flex-1 px-6 py-3 border-2 border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 font-medium transition-all"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => handleReserve(showReserveModal)}
                disabled={submitting}
                className="flex-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {t('events.view.reserving')}
                  </>
                ) : (
                  <>
                    <FiHeart className="w-5 h-5" />
                    {t('common.confirm')}
                  </>
                )}
              </button>
            </div>
          </div>
          </div>
        </div>
      )}

      {/* Contribution Modal (Money & Shared gifts) */}
      {showContributeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-full p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-scale-in">
            <div className="text-center mb-6">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg ${
                showContributeModal.giftType === 'money'
                  ? 'bg-gradient-to-br from-amber-500 to-yellow-500'
                  : 'bg-gradient-to-br from-teal-500 to-cyan-500'
              }`}>
                <FiDollarSign className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">
                {t('events.gifts.yourContribution')}
              </h3>
              <p className="text-gray-500 mt-1">{showContributeModal.name}</p>
              {existingContribution && (
                <p className="text-sm text-amber-600 mt-2 font-medium">
                  ✏️ {t('events.gifts.contributionUpdated').replace('!', '')} — {t('common.edit')}
                </p>
              )}
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Progress info for shared gifts */}
            {showContributeModal.giftType === 'shared' && parseFloat(showContributeModal.targetAmount) > 0 && (
              <div className="mb-5 p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl border border-teal-100">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="font-medium text-teal-700">{t('events.gifts.progressLabel')}</span>
                  <span className="font-bold text-teal-600">
                    {((showContributeModal.selections || []).reduce((s, sel) => s + (sel.amount || 0), 0)).toFixed(0)}€ / {parseFloat(showContributeModal.targetAmount)}€
                  </span>
                </div>
                <div className="gift-progress-bar">
                  <div 
                    className="gift-progress-fill"
                    style={{ 
                      width: `${Math.min(100, ((showContributeModal.selections || []).reduce((s, sel) => s + (sel.amount || 0), 0) / parseFloat(showContributeModal.targetAmount)) * 100)}%` 
                    }}
                  />
                </div>
                <p className="text-xs text-teal-500 mt-2">
                  {t('events.gifts.remainingAmount')}: {(parseFloat(showContributeModal.targetAmount) - (showContributeModal.selections || []).reduce((s, sel) => s + (sel.amount || 0), 0)).toFixed(0)}€
                </p>
              </div>
            )}

            <div className="space-y-4">
              {/* Amount input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <FiDollarSign className="inline mr-2 text-pink-500" />
                  {t('events.gifts.yourContribution')} (€)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={contributeForm.amount}
                    onChange={(e) => setContributeForm(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="50"
                    className="contribution-input"
                    autoFocus
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl text-gray-300 font-bold">€</span>
                </div>
                {/* Quick amount buttons */}
                <div className="flex gap-2 mt-3">
                  {[10, 25, 50, 100].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setContributeForm(prev => ({ ...prev, amount: amt.toString() }))}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all border-2 ${
                        contributeForm.amount === amt.toString()
                          ? 'border-pink-500 bg-pink-50 text-pink-600'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {amt}€
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <FiUser className="inline mr-2 text-pink-500" />
                  {t('events.view.yourName')}
                </label>
                <input
                  type="text"
                  value={contributeForm.guestName}
                  onChange={(e) => setContributeForm(prev => ({ ...prev, guestName: e.target.value }))}
                  placeholder="Marie Dupont"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all"
                />
              </div>
              
              <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl border border-purple-100">
                <input
                  type="checkbox"
                  id="contributeAnonymous"
                  checked={contributeForm.isAnonymous}
                  onChange={(e) => setContributeForm(prev => ({ ...prev, isAnonymous: e.target.checked }))}
                  className="w-5 h-5 text-purple-500 border-gray-300 rounded focus:ring-purple-500"
                />
                <label htmlFor="contributeAnonymous" className="text-sm text-purple-700">
                  <span className="font-medium">{t('events.view.stayAnonymous')}</span>
                  <br />
                  <span className="text-xs text-purple-500">{t('events.view.onlyOrganizerSees')}</span>
                </label>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <FiMessageSquare className="inline mr-2 text-pink-500" />
                  {t('events.view.messageOptional')}
                </label>
                <textarea
                  value={contributeForm.message}
                  onChange={(e) => setContributeForm(prev => ({ ...prev, message: e.target.value }))}
                  placeholder={t('events.view.messagePlaceholder')}
                  rows={2}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => { setShowContributeModal(null); setError('') }}
                className="flex-1 px-6 py-3 border-2 border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 font-medium transition-all"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => handleContribute(showContributeModal)}
                disabled={submitting}
                className={`flex-1 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 ${
                  showContributeModal.giftType === 'money'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500'
                    : 'bg-gradient-to-r from-teal-500 to-cyan-500'
                }`}
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {t('events.view.reserving')}
                  </>
                ) : (
                  <>
                    <FiHeart className="w-5 h-5" />
                    {existingContribution ? t('common.edit') : t('common.confirm')}
                  </>
                )}
              </button>
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  )
}
