import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { FiArrowLeft, FiSend, FiImage, FiX, FiCamera, FiEdit3, FiPlay, FiChevronLeft, FiChevronRight, FiGrid, FiNavigation, FiMove, FiSearch, FiMaximize2, FiMoreVertical, FiDownload, FiShare2, FiTrash2 } from 'react-icons/fi'
import LoadingSpinner from '../components/LoadingSpinner'
import FloatingLanguageSelector from '../components/FloatingLanguageSelector'
import toast from 'react-hot-toast'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import { getEventById, getGuestbookMessages, createGuestbookMessage, deleteGuestbookMessage } from '../services/firestore'
import { uploadImage } from '../services/storage'

// ==================== COMPOSANT PRINCIPAL ====================
export default function Guestbook() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const fileInputRef = useRef(null)
  
  // États
  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState(null)
  const [messages, setMessages] = useState([])
  const [isOwner, setIsOwner] = useState(false)
  
  // Vue actuelle: 'home' | 'write' | 'book'
  const [currentView, setCurrentView] = useState('home')
  const [currentPage, setCurrentPage] = useState(0)
  
  // Formulaire
  const [authorName, setAuthorName] = useState('')
  const [messageText, setMessageText] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    try {
      setLoading(true)
      const eventData = await getEventById(id)
      
      if (!eventData) {
        toast.error(t('events.notFound', 'Événement non trouvé'))
        navigate('/')
        return
      }
      
      setEvent(eventData)
      setIsOwner(eventData.userId === user?.uid)
      
      const messagesData = await getGuestbookMessages(id)
      setMessages(messagesData)
    } catch (error) {
      console.error('Erreur:', error)
      toast.error(t('common.error', 'Erreur de chargement'))
    } finally {
      setLoading(false)
    }
  }

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('guestbook.imageTooLarge', 'Image trop grande (max 5 Mo)'))
      return
    }
    
    if (!file.type.startsWith('image/')) {
      toast.error(t('guestbook.invalidFile', 'Fichier non valide'))
      return
    }
    
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target.result)
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm(t('guestbook.deleteConfirm', 'Êtes-vous sûr de vouloir supprimer ce message ?'))) {
      return
    }
    try {
      await deleteGuestbookMessage(messageId)
      toast.success(t('guestbook.messageDeleted', 'Message supprimé'))
      // Recharger les messages
      const messagesData = await getGuestbookMessages(id)
      setMessages(messagesData)
      // Ajuster la page courante si nécessaire
      if (currentPage >= messagesData.length && messagesData.length > 0) {
        setCurrentPage(messagesData.length - 1)
      } else if (messagesData.length === 0) {
        setCurrentPage(0)
      }
    } catch (error) {
      console.error('Erreur suppression:', error)
      toast.error(t('common.error', 'Erreur'))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!authorName.trim()) {
      toast.error(t('guestbook.enterName', 'Veuillez entrer votre nom'))
      return
    }
    
    if (!messageText.trim() && !imageFile) {
      toast.error(t('guestbook.addMessageOrPhoto', 'Ajoutez un message ou une photo'))
      return
    }

    try {
      setSending(true)
      
      let imageUrl = null
      if (imageFile) {
        imageUrl = await uploadImage(imageFile, `guestbook/${id}`)
      }
      
      await createGuestbookMessage({
        eventId: id,
        authorName: authorName.trim(),
        message: messageText.trim(),
        imageUrl
      })
      
      toast.success(t('guestbook.messageAdded', 'Message ajouté ! 💕'))
      
      // Reset form
      setAuthorName('')
      setMessageText('')
      setImageFile(null)
      setImagePreview(null)
      
      // Reload messages and go to book view
      await loadData()
      setCurrentView('book')
      setCurrentPage(Math.max(0, messages.length)) // Go to last page
      
    } catch (error) {
      console.error('Erreur:', error)
      toast.error(t('guestbook.sendError', 'Erreur lors de l\'envoi'))
    } finally {
      setSending(false)
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString(i18n.language, { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric'
    })
  }

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const now = new Date()
    const diff = Math.floor((now - date) / 1000 / 60)
    
    if (diff < 1) return t('time.justNow', 'À l\'instant')
    if (diff < 60) return t('guestbook.minutesAgo', 'Il y a {{count}} min', { count: diff })
    if (diff < 1440) return t('guestbook.hoursAgo', 'Il y a {{count}}h', { count: Math.floor(diff / 60) })
    return t('guestbook.daysAgo', 'Il y a {{count}}j', { count: Math.floor(diff / 1440) })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  // ==================== VUE ÉCRITURE ====================
  if (currentView === 'write') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/90 to-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <button 
            onClick={() => setCurrentView('home')}
            className="p-2 text-white/70 hover:text-white"
          >
            <FiChevronLeft size={24} />
          </button>
          <h1 className="text-white font-medium">{t('guestbook.title', "Livre d'or")}</h1>
          <button 
            onClick={handleSubmit}
            disabled={sending || (!messageText.trim() && !imageFile)}
            className="text-pink-400 font-medium disabled:opacity-50"
          >
            {sending ? '...' : t('common.send', 'Envoyer')}
          </button>
        </div>

        {/* Formulaire */}
        <div className="p-6 max-w-lg mx-auto">
          <h2 
            className="text-3xl text-white mb-2"
            style={{ fontFamily: "'Dancing Script', cursive" }}
          >
            {t('guestbook.leaveNote', 'Laissez un petit mot')}
          </h2>
          <p className="text-gray-400 text-sm mb-8">
            {t('guestbook.leaveNoteDesc', 'Partagez vos vœux, une anecdote ou un souvenir photo pour célébrer ce moment avec nous.')}
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nom */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                {t('guestbook.yourName', 'Votre nom')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="ex: Marie & Thomas"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/20 outline-none transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                  👤
                </span>
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                {t('guestbook.yourMessage', 'Votre message')}
              </label>
              <div className="relative">
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value.slice(0, 500))}
                  placeholder={t('guestbook.writeMemorable', 'Écrivez quelque chose de mémorable...')}
                  rows={5}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/20 outline-none transition-all resize-none"
                />
                <span className="absolute right-3 bottom-3 text-gray-500 text-sm">
                  😊
                </span>
              </div>
              <p className="text-right text-gray-500 text-xs mt-1">
                {messageText.length} / 500 {t('guestbook.characters', 'caractères')}
              </p>
            </div>

            {/* Photo */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                {t('guestbook.photoMemory', 'Photo Souvenir')}
              </label>
              
              {imagePreview ? (
                <div className="relative inline-block">
                  <img 
                    src={imagePreview} 
                    alt="Aperçu" 
                    className="h-32 rounded-xl border-2 border-pink-500/30"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600"
                  >
                    <FiX size={14} />
                  </button>
                </div>
              ) : (
                <label className="block cursor-pointer">
                  <div className="border-2 border-dashed border-pink-500/30 rounded-xl p-8 text-center hover:border-pink-500/50 transition-colors bg-pink-500/5">
                    <FiCamera className="mx-auto text-pink-400 mb-2" size={32} />
                    <p className="text-pink-400 font-medium">{t('guestbook.addPhoto', 'Ajouter une photo')}</p>
                    <p className="text-gray-500 text-xs mt-1">{t('guestbook.photoFormats', 'JPG, PNG (max 5MB)')}</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </form>
        </div>

        {/* Bouton Signer */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-900 to-transparent">
          <button
            onClick={handleSubmit}
            disabled={sending || (!authorName.trim() || (!messageText.trim() && !imageFile))}
            className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-full shadow-lg shadow-pink-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span>{t('guestbook.signBook', "Signer le Livre d'Or")}</span>
            <FiSend />
          </button>
        </div>
      </div>
    )
  }

  // ==================== VUE LIVRE ====================
  if (currentView === 'book') {
    // If messages are private and user is not the owner, redirect to write view
    if (!isOwner && event?.guestbookPublic === false) {
      setCurrentView('write')
      return null
    }
    const totalPages = messages.length
    const currentMessage = messages[currentPage]
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/90 to-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          <button 
            onClick={() => setCurrentView('home')}
            className="p-2 text-white/70 hover:text-white"
          >
            <FiChevronLeft size={24} />
          </button>
          <div className="text-center">
            <h1 
              className="text-white text-lg"
              style={{ fontFamily: "'Dancing Script', cursive" }}
            >
              {t('guestbook.theGuestbook', "Le Livre d'Or")}
            </h1>
            <p className="text-gray-400 text-xs">
              {t('guestbook.pageOf', 'PAGE {{current}} SUR {{total}}', { current: currentPage + 1, total: Math.max(totalPages, 1) })}
            </p>
          </div>
          <button className="p-2 text-white/70 hover:text-white">
            <FiGrid size={20} />
          </button>
        </div>

        {/* Page du livre */}
        <div className="flex-1 flex items-center justify-center p-4 min-h-[60vh]">
          <div 
            className="relative w-full max-w-md bg-gradient-to-br from-amber-50 to-orange-50 rounded-r-2xl shadow-2xl overflow-hidden"
            style={{ 
              minHeight: '500px',
              boxShadow: '-5px 0 15px rgba(0,0,0,0.1), 0 25px 50px rgba(0,0,0,0.3)'
            }}
          >
            {currentMessage ? (
              <div className="p-6 h-full flex flex-col relative">
                {/* Petit cœur en haut à droite + bouton supprimer pour l'hôte */}
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  {isOwner && (
                    <button
                      onClick={() => handleDeleteMessage(currentMessage.id)}
                      className="text-red-400 hover:text-red-300 transition-colors p-1"
                      title={t('guestbook.deleteMessage', 'Supprimer ce message')}
                    >
                      <FiTrash2 size={16} />
                    </button>
                  )}
                  <span className="text-pink-300 text-lg">💕</span>
                </div>

                {/* Date */}
                <p 
                  className="text-gray-400 text-sm mb-2"
                  style={{ fontFamily: "'Dancing Script', cursive" }}
                >
                  {formatDate(currentMessage.createdAt)}
                </p>

                {/* Auteur */}
                <h3 
                  className="text-2xl text-pink-600 mb-4"
                  style={{ fontFamily: "'Dancing Script', cursive" }}
                >
                  {t('guestbook.from', 'De :')} {currentMessage.authorName}
                </h3>

                {/* Message */}
                <div className="flex-1">
                  <div className="relative">
                    <span className="text-pink-400 text-3xl absolute -left-2 -top-2">"</span>
                    <p 
                      className="text-gray-700 leading-relaxed pl-4 font-serif italic"
                      style={{ fontSize: '1.1rem' }}
                    >
                      {currentMessage.message}
                    </p>
                  </div>

                  {/* Signature */}
                  <p 
                    className="text-right text-gray-500 mt-4 italic"
                    style={{ fontFamily: "'Dancing Script', cursive" }}
                  >
                    {t('guestbook.withLove', '– Avec tout notre amour ❤️')}
                  </p>
                </div>

                {/* Photo */}
                {currentMessage.imageUrl && (
                  <div className="mt-4 flex justify-center">
                    <div className="relative transform rotate-2 bg-white p-2 shadow-lg">
                      <img 
                        src={currentMessage.imageUrl} 
                        alt="Souvenir"
                        className="w-32 h-32 object-cover"
                      />
                      <p 
                        className="text-center text-gray-400 text-xs mt-1 italic"
                        style={{ fontFamily: "'Dancing Script', cursive" }}
                      >
                        {t('guestbook.memories', 'Souvenirs...')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 min-h-[500px]">
                <div className="text-center">
                  <p className="text-4xl mb-4">📖</p>
                  <p style={{ fontFamily: "'Dancing Script', cursive" }}>
                    {t('guestbook.noMessagesYet', 'Aucun message encore...')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-8 py-4">
          <button
            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="p-3 bg-white/10 rounded-full text-white disabled:opacity-30"
          >
            <FiChevronLeft size={24} />
          </button>
          
          <span className="text-white/60 text-sm">
            {currentPage + 1} / {totalPages || 1}
          </span>
          
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage >= totalPages - 1}
            className="p-3 bg-white/10 rounded-full text-white disabled:opacity-30"
          >
            <FiChevronRight size={24} />
          </button>
        </div>
      </div>
    )
  }

  // ==================== VUE ACCUEIL (HOME) ====================
  const coupleNames = event?.guestbookSettings?.coupleNames || event?.title

  // Fonction pour partager le lien du livre d'or
  const shareGuestbook = async () => {
    // Always include the current language prefix in shared URLs
    const currentLang = i18n.language?.split('-')[0] || 'fr'
    const url = `${window.location.origin}/${currentLang}/event/${id}/guestbook`
    const shareData = {
      title: `${t('guestbook.title')} - ${event?.name || t('events.event')}`,
      text: t('guestbook.shareText', { eventName: event?.name || t('events.ourEvent') }),
      url: url
    }

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData)
        toast.success(t('guestbook.linkShared', 'Lien partagé !'))
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(url)
        toast.success(t('guestbook.linkCopied', 'Lien copié dans le presse-papier !'))
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        // Fallback: copy to clipboard
        try {
          await navigator.clipboard.writeText(url)
          toast.success(t('guestbook.linkCopied', 'Lien copié dans le presse-papier !'))
        } catch {
          toast.error(t('guestbook.copyError', 'Impossible de copier le lien'))
        }
      }
    }
  }

  // Fonction pour générer le PDF du livre d'or avec html2canvas
  const generatePDF = async () => {
    if (messages.length === 0) {
      toast.error(t('guestbook.noMessagesToExport', 'Aucun message à exporter'))
      return
    }

    toast.loading(t('guestbook.generatingPdf', 'Génération du PDF...'))
    
    try {
      // Create a temporary container for the guestbook preview
      const container = document.createElement('div')
      container.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 800px; background: linear-gradient(135deg, #1F1F3A 0%, #3B1F5A 50%, #1F1F3A 100%);'
      document.body.appendChild(container)

      // Build guestbook HTML with exact visual appearance
      container.innerHTML = `
        <div style="font-family: system-ui, -apple-system, sans-serif; padding: 40px;">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 40px; padding: 30px; background: linear-gradient(135deg, rgba(236,72,153,0.3) 0%, rgba(139,92,246,0.3) 100%); border-radius: 20px;">
            <h1 style="font-size: 36px; font-weight: bold; color: white; margin: 0 0 10px 0; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">${t('guestbook.title', "Livre d'Or")}</h1>
            <p style="color: rgba(255,255,255,0.8); font-size: 18px; margin: 0;">${event?.name || ''}</p>
            <p style="color: rgba(255,255,255,0.6); font-size: 14px; margin: 10px 0 0 0;">${messages.length} ${t('guestbook.messagesCount', { count: messages.length })}</p>
          </div>
          
          <!-- Messages Grid -->
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
            ${messages.map(msg => {
              const msgDate = msg.createdAt?.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt)
              return `
                <div style="background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); border-radius: 16px; padding: 20px; border: 1px solid rgba(255,255,255,0.2);">
                  ${msg.imageUrl ? `<img src="${msg.imageUrl}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 12px; margin-bottom: 12px;" crossorigin="anonymous" />` : ''}
                  <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #EC4899, #8B5CF6); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px;">
                      ${(msg.authorName || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <div style="color: white; font-weight: 600; font-size: 14px;">${msg.authorName || t('guestbook.anonymous')}</div>
                      <div style="color: rgba(255,255,255,0.5); font-size: 11px;">${msgDate.toLocaleDateString(i18n.language)}</div>
                    </div>
                  </div>
                  <p style="color: rgba(255,255,255,0.9); font-size: 14px; line-height: 1.5; margin: 0;">${msg.message || ''}</p>
                </div>
              `
            }).join('')}
          </div>
          
          <!-- Footer -->
          <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.2);">
            <p style="color: rgba(255,255,255,0.4); font-size: 12px;">${t('guestbook.generatedOn')} ${new Date().toLocaleDateString(i18n.language)}</p>
          </div>
        </div>
      `

      // Wait for images to load
      const images = container.querySelectorAll('img')
      await Promise.all(Array.from(images).map(img => {
        if (img.complete) return Promise.resolve()
        return new Promise(resolve => {
          img.onload = resolve
          img.onerror = resolve
        })
      }))

      // Capture as canvas
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#1F1F3A'
      })

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = 210
      const pageHeight = 297
      const imgWidth = pageWidth
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      let heightLeft = imgHeight
      let position = 0

      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      // Cleanup
      document.body.removeChild(container)
      
      // Télécharger
      pdf.save(`livre-d-or-${event?.name || 'evenement'}.pdf`)
      toast.dismiss()
      toast.success(t('guestbook.pdfDownloaded', 'PDF téléchargé !'))
    } catch (error) {
      console.error('Erreur PDF:', error)
      toast.dismiss()
      toast.error(t('guestbook.pdfError', 'Erreur lors de la génération du PDF'))
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/90 to-gray-900">
      {/* Language selector moved left to avoid download button overlap */}
      <FloatingLanguageSelector position="top-right" className="!right-40" />
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <button 
          onClick={() => navigate(`/event/${id}/guests`)}
          className="p-2 text-white/70 hover:text-white"
        >
          <FiChevronLeft size={24} />
        </button>
        <h1 className="text-white font-medium">{t('guestbook.title', "Livre d'or")}</h1>
        <div className="flex items-center gap-2">
          <button 
            onClick={shareGuestbook}
            className="p-2 text-white/70 hover:text-white"
            title={t('guestbook.shareLink')}
          >
            <FiShare2 size={20} />
          </button>
          {isOwner && (
            <button 
              onClick={generatePDF}
              className="p-2 text-pink-400 hover:text-pink-300"
              title={t('guestbook.downloadPdf')}
            >
              <FiDownload size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Hero - Livre 3D */}
      <div className="relative px-6 py-8">
        <div className="relative mx-auto w-64 h-72">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-pink-500/40 blur-3xl rounded-full" />
          
          {/* Book 3D */}
          <div 
            className="relative w-full h-full rounded-lg overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, #ec4899 0%, #be185d 50%, #9d174d 100%)',
              boxShadow: '0 0 80px rgba(236, 72, 153, 0.6), inset 0 0 40px rgba(255, 255, 255, 0.2), 0 20px 40px rgba(157, 23, 77, 0.5)',
              border: '3px solid rgba(255, 182, 193, 0.8)'
            }}
          >
            {/* Neon border effect */}
            <div className="absolute inset-4 border-2 border-white/50 rounded" />
            <div className="absolute inset-8 border border-rose-200/40 rounded" />
            
            {/* Book decoration */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-7xl drop-shadow-lg" style={{ filter: 'drop-shadow(0 0 20px rgba(255, 255, 255, 0.8))' }}>📖</div>
            </div>
            
            {/* Heart decorations */}
            <div className="absolute top-3 left-3 text-xl opacity-60">💕</div>
            <div className="absolute bottom-3 right-3 text-xl opacity-60">💕</div>
            
            {/* Corner decorations */}
            <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 border-white/60 rounded-tr" />
            <div className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2 border-white/60 rounded-bl" />
          </div>
        </div>

      </div>

      {/* Titre */}
      <div className="px-6 mb-6">
        <h2 
          className="text-3xl text-white mb-2"
          style={{ fontFamily: "'Dancing Script', cursive" }}
        >
          {t('guestbook.leaveEternalMemory', 'Laissez un souvenir éternel')}
        </h2>
        <p className="text-gray-400 text-sm">
          {t('guestbook.leaveEternalMemoryDesc', 'Immortalisez votre présence avec un message en 3D pour les mariés.')}
        </p>
      </div>

      {/* Comment ça marche */}
      <div className="px-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-pink-400">ℹ</span>
          <span className="text-white font-medium">{t('guestbook.howItWorks', 'Comment ça marche ?')}</span>
        </div>
        
        <div className="flex justify-center gap-4">
          {(isOwner || event?.guestbookPublic !== false) && (
            <button
              onClick={() => setCurrentView('book')}
              className="flex-1 max-w-[160px] bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-center hover:bg-white/20 transition-colors"
            >
              <FiPlay className="mx-auto text-pink-400 mb-2" size={24} />
              <p className="text-white text-sm font-medium">{t('guestbook.readBook', 'Lire le livre')}</p>
            </button>
          )}
          <button
            onClick={() => setCurrentView('write')}
            className={`flex-1 ${(isOwner || event?.guestbookPublic !== false) ? 'max-w-[160px]' : 'max-w-[320px]'} bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl px-4 py-3 text-center hover:from-pink-600 hover:to-rose-600 transition-colors`}
          >
            <FiEdit3 className="mx-auto text-white mb-2" size={24} />
            <p className="text-white text-sm font-medium">{t('guestbook.signTheBook', 'Signez le livre')}</p>
          </button>
        </div>
      </div>

      {/* Derniers messages */}
      {(isOwner || event?.guestbookPublic !== false) && (
      <div className="px-6 mb-24">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-medium">{t('guestbook.latestMessages', 'Derniers messages')}</h3>
          {messages.length > 0 && (
            <button 
              onClick={() => setCurrentView('book')}
              className="text-pink-400 text-sm"
            >
              {t('common.seeAll', 'Voir tout')}
            </button>
          )}
        </div>
        
        {messages.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6">
            {messages.slice(0, 5).map((msg, index) => (
              <div 
                key={msg.id || index}
                className="flex-shrink-0 w-48 bg-white/5 border border-white/10 rounded-xl p-4 relative"
              >
                {isOwner && (
                  <button
                    onClick={() => handleDeleteMessage(msg.id)}
                    className="absolute top-2 right-2 text-red-400/60 hover:text-red-400 transition-colors p-1"
                    title={t('guestbook.deleteMessage', 'Supprimer ce message')}
                  >
                    <FiTrash2 size={14} />
                  </button>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {msg.authorName?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium truncate max-w-[100px]">
                      {msg.authorName}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {formatTimeAgo(msg.createdAt)}
                    </p>
                  </div>
                </div>
                <p className="text-gray-300 text-xs line-clamp-2">
                  {msg.message || t('guestbook.photoShared', '📷 Photo partagée')}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p className="text-4xl mb-2">📖</p>
            <p>{t('guestbook.noMessages', 'Aucun message pour l\'instant')}</p>
            <p className="text-sm">{t('guestbook.beFirst', 'Soyez le premier à signer !')}</p>
          </div>
        )}
      </div>
      )}

      {/* Barre d'outils fixe en bas */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur border-t border-white/10">
        <div className="flex items-center justify-center gap-2 p-4">
          {(isOwner || event?.guestbookPublic !== false) && (
            <button 
              onClick={() => setCurrentView('book')}
              className="p-3 bg-pink-500 rounded-full text-white"
            >
              <FiNavigation size={20} />
            </button>
          )}
          <button className="p-3 bg-white/10 rounded-full text-white/70">
            <FiMove size={20} />
          </button>
          <button className="p-3 bg-white/10 rounded-full text-white/70">
            <FiSearch size={20} />
          </button>
          <button className="p-3 bg-white/10 rounded-full text-white/70">
            <FiMaximize2 size={20} />
          </button>
          
          <button
            onClick={() => setCurrentView('write')}
            className="ml-4 px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full text-white font-medium flex items-center gap-2 shadow-lg shadow-pink-500/30"
          >
            <FiEdit3 size={18} />
            {t('guestbook.sign', 'Signer')}
          </button>
        </div>
      </div>
    </div>
  )
}
