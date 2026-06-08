import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { jsPDF } from 'jspdf'
import { useAuth } from '../contexts/AuthContext'
import { 
  getEventById, 
  getEventVisitorsByEvent,
  deleteEventVisitor
} from '../services/firestore'
import { 
  FiArrowLeft, FiUsers, FiDownload, FiTrash2, FiCalendar,
  FiCheck, FiX, FiUser, FiRefreshCw
} from 'react-icons/fi'
import LoadingSpinner from '../components/LoadingSpinner'

export default function EventVisitors() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useTranslation()
  
  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState(null)
  const [visitors, setVisitors] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [generatingPdf, setGeneratingPdf] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')
      
      const eventData = await getEventById(id)
      
      if (!eventData) {
        setError(t('eventVisitors.eventNotFound', 'Événement non trouvé'))
        setLoading(false)
        return
      }
      
      if (eventData.userId !== user?.uid) {
        setError(t('eventVisitors.unauthorized', "Vous n'êtes pas autorisé à voir cette page"))
        setLoading(false)
        return
      }
      
      setEvent(eventData)
      
      const visitorsData = await getEventVisitorsByEvent(id)
      setVisitors(visitorsData)
    } catch (err) {
      console.error('Erreur chargement:', err)
      setError(t('eventVisitors.loadingError', 'Erreur lors du chargement des données') + ': ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const generatePdfForVisitor = useCallback(async (visitor) => {
    if (!event) return
    
    setGeneratingPdf(visitor.id)
    
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })
      
      const pageWidth = 210
      const pageHeight = 297
      const margin = 20
      
      // Helper function to load image as base64
      const loadImageAsBase64 = async (url) => {
        // Try using fetch to get the image as blob
        try {
          const response = await fetch(url)
          if (!response.ok) throw new Error('Fetch failed')
          
          const blob = await response.blob()
          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result)
            reader.onerror = reject
            reader.readAsDataURL(blob)
          })
          
          // Get dimensions by loading the dataUrl
          const img = new Image()
          await new Promise((resolve, reject) => {
            img.onload = resolve
            img.onerror = reject
            img.src = dataUrl
          })
          
          return { dataUrl, width: img.naturalWidth, height: img.naturalHeight }
        } catch (fetchError) {
          console.log('Fetch failed, trying Image element:', fetchError)
          
          // Fallback to Image element
          return new Promise((resolve, reject) => {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            
            img.onload = () => {
              try {
                const canvas = document.createElement('canvas')
                canvas.width = img.naturalWidth
                canvas.height = img.naturalHeight
                const ctx = canvas.getContext('2d')
                ctx.drawImage(img, 0, 0)
                const dataUrl = canvas.toDataURL('image/jpeg', 0.95)
                resolve({ dataUrl, width: img.naturalWidth, height: img.naturalHeight })
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
          
          doc.addImage(dataUrl, 'JPEG', x, y, imgWidth, imgHeight)
        } catch (imgError) {
          console.error('Error loading invitation image:', imgError)
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
      
      // Page 2: Personalized Letter
      if (event.invitationLetter) {
        doc.addPage()
        
        doc.setFillColor(255, 252, 250)
        doc.rect(0, 0, pageWidth, pageHeight, 'F')
        
        doc.setDrawColor(236, 72, 153)
        doc.setLineWidth(0.5)
        doc.rect(margin / 2, margin / 2, pageWidth - margin, pageHeight - margin)
        
        let yPos = margin + 20
        
        doc.setFontSize(22)
        doc.setTextColor(236, 72, 153)
        doc.text(`Très cher(e) ${visitor.fullName},`, margin + 5, yPos)
        
        yPos += 20
        
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
        
        doc.setFontSize(14)
        doc.setTextColor(236, 72, 153)
        doc.text('💝', pageWidth / 2, pageHeight - margin, { align: 'center' })
      }
      
      const fileName = `invitation-${event.name.replace(/[^a-zA-Z0-9]/g, '-')}-${visitor.fullName.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`
      doc.save(fileName)
      
      setSuccess(t('eventVisitors.pdfGenerated', 'PDF généré pour {{name}}', { name: visitor.fullName }))
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Erreur génération PDF:', err)
      setError(t('eventVisitors.pdfError', 'Erreur lors de la génération du PDF'))
    } finally {
      setGeneratingPdf(null)
    }
  }, [event])

  const handleDeleteVisitor = async (visitorId) => {
    try {
      await deleteEventVisitor(visitorId)
      setVisitors(visitors.filter(v => v.id !== visitorId))
      setDeleteConfirm(null)
      setSuccess(t('eventVisitors.visitorDeleted', 'Visiteur supprimé'))
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Erreur suppression:', err)
      setError(t('eventVisitors.deleteError', 'Erreur lors de la suppression'))
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return '-'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
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
            {t('eventVisitors.backToDashboard', 'Retour au tableau de bord')}
          </button>
        </div>
      </div>
    )
  }

  const eventType = EVENT_TYPES[event?.type] || EVENT_TYPES.autre
  const visitorsWithPdf = visitors.filter(v => v.pdfGenerated).length

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/event/${id}/edit`)}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FiUsers className="text-pink-500" />
              {t('eventVisitors.title', 'Visiteurs inscrits')}
            </h1>
            <p className="text-gray-600 text-sm">
              {event?.typeEmoji || '🎉'} {event?.name}
            </p>
          </div>
        </div>
        <button
          onClick={loadData}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title={t('eventVisitors.refresh', 'Actualiser')}
        >
          <FiRefreshCw className="w-5 h-5" />
        </button>
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

      {/* Stats Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl flex items-center justify-center text-white mx-auto mb-2">
              <FiUsers className="w-6 h-6" />
            </div>
            <p className="text-2xl font-bold text-gray-800">{visitors.length}</p>
            <p className="text-xs text-gray-500">{t('eventVisitors.totalVisitors', 'Visiteurs total')}</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center text-white mx-auto mb-2">
              <FiDownload className="w-6 h-6" />
            </div>
            <p className="text-2xl font-bold text-gray-800">{visitorsWithPdf}</p>
            <p className="text-xs text-gray-500">{t('eventVisitors.pdfDownloaded', 'PDF téléchargés')}</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center text-white mx-auto mb-2">
              <FiCalendar className="w-6 h-6" />
            </div>
            <p className="text-2xl font-bold text-gray-800">
              {visitors.length > 0 ? formatDate(visitors[0].createdAt).split(',')[0] : '-'}
            </p>
            <p className="text-xs text-gray-500">{t('eventVisitors.lastVisit', 'Dernière visite')}</p>
          </div>
        </div>
      </div>

      {/* Visitors List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800">{t('eventVisitors.visitorsList', 'Liste des visiteurs')}</h2>
        </div>
        
        {visitors.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {visitors.map(visitor => (
              <div key={visitor.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full flex items-center justify-center">
                    <FiUser className="w-5 h-5 text-pink-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{visitor.fullName}</p>
                    <p className="text-xs text-gray-500">
                      {t('eventVisitors.registeredOn', 'Inscrit le')} {formatDate(visitor.createdAt)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {/* PDF Status */}
                  {visitor.pdfGenerated ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs">
                      <FiCheck className="w-3 h-3" />
                      {t('eventVisitors.pdfDownloadedStatus', 'PDF téléchargé')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-xs">
                      <FiX className="w-3 h-3" />
                      {t('eventVisitors.noPdf', 'Pas de PDF')}
                    </span>
                  )}
                  
                  {/* Generate PDF Button */}
                  <button
                    onClick={() => generatePdfForVisitor(visitor)}
                    disabled={generatingPdf === visitor.id}
                    className="p-2 text-pink-600 hover:bg-pink-50 rounded-lg transition-colors disabled:opacity-50"
                    title={t('eventVisitors.generatePdf', 'Générer le PDF')}
                  >
                    {generatingPdf === visitor.id ? (
                      <div className="w-5 h-5 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <FiDownload className="w-5 h-5" />
                    )}
                  </button>
                  
                  {/* Delete Button */}
                  <button
                    onClick={() => setDeleteConfirm(visitor)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title={t('common.delete', 'Supprimer')}
                  >
                    <FiTrash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-gray-500">
            <FiUsers className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">{t('eventVisitors.noVisitors', 'Aucun visiteur inscrit')}</p>
            <p className="text-sm">{t('eventVisitors.visitorsWillAppear', "Les visiteurs apparaîtront ici lorsqu'ils entreront leur nom")}</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('eventVisitors.deleteVisitor', 'Supprimer ce visiteur ?')}</h3>
            <p className="text-gray-600 mb-4">
              {t('eventVisitors.deleteVisitorConfirm', 'Voulez-vous vraiment supprimer {{name}} de la liste ?', { name: deleteConfirm.fullName })}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                {t('common.cancel', 'Annuler')}
              </button>
              <button
                onClick={() => handleDeleteVisitor(deleteConfirm.id)}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                {t('common.delete', 'Supprimer')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
