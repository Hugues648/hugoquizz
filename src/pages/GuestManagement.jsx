import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import * as XLSX from 'xlsx'
import { useAuth } from '../contexts/AuthContext'
import { 
  getEventById, 
  getGuestsByEvent,
  getTablesByEvent,
  createGuest,
  updateGuest,
  deleteGuest,
  getPendingGuestsByEvent,
  approvePendingGuest,
  rejectPendingGuest,
  deletePendingGuest
} from '../services/firestore'
import { 
  FiArrowLeft, FiUsers, FiDownload, FiTrash2, FiEdit2,
  FiPlus, FiX, FiUser, FiUserPlus, FiGrid, FiSearch,
  FiCheck, FiHeart, FiFilter, FiClock, FiCheckCircle, FiXCircle,
  FiAlertCircle
} from 'react-icons/fi'
import { HiQrcode } from 'react-icons/hi'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'

const EVENT_TYPES = {
  'mariage': { labelKey: 'eventTypes.wedding', emoji: '💒' },
  'anniversaire': { labelKey: 'eventTypes.birthday', emoji: '🎂' },
  'naissance': { labelKey: 'eventTypes.birth', emoji: '👶' },
  'bapteme': { labelKey: 'eventTypes.baptism', emoji: '⛪' },
  'cremaillere': { labelKey: 'eventTypes.housewarming', emoji: '🏠' },
  'noel': { labelKey: 'eventTypes.christmas', emoji: '🎄' },
  'autre': { labelKey: 'eventTypes.other', emoji: '🎉' }
}

const RELATION_KEYS = [
  'fatherGroom', 'motherGroom', 'brotherGroom', 'sisterGroom',
  'fatherBride', 'motherBride', 'brotherBride', 'sisterBride',
  'grandparent', 'uncle', 'aunt', 'cousin', 'nephew',
  'childhoodFriend', 'closeFriend', 'colleague', 'neighbor',
  'witness', 'bridesmaid', 'groomsman',
  'otherFamily', 'otherFriend', 'professional', 'other'
]

export default function GuestManagement() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState(null)
  const [guests, setGuests] = useState([])
  const [pendingGuests, setPendingGuests] = useState([])
  const [tables, setTables] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all') // all, present, absent
  const [filterTicketType, setFilterTicketType] = useState('all') // all, single, couple
  const [sortBy, setSortBy] = useState('name_asc') // Tri
  const [activeTab, setActiveTab] = useState('guests') // guests, pending
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedGuest, setSelectedGuest] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [generatingPdf, setGeneratingPdf] = useState(null)
  const [processingPending, setProcessingPending] = useState(null)
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    gender: 'homme',
    relation: '',
    ticketType: 'single',
    spouseFirstName: '',
    spouseLastName: '',
    spouseGender: 'femme',
    tableId: ''
  })

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    try {
      setLoading(true)
      
      const eventData = await getEventById(id)
      
      if (!eventData) {
        toast.error(t('events.notFound', 'Événement non trouvé'))
        navigate('/dashboard')
        return
      }
      
      if (eventData.userId !== user?.uid) {
        toast.error(t('messages.error.accessDenied'))
        navigate('/dashboard')
        return
      }
      
      setEvent(eventData)
      
      const [guestsData, tablesData, pendingData] = await Promise.all([
        getGuestsByEvent(id),
        getTablesByEvent(id),
        getPendingGuestsByEvent(id)
      ])
      
      setGuests(guestsData)
      setTables(tablesData)
      setPendingGuests(pendingData)
    } catch (err) {
      console.error('Erreur chargement:', err)
      toast.error(t('common.loadError', 'Erreur lors du chargement des données'))
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      gender: 'homme',
      relation: '',
      ticketType: 'single',
      spouseFirstName: '',
      spouseLastName: '',
      spouseGender: 'femme',
      tableId: ''
    })
  }

  const handleAddGuest = async (e) => {
    e.preventDefault()
    
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error(t('events.fillNameRequired', 'Veuillez remplir le nom et prénom'))
      return
    }
    
    if (formData.ticketType === 'couple' && (!formData.spouseFirstName.trim() || !formData.spouseLastName.trim())) {
      toast.error(t('events.fillSpouseRequired', 'Veuillez remplir les informations du/de la conjoint(e)'))
      return
    }
    
    try {
      const table = tables.find(t => t.id === formData.tableId)
      
      const guestData = {
        eventId: id,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        gender: formData.gender,
        relation: formData.relation,
        ticketType: formData.ticketType,
        tableId: formData.tableId || null,
        tableName: table?.name || null,
        isPresent: false
      }
      
      if (formData.ticketType === 'couple') {
        guestData.spouseFirstName = formData.spouseFirstName.trim()
        guestData.spouseLastName = formData.spouseLastName.trim()
        guestData.spouseGender = formData.spouseGender
        guestData.spouseIsPresent = false
      }
      
      const { id: guestId, qrCode } = await createGuest(guestData)
      
      const newGuest = { id: guestId, ...guestData, qrCode }
      setGuests([...guests, newGuest])
      
      setShowAddModal(false)
      resetForm()
      toast.success(t('events.guestAdded', 'Invité ajouté avec succès'))
    } catch (err) {
      console.error('Erreur création invité:', err)
      toast.error(t('events.guestAddError', 'Erreur lors de la création de l\'invité'))
    }
  }

  const handleEditGuest = async (e) => {
    e.preventDefault()
    
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error(t('events.fillNameRequired', 'Veuillez remplir le nom et prénom'))
      return
    }
    
    try {
      const table = tables.find(t => t.id === formData.tableId)
      
      const updateData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        gender: formData.gender,
        relation: formData.relation,
        ticketType: formData.ticketType,
        tableId: formData.tableId || null,
        tableName: table?.name || null
      }
      
      if (formData.ticketType === 'couple') {
        updateData.spouseFirstName = formData.spouseFirstName.trim()
        updateData.spouseLastName = formData.spouseLastName.trim()
        updateData.spouseGender = formData.spouseGender
      } else {
        updateData.spouseFirstName = null
        updateData.spouseLastName = null
        updateData.spouseGender = null
        updateData.spouseIsPresent = null
      }
      
      await updateGuest(selectedGuest.id, updateData)
      
      setGuests(guests.map(g => 
        g.id === selectedGuest.id ? { ...g, ...updateData } : g
      ))
      
      setShowEditModal(false)
      setSelectedGuest(null)
      resetForm()
      toast.success(t('events.guestModified', 'Invité modifié avec succès'))
    } catch (err) {
      console.error('Erreur modification invité:', err)
      toast.error(t('events.guestModifyError', 'Erreur lors de la modification'))
    }
  }

  const openEditModal = (guest) => {
    setSelectedGuest(guest)
    setFormData({
      firstName: guest.firstName || '',
      lastName: guest.lastName || '',
      gender: guest.gender || 'homme',
      relation: guest.relation || '',
      ticketType: guest.ticketType || 'single',
      spouseFirstName: guest.spouseFirstName || '',
      spouseLastName: guest.spouseLastName || '',
      spouseGender: guest.spouseGender || 'femme',
      tableId: guest.tableId || ''
    })
    setShowEditModal(true)
  }

  const handleDeleteGuest = async (guestId) => {
    try {
      await deleteGuest(guestId)
      setGuests(guests.filter(g => g.id !== guestId))
      setDeleteConfirm(null)
      toast.success(t('events.guestDeleted', 'Invité supprimé'))
    } catch (err) {
      console.error('Erreur suppression:', err)
      toast.error(t('events.guestDeleteError', 'Erreur lors de la suppression'))
    }
  }

  // Approve pending guest
  const handleApprovePending = async (pendingId) => {
    try {
      setProcessingPending(pendingId)
      const { guestId, qrCode } = await approvePendingGuest(pendingId)
      
      // Remove from pending list
      setPendingGuests(prev => prev.filter(p => p.id !== pendingId))
      
      // Reload guests to include the new one
      const guestsData = await getGuestsByEvent(id)
      setGuests(guestsData)
      
      toast.success(t('guests.pendingApproved', 'Invité approuvé et ajouté à la liste'))
    } catch (err) {
      console.error('Erreur approbation:', err)
      toast.error(t('guests.approveError', 'Erreur lors de l\'approbation'))
    } finally {
      setProcessingPending(null)
    }
  }

  // Reject pending guest
  const handleRejectPending = async (pendingId) => {
    try {
      setProcessingPending(pendingId)
      await rejectPendingGuest(pendingId)
      
      // Remove from pending list
      setPendingGuests(prev => prev.filter(p => p.id !== pendingId))
      
      toast.success(t('guests.pendingRejected', 'Demande rejetée'))
    } catch (err) {
      console.error('Erreur rejet:', err)
      toast.error(t('guests.rejectError', 'Erreur lors du rejet'))
    } finally {
      setProcessingPending(null)
    }
  }

  // Changer le statut de présence manuellement
  const toggleGuestPresence = async (guest, isSpouse = false) => {
    try {
      const updateData = {}
      
      if (isSpouse) {
        updateData.spouseIsPresent = !guest.spouseIsPresent
        if (!guest.spouseIsPresent) {
          updateData.spouseCheckedInAt = new Date()
        }
      } else {
        updateData.isPresent = !guest.isPresent
        if (!guest.isPresent) {
          updateData.checkedInAt = new Date()
        }
      }
      
      await updateGuest(guest.id, updateData)
      
      setGuests(guests.map(g => 
        g.id === guest.id ? { ...g, ...updateData } : g
      ))
      
      const name = isSpouse ? guest.spouseFirstName : guest.firstName
      const newStatus = isSpouse ? !guest.spouseIsPresent : !guest.isPresent
      
      toast.success(t('events.presenceChanged', '{{name}} marqué(e) comme {{status}}', { name, status: newStatus ? t('events.present', 'présent(e)') : t('events.absent', 'absent(e)') }))
    } catch (err) {
      console.error('Erreur changement statut:', err)
      toast.error(t('events.presenceChangeError', 'Erreur lors du changement de statut'))
    }
  }

  const generatePdfForGuest = useCallback(async (guest, forSpouse = false) => {
    if (!event) return
    
    setGeneratingPdf(guest.id)
    
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
      
      // PDF size limit (2MB = 2 * 1024 * 1024 bytes)
      const MAX_PDF_SIZE = 2 * 1024 * 1024
      // Estimated overhead for page 2 (QR code, text, etc.) ~50KB
      const PAGE2_OVERHEAD = 50 * 1024
      // Maximum bytes for page 1 image
      const MAX_IMAGE_BYTES = MAX_PDF_SIZE - PAGE2_OVERHEAD
      
      // Helper function to estimate base64 size in bytes
      const getBase64Size = (dataUrl) => {
        const base64 = dataUrl.split(',')[1]
        return Math.ceil(base64.length * 3 / 4)
      }
      
      // Helper function to load and optimize image as base64
      const loadImageAsBase64 = async (url) => {
        try {
          const response = await fetch(url)
          if (!response.ok) throw new Error('Fetch failed')
          
          const blob = await response.blob()
          const originalDataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result)
            reader.onerror = reject
            reader.readAsDataURL(blob)
          })
          
          // Load image to get dimensions
          const img = new Image()
          await new Promise((resolve, reject) => {
            img.onload = resolve
            img.onerror = reject
            img.src = originalDataUrl
          })
          
          // First try: full quality, original size
          const canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth
          canvas.height = img.naturalHeight
          const ctx = canvas.getContext('2d')
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
          ctx.drawImage(img, 0, 0)
          
          let dataUrl = canvas.toDataURL('image/jpeg', 1.0)
          let imageSize = getBase64Size(dataUrl)
          
          // If original fits within limit, use it
          if (imageSize <= MAX_IMAGE_BYTES) {
            return { dataUrl, width: img.naturalWidth, height: img.naturalHeight }
          }
          
          // Otherwise, progressively reduce quality/size
          const qualityLevels = [0.95, 0.90, 0.85, 0.80, 0.75]
          const maxDimensions = [
            { w: img.naturalWidth, h: img.naturalHeight },
            { w: 2480, h: 3508 }, // A4 at 300dpi
            { w: 1754, h: 2480 }, // A4 at 212dpi
            { w: 1240, h: 1754 }, // A4 at 150dpi
            { w: 827, h: 1169 }   // A4 at 100dpi
          ]
          
          for (const dims of maxDimensions) {
            let targetWidth = img.naturalWidth
            let targetHeight = img.naturalHeight
            
            // Scale down if needed
            if (targetWidth > dims.w || targetHeight > dims.h) {
              const widthRatio = dims.w / targetWidth
              const heightRatio = dims.h / targetHeight
              const ratio = Math.min(widthRatio, heightRatio)
              targetWidth = Math.round(targetWidth * ratio)
              targetHeight = Math.round(targetHeight * ratio)
            }
            
            canvas.width = targetWidth
            canvas.height = targetHeight
            ctx.imageSmoothingEnabled = true
            ctx.imageSmoothingQuality = 'high'
            ctx.drawImage(img, 0, 0, targetWidth, targetHeight)
            
            for (const quality of qualityLevels) {
              dataUrl = canvas.toDataURL('image/jpeg', quality)
              imageSize = getBase64Size(dataUrl)
              
              if (imageSize <= MAX_IMAGE_BYTES) {
                console.log(`Image optimized: ${targetWidth}x${targetHeight} @ ${quality * 100}% = ${(imageSize / 1024).toFixed(0)}KB`)
                return { dataUrl, width: targetWidth, height: targetHeight }
              }
            }
          }
          
          // Final fallback: smallest size and lowest quality
          console.log('Using minimum quality fallback')
          return { dataUrl, width: canvas.width, height: canvas.height }
          
        } catch (fetchError) {
          console.log('Fetch failed, trying Image element:', fetchError)
          
          return new Promise((resolve, reject) => {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            
            img.onload = () => {
              try {
                const canvas = document.createElement('canvas')
                const ctx = canvas.getContext('2d')
                
                // Try full quality first
                canvas.width = img.naturalWidth
                canvas.height = img.naturalHeight
                ctx.drawImage(img, 0, 0)
                
                let dataUrl = canvas.toDataURL('image/jpeg', 1.0)
                let imageSize = getBase64Size(dataUrl)
                
                if (imageSize <= MAX_IMAGE_BYTES) {
                  resolve({ dataUrl, width: img.naturalWidth, height: img.naturalHeight })
                  return
                }
                
                // Progressive optimization
                const qualityLevels = [0.95, 0.90, 0.85, 0.80]
                const maxDimensions = [
                  { w: 2480, h: 3508 },
                  { w: 1754, h: 2480 },
                  { w: 1240, h: 1754 }
                ]
                
                for (const dims of maxDimensions) {
                  let targetWidth = img.naturalWidth
                  let targetHeight = img.naturalHeight
                  
                  if (targetWidth > dims.w || targetHeight > dims.h) {
                    const ratio = Math.min(dims.w / targetWidth, dims.h / targetHeight)
                    targetWidth = Math.round(targetWidth * ratio)
                    targetHeight = Math.round(targetHeight * ratio)
                  }
                  
                  canvas.width = targetWidth
                  canvas.height = targetHeight
                  ctx.imageSmoothingEnabled = true
                  ctx.imageSmoothingQuality = 'high'
                  ctx.drawImage(img, 0, 0, targetWidth, targetHeight)
                  
                  for (const quality of qualityLevels) {
                    dataUrl = canvas.toDataURL('image/jpeg', quality)
                    if (getBase64Size(dataUrl) <= MAX_IMAGE_BYTES) {
                      resolve({ dataUrl, width: targetWidth, height: targetHeight })
                      return
                    }
                  }
                }
                
                resolve({ dataUrl, width: canvas.width, height: canvas.height })
              } catch (e) {
                reject(e)
              }
            }
            
            img.onerror = () => reject(new Error('Failed to load image'))
            img.src = url
          })
        }
      }
      
      // Page 1: Invitation Image
      if (event.invitationImageUrl) {
        try {
          const { dataUrl, width, height } = await loadImageAsBase64(event.invitationImageUrl)
          
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
          // Fallback page
          doc.setFillColor(255, 240, 245)
          doc.rect(0, 0, pageWidth, pageHeight, 'F')
          doc.setFontSize(24)
          doc.setTextColor(236, 72, 153)
          doc.text('Invitation', pageWidth / 2, pageHeight / 2, { align: 'center' })
        }
      } else {
        const eventType = EVENT_TYPES[event.type] || EVENT_TYPES.autre
        
        doc.setFillColor(255, 240, 245)
        doc.rect(0, 0, pageWidth, pageHeight, 'F')
        
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
      
      // Get guest name info
      const guestName = forSpouse 
        ? `${guest.spouseFirstName} ${guest.spouseLastName}`
        : `${guest.firstName} ${guest.lastName}`
      
      const guestFirstName = forSpouse ? guest.spouseFirstName : guest.firstName
      
      // Page 2: Personalized Letter + QR Code and Guest Info
      doc.addPage()
      
      // Elegant background
      doc.setFillColor(255, 252, 250)
      doc.rect(0, 0, pageWidth, pageHeight, 'F')
      
      // Decorative border
      doc.setDrawColor(236, 72, 153)
      doc.setLineWidth(1)
      doc.rect(margin / 2, margin / 2, pageWidth - margin, pageHeight - margin)
      
      // Inner decorative border
      doc.setLineWidth(0.3)
      doc.setDrawColor(252, 165, 165)
      doc.rect(margin / 2 + 3, margin / 2 + 3, pageWidth - margin - 6, pageHeight - margin - 6)
      
      let yPos = margin + 15
      
      // === PERSONALIZED LETTER SECTION ===
      if (event.invitationLetter) {
        // Salutation - personalized based on ticket type
        doc.setFontSize(18)
        doc.setTextColor(236, 72, 153)
        
        let salutation
        if (guest.ticketType === 'couple') {
          const firstName1 = forSpouse ? guest.spouseFirstName : guest.firstName
          const firstName2 = forSpouse ? guest.firstName : guest.spouseFirstName
          salutation = `Très chers ${firstName1} & ${firstName2},`
        } else {
          salutation = `Très cher(e) ${guestFirstName},`
        }
        
        doc.text(salutation, pageWidth / 2, yPos, { align: 'center' })
        yPos += 15
        
        // Decorative line under salutation
        doc.setDrawColor(252, 165, 165)
        doc.setLineWidth(0.5)
        doc.line(margin + 30, yPos, pageWidth - margin - 30, yPos)
        yPos += 12
        
        // Letter text
        doc.setFontSize(11)
        doc.setTextColor(60, 60, 60)
        
        const letterLines = doc.splitTextToSize(event.invitationLetter, pageWidth - margin * 2 - 20)
        const lineHeight = 6
        
        letterLines.forEach(line => {
          if (yPos > pageHeight - 140) {
            // If letter is too long, we need to stop to leave space for QR
            return
          }
          doc.text(line, pageWidth / 2, yPos, { align: 'center' })
          yPos += lineHeight
        })
        
        yPos += 10
        
        // Decorative separator before QR section
        doc.setDrawColor(236, 72, 153)
        doc.setLineWidth(0.3)
        const separatorY = yPos
        doc.line(margin + 20, separatorY, pageWidth - margin - 20, separatorY)
        yPos += 15
      } else {
        // No letter - just show header with guest name
        doc.setFillColor(236, 72, 153)
        doc.roundedRect(margin, yPos - 5, pageWidth - margin * 2, 35, 3, 3, 'F')
        
        doc.setFontSize(20)
        doc.setTextColor(255, 255, 255)
        doc.text(t('guests.yourInvitation'), pageWidth / 2, yPos + 12, { align: 'center' })
        
        yPos += 45
        
        // Guest name
        doc.setFontSize(20)
        doc.setTextColor(60, 60, 60)
        doc.text(guestName, pageWidth / 2, yPos, { align: 'center' })
        yPos += 15
      }
      
      // === TICKET INFO SECTION ===
      // Ticket type badge
      if (guest.ticketType === 'couple') {
        doc.setFontSize(11)
        doc.setTextColor(236, 72, 153)
        const partnerName = forSpouse
          ? `${guest.firstName} ${guest.lastName}`
          : `${guest.spouseFirstName} ${guest.spouseLastName}`
        doc.text(`${t('guests.coupleTicket')} ${partnerName}`, pageWidth / 2, yPos, { align: 'center' })
        yPos += 10
      }
      
      yPos += 5
      
      // === QR CODE SECTION ===
      try {
        // Generate QR code at optimal size (200px is enough for 70mm display)
        const qrDataUrl = await QRCode.toDataURL(guest.qrCode, {
          width: 200,
          margin: 1,
          color: {
            dark: '#1a1a1a',
            light: '#ffffff'
          }
        })
        
        // Adaptive QR size based on available space
        const availableSpace = pageHeight - yPos - 80
        const qrSize = Math.min(70, Math.max(50, availableSpace - 20))
        const qrX = (pageWidth - qrSize) / 2
        
        // QR Code with subtle border
        doc.setDrawColor(236, 72, 153)
        doc.setLineWidth(0.5)
        doc.roundedRect(qrX - 3, yPos - 3, qrSize + 6, qrSize + 6, 3, 3)
        
        doc.addImage(qrDataUrl, 'PNG', qrX, yPos, qrSize, qrSize, undefined, 'FAST')
        
        yPos += qrSize + 8
        
        // QR Code caption
        doc.setFontSize(9)
        doc.setTextColor(150, 150, 150)
        doc.text(t('guests.scanQrCode'), pageWidth / 2, yPos, { align: 'center' })
        
        yPos += 12
        
      } catch (qrError) {
        console.error('Error generating QR code:', qrError)
        doc.setFontSize(12)
        doc.setTextColor(200, 100, 100)
        doc.text('Erreur génération QR code', pageWidth / 2, yPos + 20, { align: 'center' })
        yPos += 40
      }
      
      // === EVENT INFO BOX ===
      const boxHeight = event.location ? 45 : 35
      const boxY = Math.min(yPos, pageHeight - boxHeight - 25)
      
      doc.setDrawColor(236, 72, 153)
      doc.setLineWidth(0.5)
      doc.setFillColor(255, 245, 247)
      doc.roundedRect(margin + 10, boxY, pageWidth - margin * 2 - 20, boxHeight, 4, 4, 'FD')
      
      doc.setFontSize(13)
      doc.setTextColor(80, 80, 80)
      doc.text(event.name, pageWidth / 2, boxY + 12, { align: 'center' })
      
      if (event.date) {
        doc.setFontSize(10)
        doc.setTextColor(120, 120, 120)
        const dateStr = new Date(event.date).toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
        doc.text(dateStr, pageWidth / 2, boxY + 24, { align: 'center' })
      }
      
      if (event.location) {
        doc.setFontSize(9)
        doc.text(event.location, pageWidth / 2, boxY + 35, { align: 'center' })
      }
      
      // Footer
      doc.setFontSize(9)
      doc.setTextColor(180, 180, 180)
      doc.text(t('guests.personalTicket'), pageWidth / 2, pageHeight - 12, { align: 'center' })
      
      // Save PDF
      const fileName = `invitation-${guestName.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`
      doc.save(fileName)
      
      toast.success(t('events.pdfGenerated', 'PDF généré pour {{name}}', { name: guestName }))
    } catch (err) {
      console.error('Erreur génération PDF:', err)
      toast.error(t('events.pdfError', 'Erreur lors de la génération du PDF'))
    } finally {
      setGeneratingPdf(null)
    }
  }, [event])

  // Export to Excel
  const exportToExcel = useCallback(() => {
    // Get current locale for date formatting
    const currentLocale = i18n.language === 'fr' ? 'fr-FR' : 
                          i18n.language === 'de' ? 'de-DE' : 
                          i18n.language === 'nl' ? 'nl-NL' : 'en-US'
    
    try {
      // Prepare data for Excel with translated headers
      const excelData = guests.map((guest, index) => {
        const row = {
          [t('guests.number')]: index + 1,
          [t('guests.firstName')]: guest.firstName || '',
          [t('guests.lastName')]: guest.lastName || '',
          [t('guests.gender')]: guest.gender === 'homme' ? t('guests.male') : t('guests.female'),
          [t('guests.type')]: guest.ticketType === 'couple' ? t('guests.couple') : t('guests.single'),
          [t('guests.relation')]: guest.relation ? t(`relations.${guest.relation}`, guest.relation) : '',
          [t('guests.table')]: guest.tableName || t('guests.notAssigned'),
          [t('common.status')]: guest.isPresent ? t('guests.present') : t('guests.absent'),
          [t('guests.arrivalDate')]: guest.checkedInAt 
            ? new Date(guest.checkedInAt.toDate?.() || guest.checkedInAt).toLocaleString(currentLocale)
            : '',
          [t('guests.registrationDate')]: guest.createdAt 
            ? new Date(guest.createdAt.toDate?.() || guest.createdAt).toLocaleDateString(currentLocale)
            : ''
        }
        
        // Add spouse info if couple
        if (guest.ticketType === 'couple') {
          row[t('guests.spouseFirstName')] = guest.spouseFirstName || ''
          row[t('guests.spouseLastName')] = guest.spouseLastName || ''
          row[t('guests.spouseGender')] = guest.spouseGender === 'homme' ? t('guests.male') : t('guests.female')
          row[t('guests.spouseStatus')] = guest.spouseIsPresent ? t('guests.present') : t('guests.absent')
          row[t('guests.spouseArrival')] = guest.spouseCheckedInAt 
            ? new Date(guest.spouseCheckedInAt.toDate?.() || guest.spouseCheckedInAt).toLocaleString(currentLocale)
            : ''
        } else {
          row[t('guests.spouseFirstName')] = ''
          row[t('guests.spouseLastName')] = ''
          row[t('guests.spouseGender')] = ''
          row[t('guests.spouseStatus')] = ''
          row[t('guests.spouseArrival')] = ''
        }
        
        return row
      })
      
      // Create workbook and worksheet
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(excelData)
      
      // Set column widths
      const colWidths = [
        { wch: 5 },   // N°
        { wch: 15 },  // Prénom
        { wch: 15 },  // Nom
        { wch: 10 },  // Genre
        { wch: 10 },  // Type
        { wch: 20 },  // Relation
        { wch: 15 },  // Table
        { wch: 10 },  // Statut
        { wch: 20 },  // Date arrivée
        { wch: 15 },  // Date inscription
        { wch: 15 },  // Prénom conjoint
        { wch: 15 },  // Nom conjoint
        { wch: 12 },  // Genre conjoint
        { wch: 12 },  // Statut conjoint
        { wch: 20 },  // Arrivée conjoint
      ]
      ws['!cols'] = colWidths
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, t('guests.title'))
      
      // Create summary sheet
      const presentCount = guests.filter(g => g.isPresent).length
      const absentCount = guests.filter(g => !g.isPresent).length
      const coupleCount = guests.filter(g => g.ticketType === 'couple').length
      const singleCount = guests.filter(g => g.ticketType === 'single').length
      const totalPersons = singleCount + (coupleCount * 2)
      const spousePresent = guests.filter(g => g.ticketType === 'couple' && g.spouseIsPresent).length
      
      const summaryData = [
        { [t('guests.statistic')]: t('guests.totalInvitations'), [t('guests.value')]: guests.length },
        { [t('guests.statistic')]: t('guests.totalPersons'), [t('guests.value')]: totalPersons },
        { [t('guests.statistic')]: t('guests.guestsPresent'), [t('guests.value')]: presentCount },
        { [t('guests.statistic')]: t('guests.guestsAbsent'), [t('guests.value')]: absentCount },
        { [t('guests.statistic')]: t('guests.couples'), [t('guests.value')]: coupleCount },
        { [t('guests.statistic')]: t('guests.singles'), [t('guests.value')]: singleCount },
        { [t('guests.statistic')]: t('guests.spousesPresent'), [t('guests.value')]: spousePresent },
        { [t('guests.statistic')]: t('events.event'), [t('guests.value')]: event?.title || '' },
        { [t('guests.statistic')]: t('guests.exportDate'), [t('guests.value')]: new Date().toLocaleString(currentLocale) },
      ]
      
      const wsSummary = XLSX.utils.json_to_sheet(summaryData)
      wsSummary['!cols'] = [{ wch: 20 }, { wch: 30 }]
      XLSX.utils.book_append_sheet(wb, wsSummary, t('guests.summary'))
      
      // Generate filename
      const eventName = (event?.title || 'invites').replace(/[^a-zA-Z0-9]/g, '-')
      const dateStr = new Date().toISOString().split('T')[0]
      const fileName = `${eventName}_${dateStr}.xlsx`
      
      // Download file
      XLSX.writeFile(wb, fileName)
      
      toast.success(t('events.excelExported', 'Export Excel téléchargé ✅'))
    } catch (err) {
      console.error('Erreur export Excel:', err)
      toast.error(t('events.exportError', 'Erreur lors de l\'export'))
    }
  }, [guests, event, t, i18n.language])

  // Filter guests
  const filteredGuests = guests.filter(guest => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = 
      guest.firstName?.toLowerCase().includes(searchLower) ||
      guest.lastName?.toLowerCase().includes(searchLower) ||
      guest.spouseFirstName?.toLowerCase().includes(searchLower) ||
      guest.spouseLastName?.toLowerCase().includes(searchLower) ||
      guest.tableName?.toLowerCase().includes(searchLower) ||
      guest.relation?.toLowerCase().includes(searchLower)
    
    const matchesStatus = 
      filterStatus === 'all' ||
      (filterStatus === 'present' && guest.isPresent) ||
      (filterStatus === 'absent' && !guest.isPresent)
    
    const matchesTicketType =
      filterTicketType === 'all' ||
      guest.ticketType === filterTicketType
    
    return matchesSearch && matchesStatus && matchesTicketType
  })

  // Sort guests
  const sortedGuests = [...filteredGuests].sort((a, b) => {
    switch (sortBy) {
      case 'name_asc':
        return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`)
      case 'name_desc':
        return `${b.lastName} ${b.firstName}`.localeCompare(`${a.lastName} ${a.firstName}`)
      case 'firstname_asc':
        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
      case 'firstname_desc':
        return `${b.firstName} ${b.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`)
      case 'date_recent':
        return (b.createdAt?.toDate?.() || new Date(b.createdAt) || 0) - (a.createdAt?.toDate?.() || new Date(a.createdAt) || 0)
      case 'date_oldest':
        return (a.createdAt?.toDate?.() || new Date(a.createdAt) || 0) - (b.createdAt?.toDate?.() || new Date(b.createdAt) || 0)
      case 'table':
        return (a.tableName || 'zzz').localeCompare(b.tableName || 'zzz')
      case 'relation':
        return (a.relation || 'zzz').localeCompare(b.relation || 'zzz')
      case 'status_present':
        return (b.isPresent ? 1 : 0) - (a.isPresent ? 1 : 0)
      case 'status_absent':
        return (a.isPresent ? 1 : 0) - (b.isPresent ? 1 : 0)
      default:
        return 0
    }
  })

  // Stats
  const totalGuests = guests.reduce((acc, g) => acc + (g.ticketType === 'couple' ? 2 : 1), 0)
  const presentCount = guests.reduce((acc, g) => {
    let count = g.isPresent ? 1 : 0
    if (g.ticketType === 'couple' && g.spouseIsPresent) count++
    return acc + count
  }, 0)

  if (loading) return <LoadingSpinner />

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <FiArrowLeft />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <FiUsers className="text-pink-400" />
              {t('guests.title')}
            </h1>
            <p className="text-white/70">{event?.name}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/event/${id}/tables`}
            className="btn bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"
          >
            <FiGrid className="flex-shrink-0" />
            <span>{t('guests.tables')}</span>
          </Link>
          <Link
            to={`/event/${id}/scanner`}
            className="btn bg-green-500 hover:bg-green-600 text-white flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"
          >
            <HiQrcode className="flex-shrink-0" />
            <span>{t('guests.scanner')}</span>
          </Link>
          <Link
            to={`/event/${id}/seating`}
            className="btn bg-indigo-500 hover:bg-indigo-600 text-white flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"
          >
            <FiGrid className="flex-shrink-0" />
            <span>{t('guests.plan')}</span>
          </Link>
          <Link
            to={`/event/${id}/guestbook`}
            className="btn bg-pink-500 hover:bg-pink-600 text-white flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"
          >
            📖 <span>{t('guests.guestbook')}</span>
          </Link>
          <button
            onClick={exportToExcel}
            className="btn bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"
          >
            <FiDownload className="flex-shrink-0" />
            <span>{t('guests.excel')}</span>
          </button>
          <button
            onClick={() => {
              resetForm()
              setShowAddModal(true)
            }}
            className="btn btn-primary flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"
          >
            <FiUserPlus className="flex-shrink-0" />
            <span>{t('guests.add')}</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <p className="text-white/70 text-sm">{t('guests.totalGuests')}</p>
          <p className="text-2xl font-bold text-white">{totalGuests}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <p className="text-white/70 text-sm">{t('guests.tickets')}</p>
          <p className="text-2xl font-bold text-white">{guests.length}</p>
        </div>
        <div className="bg-green-500/20 backdrop-blur-lg rounded-xl p-4 border border-green-500/30">
          <p className="text-green-300 text-sm">{t('guests.presents')}</p>
          <p className="text-2xl font-bold text-green-400">{presentCount}</p>
        </div>
        <div className="bg-red-500/20 backdrop-blur-lg rounded-xl p-4 border border-red-500/30">
          <p className="text-red-300 text-sm">{t('guests.absents')}</p>
          <p className="text-2xl font-bold text-red-400">{totalGuests - presentCount}</p>
        </div>
        <div className="bg-amber-500/20 backdrop-blur-lg rounded-xl p-4 border border-amber-500/30 relative">
          <p className="text-amber-300 text-sm">{t('guests.pendingApproval')}</p>
          <p className="text-2xl font-bold text-amber-400">{pendingGuests.length}</p>
          {pendingGuests.length > 0 && (
            <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold animate-pulse">
              {pendingGuests.length}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('guests')}
          className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
            activeTab === 'guests'
              ? 'bg-white text-gray-800 shadow-lg'
              : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          <FiUsers />
          {t('guests.confirmedList')} ({guests.length})
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 relative ${
            activeTab === 'pending'
              ? 'bg-white text-gray-800 shadow-lg'
              : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          <FiClock />
          {t('guests.pendingRequests')} ({pendingGuests.length})
          {pendingGuests.length > 0 && activeTab !== 'pending' && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {pendingGuests.length}
            </span>
          )}
        </button>
      </div>

      {/* Pending Guests Tab */}
      {activeTab === 'pending' && (
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
          {pendingGuests.length === 0 ? (
            <div className="p-12 text-center">
              <FiCheckCircle className="w-16 h-16 mx-auto text-green-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                {t('guests.noPendingRequests')}
              </h3>
              <p className="text-gray-500">
                {t('guests.noPendingDescription')}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {/* Pending Header */}
              <div className="p-4 bg-amber-50 border-b border-amber-200">
                <div className="flex items-center gap-2 text-amber-800">
                  <FiAlertCircle className="w-5 h-5" />
                  <span className="font-medium">
                    {t('guests.pendingInfo')}
                  </span>
                </div>
              </div>
              
              {pendingGuests.map(pending => (
                <div key={pending.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${
                          pending.gender === 'femme' ? 'bg-pink-500' : 'bg-blue-500'
                        }`}>
                          {pending.gender === 'femme' ? '👩' : '👨'}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-800">
                            {pending.firstName} {pending.lastName}
                          </h4>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>{t(`relations.${pending.relation}`)}</span>
                            <span>•</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                              pending.ticketType === 'couple' 
                                ? 'bg-pink-100 text-pink-700' 
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {pending.ticketType === 'couple' ? (
                                <>
                                  <FiHeart className="inline w-3 h-3 mr-1" />
                                  {t('guests.couple')}
                                </>
                              ) : t('guests.single')}
                            </span>
                          </div>
                          {pending.ticketType === 'couple' && (
                            <p className="text-sm text-pink-600 mt-1">
                              + {pending.spouseFirstName} {pending.spouseLastName} 
                              {pending.spouseGender === 'femme' ? ' 👩' : ' 👨'}
                            </p>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        {t('guests.requestedOn')}: {pending.createdAt?.toDate?.().toLocaleDateString() || 'N/A'}
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprovePending(pending.id)}
                        disabled={processingPending === pending.id}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        {processingPending === pending.id ? (
                          <LoadingSpinner size="small" />
                        ) : (
                          <FiCheckCircle />
                        )}
                        {t('guests.approve')}
                      </button>
                      <button
                        onClick={() => handleRejectPending(pending.id)}
                        disabled={processingPending === pending.id}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        <FiXCircle />
                        {t('guests.reject')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search and Filters - Only show for guests tab */}
      {activeTab === 'guests' && (
      <>
      <div className="bg-white rounded-2xl shadow-xl p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t('guests.searchGuest')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input"
            >
              <option value="all">{t('guests.allStatuses')}</option>
              <option value="present">{t('guests.presents')}</option>
              <option value="absent">{t('guests.absents')}</option>
            </select>
            <select
              value={filterTicketType}
              onChange={(e) => setFilterTicketType(e.target.value)}
              className="input"
            >
              <option value="all">{t('guests.allTickets')}</option>
              <option value="single">{t('guests.single')}</option>
              <option value="couple">{t('guests.couple')}</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input bg-purple-50 border-purple-200"
            >
              <option value="name_asc">{t('guests.sortNameAsc')}</option>
              <option value="name_desc">{t('guests.sortNameDesc')}</option>
              <option value="firstname_asc">{t('guests.sortFirstNameAsc')}</option>
              <option value="firstname_desc">{t('guests.sortFirstNameDesc')}</option>
              <option value="date_recent">{t('guests.sortDateRecent')}</option>
              <option value="date_oldest">{t('guests.sortDateOldest')}</option>
              <option value="table">{t('guests.sortByTable')}</option>
              <option value="relation">{t('guests.sortByRelation')}</option>
              <option value="status_present">{t('guests.sortPresentFirst')}</option>
              <option value="status_absent">{t('guests.sortAbsentFirst')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Guests List */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        {sortedGuests.length === 0 ? (
          <div className="text-center py-12">
            <FiUsers className="text-6xl text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {guests.length === 0 
                ? t('guests.noGuests') 
                : t('guests.noMatchingGuests')}
            </p>
            {guests.length === 0 && (
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 btn btn-primary inline-flex items-center gap-2"
              >
                <FiUserPlus />
                {t('guests.addFirstGuest')}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">{t('guests.guest')}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">{t('guests.gender')}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">{t('guests.relation')}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">{t('guests.type')}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">{t('guests.table')}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">{t('guests.statusClick')}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t('guests.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedGuests.map((guest) => (
                  <tr key={guest.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-gray-800">
                          {guest.firstName} {guest.lastName}
                        </p>
                        {guest.ticketType === 'couple' && (
                          <p className="text-sm text-pink-500 flex items-center gap-1">
                            <FiHeart className="text-xs" />
                            {guest.spouseFirstName} {guest.spouseLastName}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-gray-600">
                      {guest.gender === 'homme' ? `👨 ${t('guests.male')}` : `👩 ${t('guests.female')}`}
                    </td>
                    <td className="px-4 py-4 text-gray-600 text-sm">
                      {guest.relation ? t(`relations.${guest.relation}`, guest.relation) : '-'}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        guest.ticketType === 'couple' 
                          ? 'bg-pink-100 text-pink-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {guest.ticketType === 'couple' ? `💕 ${t('guests.couple')}` : `👤 ${t('guests.single')}`}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-gray-600 text-sm">
                      {guest.tableName || <span className="text-gray-400">{t('guests.notAssigned')}</span>}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1">
                        {/* Bouton statut principal - cliquable */}
                        <button
                          onClick={() => toggleGuestPresence(guest, false)}
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all hover:scale-105 cursor-pointer ${
                            guest.isPresent 
                              ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                          title={`Cliquez pour marquer ${guest.firstName} comme ${guest.isPresent ? t('guests.absent') : t('guests.present')}`}
                        >
                          {guest.isPresent ? <FiCheck /> : <FiX />}
                          {guest.isPresent ? t('guests.present') : t('guests.absent')}
                        </button>
                        {/* Bouton statut conjoint - cliquable */}
                        {guest.ticketType === 'couple' && (
                          <button
                            onClick={() => toggleGuestPresence(guest, true)}
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all hover:scale-105 cursor-pointer ${
                              guest.spouseIsPresent 
                                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                            }`}
                            title={`Cliquez pour marquer ${guest.spouseFirstName} comme ${guest.spouseIsPresent ? t('guests.absent') : t('guests.present')}`}
                          >
                            {guest.spouseIsPresent ? <FiCheck /> : <FiX />}
                            {guest.spouseFirstName}: {guest.spouseIsPresent ? t('guests.present') : t('guests.absent')}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => generatePdfForGuest(guest, false)}
                          disabled={generatingPdf === guest.id}
                          className="p-2 rounded-lg text-purple-500 hover:bg-purple-50 transition-colors disabled:opacity-50"
                          title={t('guests.downloadPdf')}
                        >
                          {generatingPdf === guest.id ? (
                            <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <FiDownload />
                          )}
                        </button>
                        {guest.ticketType === 'couple' && (
                          <button
                            onClick={() => generatePdfForGuest(guest, true)}
                            disabled={generatingPdf === guest.id}
                            className="p-2 rounded-lg text-pink-500 hover:bg-pink-50 transition-colors disabled:opacity-50"
                            title={`PDF pour ${guest.spouseFirstName}`}
                          >
                            <FiHeart />
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(guest)}
                          className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
                          title={t('guests.edit')}
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(guest)}
                          className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                          title={t('guests.deleteGuest')}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>
      )}

      {/* Add Guest Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">{t('guests.addGuest')}</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 rounded-lg hover:bg-gray-100"
                >
                  <FiX />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleAddGuest} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('guests.firstName')} *</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    className="input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('guests.lastName')} *</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    className="input w-full"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('guests.gender')}</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({...formData, gender: e.target.value})}
                    className="input w-full"
                  >
                    <option value="homme">{t('guests.male')}</option>
                    <option value="femme">{t('guests.female')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('guests.ticketType')}</label>
                  <select
                    value={formData.ticketType}
                    onChange={(e) => setFormData({...formData, ticketType: e.target.value})}
                    className="input w-full"
                  >
                    <option value="single">{t('guests.single')}</option>
                    <option value="couple">{t('guests.couple')}</option>
                  </select>
                </div>
              </div>
              
              {formData.ticketType === 'couple' && (
                <div className="bg-pink-50 rounded-xl p-4 border border-pink-200">
                  <h3 className="font-medium text-pink-800 mb-3 flex items-center gap-2">
                    <FiHeart />
                    {t('guests.spouseInfo')}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('guests.firstName')} *</label>
                      <input
                        type="text"
                        value={formData.spouseFirstName}
                        onChange={(e) => setFormData({...formData, spouseFirstName: e.target.value})}
                        className="input w-full"
                        required={formData.ticketType === 'couple'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('guests.lastName')} *</label>
                      <input
                        type="text"
                        value={formData.spouseLastName}
                        onChange={(e) => setFormData({...formData, spouseLastName: e.target.value})}
                        className="input w-full"
                        required={formData.ticketType === 'couple'}
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('guests.gender')}</label>
                    <select
                      value={formData.spouseGender}
                      onChange={(e) => setFormData({...formData, spouseGender: e.target.value})}
                      className="input w-full"
                    >
                      <option value="homme">{t('guests.male')}</option>
                      <option value="femme">{t('guests.female')}</option>
                    </select>
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('guests.relation')}</label>
                <select
                  value={formData.relation}
                  onChange={(e) => setFormData({...formData, relation: e.target.value})}
                  className="input w-full"
                >
                  <option value="">{t('guests.selectRelation')}</option>
                  {RELATION_KEYS.map(relKey => (
                    <option key={relKey} value={relKey}>{t(`relations.${relKey}`)}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('guests.tableOptional')}</label>
                <select
                  value={formData.tableId}
                  onChange={(e) => setFormData({...formData, tableId: e.target.value})}
                  className="input w-full"
                >
                  <option value="">{t('guests.notAssigned')}</option>
                  {tables.map(table => (
                    <option key={table.id} value={table.id}>
                      {table.name} ({guests.filter(g => g.tableId === table.id).length}/{table.capacity})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 btn bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 btn btn-primary"
                >
                  {t('guests.addTheGuest')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Guest Modal */}
      {showEditModal && selectedGuest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">{t('guests.editGuest')}</h2>
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedGuest(null)
                    resetForm()
                  }}
                  className="p-2 rounded-lg hover:bg-gray-100"
                >
                  <FiX />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleEditGuest} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('guests.firstName')} *</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    className="input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('guests.lastName')} *</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    className="input w-full"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('guests.gender')}</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({...formData, gender: e.target.value})}
                    className="input w-full"
                  >
                    <option value="homme">{t('guests.male')}</option>
                    <option value="femme">{t('guests.female')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('guests.ticketType')}</label>
                  <select
                    value={formData.ticketType}
                    onChange={(e) => setFormData({...formData, ticketType: e.target.value})}
                    className="input w-full"
                  >
                    <option value="single">{t('guests.single')}</option>
                    <option value="couple">{t('guests.couple')}</option>
                  </select>
                </div>
              </div>
              
              {formData.ticketType === 'couple' && (
                <div className="bg-pink-50 rounded-xl p-4 border border-pink-200">
                  <h3 className="font-medium text-pink-800 mb-3 flex items-center gap-2">
                    <FiHeart />
                    {t('guests.spouseInfo')}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('guests.firstName')} *</label>
                      <input
                        type="text"
                        value={formData.spouseFirstName}
                        onChange={(e) => setFormData({...formData, spouseFirstName: e.target.value})}
                        className="input w-full"
                        required={formData.ticketType === 'couple'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('guests.lastName')} *</label>
                      <input
                        type="text"
                        value={formData.spouseLastName}
                        onChange={(e) => setFormData({...formData, spouseLastName: e.target.value})}
                        className="input w-full"
                        required={formData.ticketType === 'couple'}
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('guests.gender')}</label>
                    <select
                      value={formData.spouseGender}
                      onChange={(e) => setFormData({...formData, spouseGender: e.target.value})}
                      className="input w-full"
                    >
                      <option value="homme">{t('guests.male')}</option>
                      <option value="femme">{t('guests.female')}</option>
                    </select>
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('guests.relation')}</label>
                <select
                  value={formData.relation}
                  onChange={(e) => setFormData({...formData, relation: e.target.value})}
                  className="input w-full"
                >
                  <option value="">{t('guests.selectRelation')}</option>
                  {RELATION_KEYS.map(relKey => (
                    <option key={relKey} value={relKey}>{t(`relations.${relKey}`)}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('guests.table')}</label>
                <select
                  value={formData.tableId}
                  onChange={(e) => setFormData({...formData, tableId: e.target.value})}
                  className="input w-full"
                >
                  <option value="">{t('guests.notAssigned')}</option>
                  {tables.map(table => (
                    <option key={table.id} value={table.id}>
                      {table.name} ({guests.filter(g => g.tableId === table.id && g.id !== selectedGuest?.id).length}/{table.capacity})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedGuest(null)
                    resetForm()
                  }}
                  className="flex-1 btn bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 btn btn-primary"
                >
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2">{t('common.confirmDelete')}</h3>
            <p className="text-gray-600 mb-6">
              {t('common.confirmDeleteMessage')}{' '}
              <strong>{deleteConfirm.firstName} {deleteConfirm.lastName}</strong>
              {deleteConfirm.ticketType === 'couple' && (
                <> {t('common.and')} <strong>{deleteConfirm.spouseFirstName} {deleteConfirm.spouseLastName}</strong></>
              )} ?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 btn bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => handleDeleteGuest(deleteConfirm.id)}
                className="flex-1 btn bg-red-500 text-white hover:bg-red-600"
              >
                {t('guests.deleteGuest')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
