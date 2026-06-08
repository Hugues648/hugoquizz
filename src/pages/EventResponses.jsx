import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { 
  getEventById, 
  getGiftsByEvent,
  getGiftSelectionsByEvent,
  deleteGiftSelection
} from '../services/firestore'
import { 
  FiArrowLeft, FiGift, FiUsers, FiCheck, FiTrash2,
  FiCalendar, FiMessageSquare, FiDollarSign, FiPieChart
} from 'react-icons/fi'
import LoadingSpinner from '../components/LoadingSpinner'

const EVENT_TYPES = {
  'mariage': { label: 'Mariage', emoji: '💒' },
  'anniversaire': { label: 'Anniversaire', emoji: '🎂' },
  'naissance': { label: 'Naissance', emoji: '👶' },
  'bapteme': { label: 'Baptême', emoji: '⛪' },
  'cremaillere': { label: 'Crémaillère', emoji: '🏠' },
  'noel': { label: 'Noël', emoji: '🎄' },
  'autre': { label: 'Événement', emoji: '🎉' }
}

export default function EventResponses() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [event, setEvent] = useState(null)
  const [gifts, setGifts] = useState([])
  const [selections, setSelections] = useState([])

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    try {
      const eventData = await getEventById(id)
      if (!eventData) {
        setError(t('eventResponses.errors.notFound', 'Événement non trouvé'))
        return
      }
      if (eventData.userId !== user.uid) {
        setError(t('eventResponses.errors.unauthorized', 'Vous n\'êtes pas autorisé à voir ces statistiques'))
        return
      }
      setEvent(eventData)
      
      const [giftsData, selectionsData] = await Promise.all([
        getGiftsByEvent(id),
        getGiftSelectionsByEvent(id)
      ])
      
      setGifts(giftsData)
      setSelections(selectionsData)
    } catch (err) {
      console.error('Erreur chargement:', err)
      setError(t('eventResponses.errors.loadError', 'Erreur lors du chargement des données'))
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSelection = async (selectionId) => {
    if (!confirm(t('eventResponses.confirmDelete', 'Supprimer cette réservation ?'))) return
    
    try {
      await deleteGiftSelection(selectionId)
      await loadData()
      setSuccess(t('eventResponses.deleteSuccess', 'Réservation supprimée'))
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Erreur suppression:', err)
      setError(t('eventResponses.errors.deleteError', 'Erreur lors de la suppression'))
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return '-'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString(i18n.language, {
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
            {t('eventResponses.backToDashboard', 'Retour au tableau de bord')}
          </button>
        </div>
      </div>
    )
  }

  const eventType = EVENT_TYPES[event?.type] || EVENT_TYPES.autre
  
  // Stats
  const totalGifts = gifts.length
  const reservedGifts = gifts.filter(g => {
    const giftSelections = selections.filter(s => s.giftId === g.id)
    if (g.allowMultiple) {
      return g.maxSelections > 0 && giftSelections.length >= g.maxSelections
    }
    return giftSelections.length > 0
  }).length
  
  const totalSelections = selections.length
  const uniqueGuests = [...new Set(selections.map(s => s.guestName.toLowerCase()))].length
  
  const totalValue = gifts.reduce((sum, g) => {
    const giftSelections = selections.filter(s => s.giftId === g.id)
    const giftType = g.giftType || 'article'
    if (giftType === 'money' || giftType === 'shared') {
      // Sum actual contributed amounts
      return sum + giftSelections.reduce((s, sel) => s + (sel.amount || 0), 0)
    }
    if (giftSelections.length > 0 && g.price) {
      return sum + (g.price * giftSelections.length)
    }
    return sum
  }, 0)

  // Group selections by gift
  const giftMap = gifts.reduce((acc, g) => {
    acc[g.id] = g
    return acc
  }, {})

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <FiArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FiPieChart className="text-pink-500" />
            {t('eventResponses.title', 'Statistiques')}
          </h1>
          <p className="text-gray-600">
            {eventType.emoji} {event.name}
          </p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-pink-100 text-pink-600 rounded-lg">
              <FiGift className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{reservedGifts}/{totalGifts}</p>
              <p className="text-xs text-gray-500">{t('eventResponses.stats.giftsReserved', 'Cadeaux réservés')}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <FiUsers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{uniqueGuests}</p>
              <p className="text-xs text-gray-500">{t('eventResponses.stats.participants', 'Participants')}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 text-green-600 rounded-lg">
              <FiCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalSelections}</p>
              <p className="text-xs text-gray-500">{t('eventResponses.stats.reservations', 'Réservations')}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 text-yellow-600 rounded-lg">
              <FiDollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalValue.toFixed(0)}€</p>
              <p className="text-xs text-gray-500">{t('eventResponses.stats.reservedValue', 'Valeur réservée')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">{t('eventResponses.progress', 'Progression')}</span>
          <span className="text-sm text-gray-500">
            {totalGifts > 0 ? Math.round((reservedGifts / totalGifts) * 100) : 0}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-pink-500 to-purple-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${totalGifts > 0 ? (reservedGifts / totalGifts) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Reservations List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FiCheck className="text-green-500" />
            {t('eventResponses.reservationsList', 'Liste des réservations')} ({totalSelections})
          </h2>
        </div>

        {selections.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {selections.map(selection => {
              const gift = giftMap[selection.giftId]
              
              return (
                <div key={selection.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium text-gray-900">
                          {selection.guestName}
                        </span>
                        {selection.isAnonymous && (
                          <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">{t('eventResponses.anonymous', 'anonyme')}</span>
                        )}
                        <span className="text-gray-400">→</span>
                        <span className="text-pink-600 font-medium">
                          {gift?.name || t('eventResponses.giftDeleted', 'Cadeau supprimé')}
                        </span>
                        {(gift?.giftType === 'money' || gift?.giftType === 'shared') && selection.amount ? (
                          <span className="px-2 py-0.5 text-xs font-bold bg-amber-100 text-amber-700 rounded-full">{selection.amount}€</span>
                        ) : gift?.price ? (
                          <span className="text-sm text-gray-500">({gift.price}€)</span>
                        ) : null}
                      </div>
                      
                      {selection.message && (
                        <p className="text-sm text-gray-600 flex items-start gap-1 mt-1">
                          <FiMessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                          {selection.message}
                        </p>
                      )}
                      
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                        <FiCalendar className="w-3 h-3" />
                        {formatDate(selection.createdAt)}
                      </p>
                    </div>
                    
                    <button
                      onClick={() => handleDeleteSelection(selection.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title={t('eventResponses.deleteReservation', 'Supprimer la réservation')}
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <FiGift className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>{t('eventResponses.noReservations', 'Aucune réservation pour le moment')}</p>
            <p className="text-sm">{t('eventResponses.shareToReceive', 'Partagez votre liste pour recevoir des réservations')}</p>
          </div>
        )}
      </div>

      {/* Gift Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FiGift className="text-pink-500" />
            {t('eventResponses.giftSummary', 'Récapitulatif par cadeau')}
          </h2>
        </div>

        <div className="divide-y divide-gray-100">
          {gifts.map(gift => {
            const giftSelections = selections.filter(s => s.giftId === gift.id)
            const giftType = gift.giftType || 'article'
            const totalContributed = giftSelections.reduce((s, sel) => s + (sel.amount || 0), 0)
            const targetAmount = parseFloat(gift.targetAmount) || 0
            const isReserved = giftType === 'article'
              ? (gift.allowMultiple 
                  ? (gift.maxSelections > 0 && giftSelections.length >= gift.maxSelections)
                  : giftSelections.length > 0)
              : (giftType === 'shared' && targetAmount > 0)
                ? totalContributed >= targetAmount
                : giftSelections.length > 0
            
            return (
              <div key={gift.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {gift.imageUrl && (
                      <img 
                        src={gift.imageUrl} 
                        alt={gift.name}
                        className="w-10 h-10 rounded-lg object-cover"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    )}
                    <div>
                      <p className="font-medium text-gray-900 flex items-center gap-2">
                        {gift.name}
                        {giftType !== 'article' && (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                            giftType === 'money' ? 'bg-amber-100 text-amber-700' : 'bg-teal-100 text-teal-700'
                          }`}>
                            {giftType === 'money' ? '💰' : '🤝'}
                          </span>
                        )}
                      </p>
                      {giftType === 'article' && gift.price && (
                        <p className="text-sm text-gray-500">{gift.price}€</p>
                      )}
                      {giftType === 'shared' && targetAmount > 0 && (
                        <p className="text-sm text-gray-500">{t('eventResponses.stats.target', 'Objectif')}: {targetAmount}€</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {giftSelections.length > 0 ? (
                      <div className="text-right">
                        {(giftType === 'money' || giftType === 'shared') ? (
                          <>
                            <p className="text-sm font-bold text-green-600">
                              {totalContributed.toFixed(0)}€
                              {giftType === 'shared' && targetAmount > 0 && (
                                <span className="text-gray-400 font-normal"> / {targetAmount}€</span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500">
                              {giftSelections.length} {t('eventResponses.contribution', 'contribution')}{giftSelections.length > 1 ? 's' : ''}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-green-600">
                              {giftSelections.length} {t('eventResponses.reservation', 'réservation')}{giftSelections.length > 1 ? 's' : ''}
                            </p>
                            <p className="text-xs text-gray-500">
                              {giftSelections.map(s => s.guestName).join(', ')}
                            </p>
                          </>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">{t('eventResponses.notReserved', 'Non réservé')}</span>
                    )}
                    
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      isReserved 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {isReserved ? t('eventResponses.reserved', 'Réservé') : t('eventResponses.available', 'Disponible')}
                    </span>
                  </div>
                </div>

                {/* Detailed contributions for money/shared gifts */}
                {(giftType === 'money' || giftType === 'shared') && giftSelections.length > 0 && (
                  <div className="mt-3 ml-13 space-y-1">
                    {giftSelections.map(sel => (
                      <div key={sel.id} className="flex items-center justify-between text-xs px-3 py-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${sel.isAnonymous ? 'text-purple-700' : 'text-gray-700'}`}>
                            {sel.guestName}
                            {sel.isAnonymous && <span className="text-purple-500 ml-1">(anonyme)</span>}
                          </span>
                          {sel.message && (
                            <span className="text-gray-400 italic truncate max-w-[200px]" title={sel.message}>
                              — {sel.message}
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                          {sel.amount ? `${sel.amount}€` : '-'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Shared gift progress bar */}
                {giftType === 'shared' && targetAmount > 0 && (
                  <div className="mt-2 ml-13">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          totalContributed >= targetAmount 
                            ? 'bg-gradient-to-r from-emerald-500 to-green-500' 
                            : 'bg-gradient-to-r from-pink-500 to-purple-500'
                        }`}
                        style={{ width: `${Math.min(100, (totalContributed / targetAmount) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
