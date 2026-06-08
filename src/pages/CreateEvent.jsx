import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { createEvent } from '../services/firestore'
import { deleteFileFromStorage } from '../services/storage'
import { 
  FiCalendar, FiImage, FiType, FiFileText, FiEye, FiEyeOff, 
  FiSave, FiArrowLeft, FiGift, FiHeart, FiMail, FiCamera,
  FiChevronDown, FiChevronUp, FiMusic, FiTrash2
} from 'react-icons/fi'
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

export default function CreateEvent() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [expandedSection, setExpandedSection] = useState('basic')
  const [galleryUploadKey, setGalleryUploadKey] = useState(0)
  
  const [formData, setFormData] = useState({
    // Infos de base
    name: '',
    type: 'mariage',
    date: '',
    description: '',
    imageUrl: '',
    isPublic: true,
    
    // Histoire de l'événement
    story: '',
    
    // Invitation
    invitationImageUrl: '',
    invitationLetter: '',
    showInvitationTicket: true,
    
    // Musique de fond
    backgroundMusicUrl: '',
    
    // Photos pour le montage
    galleryPhotos: []
  })

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleAddGalleryPhoto = (url) => {
    if (url && formData.galleryPhotos.length < 10) {
      setFormData(prev => ({
        ...prev,
        galleryPhotos: [...prev.galleryPhotos, url]
      }))
      // Réinitialiser le composant ImageUpload pour permettre l'ajout d'une nouvelle photo
      setGalleryUploadKey(prev => prev + 1)
    }
  }

  const handleRemoveGalleryPhoto = async (index) => {
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      setError(t('events.create.eventNameRequired'))
      return
    }

    setLoading(true)
    setError('')

    try {
      const eventId = await createEvent({
        ...formData,
        userId: user.uid,
        userName: user.displayName || user.email
      })
      navigate(`/event/${eventId}/edit`)
    } catch (err) {
      console.error('Erreur création événement:', err)
      if (err.code === 'permission-denied') {
        setError(t('events.create.permissionDenied'))
      } else {
        setError(t('events.create.errorCreating', { message: err.message }))
      }
    } finally {
      setLoading(false)
    }
  }

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
        >
          <FiArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-3xl">🎁</span>
            {t('events.create.title')}
          </h1>
          <p className="text-white/70 mt-1">
            {t('events.create.subtitle')}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/20 backdrop-blur-sm border border-red-500/30 rounded-2xl text-white">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Section 1: Informations de base */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('basic')}
            className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-pink-500 to-rose-500 text-white"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <FiGift className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h2 className="font-semibold">{t('events.create.basicInfo')}</h2>
                <p className="text-sm text-white/80">{t('events.create.basicInfoDesc')}</p>
              </div>
            </div>
            {expandedSection === 'basic' ? <FiChevronUp /> : <FiChevronDown />}
          </button>
          
          {expandedSection === 'basic' && (
            <div className="p-6 space-y-5">
              {/* Nom de l'événement */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <FiType className="inline mr-2 text-pink-500" />
                  {t('events.create.eventName')} *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder={t('events.create.eventNamePlaceholder')}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                  required
                />
              </div>

              {/* Type d'événement */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('events.create.eventType')}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {EVENT_TYPES.map(type => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, type: type.value }))}
                      className={`p-3 rounded-xl border-2 transition-all text-center ${
                        formData.type === type.value
                          ? 'border-pink-500 bg-pink-50 text-pink-700 shadow-lg'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <span className="text-2xl block mb-1">{type.emoji}</span>
                      <span className="text-sm font-medium">{t(type.labelKey)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <FiCalendar className="inline mr-2 text-pink-500" />
                  {t('events.create.eventDate')}
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                />
              </div>

              {/* Description courte */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <FiFileText className="inline mr-2 text-pink-500" />
                  {t('events.create.shortDescription')}
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder={t('events.create.shortDescriptionPlaceholder')}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 resize-none"
                />
              </div>

              {/* Image de couverture */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <FiImage className="inline mr-2 text-pink-500" />
                  {t('events.create.coverImage')}
                </label>
                <ImageUpload
                  value={formData.imageUrl}
                  onChange={(url) => setFormData(prev => ({ ...prev, imageUrl: url }))}
                  folder="events"
                />
              </div>

              {/* Visibilité */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  {formData.isPublic ? (
                    <FiEye className="w-5 h-5 text-green-600" />
                  ) : (
                    <FiEyeOff className="w-5 h-5 text-orange-600" />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">
                      {formData.isPublic ? t('events.create.publicEvent') : t('events.create.privateEvent')}
                    </p>
                    <p className="text-sm text-gray-600">
                      {formData.isPublic 
                        ? t('events.create.accessibleWithLink')
                        : t('events.create.restrictedAccess')}
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="isPublic"
                    checked={formData.isPublic}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500"></div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Histoire de l'événement */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('story')}
            className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-purple-500 to-indigo-500 text-white"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <FiHeart className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h2 className="font-semibold">{t('events.create.eventStory')}</h2>
                <p className="text-sm text-white/80">{t('events.create.eventStoryDesc')}</p>
              </div>
            </div>
            {expandedSection === 'story' ? <FiChevronUp /> : <FiChevronDown />}
          </button>
          
          {expandedSection === 'story' && (
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                💝 {t('events.create.storyHelpText')}
              </p>
              <textarea
                name="story"
                value={formData.story}
                onChange={handleChange}
                placeholder={t('events.create.storyPlaceholder')}
                rows={8}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
              />
            </div>
          )}
        </div>

        {/* Section 3: Billet d'invitation */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('invitation')}
            className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-amber-500 to-orange-500 text-white"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <FiMail className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h2 className="font-semibold">{t('events.create.invitationTicket')}</h2>
                <p className="text-sm text-white/80">{t('events.create.invitationTicketDesc')}</p>
              </div>
            </div>
            {expandedSection === 'invitation' ? <FiChevronUp /> : <FiChevronDown />}
          </button>
          
          {expandedSection === 'invitation' && (
            <div className="p-6 space-y-5">
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                <p className="text-sm text-amber-800">
                  📨 <strong>{t('events.create.howItWorks')}:</strong> {t('events.create.invitationExplanation')}
                </p>
              </div>

              {/* Image d'invitation */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <FiImage className="inline mr-2 text-amber-500" />
                  {t('events.create.invitationImage')}
                </label>
                <ImageUpload
                  value={formData.invitationImageUrl}
                  onChange={(url) => setFormData(prev => ({ ...prev, invitationImageUrl: url }))}
                  folder="invitations"
                />
              </div>

              {/* Lettre d'invitation */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <FiFileText className="inline mr-2 text-amber-500" />
                  {t('events.create.invitationLetter')}
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  {t('events.create.invitationLetterHint')}
                </p>
                <textarea
                  name="invitationLetter"
                  value={formData.invitationLetter}
                  onChange={handleChange}
                  placeholder={t('events.create.invitationLetterPlaceholder')}
                  rows={6}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
                />
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
          )}
        </div>

        {/* Section 4: Galerie photos */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('gallery')}
            className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <FiCamera className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h2 className="font-semibold">{t('events.create.photoGallery')}</h2>
                <p className="text-sm text-white/80">{t('events.create.photoGalleryDesc')}</p>
              </div>
            </div>
            {expandedSection === 'gallery' ? <FiChevronUp /> : <FiChevronDown />}
          </button>
          
          {expandedSection === 'gallery' && (
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                📸 {t('events.create.galleryHelpText')}
              </p>

              {/* Aperçu du collage */}
              {formData.galleryPhotos.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <FiImage className="w-4 h-4 text-emerald-600" />
                    {t('events.create.collagePreview')}
                  </h3>
                  <div className="relative rounded-xl overflow-hidden shadow-lg bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100 p-1">
                    <div className="grid grid-cols-4 grid-rows-2 gap-1 rounded-lg overflow-hidden" style={{ minHeight: '200px' }}>
                      {formData.galleryPhotos.map((photo, index) => {
                        const count = formData.galleryPhotos.length
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
                      {formData.galleryPhotos.length} photos
                    </div>
                  </div>
                </div>
              )}

              {/* Photos existantes - gestion */}
              {formData.galleryPhotos.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">{t('events.create.managePhotos')}</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {formData.galleryPhotos.map((photo, index) => (
                      <div key={index} className="relative group aspect-square">
                        <img 
                          src={photo} 
                          alt={`Photo ${index + 1}`}
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveGalleryPhoto(index)}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-sm"
                        >
                          ×
                        </button>
                        <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                          {index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ajouter une photo */}
              {formData.galleryPhotos.length < 10 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">
                    {formData.galleryPhotos.length}/10 photos
                  </p>
                  <ImageUpload
                    key={galleryUploadKey}
                    value=""
                    onChange={handleAddGalleryPhoto}
                    folder="gallery"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 5: Musique de fond */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('music')}
            className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-violet-500 to-purple-500 text-white"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <FiMusic className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h2 className="font-semibold">{t('events.create.backgroundMusic')}</h2>
                <p className="text-sm text-white/80">{t('events.create.backgroundMusicDesc')}</p>
              </div>
            </div>
            {expandedSection === 'music' ? <FiChevronUp /> : <FiChevronDown />}
          </button>
          
          {expandedSection === 'music' && (
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                🎵 {t('events.create.backgroundMusicDesc')}
              </p>

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
                          const { deleteFileFromStorage: delFile } = await import('../services/storage')
                          await delFile(formData.backgroundMusicUrl)
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
          )}
        </div>

        {/* Boutons de soumission */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex-1 px-6 py-4 bg-white/10 backdrop-blur-sm text-white border border-white/20 rounded-2xl hover:bg-white/20 transition-colors font-medium"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-2xl hover:from-pink-600 hover:to-rose-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-bold shadow-lg shadow-pink-500/30"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {t('events.create.creating')}
              </>
            ) : (
              <>
                <FiSave className="w-5 h-5" />
                {t('events.create.createEvent')}
              </>
            )}
          </button>
        </div>
      </form>

      {/* Info box */}
      <div className="mt-6 p-5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl">
        <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
          <span className="text-xl">💡</span>
          {t('events.create.howItWorksTitle')}
        </h3>
        <ol className="text-sm text-white/80 space-y-2">
          <li><strong>1.</strong> {t('events.create.step1')}</li>
          <li><strong>2.</strong> {t('events.create.step2')}</li>
          <li><strong>3.</strong> {t('events.create.step3')}</li>
        </ol>
      </div>
    </div>
  )
}
