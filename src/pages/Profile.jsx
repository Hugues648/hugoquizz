import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import { useNavigate, Link } from 'react-router-dom'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../config/firebase'
import { uploadFile, deleteFile } from '../services/storage'
import { deleteAccount } from '../services/stripe'
import { FiUser, FiMail, FiPhone, FiMapPin, FiCamera, FiSave, FiEdit2, FiZap, FiCreditCard, FiArrowRight, FiCheck, FiHome, FiTrash2, FiLogOut, FiFileText, FiShield, FiAlertTriangle } from 'react-icons/fi'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'

const Profile = () => {
  const { user, userData, refreshUserData, getCurrentPlan, isFreeUser, getSubStatus, logout } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [loading, setLoading] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Profile data state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    displayName: '',
    phoneNumber: '',
    address: {
      streetName: '',
      streetNumber: '',
      postalCode: '',
      city: '',
      country: ''
    },
    bio: ''
  })

  const currentPlan = getCurrentPlan()
  const subscriptionStatus = getSubStatus()

  useEffect(() => {
    if (userData) {
      setFormData({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        displayName: userData.displayName || '',
        phoneNumber: userData.phoneNumber || '',
        address: {
          streetName: userData.address?.streetName || '',
          streetNumber: userData.address?.streetNumber || '',
          postalCode: userData.address?.postalCode || '',
          city: userData.address?.city || '',
          country: userData.address?.country || ''
        },
        bio: userData.bio || ''
      })
    }
  }, [userData])

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name.startsWith('address.')) {
      const field = name.split('.')[1]
      setFormData(prev => ({
        ...prev,
        address: { ...prev.address, [field]: value }
      }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error(t('profile.invalidImageType', 'Veuillez sélectionner une image'))
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('profile.imageTooLarge', 'L\'image ne doit pas dépasser 5MB'))
      return
    }

    setUploadingPhoto(true)
    try {
      // Delete old photo if exists
      if (userData?.photoURL) {
        try {
          await deleteFile(userData.photoURL)
        } catch (err) {
          console.warn('Could not delete old photo:', err)
        }
      }

      // Upload new photo
      const photoURL = await uploadFile(file, `users/${user.uid}/profile`)

      // Update Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        photoURL,
        updatedAt: serverTimestamp()
      })

      await refreshUserData()
      toast.success(t('profile.photoUpdated', 'Photo de profil mise à jour'))
    } catch (error) {
      console.error('Photo upload error:', error)
      toast.error(t('profile.photoError', 'Erreur lors du téléchargement de la photo'))
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleDeletePhoto = async () => {
    if (!userData?.photoURL) return

    setUploadingPhoto(true)
    try {
      await deleteFile(userData.photoURL)
      await updateDoc(doc(db, 'users', user.uid), {
        photoURL: null,
        updatedAt: serverTimestamp()
      })
      await refreshUserData()
      toast.success(t('profile.photoDeleted', 'Photo de profil supprimée'))
    } catch (error) {
      console.error('Delete photo error:', error)
      toast.error(t('profile.deletePhotoError', 'Erreur lors de la suppression'))
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Combine firstName and lastName into displayName
      const displayName = `${formData.firstName} ${formData.lastName}`.trim()
      
      await updateDoc(doc(db, 'users', user.uid), {
        firstName: formData.firstName,
        lastName: formData.lastName,
        displayName: displayName,
        phoneNumber: formData.phoneNumber,
        address: formData.address,
        bio: formData.bio,
        updatedAt: serverTimestamp()
      })

      await refreshUserData()
      setEditMode(false)
      toast.success(t('profile.updated', 'Profil mis à jour avec succès'))
    } catch (error) {
      console.error('Profile update error:', error)
      toast.error(t('profile.updateError', 'Erreur lors de la mise à jour'))
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = () => {
    switch (subscriptionStatus) {
      case 'active': return 'bg-emerald-500'
      case 'expiring_soon': return 'bg-amber-500'
      case 'expired': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusLabel = () => {
    switch (subscriptionStatus) {
      case 'active': return t('subscription.status.active', 'Actif')
      case 'expiring_soon': return t('subscription.status.expiringSoon', 'Expire bientôt')
      case 'expired': return t('subscription.status.expired', 'Expiré')
      default: return t('subscription.status.free', 'Gratuit')
    }
  }

  if (!userData) {
    return <LoadingSpinner text={t('common.loading')} />
  }

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          {t('profile.title', 'Mon Profil')}
        </h1>
        <p className="text-white/70">{t('profile.subtitle', 'Gérez vos informations personnelles')}</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 mb-6">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Photo Section */}
          <div className="flex flex-col items-center">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                {userData.photoURL ? (
                  <img 
                    src={userData.photoURL} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-5xl text-white">
                    {userData.displayName?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="absolute bottom-0 right-0 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-violet-600 hover:bg-violet-100 transition-colors"
              >
                {uploadingPhoto ? (
                  <div className="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FiCamera className="w-5 h-5" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>
            {userData.photoURL && (
              <button
                onClick={handleDeletePhoto}
                disabled={uploadingPhoto}
                className="mt-2 text-sm text-red-400 hover:text-red-300 flex items-center gap-1"
              >
                <FiTrash2 className="w-3 h-3" />
                {t('profile.deletePhoto', 'Supprimer')}
              </button>
            )}

            {/* Subscription Badge */}
            <div className="mt-4 text-center">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${getStatusColor()} text-white text-sm font-medium`}>
                <FiCreditCard className="w-4 h-4" />
                {currentPlan.name}
              </div>
              <p className="text-white/60 text-xs mt-1">{getStatusLabel()}</p>
            </div>
          </div>

          {/* Info Section */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {t('profile.personalInfo', 'Informations personnelles')}
              </h2>
              {!editMode && (
                <button
                  onClick={() => setEditMode(true)}
                  className="flex items-center gap-2 text-violet-400 hover:text-violet-300"
                >
                  <FiEdit2 className="w-4 h-4" />
                  {t('common.edit', 'Modifier')}
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* First Name */}
                <div>
                  <label className="block text-white/70 text-sm mb-1">
                    <FiUser className="inline w-4 h-4 mr-1" />
                    {t('profile.firstName', 'Prénom')}
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-violet-400"
                    />
                  ) : (
                    <p className="text-white font-medium">{formData.firstName || '-'}</p>
                  )}
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-white/70 text-sm mb-1">
                    <FiUser className="inline w-4 h-4 mr-1" />
                    {t('profile.lastName', 'Nom')}
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-violet-400"
                    />
                  ) : (
                    <p className="text-white font-medium">{formData.lastName || '-'}</p>
                  )}
                </div>

                {/* Email (read-only) */}
                <div>
                  <label className="block text-white/70 text-sm mb-1">
                    <FiMail className="inline w-4 h-4 mr-1" />
                    {t('profile.email', 'Email')}
                  </label>
                  <p className="text-white font-medium">{user?.email}</p>
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-white/70 text-sm mb-1">
                    <FiPhone className="inline w-4 h-4 mr-1" />
                    {t('profile.phone', 'Téléphone')}
                  </label>
                  {editMode ? (
                    <input
                      type="tel"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleChange}
                      placeholder="+33 6 12 34 56 78"
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-violet-400"
                    />
                  ) : (
                    <p className="text-white font-medium">{formData.phoneNumber || '-'}</p>
                  )}
                </div>

                {/* Bio */}
                <div className="md:col-span-2">
                  <label className="block text-white/70 text-sm mb-1">
                    {t('profile.bio', 'Biographie')}
                  </label>
                  {editMode ? (
                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      placeholder={t('profile.bioPlaceholder', 'Parlez-nous de vous...')}
                      rows={2}
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-violet-400 resize-none"
                    />
                  ) : (
                    <p className="text-white font-medium">{formData.bio || '-'}</p>
                  )}
                </div>
              </div>

              {/* Address Section */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <FiHome className="w-5 h-5" />
                  {t('profile.address', 'Adresse')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-white/70 text-sm mb-1">
                      {t('profile.streetName', 'Rue')}
                    </label>
                    {editMode ? (
                      <input
                        type="text"
                        name="address.streetName"
                        value={formData.address.streetName}
                        onChange={handleChange}
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-violet-400"
                      />
                    ) : (
                      <p className="text-white font-medium">{formData.address.streetName || '-'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-white/70 text-sm mb-1">
                      {t('profile.streetNumber', 'N°')}
                    </label>
                    {editMode ? (
                      <input
                        type="text"
                        name="address.streetNumber"
                        value={formData.address.streetNumber}
                        onChange={handleChange}
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-violet-400"
                      />
                    ) : (
                      <p className="text-white font-medium">{formData.address.streetNumber || '-'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-white/70 text-sm mb-1">
                      {t('profile.postalCode', 'Code postal')}
                    </label>
                    {editMode ? (
                      <input
                        type="text"
                        name="address.postalCode"
                        value={formData.address.postalCode}
                        onChange={handleChange}
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-violet-400"
                      />
                    ) : (
                      <p className="text-white font-medium">{formData.address.postalCode || '-'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-white/70 text-sm mb-1">
                      {t('profile.city', 'Ville')}
                    </label>
                    {editMode ? (
                      <input
                        type="text"
                        name="address.city"
                        value={formData.address.city}
                        onChange={handleChange}
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-violet-400"
                      />
                    ) : (
                      <p className="text-white font-medium">{formData.address.city || '-'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-white/70 text-sm mb-1">
                      {t('profile.country', 'Pays')}
                    </label>
                    {editMode ? (
                      <input
                        type="text"
                        name="address.country"
                        value={formData.address.country}
                        onChange={handleChange}
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-violet-400"
                      />
                    ) : (
                      <p className="text-white font-medium">{formData.address.country || '-'}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Save Button */}
              {editMode && (
                <div className="flex gap-4 mt-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700 flex items-center gap-2"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <FiSave className="w-5 h-5" />
                    )}
                    {t('common.save', 'Enregistrer')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditMode(false)}
                    className="btn bg-white/10 text-white hover:bg-white/20"
                  >
                    {t('common.cancel', 'Annuler')}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Upgrade Section - Show for free users or prominently for all */}
      <div className="bg-gradient-to-r from-violet-600/20 to-purple-600/20 backdrop-blur-lg rounded-3xl p-6 border border-violet-400/30 mb-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center">
              <FiZap className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">
                {isFreeUser() 
                  ? t('profile.upgradeToPro', 'Passez au forfait Pro')
                  : t('profile.managePlan', 'Gérer mon abonnement')}
              </h3>
              <p className="text-white/70">
                {isFreeUser()
                  ? t('profile.unlockFeatures', 'Débloquez toutes les fonctionnalités et les participants illimités')
                  : t('profile.currentPlan', 'Votre forfait actuel : {{plan}}', { plan: currentPlan.name })}
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            {!isFreeUser() && (
              <button
                onClick={() => navigate('/settings?tab=subscription')}
                className="btn bg-white/10 text-white hover:bg-white/20 flex items-center gap-2 whitespace-nowrap border border-white/20"
              >
                <FiCreditCard className="w-4 h-4" />
                {t('profile.manageSubscription', 'Gérer / Résilier')}
              </button>
            )}
            <button
              onClick={() => navigate('/pricing')}
              className="btn bg-gradient-to-r from-amber-400 to-orange-500 text-white hover:from-amber-500 hover:to-orange-600 flex items-center gap-2 whitespace-nowrap"
            >
              {isFreeUser() ? t('profile.seePlans', 'Voir les forfaits') : t('profile.changePlan', 'Changer')}
              <FiArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => navigate('/settings')}
          className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 text-left hover:bg-white/20 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <FiCreditCard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{t('profile.subscriptionSettings', 'Paramètres d\'abonnement')}</h3>
              <p className="text-white/60 text-sm">{t('profile.managePayments', 'Gérer paiements et facturation')}</p>
            </div>
            <FiArrowRight className="w-5 h-5 text-white/50 ml-auto group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        <button
          onClick={() => navigate('/pricing')}
          className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 text-left hover:bg-white/20 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <FiZap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{t('profile.viewPlans', 'Voir les forfaits')}</h3>
              <p className="text-white/60 text-sm">{t('profile.comparePlans', 'Comparer les offres disponibles')}</p>
            </div>
            <FiArrowRight className="w-5 h-5 text-white/50 ml-auto group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      </div>

      {/* Logout Button */}
      <div className="mt-6">
        <button
          onClick={async () => {
            try {
              await logout()
              toast.success(t('common.logoutSuccess', 'Déconnexion réussie'))
              navigate('/')
            } catch (error) {
              toast.error(t('common.error', 'Erreur'))
            }
          }}
          className="w-full bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20 text-left hover:bg-red-500/20 hover:border-red-400/30 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-rose-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <FiLogOut className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{t('nav.logout', 'Déconnexion')}</h3>
              <p className="text-white/60 text-sm">{t('profile.logoutDesc', 'Se déconnecter de votre compte')}</p>
            </div>
          </div>
        </button>
      </div>

      {/* Legal Links Section */}
      <div className="mt-8 bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">{t('profile.legalInfo', 'Informations légales')}</h3>
        <div className="space-y-3">
          <Link
            to="/cgu"
            className="flex items-center gap-3 text-white/70 hover:text-white transition-colors"
          >
            <FiFileText className="w-5 h-5" />
            <span>{t('footer.terms', 'Conditions Générales d\'Utilisation')}</span>
            <FiArrowRight className="w-4 h-4 ml-auto" />
          </Link>
          <Link
            to="/privacy"
            className="flex items-center gap-3 text-white/70 hover:text-white transition-colors"
          >
            <FiShield className="w-5 h-5" />
            <span>{t('footer.privacy', 'Protection des données')}</span>
            <FiArrowRight className="w-4 h-4 ml-auto" />
          </Link>
        </div>
      </div>

      {/* Delete Account Section */}
      <div className="mt-6 bg-red-500/10 backdrop-blur-lg rounded-2xl p-6 border border-red-500/20">
        <h3 className="text-lg font-semibold text-red-400 mb-2 flex items-center gap-2">
          <FiAlertTriangle className="w-5 h-5" />
          {t('profile.dangerZone', 'Zone de danger')}
        </h3>
        <p className="text-white/60 text-sm mb-4">
          {t('profile.deleteAccountWarning', 'La suppression de votre compte est irréversible. Toutes vos données seront définitivement supprimées.')}
        </p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 hover:bg-red-500/30 transition-colors"
        >
          <FiTrash2 className="w-4 h-4" />
          {t('profile.deleteAccount', 'Supprimer mon compte')}
        </button>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <FiAlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{t('profile.confirmDeletion', 'Confirmer la suppression')}</h3>
                <p className="text-gray-500 text-sm">{t('profile.actionIrreversible', 'Cette action est irréversible')}</p>
              </div>
            </div>
            
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <h4 className="font-semibold text-amber-800 mb-2">{t('profile.importantNotice', 'Avertissement important')}</h4>
              <ul className="text-sm text-amber-700 space-y-2">
                <li>• {t('profile.deleteWarning1', 'Tous vos quiz, questionnaires et événements seront supprimés')}</li>
                <li>• {t('profile.deleteWarning2', 'Vos données personnelles seront effacées définitivement')}</li>
                <li>• {t('profile.deleteWarning3', 'Vous ne pourrez plus accéder à votre compte')}</li>
                {!isFreeUser() && (
                  <li className="font-semibold text-red-700">
                    • {t('profile.deleteWarning4', 'Si votre abonnement est renouvelé dans moins de 48h et que vous n\'avez pas annulé le renouvellement, le dernier prélèvement sera effectué avant la suppression.')}
                  </li>
                )}
              </ul>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('profile.typeConfirm', 'Tapez "SUPPRIMER" pour confirmer :')}
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="SUPPRIMER"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteConfirmText('')
                }}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
              >
                {t('common.cancel', 'Annuler')}
              </button>
              <button
                onClick={async () => {
                  if (deleteConfirmText !== 'SUPPRIMER') {
                    toast.error(t('profile.typeSupprimer', 'Veuillez taper "SUPPRIMER" pour confirmer'))
                    return
                  }
                  
                  setDeleting(true)
                  try {
                    const result = await deleteAccount()
                    
                    if (result.pendingCharge) {
                      toast.success(t('profile.accountMarkedDeleted', 'Compte marqué pour suppression. Le dernier prélèvement sera effectué.'), { duration: 6000 })
                    } else {
                      toast.success(t('profile.accountDeleted', 'Compte supprimé avec succès'))
                    }
                    
                    await logout()
                    navigate('/')
                  } catch (error) {
                    console.error('Delete account error:', error)
                    toast.error(t('profile.deleteError', 'Erreur lors de la suppression'))
                  } finally {
                    setDeleting(false)
                  }
                }}
                disabled={deleteConfirmText !== 'SUPPRIMER' || deleting}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {t('common.loading', 'Chargement...')}
                  </>
                ) : (
                  <>
                    <FiTrash2 className="w-4 h-4" />
                    {t('profile.confirmDelete', 'Supprimer définitivement')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Profile
