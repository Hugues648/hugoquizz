import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { 
  getEventById, 
  updateEvent, 
  deleteEvent,
  getGiftsByEvent,
  createGift,
  updateGift,
  deleteGift,
  getGiftSelectionsByGift,
  deleteGiftSelection
} from '../services/firestore'
import { deleteFileFromStorage, deleteMultipleFilesFromStorage } from '../services/storage'
import { 
  FiArrowLeft, FiSave, FiTrash2, FiPlus, FiEdit2, FiGift, 
  FiExternalLink, FiDollarSign, FiFileText, FiImage, FiUsers,
  FiEye, FiLink, FiCheck, FiX, FiChevronDown, FiChevronUp,
  FiBook, FiMail, FiCamera, FiMusic, FiEyeOff
} from 'react-icons/fi'
import LoadingSpinner from '../components/LoadingSpinner'
import ImageUpload from '../components/ImageUpload'

const EVENT_TYPES = [
  { value: 'mariage', labelKey: 'home.eventTypes.wedding', emoji: '💒' },
  { value: 'anniversaire', labelKey: 'home.eventTypes.birthday', emoji: '🎂' },
  { value: 'naissance', labelKey: 'home.eventTypes.birth', emoji: '👶' },
  { value: 'bapteme', labelKey: 'home.eventTypes.baptism', emoji: '⛪' },
  { value: 'cremaillere', labelKey: 'home.eventTypes.housewarming', emoji: '🏠' },
  { value: 'noel', labelKey: 'home.eventTypes.christmas', emoji: '🎄' },
  { value: 'autre', labelKey: 'events.create.other', emoji: '🎉' }
]

export default function EditEvent() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [event, setEvent] = useState(null)
  const [gifts, setGifts] = useState([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showGiftForm, setShowGiftForm] = useState(false)
  const [editingGift, setEditingGift] = useState(null)
  const [expandedSection, setExpandedSection] = useState('details')
  const [selectionToDelete, setSelectionToDelete] = useState(null)
  const [galleryUploadKey, setGalleryUploadKey] = useState(0)
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'mariage',
    date: '',
    description: '',
    imageUrl: '',
    isPublic: true,
    story: '',
    invitationImageUrl: '',
    invitationLetter: '',
    showInvitationTicket: true,
    backgroundMusicUrl: '',
    galleryPhotos: [],
    guestbookPublic: true
  })

  const [giftForm, setGiftForm] = useState({
    name: '',
    description: '',
    imageUrl: '',
    externalUrl: '',
    price: '',
    notes: '',
    allowMultiple: false,
    maxSelections: 1,
    giftType: 'article',
    targetAmount: ''
  })

  useEffect(() => {
    loadEvent()
  }, [id])

  const loadEvent = async () => {
    try {
      const eventData = await getEventById(id)
      if (!eventData) {
        setError('Événement non trouvé')
        return
      }
      if (eventData.userId !== user.uid) {
        setError('Vous n\'êtes pas autorisé à modifier cet événement')
        return
      }
      setEvent(eventData)
      setFormData({
        name: eventData.name || '',
        type: eventData.type || 'autre',
        date: eventData.date || '',
        description: eventData.description || '',
        imageUrl: eventData.imageUrl || '',
        isPublic: eventData.isPublic !== false,
        story: eventData.story || '',
        invitationImageUrl: eventData.invitationImageUrl || '',
        invitationLetter: eventData.invitationLetter || '',
        showInvitationTicket: eventData.showInvitationTicket !== false,
        backgroundMusicUrl: eventData.backgroundMusicUrl || '',
        galleryPhotos: eventData.galleryPhotos || [],
        guestbookPublic: eventData.guestbookPublic !== false
      })
      
      // Load gifts
      const giftsData = await getGiftsByEvent(id)
      // Load selections for each gift
      const giftsWithSelections = await Promise.all(
        giftsData.map(async (gift) => {
          const selections = await getGiftSelectionsByGift(gift.id)
          return { ...gift, selections }
        })
      )
      setGifts(giftsWithSelections)
    } catch (err) {
      console.error('Erreur chargement événement:', err)
      setError(t('events.edit.loadError'))
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleGiftChange = (e) => {
    const { name, value, type, checked } = e.target
    setGiftForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const addGalleryPhoto = (url) => {
    if (url && formData.galleryPhotos.length < 10) {
      setFormData(prev => ({
        ...prev,
        galleryPhotos: [...prev.galleryPhotos, url]
      }))
      // Réinitialiser le composant ImageUpload pour permettre l'ajout d'une nouvelle photo
      setGalleryUploadKey(prev => prev + 1)
    }
  }

  const updateGalleryPhoto = (index, url) => {
    setFormData(prev => ({
      ...prev,
      galleryPhotos: prev.galleryPhotos.map((p, i) => i === index ? url : p)
    }))
  }

  const removeGalleryPhoto = async (index) => {
    const photoUrl = formData.galleryPhotos[index]
    
    // Supprimer du Storage si c'est une URL Firebase
    if (photoUrl) {
      try {
        await deleteFileFromStorage(photoUrl)
      } catch (err) {
        console.error('Error deleting gallery photo from storage:', err)
      }
    }
    
    setFormData(prev => ({
      ...prev,
      galleryPhotos: prev.galleryPhotos.filter((_, i) => i !== index)
    }))
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError(t('events.create.eventNameRequired'))
      return
    }

    setSaving(true)
    setError('')
    
    try {
      // Filtrer les photos vides avant la sauvegarde
      const dataToSave = {
        ...formData,
        galleryPhotos: formData.galleryPhotos.filter(p => p)
      }
      await updateEvent(id, dataToSave)
      setSuccess(t('events.edit.updateSuccess'))
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Erreur sauvegarde:', err)
      setError(t('events.edit.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteEvent(id)
      navigate('/dashboard')
    } catch (err) {
      console.error('Erreur suppression:', err)
      setError(t('events.edit.deleteError'))
    }
  }

  const resetGiftForm = () => {
    setGiftForm({
      name: '',
      description: '',
      imageUrl: '',
      externalUrl: '',
      price: '',
      notes: '',
      allowMultiple: false,
      maxSelections: 1,
      giftType: 'article',
      targetAmount: ''
    })
    setEditingGift(null)
  }

  const handleAddGift = async () => {
    if (!giftForm.name.trim()) {
      setError(t('events.gifts.giftNameRequired'))
      return
    }

    setSaving(true)
    setError('')

    try {
      if (editingGift) {
        await updateGift(editingGift.id, {
          ...giftForm,
          price: giftForm.price ? parseFloat(giftForm.price) : null,
          maxSelections: giftForm.allowMultiple ? parseInt(giftForm.maxSelections) || 0 : 1,
          giftType: giftForm.giftType || 'article',
          targetAmount: giftForm.targetAmount ? parseFloat(giftForm.targetAmount) : null
        })
      } else {
        await createGift({
          ...giftForm,
          eventId: id,
          price: giftForm.price ? parseFloat(giftForm.price) : null,
          maxSelections: giftForm.allowMultiple ? parseInt(giftForm.maxSelections) || 0 : 1,
          giftType: giftForm.giftType || 'article',
          targetAmount: giftForm.targetAmount ? parseFloat(giftForm.targetAmount) : null,
          order: gifts.length
        })
      }
      
      await loadEvent()
      setShowGiftForm(false)
      resetGiftForm()
      setSuccess(editingGift ? t('events.gifts.giftUpdated') : t('events.gifts.giftAdded'))
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Erreur cadeau:', err)
      setError(t('events.gifts.giftSaveError'))
    } finally {
      setSaving(false)
    }
  }

  const handleEditGift = (gift) => {
    setGiftForm({
      name: gift.name || '',
      description: gift.description || '',
      imageUrl: gift.imageUrl || '',
      externalUrl: gift.externalUrl || '',
      price: gift.price ? String(gift.price) : '',
      notes: gift.notes || '',
      allowMultiple: gift.allowMultiple || false,
      maxSelections: gift.maxSelections || 1,
      giftType: gift.giftType || 'article',
      targetAmount: gift.targetAmount ? String(gift.targetAmount) : ''
    })
    setEditingGift(gift)
    setShowGiftForm(true)
  }

  const handleDeleteGift = async (giftId) => {
    if (!confirm(t('events.gifts.deleteGiftConfirm'))) return
    
    try {
      await deleteGift(giftId)
      await loadEvent()
      setSuccess(t('events.gifts.giftDeleted'))
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Erreur suppression cadeau:', err)
      setError(t('events.edit.deleteError'))
    }
  }

  const handleDeleteSelection = async (selectionId) => {
    try {
      await deleteGiftSelection(selectionId)
      setSelectionToDelete(null)
      await loadEvent()
      setSuccess(t('events.edit.reservationDeleted'))
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Erreur suppression réservation:', err)
      setError(t('events.edit.reservationDeleteError'))
    }
  }

  const copyLink = () => {
    const url = `${window.location.origin}/event/${id}`
    navigator.clipboard.writeText(url)
    setSuccess(t('events.edit.linkCopied'))
    setTimeout(() => setSuccess(''), 2000)
  }

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  if (loading) return <LoadingSpinner />

  if (error && !event) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
          >
            {t('nav.backToDashboard')}
          </button>
        </div>
      </div>
    )
  }

  const eventType = EVENT_TYPES.find(t => t.value === formData.type)
  const totalSelections = gifts.reduce((sum, g) => sum + (g.selections?.length || 0), 0)

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              {eventType?.emoji} {formData.name || 'Événement'}
            </h1>
            <p className="text-gray-600 text-sm">
              {gifts.length} {t('events.gifts.gift', { count: gifts.length })} • {totalSelections} {t('events.edit.reservation', { count: totalSelections })}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={copyLink}
            className="px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
            title="Copier le lien"
          >
            <FiLink className="w-4 h-4" />
          </button>
          <button
            onClick={() => window.open(`/event/${id}`, '_blank')}
            className="px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
            title="Voir la page publique"
          >
            <FiEye className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate(`/event/${id}/visitors`)}
            className="px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
            title="Voir les visiteurs"
          >
            <FiUsers className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
          <FiCheck className="w-4 h-4" />
          {success}
        </div>
      )}

      <div className="space-y-4">
        {/* Section 1: Détails de base */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <button
            onClick={() => toggleSection('details')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-pink-50 transition-colors"
          >
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center">
                <FiFileText className="w-4 h-4 text-pink-600" />
              </div>
              <span>{t('events.edit.eventDetails')}</span>
            </h2>
            {expandedSection === 'details' ? <FiChevronUp /> : <FiChevronDown />}
          </button>
          
          {expandedSection === 'details' && (
            <div className="px-6 pb-6 space-y-4 border-t bg-pink-50/30">
              <div className="pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('events.create.eventName')} *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.type')}</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                  >
                    {EVENT_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.emoji} {t(type.labelKey)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.date')}</label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('events.create.shortDescription')}</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={2}
                  placeholder={t('events.create.shortDescriptionPlaceholder')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('events.create.coverImage')}</label>
                <ImageUpload
                  value={formData.imageUrl}
                  onChange={(url) => setFormData(prev => ({ ...prev, imageUrl: url }))}
                  folder="events"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="isPublic"
                  id="isPublic"
                  checked={formData.isPublic}
                  onChange={handleChange}
                  className="w-4 h-4 text-pink-500 border-gray-300 rounded focus:ring-pink-500"
                />
                <label htmlFor="isPublic" className="text-sm text-gray-700">
                  {t('events.create.publicEventWithLink')}
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Histoire */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <button
            onClick={() => toggleSection('story')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-purple-50 transition-colors"
          >
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <FiBook className="w-4 h-4 text-purple-600" />
              </div>
              <span>{t('events.edit.ourStory')}</span>
              {formData.story && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{t('events.edit.configured')}</span>}
            </h2>
            {expandedSection === 'story' ? <FiChevronUp /> : <FiChevronDown />}
          </button>
          
          {expandedSection === 'story' && (
            <div className="px-6 pb-6 border-t bg-purple-50/30">
              <div className="pt-4">
                <p className="text-sm text-gray-600 mb-3">
                  {t('events.edit.storyDesc')}
                </p>
                <textarea
                  name="story"
                  value={formData.story}
                  onChange={handleChange}
                  rows={6}
                  placeholder={t('events.edit.storyPlaceholder')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Invitation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <button
            onClick={() => toggleSection('invitation')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-amber-50 transition-colors"
          >
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                <FiMail className="w-4 h-4 text-amber-600" />
              </div>
              <span>{t('events.edit.personalizedInvitation')}</span>
              {(formData.invitationImageUrl || formData.invitationLetter) && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{t('events.edit.configured')}</span>
              )}
            </h2>
            {expandedSection === 'invitation' ? <FiChevronUp /> : <FiChevronDown />}
          </button>
          
          {expandedSection === 'invitation' && (
            <div className="px-6 pb-6 space-y-4 border-t bg-amber-50/30">
              <div className="pt-4">
                <p className="text-sm text-gray-600 mb-4">
                  {t('events.edit.invitationDesc')}
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('events.edit.invitationImagePage1')}
                    </label>
                    <ImageUpload
                      value={formData.invitationImageUrl}
                      onChange={(url) => setFormData(prev => ({ ...prev, invitationImageUrl: url }))}
                      folder="invitations"
                    />
                    <p className="mt-1 text-xs text-gray-500">{t('events.edit.formatRecommendation')}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('events.edit.letterTextPage2')}
                    </label>
                    <textarea
                      name="invitationLetter"
                      value={formData.invitationLetter}
                      onChange={handleChange}
                      rows={8}
                      placeholder={t('events.edit.letterPlaceholder')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none font-serif"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      {t('events.edit.guestNameAutoAdded')}
                    </p>
                  </div>

                  {/* Visibilité du billet */}
                  <div className="flex items-center justify-between p-4 bg-amber-50 rounded-xl border border-amber-200">
                    <div className="flex items-center gap-3">
                      {formData.showInvitationTicket ? (
                        <FiEye className="w-5 h-5 text-green-600" />
                      ) : (
                        <FiEyeOff className="w-5 h-5 text-orange-600" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">
                          {formData.showInvitationTicket ? t('events.create.showInvitationTicket') : t('events.create.hideInvitationTicket')}
                        </p>
                        <p className="text-sm text-gray-600">
                          {formData.showInvitationTicket 
                            ? t('events.create.showInvitationTicketDesc')
                            : t('events.create.hideInvitationTicketDesc')}
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.showInvitationTicket}
                        onChange={(e) => setFormData(prev => ({ ...prev, showInvitationTicket: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section Musique de fond */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <button
            onClick={() => toggleSection('music')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-violet-50 transition-colors"
          >
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
                <FiMusic className="w-4 h-4 text-violet-600" />
              </div>
              <span>{t('events.create.backgroundMusic')}</span>
              {formData.backgroundMusicUrl && <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">{t('events.edit.configured')}</span>}
            </h2>
            {expandedSection === 'music' ? <FiChevronUp /> : <FiChevronDown />}
          </button>
          
          {expandedSection === 'music' && (
            <div className="px-6 pb-6 border-t bg-violet-50/30">
              <div className="pt-4 space-y-4">
                <p className="text-sm text-gray-600">🎵 {t('events.create.backgroundMusicDesc')}</p>

                {formData.backgroundMusicUrl ? (
                  <div className="p-4 bg-violet-50 rounded-xl border border-violet-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <FiMusic className="w-5 h-5 text-violet-600" />
                        <span className="font-medium text-violet-800">{t('events.create.musicPlaying')}</span>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await deleteFileFromStorage(formData.backgroundMusicUrl)
                          } catch (e) { console.error(e) }
                          setFormData(prev => ({ ...prev, backgroundMusicUrl: '' }))
                        }}
                        className="text-red-500 hover:text-red-700 flex items-center gap-1 text-sm"
                      >
                        <FiTrash2 className="w-4 h-4" />
                        {t('events.create.removeMusic')}
                      </button>
                    </div>
                    <audio controls className="w-full" src={formData.backgroundMusicUrl} />
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">{t('events.create.musicFormats')}</p>
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-violet-300 rounded-xl cursor-pointer bg-violet-50 hover:bg-violet-100 transition-colors">
                      <FiMusic className="w-8 h-8 text-violet-400 mb-2" />
                      <span className="text-sm text-violet-600 font-medium">{t('events.create.uploadMusic')}</span>
                      <input
                        type="file"
                        accept="audio/mp3,audio/wav,audio/ogg,audio/mpeg,audio/mp4,audio/x-m4a,audio/aac,.m4a,.mp3,.wav,.ogg"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files[0]
                          if (!file) return
                          if (file.size > 10 * 1024 * 1024) {
                            setError(t('events.create.musicFormats'))
                            return
                          }
                          try {
                            const { uploadFile } = await import('../services/storage')
                            const url = await uploadFile(file, 'music')
                            setFormData(prev => ({ ...prev, backgroundMusicUrl: url }))
                          } catch (err) {
                            console.error('Error uploading music:', err)
                            setError('Erreur upload musique')
                          }
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Section 4: Galerie photos */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <button
            onClick={() => toggleSection('gallery')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-emerald-50 transition-colors"
          >
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <FiCamera className="w-4 h-4 text-emerald-600" />
              </div>
              <span>{t('events.create.photoGallery')}</span>
              {formData.galleryPhotos.length > 0 && (
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                  {formData.galleryPhotos.length} photo{formData.galleryPhotos.length > 1 ? 's' : ''}
                </span>
              )}
            </h2>
            {expandedSection === 'gallery' ? <FiChevronUp /> : <FiChevronDown />}
          </button>
          
          {expandedSection === 'gallery' && (
            <div className="px-6 pb-6 border-t bg-emerald-50/30">
              <div className="pt-4">
                <p className="text-sm text-gray-600 mb-4">
                  {t('events.edit.galleryDesc')}
                </p>
                
                {/* Aperçu du collage */}
                {formData.galleryPhotos.filter(p => p && p.trim()).length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <FiImage className="w-4 h-4 text-emerald-600" />
                      {t('events.create.collagePreview')}
                    </h3>
                    <div className="relative rounded-xl overflow-hidden shadow-lg bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100 p-1">
                      <div className="grid grid-cols-4 grid-rows-2 gap-1 rounded-lg overflow-hidden" style={{ minHeight: '200px' }}>
                        {formData.galleryPhotos.filter(p => p && p.trim()).map((photo, index) => {
                          // Layout dynamique selon le nombre de photos
                          const count = formData.galleryPhotos.filter(p => p && p.trim()).length
                          let colSpan = 'col-span-1'
                          let rowSpan = 'row-span-1'
                          
                          if (count === 1) {
                            colSpan = 'col-span-4'
                            rowSpan = 'row-span-2'
                          } else if (count === 2) {
                            colSpan = 'col-span-2'
                            rowSpan = 'row-span-2'
                          } else if (count === 3) {
                            if (index === 0) { colSpan = 'col-span-2'; rowSpan = 'row-span-2' }
                            else { colSpan = 'col-span-2'; rowSpan = 'row-span-1' }
                          } else if (count === 4) {
                            colSpan = 'col-span-2'
                            rowSpan = 'row-span-1'
                          } else if (index === 0) {
                            colSpan = 'col-span-2'
                            rowSpan = 'row-span-2'
                          }
                          
                          return (
                            <div 
                              key={index}
                              className={`relative overflow-hidden ${colSpan} ${rowSpan} group`}
                            >
                              <img
                                src={photo}
                                alt={`Photo ${index + 1}`}
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                              <div className="absolute bottom-1 right-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                {index + 1}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        <FiImage className="w-3 h-3" />
                        {formData.galleryPhotos.filter(p => p && p.trim()).length} photos
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Grille d'upload */}
                <h3 className="text-sm font-medium text-gray-700 mb-3">{t('events.create.managePhotos')}</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {formData.galleryPhotos.filter(photo => photo).map((photo, index) => (
                    <div key={index} className="relative">
                      <div className="h-32 rounded-lg overflow-hidden bg-gray-100">
                        <img
                          src={photo}
                          alt={`Photo ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeGalleryPhoto(formData.galleryPhotos.indexOf(photo))}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-lg z-10"
                      >
                        <FiX className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  
                  {formData.galleryPhotos.length < 10 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-2">
                        {formData.galleryPhotos.filter(p => p).length}/10 photos
                      </p>
                      <ImageUpload
                        key={galleryUploadKey}
                        value=""
                        onChange={addGalleryPhoto}
                        folder="gallery"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bouton Sauvegarder global */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:from-pink-600 hover:to-purple-600 disabled:opacity-50 flex items-center justify-center gap-2 font-semibold shadow-lg"
            >
              <FiSave className="w-5 h-5" />
              {saving ? t('events.edit.saving') : t('events.edit.saveAllChanges')}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2 border border-red-200"
            >
              <FiTrash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Section Cadeaux */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <button
            onClick={() => toggleSection('gifts')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-pink-50 transition-colors"
          >
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center">
                <FiGift className="w-4 h-4 text-pink-600" />
              </div>
              <span>{t('events.gifts.title')}</span>
              <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full">
                {gifts.length} {t('events.gifts.gift', { count: gifts.length })}
              </span>
            </h2>
            {expandedSection === 'gifts' ? <FiChevronUp /> : <FiChevronDown />}
          </button>

          {expandedSection === 'gifts' && (
            <div className="px-6 pb-6 border-t">
              {/* Liste des cadeaux */}
              {gifts.length > 0 ? (
                <div className="space-y-3 mt-4">
                  {gifts.map(gift => {
                    const totalQuantity = (gift.selections || []).reduce((sum, sel) => sum + (sel.quantity || 1), 0)
                    const selectionsCount = gift.selections?.length || 0
                    const isReserved = gift.allowMultiple 
                      ? (gift.maxSelections > 0 && totalQuantity >= gift.maxSelections)
                      : totalQuantity > 0

                    return (
                      <div 
                        key={gift.id} 
                        className={`p-4 rounded-lg border ${isReserved ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}
                      >
                        <div className="flex gap-4">
                          {gift.imageUrl && (
                            <img 
                              src={gift.imageUrl} 
                              alt={gift.name}
                              className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                              onError={(e) => e.target.style.display = 'none'}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3 className="font-medium text-gray-900">{gift.name}</h3>
                                {gift.price && (
                                  <p className="text-sm text-gray-600">{gift.price}€</p>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                {gift.externalUrl && (
                                  <a
                                    href={gift.externalUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 text-gray-500 hover:text-gray-700"
                                  >
                                    <FiExternalLink className="w-4 h-4" />
                                  </a>
                                )}
                                <button
                                  onClick={() => handleEditGift(gift)}
                                  className="p-1.5 text-gray-500 hover:text-blue-600"
                                >
                                  <FiEdit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteGift(gift.id)}
                                  className="p-1.5 text-gray-500 hover:text-red-600"
                                >
                                  <FiTrash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            {gift.description && (
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{gift.description}</p>
                            )}
                            
                            {/* Réservations */}
                            {totalQuantity > 0 && (
                              <div className="mt-2 pt-2 border-t border-gray-200">
                                <p className="text-xs text-gray-500 mb-1">
                                  <FiUsers className="inline mr-1" />
                                  {(gift.giftType === 'money' || gift.giftType === 'shared') 
                                    ? `${selectionsCount} contribution${selectionsCount > 1 ? 's' : ''}`
                                    : `${totalQuantity} réservation${totalQuantity > 1 ? 's' : ''}${gift.allowMultiple && gift.maxSelections > 0 ? ` / ${gift.maxSelections}` : ''}`
                                  }
                                  {(gift.giftType === 'money' || gift.giftType === 'shared') && (
                                    <span className="ml-2 font-bold text-amber-700">
                                      — Total: {gift.selections.reduce((s, sel) => s + (sel.amount || 0), 0).toFixed(0)}€
                                      {gift.giftType === 'shared' && gift.targetAmount && ` / ${gift.targetAmount}€`}
                                    </span>
                                  )}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {gift.selections.map(sel => {
                                    const qty = sel.quantity || 1
                                    return (
                                      <div 
                                        key={sel.id} 
                                        className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${sel.isAnonymous ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}
                                        title={sel.message ? `Message: ${sel.message}` : ''}
                                      >
                                        <span>
                                          {(gift.giftType === 'money' || gift.giftType === 'shared') && sel.amount
                                            ? `${sel.amount}€ — `
                                            : (qty > 1 ? `${qty}× ` : '')
                                          }
                                          {sel.guestName}
                                        </span>
                                        {sel.isAnonymous && <span className="text-purple-500">(anonyme)</span>}
                                        <button
                                          type="button"
                                          onClick={() => setSelectionToDelete(sel)}
                                          className="ml-1 w-4 h-4 flex items-center justify-center bg-red-100 hover:bg-red-300 text-red-600 hover:text-red-800 rounded-full transition-colors"
                                          title="Supprimer cette réservation"
                                        >
                                          <FiX className="w-3 h-3" />
                                        </button>
                                      </div>
                                    )
                                  })}
                                </div>
                                {/* Messages des réservations */}
                                {gift.selections.some(sel => sel.message) && (
                                  <div className="mt-2 space-y-1">
                                    {gift.selections.filter(sel => sel.message).map(sel => (
                                      <div key={sel.id} className="text-xs text-gray-600 bg-white p-2 rounded border border-gray-200">
                                        <span className="font-medium">{sel.guestName}:</span> {sel.message}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FiGift className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>{t('events.gifts.noGifts')}</p>
                  <p className="text-sm">{t('events.gifts.addFirst')}</p>
                </div>
              )}

              {/* Formulaire d'ajout de cadeau */}
              {showGiftForm ? (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="font-medium mb-4">
                    {editingGift ? t('events.gifts.editGift') : t('events.gifts.addGift')}
                  </h3>
                  <div className="space-y-3">
                    {/* Type de cadeau */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('events.gifts.giftType')} *</label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setGiftForm(prev => ({ ...prev, giftType: 'article' }))}
                          className={`p-3 rounded-lg border-2 text-center transition-all ${giftForm.giftType === 'article' ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-gray-200 hover:border-gray-300'}`}
                        >
                          <span className="text-xl block mb-1">🎁</span>
                          <span className="text-xs font-medium">{t('events.gifts.typeArticle')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setGiftForm(prev => ({ ...prev, giftType: 'money' }))}
                          className={`p-3 rounded-lg border-2 text-center transition-all ${giftForm.giftType === 'money' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 hover:border-gray-300'}`}
                        >
                          <span className="text-xl block mb-1">💰</span>
                          <span className="text-xs font-medium">{t('events.gifts.typeMoney')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setGiftForm(prev => ({ ...prev, giftType: 'shared' }))}
                          className={`p-3 rounded-lg border-2 text-center transition-all ${giftForm.giftType === 'shared' ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 hover:border-gray-300'}`}
                        >
                          <span className="text-xl block mb-1">🤝</span>
                          <span className="text-xs font-medium">{t('events.gifts.typeShared')}</span>
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {giftForm.giftType === 'article' && t('events.gifts.typeArticleDesc')}
                        {giftForm.giftType === 'money' && t('events.gifts.typeMoneyDesc')}
                        {giftForm.giftType === 'shared' && t('events.gifts.typeSharedDesc')}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.name')} *</label>
                      <input
                        type="text"
                        name="name"
                        value={giftForm.name}
                        onChange={handleGiftChange}
                        placeholder={giftForm.giftType === 'money' ? t('events.gifts.moneyGiftName') : t('events.gifts.giftNamePlaceholder')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.description')}</label>
                      <textarea
                        name="description"
                        value={giftForm.description}
                        onChange={handleGiftChange}
                        rows={2}
                        placeholder={giftForm.giftType === 'money' ? t('events.gifts.moneyGiftDesc') : ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 resize-none"
                      />
                    </div>

                    {/* Prix - seulement pour article et shared */}
                    {giftForm.giftType !== 'money' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            <FiDollarSign className="inline mr-1" />
                            {giftForm.giftType === 'shared' ? t('events.gifts.targetAmount') : t('events.gifts.giftPrice')}
                          </label>
                          <input
                            type="number"
                            name={giftForm.giftType === 'shared' ? 'targetAmount' : 'price'}
                            value={giftForm.giftType === 'shared' ? giftForm.targetAmount : giftForm.price}
                            onChange={handleGiftChange}
                            placeholder={giftForm.giftType === 'shared' ? t('events.gifts.targetAmountPlaceholder') : '0'}
                            min="0"
                            step="0.01"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            <FiExternalLink className="inline mr-1" />
                            {t('events.gifts.giftLink')}
                          </label>
                          <input
                            type="url"
                            name="externalUrl"
                            value={giftForm.externalUrl}
                            onChange={handleGiftChange}
                            placeholder="https://..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                          />
                        </div>
                      </div>
                    )}

                    {/* Lien externe - seulement pour money */}
                    {giftForm.giftType === 'money' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          <FiExternalLink className="inline mr-1" />
                          {t('events.gifts.paymentLink')}
                        </label>
                        <input
                          type="url"
                          name="externalUrl"
                          value={giftForm.externalUrl}
                          onChange={handleGiftChange}
                          placeholder="https://paypal.me/... , https://lydia-app.com/..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          {t('events.gifts.paymentLinkDesc')}
                        </p>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <FiImage className="inline mr-1" />
                        {t('events.gifts.giftImage')}
                      </label>
                      <ImageUpload
                        value={giftForm.imageUrl}
                        onChange={(url) => setGiftForm(prev => ({ ...prev, imageUrl: url }))}
                        folder="gifts"
                      />
                      <div className="mt-2">
                        <p className="text-xs text-gray-500 mb-1">{t('events.gifts.orUseUrl')}</p>
                        <input
                          type="url"
                          value={giftForm.imageUrl}
                          onChange={(e) => setGiftForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                          placeholder={t('events.gifts.imageByUrlPlaceholder')}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('events.gifts.notesVisibleToGuests')}</label>
                      <input
                        type="text"
                        name="notes"
                        value={giftForm.notes}
                        onChange={handleGiftChange}
                        placeholder={t('events.gifts.notesPlaceholder')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                      />
                    </div>

                    {/* Options article classique uniquement */}
                    {giftForm.giftType === 'article' && (
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          name="allowMultiple"
                          id="allowMultiple"
                          checked={giftForm.allowMultiple}
                          onChange={handleGiftChange}
                          className="w-4 h-4 text-pink-500 border-gray-300 rounded focus:ring-pink-500"
                        />
                        <label htmlFor="allowMultiple" className="text-sm text-gray-700">
                          {t('events.gifts.allowMultipleReservations')}
                        </label>
                        {giftForm.allowMultiple && (
                          <input
                            type="number"
                            name="maxSelections"
                            value={giftForm.maxSelections}
                            onChange={handleGiftChange}
                            min="0"
                            placeholder="Max (0=illimité)"
                            className="w-24 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                          />
                        )}
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={handleAddGift}
                        disabled={saving}
                        className="flex-1 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <FiCheck className="w-4 h-4" />
                        {saving ? t('events.edit.saving') : editingGift ? t('common.edit') : t('common.add')}
                      </button>
                      <button
                        onClick={() => { setShowGiftForm(false); resetGiftForm() }}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg flex items-center gap-2"
                      >
                        <FiX className="w-4 h-4" />
                        {t('common.cancel')}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowGiftForm(true)}
                  className="mt-4 w-full px-4 py-3 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-pink-500 hover:text-pink-500 transition-colors flex items-center justify-center gap-2"
                >
                  <FiPlus className="w-5 h-5" />
                  {t('events.gifts.addGift')}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Section Livre d'or */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <button
            onClick={() => toggleSection('guestbook')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-emerald-50 transition-colors"
          >
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <FiBook className="w-4 h-4 text-emerald-600" />
              </div>
              <span>{t('guestbook.title', "Livre d'or")}</span>
            </h2>
            {expandedSection === 'guestbook' ? <FiChevronUp /> : <FiChevronDown />}
          </button>

          {expandedSection === 'guestbook' && (
            <div className="px-6 pb-6 border-t">
              <div className="mt-4">
                <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="flex items-center gap-3">
                    {formData.guestbookPublic ? (
                      <FiEye className="w-5 h-5 text-green-600" />
                    ) : (
                      <FiEyeOff className="w-5 h-5 text-orange-600" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">
                        {formData.guestbookPublic ? t('guestbook.messagesPublic', 'Messages visibles par tous') : t('guestbook.messagesPrivate', 'Messages visibles par vous seul')}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formData.guestbookPublic
                          ? t('guestbook.messagesPublicDesc', 'Les invités peuvent lire les messages des autres')
                          : t('guestbook.messagesPrivateDesc', 'Les invités peuvent uniquement écrire, seul vous pouvez lire')}
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.guestbookPublic}
                      onChange={(e) => setFormData(prev => ({ ...prev, guestbookPublic: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de confirmation de suppression */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('events.edit.deleteEventConfirmTitle')}</h3>
            <p className="text-gray-600 mb-4">
              {t('events.edit.deleteEventConfirmMessage')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation de suppression de réservation */}
      {selectionToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('events.edit.deleteReservationConfirmTitle')}</h3>
            <p className="text-gray-600 mb-4">
              {t('events.edit.deleteReservationConfirmMessage', { name: selectionToDelete.guestName })}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setSelectionToDelete(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => handleDeleteSelection(selectionToDelete.id)}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
