import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode'
import { useAuth } from '../contexts/AuthContext'
import { 
  getEventById, 
  getGuestByQRCode,
  updateGuest
} from '../services/firestore'
import { 
  FiArrowLeft, FiUsers, FiCheck, FiX, FiGrid, 
  FiUser, FiHeart, FiRefreshCw
} from 'react-icons/fi'
import { HiQrcode } from 'react-icons/hi'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'

export default function QRScanner() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState(null)
  const [scannedGuest, setScannedGuest] = useState(null)
  const [scanning, setScanning] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [showPersonSelector, setShowPersonSelector] = useState(false)
  const [selectedPerson, setSelectedPerson] = useState('main') // 'main' or 'spouse'
  
  const scannerRef = useRef(null)
  const html5QrcodeScanner = useRef(null)

  useEffect(() => {
    loadEvent()
  }, [id])

  useEffect(() => {
    if (event && scanning && !scannedGuest) {
      initScanner()
    }
    
    return () => {
      if (html5QrcodeScanner.current) {
        html5QrcodeScanner.current.clear().catch(console.error)
      }
    }
  }, [event, scanning, scannedGuest])

  const loadEvent = async () => {
    try {
      setLoading(true)
      
      const eventData = await getEventById(id)
      
      if (!eventData) {
        toast.error(t('messages.error.eventNotFound'))
        navigate('/dashboard')
        return
      }
      
      if (eventData.userId !== user?.uid) {
        toast.error(t('messages.error.accessDenied'))
        navigate('/dashboard')
        return
      }
      
      setEvent(eventData)
    } catch (err) {
      console.error('Erreur chargement:', err)
      toast.error(t('messages.error.loading'))
    } finally {
      setLoading(false)
    }
  }

  const initScanner = () => {
    if (!scannerRef.current) return
    
    // Clear previous scanner if exists
    if (html5QrcodeScanner.current) {
      html5QrcodeScanner.current.clear().catch(console.error)
    }
    
    html5QrcodeScanner.current = new Html5QrcodeScanner(
      "qr-reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        rememberLastUsedCamera: true,
        aspectRatio: 1.0
      },
      false
    )
    
    html5QrcodeScanner.current.render(onScanSuccess, onScanFailure)
  }

  const onScanSuccess = async (decodedText) => {
    // Pause scanner
    if (html5QrcodeScanner.current) {
      html5QrcodeScanner.current.clear().catch(console.error)
    }
    
    setScanning(false)
    
    try {
      // Find guest by QR code
      const guest = await getGuestByQRCode(decodedText)
      
      if (!guest) {
        toast.error(t('messages.error.qrCodeNotRecognized'))
        resetScanner()
        return
      }
      
      if (guest.eventId !== id) {
        toast.error(t('messages.error.qrCodeWrongEvent'))
        resetScanner()
        return
      }
      
      setScannedGuest(guest)
      setSelectedPerson('main')
      
      // Show person selector for couple tickets
      if (guest.ticketType === 'couple') {
        setShowPersonSelector(true)
      }
      
      // Play success sound
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleRcAQq3A0MFzDBMtdrjI1a1uGxMmYaLI2b5cCAo0dcDMz6ZPAAEhXJTD0cR9FgAANXKixMOpbBoMHl2PtcbDikIKAEV5q8+wYgAMAjZyrMjRo08EBSVhlbzHsmIIDiRdjb3MxnwHADl1qcrYoUMAAiNdl8DS')
      audio.volume = 0.3
      audio.play().catch(() => {})
      
    } catch (err) {
      console.error('Erreur scan:', err)
      toast.error(t('messages.error.qrCodeReadError'))
      resetScanner()
    }
  }

  const onScanFailure = (error) => {
    // Ignore errors
  }

  const resetScanner = () => {
    setScannedGuest(null)
    setSelectedPerson('main')
    setShowPersonSelector(false)
    setScanning(true)
  }

  const updatePresenceStatus = async (isPresent, person = 'main') => {
    if (!scannedGuest) return
    
    setUpdating(true)
    
    try {
      const updateData = person === 'spouse' 
        ? { spouseIsPresent: isPresent }
        : { isPresent: isPresent }
      
      await updateGuest(scannedGuest.id, updateData)
      
      // Update local state
      setScannedGuest(prev => ({
        ...prev,
        ...updateData
      }))
      
      const personName = person === 'spouse'
        ? `${scannedGuest.spouseFirstName} ${scannedGuest.spouseLastName}`
        : `${scannedGuest.firstName} ${scannedGuest.lastName}`
      
      const status = isPresent ? t('qrScanner.presentFemale', 'présent(e)') : t('qrScanner.absentFemale', 'absent(e)')
      toast.success(t('qrScanner.markedAs', '{{name}} marqué(e) comme {{status}}', { name: personName, status }))
    } catch (err) {
      console.error('Erreur mise à jour:', err)
      toast.error(t('messages.error.updating'))
    } finally {
      setUpdating(false)
    }
  }

  const getCurrentPersonInfo = () => {
    if (!scannedGuest) return null
    
    if (selectedPerson === 'spouse' && scannedGuest.ticketType === 'couple') {
      return {
        name: `${scannedGuest.spouseFirstName} ${scannedGuest.spouseLastName}`,
        gender: scannedGuest.spouseGender,
        isPresent: scannedGuest.spouseIsPresent
      }
    }
    
    return {
      name: `${scannedGuest.firstName} ${scannedGuest.lastName}`,
      gender: scannedGuest.gender,
      isPresent: scannedGuest.isPresent
    }
  }

  if (loading) return <LoadingSpinner />

  const currentPerson = getCurrentPersonInfo()

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/event/${id}/guests`)}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <FiArrowLeft />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <HiQrcode className="text-green-400" />
              {t('qrScanner.title', 'Scanner QR Code')}
            </h1>
            <p className="text-white/70">{event?.name}</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Link
            to={`/event/${id}/guests`}
            className="btn bg-pink-500 hover:bg-pink-600 text-white flex items-center gap-2"
          >
            <FiUsers />
            {t('qrScanner.guestList', 'Liste des Invités')}
          </Link>
          <Link
            to={`/event/${id}/tables`}
            className="btn bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-2"
          >
            <FiGrid />
            {t('qrScanner.tables', 'Tables')}
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Scanner Area */}
        {!scannedGuest && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6 bg-green-50 border-b border-green-100">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <HiQrcode className="text-green-500" />
                {t('qrScanner.scanTicket', 'Scanner un billet')}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {t('qrScanner.scanInstructions', 'Pointez la caméra vers le QR code du billet d\'invitation')}
              </p>
            </div>
            
            <div className="p-6">
              <div 
                id="qr-reader" 
                ref={scannerRef}
                className="rounded-xl overflow-hidden"
              />
            </div>
          </div>
        )}

        {/* Scanned Guest Info */}
        {scannedGuest && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Person Selector for Couples */}
            {scannedGuest.ticketType === 'couple' && (
              <div className="p-4 bg-pink-50 border-b border-pink-100">
                <p className="text-sm text-pink-700 mb-2 flex items-center gap-2">
                  <FiHeart />
                  {t('qrScanner.coupleTicket', 'Billet Couple - Sélectionnez la personne')}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedPerson('main')}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                      selectedPerson === 'main'
                        ? 'bg-pink-500 text-white'
                        : 'bg-white text-gray-700 hover:bg-pink-100'
                    }`}
                  >
                    {scannedGuest.firstName} {scannedGuest.lastName}
                  </button>
                  <button
                    onClick={() => setSelectedPerson('spouse')}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                      selectedPerson === 'spouse'
                        ? 'bg-pink-500 text-white'
                        : 'bg-white text-gray-700 hover:bg-pink-100'
                    }`}
                  >
                    {scannedGuest.spouseFirstName} {scannedGuest.spouseLastName}
                  </button>
                </div>
              </div>
            )}

            {/* Guest Info */}
            <div className="p-6">
              {/* Status Banner */}
              <div className={`rounded-xl p-4 mb-6 ${
                currentPerson?.isPresent 
                  ? 'bg-green-100 border-2 border-green-300'
                  : 'bg-red-100 border-2 border-red-300'
              }`}>
                <div className="flex items-center justify-center gap-2 text-2xl font-bold">
                  {currentPerson?.isPresent ? (
                    <>
                      <FiCheck className="text-green-600" />
                      <span className="text-green-700">{t('qrScanner.present', 'PRÉSENT(E)')}</span>
                    </>
                  ) : (
                    <>
                      <FiX className="text-red-600" />
                      <span className="text-red-700">{t('qrScanner.absent', 'ABSENT(E)')}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Info Cards */}
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <FiUser className="text-purple-600 text-xl" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t('qrScanner.name', 'Nom')}</p>
                    <p className="text-lg font-bold text-gray-800">{currentPerson?.name}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-500">{t('qrScanner.gender', 'Genre')}</p>
                    <p className="text-lg font-medium text-gray-800">
                      {currentPerson?.gender === 'homme' ? `👨 ${t('qrScanner.male', 'Homme')}` : `👩 ${t('qrScanner.female', 'Femme')}`}
                    </p>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-500">{t('qrScanner.ticketType', 'Type de billet')}</p>
                    <p className="text-lg font-medium text-gray-800">
                      {scannedGuest.ticketType === 'couple' ? `💕 ${t('qrScanner.couple', 'Couple')}` : `👤 ${t('qrScanner.single', 'Single')}`}
                    </p>
                  </div>
                </div>

                {scannedGuest.relation && (
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-500">{t('qrScanner.organizerRelation', 'Relation avec l\'organisateur')}</p>
                    <p className="text-lg font-medium text-gray-800">{scannedGuest.relation}</p>
                  </div>
                )}

                {scannedGuest.tableName && (
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                    <p className="text-sm text-amber-600">{t('qrScanner.assignedTable', 'Table assignée')}</p>
                    <p className="text-lg font-bold text-amber-800">🪑 {scannedGuest.tableName}</p>
                  </div>
                )}

                {/* Status for both people in couple ticket */}
                {scannedGuest.ticketType === 'couple' && (
                  <div className="p-4 bg-pink-50 rounded-xl border border-pink-200">
                    <p className="text-sm text-pink-600 mb-2">{t('qrScanner.coupleStatus', 'Statut du couple')}</p>
                    <div className="flex gap-4">
                      <div className={`flex-1 p-2 rounded-lg text-center ${
                        scannedGuest.isPresent ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        <p className="text-xs text-gray-500">{scannedGuest.firstName}</p>
                        <p className={`font-medium ${
                          scannedGuest.isPresent ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {scannedGuest.isPresent ? t('qrScanner.presentStatus', 'Présent') : t('qrScanner.absentStatus', 'Absent')}
                        </p>
                      </div>
                      <div className={`flex-1 p-2 rounded-lg text-center ${
                        scannedGuest.spouseIsPresent ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        <p className="text-xs text-gray-500">{scannedGuest.spouseFirstName}</p>
                        <p className={`font-medium ${
                          scannedGuest.spouseIsPresent ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {scannedGuest.spouseIsPresent ? t('qrScanner.presentFemale', 'Présent(e)') : t('qrScanner.absentFemale', 'Absent(e)')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-6 space-y-3">
                <div className="flex gap-3">
                  <button
                    onClick={() => updatePresenceStatus(true, selectedPerson)}
                    disabled={updating || currentPerson?.isPresent}
                    className={`flex-1 py-3 px-6 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors ${
                      currentPerson?.isPresent
                        ? 'bg-green-100 text-green-400 cursor-not-allowed'
                        : 'bg-green-500 text-white hover:bg-green-600'
                    }`}
                  >
                    {updating ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <FiCheck />
                    )}
                    {t('qrScanner.markPresent', 'Marquer Présent')}
                  </button>
                  
                  <button
                    onClick={() => updatePresenceStatus(false, selectedPerson)}
                    disabled={updating || !currentPerson?.isPresent}
                    className={`flex-1 py-3 px-6 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors ${
                      !currentPerson?.isPresent
                        ? 'bg-red-100 text-red-400 cursor-not-allowed'
                        : 'bg-red-500 text-white hover:bg-red-600'
                    }`}
                  >
                    {updating ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <FiX />
                    )}
                    {t('qrScanner.markAbsent', 'Marquer Absent')}
                  </button>
                </div>

                <button
                  onClick={resetScanner}
                  className="w-full py-3 px-6 rounded-xl font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center justify-center gap-2 transition-colors"
                >
                  <FiRefreshCw />
                  {t('qrScanner.scanAnother', 'Scanner un autre billet')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <h3 className="text-white font-medium mb-2">💡 {t('qrScanner.instructions', 'Instructions')}</h3>
          <ul className="text-white/70 text-sm space-y-1">
            <li>• {t('qrScanner.instruction1', 'Scannez le QR code présent sur le billet d\'invitation')}</li>
            <li>• {t('qrScanner.instruction2', 'Vérifiez les informations de l\'invité')}</li>
            <li>• {t('qrScanner.instruction3', 'Changez le statut de présence si nécessaire')}</li>
            <li>• {t('qrScanner.instruction4', 'Pour les billets couple, sélectionnez la personne concernée')}</li>
            <li>• {t('qrScanner.instruction5', 'Vous pouvez scanner le même billet plusieurs fois')}</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
