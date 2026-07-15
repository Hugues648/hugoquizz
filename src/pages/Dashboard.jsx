import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { getQuizzesByUser, getQuestionnairesByUser, deleteQuiz, deleteQuestionnaire, getEventsByUser, deleteEvent, getServicesByUser, deleteService } from '../services/firestore'
import { getStorageStatus, formatBytes } from '../services/storage'
import { FiPlus, FiPlay, FiEdit2, FiTrash2, FiShare2, FiClock, FiHelpCircle, FiList, FiCopy, FiX, FiMail, FiBarChart2, FiGift, FiCalendar, FiEye, FiUsers, FiRadio, FiLock, FiZap, FiChevronDown, FiChevronUp, FiAlertTriangle, FiHardDrive, FiCheckSquare, FiBriefcase, FiMessageSquare } from 'react-icons/fi'
import { FaWhatsapp } from 'react-icons/fa'
import ServiceAvatar from '../components/services/ServiceAvatar'
import { categoryLabel, typeLabel } from '../config/serviceCategories'
import { getShareableLink } from '../config/app'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'
import LocalizedLink, { useLocalizedPath } from '../components/LocalizedLink'
import NotificationIcon from '../components/NotificationIcon'

const EVENT_TYPE_EMOJIS = {
  'mariage': '💒',
  'anniversaire': '🎂',
  'naissance': '👶',
  'bapteme': '⛪',
  'cremaillere': '🏠',
  'noel': '🎄',
  'autre': '🎉'
}

// Composant ActionPanel pour afficher les actions de manière explicite
const ActionPanel = ({ type, item, onShare, onDelete, navigate, t }) => {
  const actions = {
    quiz: [
      { icon: FiRadio, label: t('dashboard.actionPanel.hostLive', 'Lancer en direct'), color: 'bg-pink-500 hover:bg-pink-600', textColor: 'text-white', path: `/quiz/${item.id}/host` },
      { icon: FiPlay, label: t('dashboard.actionPanel.testQuiz', 'Tester le quiz'), color: 'bg-green-500 hover:bg-green-600', textColor: 'text-white', path: `/play/quiz/${item.id}` },
      { icon: FiBarChart2, label: t('dashboard.actionPanel.viewResults', 'Voir les résultats'), color: 'bg-orange-500 hover:bg-orange-600', textColor: 'text-white', path: `/quiz/${item.id}/responses` },
      { icon: FiShare2, label: t('dashboard.actionPanel.share', 'Partager'), color: 'bg-purple-500 hover:bg-purple-600', textColor: 'text-white', onClick: () => onShare('quiz', item.id, item.title) },
      { icon: FiEdit2, label: t('dashboard.actionPanel.edit', 'Modifier'), color: 'bg-blue-500 hover:bg-blue-600', textColor: 'text-white', path: `/quiz/edit/${item.id}` },
      { icon: FiTrash2, label: t('dashboard.actionPanel.delete', 'Supprimer'), color: 'bg-red-100 hover:bg-red-200', textColor: 'text-red-600', onClick: () => onDelete('quiz', item.id, item.title) },
    ],
    questionnaire: [
      { icon: FiBarChart2, label: t('dashboard.actionPanel.viewResponses', 'Voir les réponses'), color: 'bg-orange-500 hover:bg-orange-600', textColor: 'text-white', path: `/questionnaire/${item.id}/responses` },
      { icon: FiPlay, label: t('dashboard.actionPanel.test', 'Tester'), color: 'bg-green-500 hover:bg-green-600', textColor: 'text-white', path: `/play/questionnaire/${item.id}` },
      { icon: FiShare2, label: t('dashboard.actionPanel.share', 'Partager'), color: 'bg-purple-500 hover:bg-purple-600', textColor: 'text-white', onClick: () => onShare('questionnaire', item.id, item.title) },
      { icon: FiEdit2, label: t('dashboard.actionPanel.edit', 'Modifier'), color: 'bg-blue-500 hover:bg-blue-600', textColor: 'text-white', path: `/questionnaire/edit/${item.id}` },
      { icon: FiTrash2, label: t('dashboard.actionPanel.delete', 'Supprimer'), color: 'bg-red-100 hover:bg-red-200', textColor: 'text-red-600', onClick: () => onDelete('questionnaire', item.id, item.title) },
    ],
    event: [
      { icon: FiUsers, label: t('dashboard.actionPanel.guestList', 'Liste des invités'), color: 'bg-pink-500 hover:bg-pink-600', textColor: 'text-white', path: `/event/${item.id}/guests` },
      { icon: FiCalendar, label: t('dashboard.actionPanel.planning', 'Planification'), color: 'bg-orange-500 hover:bg-orange-600', textColor: 'text-white', path: `/event/${item.id}/planning` },
      { icon: FiCheckSquare, label: t('dashboard.actionPanel.tasks', 'Tâches'), color: 'bg-indigo-500 hover:bg-indigo-600', textColor: 'text-white', path: `/event/${item.id}/tasks` },
      { icon: FiBarChart2, label: t('dashboard.actionPanel.statistics', 'Statistiques'), color: 'bg-teal-500 hover:bg-teal-600', textColor: 'text-white', path: `/event/${item.id}/responses` },
      { icon: FiShare2, label: t('dashboard.actionPanel.shareGiftList', 'Partager'), color: 'bg-purple-500 hover:bg-purple-600', textColor: 'text-white', onClick: () => onShare('event', item.id, item.name) },
      { icon: FiEye, label: t('dashboard.actionPanel.viewGiftList', 'Consulter'), color: 'bg-green-500 hover:bg-green-600', textColor: 'text-white', path: `/event/${item.id}` },
      { icon: FiEdit2, label: t('dashboard.actionPanel.edit', 'Modifier'), color: 'bg-blue-500 hover:bg-blue-600', textColor: 'text-white', path: `/event/${item.id}/edit` },
      { icon: FiTrash2, label: t('dashboard.actionPanel.delete', 'Supprimer'), color: 'bg-red-100 hover:bg-red-200', textColor: 'text-red-600', onClick: () => onDelete('event', item.id, item.name) },
    ],
  }

  const currentActions = actions[type] || []

  return (
    <div className="mt-4 pt-4 border-t border-gray-200 animate-fade-in">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {currentActions.map((action, index) => {
          const Icon = action.icon
          const content = (
            <div className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl ${action.color} ${action.textColor} transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md`}>
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium text-center leading-tight">{action.label}</span>
            </div>
          )

          if (action.path) {
            return (
              <LocalizedLink key={index} to={action.path} onClick={(e) => e.stopPropagation()}>
                {content}
              </LocalizedLink>
            )
          }

          return (
            <div key={index} onClick={(e) => { e.stopPropagation(); action.onClick?.() }}>
              {content}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const Dashboard = () => {
  const { t } = useTranslation()
  const { user, userData, canAccessQuestionnaire, canAccessEvents, isFreeUser } = useAuth()
  const navigate = useNavigate()
  const getLocalizedPath = useLocalizedPath()
  const [quizzes, setQuizzes] = useState([])
  const [questionnaires, setQuestionnaires] = useState([])
  const [events, setEvents] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('quizzes')
  const [deleteModal, setDeleteModal] = useState({ show: false, type: null, id: null, title: '' })
  const [shareModal, setShareModal] = useState({ show: false, type: null, id: null, title: '' })
  const [expandedItem, setExpandedItem] = useState(null) // { type: 'quiz'|'questionnaire'|'event', id: string }
  const [storageStatus, setStorageStatus] = useState(null) // { status, used, limit, percentage }
  
  // Helper pour naviguer avec la langue
  const navigateTo = (path) => navigate(getLocalizedPath(path))

  // Toggle l'expansion d'une carte
  const toggleExpand = (type, id) => {
    if (expandedItem?.type === type && expandedItem?.id === id) {
      setExpandedItem(null)
    } else {
      setExpandedItem({ type, id })
    }
  }

  useEffect(() => {
    fetchData()
  }, [user])

  const fetchData = async () => {
    try {
      const [quizzesData, questionnairesData, eventsData, servicesData, storageData] = await Promise.all([
        getQuizzesByUser(user.uid),
        getQuestionnairesByUser(user.uid),
        getEventsByUser(user.uid),
        getServicesByUser(user.uid),
        getStorageStatus(user.uid)
      ])
      setQuizzes(quizzesData)
      setQuestionnaires(questionnairesData)
      setEvents(eventsData)
      setServices(servicesData)
      setStorageStatus(storageData)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error(t('dashboard.loadError'))
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    try {
      if (deleteModal.type === 'quiz') {
        await deleteQuiz(deleteModal.id)
        setQuizzes(quizzes.filter(q => q.id !== deleteModal.id))
      } else if (deleteModal.type === 'questionnaire') {
        await deleteQuestionnaire(deleteModal.id)
        setQuestionnaires(questionnaires.filter(q => q.id !== deleteModal.id))
      } else if (deleteModal.type === 'event') {
        await deleteEvent(deleteModal.id)
        setEvents(events.filter(e => e.id !== deleteModal.id))
      } else if (deleteModal.type === 'service') {
        await deleteService(deleteModal.id)
        setServices(services.filter(s => s.id !== deleteModal.id))
      }
      toast.success(t('dashboard.deleteModal.success'))
    } catch (error) {
      console.error('Delete error:', error)
      toast.error(t('dashboard.deleteModal.error'))
    } finally {
      setDeleteModal({ show: false, type: null, id: null, title: '' })
    }
  }

  const copyShareLink = async (type, id) => {
    const link = getShareableLink(type, id)
    
    try {
      // Méthode moderne (nécessite HTTPS ou localhost)
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(link)
        toast.success(t('dashboard.share.linkCopied'))
      } else {
        // Fallback pour HTTP ou navigateurs anciens
        const textArea = document.createElement('textarea')
        textArea.value = link
        textArea.style.position = 'fixed'
        textArea.style.left = '-9999px'
        textArea.style.top = '-9999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        const successful = document.execCommand('copy')
        document.body.removeChild(textArea)
        if (successful) {
          toast.success(t('dashboard.share.linkCopied'))
        } else {
          toast.error(t('dashboard.share.copyError'))
        }
      }
    } catch (err) {
      console.error('Erreur de copie:', err)
      // Fallback en cas d'erreur
      const textArea = document.createElement('textarea')
      textArea.value = link
      textArea.style.position = 'fixed'
      textArea.style.left = '-9999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      try {
        document.execCommand('copy')
        toast.success(t('dashboard.share.linkCopied'))
      } catch (e) {
        toast.error(t('dashboard.share.copyError') + ': ' + link)
      }
      document.body.removeChild(textArea)
    }
    setShareModal({ show: false, type: null, id: null, title: '' })
  }

  const getShareLink = (type, id) => {
    return getShareableLink(type, id)
  }

  const shareViaWhatsApp = (type, id, title) => {
    const link = getShareLink(type, id)
    let message
    if (type === 'quiz') {
      message = `🎯 ${t('dashboard.share.quizMessage')} "${title}" !\n\n${link}`
    } else if (type === 'questionnaire') {
      message = `📋 ${t('dashboard.share.questionnaireMessage')} "${title}" !\n\n${link}`
    } else {
      message = `🎁 ${t('dashboard.share.eventMessage')} "${title}" !\n\n${link}`
    }
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
    setShareModal({ show: false, type: null, id: null, title: '' })
  }

  const shareViaEmail = (type, id, title) => {
    const link = getShareLink(type, id)
    let subject, body
    if (type === 'quiz') {
      subject = `${t('dashboard.share.quizEmailSubject')}: ${title}`
      body = t('dashboard.share.quizEmailBody').replace('{title}', title).replace('{link}', link)
    } else if (type === 'questionnaire') {
      subject = `${t('dashboard.share.questionnaireEmailSubject')}: ${title}`
      body = t('dashboard.share.questionnaireEmailBody').replace('{title}', title).replace('{link}', link)
    } else {
      subject = `${t('dashboard.share.eventEmailSubject')}: ${title}`
      body = t('dashboard.share.eventEmailBody').replace('{title}', title).replace('{link}', link)
    }
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.location.href = mailtoUrl
    setShareModal({ show: false, type: null, id: null, title: '' })
  }

  const openShareModal = (type, id, title) => {
    setShareModal({ show: true, type, id, title })
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return '-'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner text={t('dashboard.loading')} />
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {t('dashboard.hello')}, {userData?.displayName || t('common.user')} 👋
            </h1>
            <p className="text-white/70">{t('dashboard.manageContent')}</p>
          </div>
          <div className="relative">
            <NotificationIcon />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <FiHelpCircle className="text-white text-xl" />
            </div>
            <div>
              <p className="text-white/70 text-sm">{t('dashboard.stats.quizzesCreated')}</p>
              <p className="text-2xl font-bold text-white">{quizzes.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <FiList className="text-white text-xl" />
            </div>
            <div>
              <p className="text-white/70 text-sm">{t('dashboard.stats.questionnaires')}</p>
              <p className="text-2xl font-bold text-white">{questionnaires.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl flex items-center justify-center">
              <FiGift className="text-white text-xl" />
            </div>
            <div>
              <p className="text-white/70 text-sm">{t('dashboard.stats.events')}</p>
              <p className="text-2xl font-bold text-white">{events.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
              <FiBriefcase className="text-white text-xl" />
            </div>
            <div>
              <p className="text-white/70 text-sm">{t('dashboard.stats.services', 'Services')}</p>
              <p className="text-2xl font-bold text-white">{services.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
              <FiPlay className="text-white text-xl" />
            </div>
            <div>
              <p className="text-white/70 text-sm">{t('dashboard.stats.totalContent')}</p>
              <p className="text-2xl font-bold text-white">{quizzes.length + questionnaires.length + events.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Storage Warning */}
      {storageStatus && (storageStatus.status === 'warning' || storageStatus.status === 'critical' || storageStatus.status === 'exceeded') && (
        <div className={`rounded-2xl p-5 mb-8 border ${
          storageStatus.status === 'exceeded' 
            ? 'bg-red-500/20 border-red-400/30' 
            : storageStatus.status === 'critical'
              ? 'bg-orange-500/20 border-orange-400/30'
              : 'bg-yellow-500/20 border-yellow-400/30'
        }`}>
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
              storageStatus.status === 'exceeded' ? 'bg-red-500' : 
              storageStatus.status === 'critical' ? 'bg-orange-500' : 'bg-yellow-500'
            }`}>
              {storageStatus.status === 'exceeded' ? (
                <FiAlertTriangle className="text-white text-2xl" />
              ) : (
                <FiHardDrive className="text-white text-2xl" />
              )}
            </div>
            <div className="flex-1 text-center md:text-left">
              <h4 className="font-bold text-white text-lg">
                {storageStatus.status === 'exceeded' 
                  ? t('dashboard.storage.exceeded', 'Espace de stockage épuisé !')
                  : storageStatus.status === 'critical'
                    ? t('dashboard.storage.critical', 'Espace de stockage critique !')
                    : t('dashboard.storage.warning', 'Espace de stockage bientôt plein')}
              </h4>
              <p className="text-white/70 text-sm">
                {t('dashboard.storage.usageInfo', 'Vous utilisez {{used}} sur {{limit}} ({{percentage}}%)', {
                  used: formatBytes(storageStatus.used),
                  limit: formatBytes(storageStatus.limit),
                  percentage: storageStatus.percentage.toFixed(1)
                })}
              </p>
              {storageStatus.status === 'exceeded' && (
                <p className="text-white/80 text-sm mt-1">
                  {t('dashboard.storage.contactAdmin', 'Contactez contact@hugoquiz.com pour augmenter votre espace.')}
                </p>
              )}
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-32 bg-white/20 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full ${
                    storageStatus.status === 'exceeded' ? 'bg-red-400' : 
                    storageStatus.status === 'critical' ? 'bg-orange-400' : 'bg-yellow-400'
                  }`}
                  style={{ width: `${Math.min(100, storageStatus.percentage)}%` }}
                />
              </div>
              <span className="text-white/80 text-xs font-medium">
                {storageStatus.percentage.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4 mb-8">
        <LocalizedLink to="/quiz/create" className="btn btn-primary flex items-center gap-2">
          <FiPlus />
          {t('dashboard.createQuiz')}
        </LocalizedLink>
        {canAccessQuestionnaire() ? (
          <LocalizedLink to="/questionnaire/create" className="btn btn-secondary flex items-center gap-2">
            <FiPlus />
            {t('dashboard.createQuestionnaire')}
          </LocalizedLink>
        ) : (
          <button 
            onClick={() => navigateTo('/pricing')}
            className="btn bg-gray-400 text-white flex items-center gap-2 opacity-80"
          >
            <FiLock />
            {t('dashboard.createQuestionnaire')}
            <span className="text-xs bg-amber-400 text-amber-900 px-2 py-0.5 rounded-full ml-1">PRO</span>
          </button>
        )}
        {canAccessEvents() ? (
          <LocalizedLink to="/event/create" className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-pink-600 hover:to-rose-600 transition-all flex items-center gap-2 shadow-lg">
            <FiGift />
            {t('dashboard.createEvent')}
          </LocalizedLink>
        ) : (
          <button 
            onClick={() => navigateTo('/pricing')}
            className="bg-gray-400 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 opacity-80"
          >
            <FiLock />
            {t('dashboard.createEvent')}
            <span className="text-xs bg-amber-400 text-amber-900 px-2 py-0.5 rounded-full ml-1">PRO</span>
          </button>
        )}
        <LocalizedLink to="/service/create" className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-amber-600 hover:to-orange-600 transition-all flex items-center gap-2 shadow-lg">
          <FiBriefcase />
          {t('dashboard.createService', 'Proposer un service')}
        </LocalizedLink>
      </div>

      {/* Free user upgrade banner */}
      {isFreeUser() && (
        <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 backdrop-blur-lg rounded-2xl p-4 border border-amber-400/30 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
              <FiZap className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold">{t('dashboard.freeUserBanner', 'Compte gratuit - Quiz limité à 5 joueurs')}</p>
              <p className="text-white/70 text-sm">{t('dashboard.upgradeForMore', 'Passez au Pro pour débloquer questionnaires, événements et joueurs illimités')}</p>
            </div>
          </div>
          <button
            onClick={() => navigateTo('/pricing')}
            className="btn bg-gradient-to-r from-amber-400 to-orange-500 text-white hover:from-amber-500 hover:to-orange-600 whitespace-nowrap"
          >
            {t('dashboard.upgradePro', 'Passer au Pro')}
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('quizzes')}
            className={`flex-1 min-w-max whitespace-nowrap px-3 md:px-4 py-4 text-sm md:text-base font-medium transition-colors ${
              activeTab === 'quizzes'
                ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FiHelpCircle className="inline mr-1.5 md:mr-2" />
            {t('dashboard.tabs.quiz')} ({quizzes.length})
          </button>
          <button
            onClick={() => canAccessQuestionnaire() ? setActiveTab('questionnaires') : navigateTo('/pricing')}
            className={`flex-1 min-w-max whitespace-nowrap px-3 md:px-4 py-4 text-sm md:text-base font-medium transition-colors relative ${
              activeTab === 'questionnaires'
                ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                : 'text-gray-500 hover:text-gray-700'
            } ${!canAccessQuestionnaire() ? 'opacity-60' : ''}`}
          >
            {!canAccessQuestionnaire() && <FiLock className="inline mr-1 text-amber-500" />}
            <FiList className="inline mr-1.5 md:mr-2" />
            {t('dashboard.tabs.questionnaires')} ({questionnaires.length})
            {!canAccessQuestionnaire() && <span className="text-xs bg-amber-400 text-amber-900 px-1.5 py-0.5 rounded-full ml-2">PRO</span>}
          </button>
          <button
            onClick={() => canAccessEvents() ? setActiveTab('events') : navigateTo('/pricing')}
            className={`flex-1 min-w-max whitespace-nowrap px-3 md:px-4 py-4 text-sm md:text-base font-medium transition-colors relative ${
              activeTab === 'events'
                ? 'text-pink-600 border-b-2 border-pink-600 bg-pink-50'
                : 'text-gray-500 hover:text-gray-700'
            } ${!canAccessEvents() ? 'opacity-60' : ''}`}
          >
            {!canAccessEvents() && <FiLock className="inline mr-1 text-amber-500" />}
            <FiGift className="inline mr-1.5 md:mr-2" />
            {t('dashboard.tabs.events')} ({events.length})
            {!canAccessEvents() && <span className="text-xs bg-amber-400 text-amber-900 px-1.5 py-0.5 rounded-full ml-2">PRO</span>}
          </button>
          <button
            onClick={() => setActiveTab('services')}
            className={`flex-1 min-w-max whitespace-nowrap px-3 md:px-4 py-4 text-sm md:text-base font-medium transition-colors relative ${
              activeTab === 'services'
                ? 'text-amber-600 border-b-2 border-amber-600 bg-amber-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FiBriefcase className="inline mr-1.5 md:mr-2" />
            {t('dashboard.tabs.services', 'Services')} ({services.length})
          </button>
        </div>

        <div className="p-6">
          {/* Blocked content for questionnaires */}
          {activeTab === 'questionnaires' && !canAccessQuestionnaire() ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FiLock className="text-4xl text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">{t('dashboard.questionnairesLocked', 'Questionnaires réservés aux abonnés')}</h3>
              <p className="text-gray-500 mb-6">{t('dashboard.upgradeToAccess', 'Passez au forfait Quiz & Questionnaire ou Complet pour accéder à cette fonctionnalité')}</p>
              <button
                onClick={() => navigateTo('/pricing')}
                className="btn bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 inline-flex items-center gap-2"
              >
                <FiZap />
                {t('dashboard.seePlans', 'Voir les forfaits')}
              </button>
            </div>
          ) : activeTab === 'events' && !canAccessEvents() ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FiLock className="text-4xl text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">{t('dashboard.eventsLocked', 'Événements réservés aux abonnés')}</h3>
              <p className="text-gray-500 mb-6">{t('dashboard.upgradeToAccessEvents', 'Passez au forfait Événements ou Complet pour accéder à cette fonctionnalité')}</p>
              <button
                onClick={() => navigateTo('/pricing')}
                className="btn bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 inline-flex items-center gap-2"
              >
                <FiZap />
                {t('dashboard.seePlans', 'Voir les forfaits')}
              </button>
            </div>
          ) : activeTab === 'quizzes' ? (
            quizzes.length === 0 ? (
              <div className="text-center py-12">
                <FiHelpCircle className="text-6xl text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">{t('dashboard.noQuizzes')}</p>
                <LocalizedLink to="/quiz/create" className="btn btn-primary inline-flex items-center gap-2">
                  <FiPlus />
                  {t('dashboard.createFirstQuiz')}
                </LocalizedLink>
              </div>
            ) : (
              <div className="grid gap-4">
                {quizzes.map((quiz) => {
                  const isExpanded = expandedItem?.type === 'quiz' && expandedItem?.id === quiz.id
                  return (
                  <div 
                    key={quiz.id} 
                    className={`border rounded-xl p-5 transition-all duration-200 cursor-pointer ${
                      isExpanded 
                        ? 'border-purple-300 shadow-lg bg-purple-50/30' 
                        : 'border-gray-200 hover:shadow-lg hover:border-gray-300'
                    }`}
                    onClick={() => toggleExpand('quiz', quiz.id)}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-800">{quiz.title}</h3>
                        <p className="text-gray-500 text-sm mt-1">{quiz.description || t('dashboard.noDescription')}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <FiHelpCircle />
                            {quiz.questionsCount || 0} questions
                          </span>
                          <span className="flex items-center gap-1">
                            <FiClock />
                            {formatDate(quiz.createdAt)}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            quiz.isPublic ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {quiz.isPublic ? t('common.public') : t('common.private')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <LocalizedLink
                          to={`/quiz/${quiz.id}/host`}
                          className="p-2 rounded-lg text-pink-500 hover:bg-pink-50 transition-colors"
                          title={t('dashboard.actions.hostLive')}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <FiRadio />
                        </LocalizedLink>
                        <LocalizedLink
                          to={`/quiz/${quiz.id}/responses`}
                          className="p-2 rounded-lg text-orange-500 hover:bg-orange-50 transition-colors"
                          title={t('dashboard.actions.viewResponses')}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <FiBarChart2 />
                        </LocalizedLink>
                        <button
                          onClick={(e) => { e.stopPropagation(); openShareModal('quiz', quiz.id, quiz.title) }}
                          className="p-2 rounded-lg text-purple-500 hover:bg-purple-50 transition-colors"
                          title={t('dashboard.actions.share')}
                        >
                          <FiShare2 />
                        </button>
                        <LocalizedLink
                          to={`/play/quiz/${quiz.id}`}
                          className="p-2 rounded-lg text-green-500 hover:bg-green-50 transition-colors"
                          title={t('dashboard.actions.play')}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <FiPlay />
                        </LocalizedLink>
                        <LocalizedLink
                          to={`/quiz/edit/${quiz.id}`}
                          className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
                          title={t('dashboard.actions.edit')}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <FiEdit2 />
                        </LocalizedLink>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteModal({ show: true, type: 'quiz', id: quiz.id, title: quiz.title }) }}
                          className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                          title={t('dashboard.actions.delete')}
                        >
                          <FiTrash2 />
                        </button>
                        <div className={`p-2 rounded-lg text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                          <FiChevronDown />
                        </div>
                      </div>
                    </div>
                    
                    {/* Panneau d'actions explicites */}
                    {isExpanded && (
                      <ActionPanel 
                        type="quiz"
                        item={quiz}
                        onShare={openShareModal}
                        onDelete={(type, id, title) => setDeleteModal({ show: true, type, id, title })}
                        navigate={navigate}
                        t={t}
                      />
                    )}
                  </div>
                  )
                })}
              </div>
            )
          ) : activeTab === 'questionnaires' ? (
            questionnaires.length === 0 ? (
              <div className="text-center py-12">
                <FiList className="text-6xl text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">{t('dashboard.noQuestionnaires')}</p>
                <LocalizedLink to="/questionnaire/create" className="btn btn-secondary inline-flex items-center gap-2">
                  <FiPlus />
                  {t('dashboard.createFirstQuestionnaire')}
                </LocalizedLink>
              </div>
            ) : (
              <div className="grid gap-4">
                {questionnaires.map((questionnaire) => {
                  const isExpanded = expandedItem?.type === 'questionnaire' && expandedItem?.id === questionnaire.id
                  return (
                  <div 
                    key={questionnaire.id} 
                    className={`border rounded-xl p-5 transition-all duration-200 cursor-pointer ${
                      isExpanded 
                        ? 'border-purple-300 shadow-lg bg-purple-50/30' 
                        : 'border-gray-200 hover:shadow-lg hover:border-gray-300'
                    }`}
                    onClick={() => toggleExpand('questionnaire', questionnaire.id)}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-800">{questionnaire.title}</h3>
                        <p className="text-gray-500 text-sm mt-1">{questionnaire.description || t('dashboard.noDescription')}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <FiList />
                            {questionnaire.questions?.length || 0} questions
                          </span>
                          <span className="flex items-center gap-1">
                            <FiClock />
                            {formatDate(questionnaire.createdAt)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <LocalizedLink
                          to={`/questionnaire/${questionnaire.id}/responses`}
                          className="p-2 rounded-lg text-orange-500 hover:bg-orange-50 transition-colors"
                          title={t('dashboard.actions.viewResponses')}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <FiBarChart2 />
                        </LocalizedLink>
                        <button
                          onClick={(e) => { e.stopPropagation(); openShareModal('questionnaire', questionnaire.id, questionnaire.title) }}
                          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                          title={t('dashboard.actions.share')}
                        >
                          <FiShare2 />
                        </button>
                        <LocalizedLink
                          to={`/play/questionnaire/${questionnaire.id}`}
                          className="p-2 rounded-lg text-green-500 hover:bg-green-50 transition-colors"
                          title={t('dashboard.actions.answer')}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <FiPlay />
                        </LocalizedLink>
                        <LocalizedLink
                          to={`/questionnaire/edit/${questionnaire.id}`}
                          className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
                          title={t('dashboard.actions.edit')}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <FiEdit2 />
                        </LocalizedLink>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteModal({ show: true, type: 'questionnaire', id: questionnaire.id, title: questionnaire.title }) }}
                          className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                          title={t('dashboard.actions.delete')}
                        >
                          <FiTrash2 />
                        </button>
                        <div className={`p-2 rounded-lg text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                          <FiChevronDown />
                        </div>
                      </div>
                    </div>
                    
                    {/* Panneau d'actions explicites */}
                    {isExpanded && (
                      <ActionPanel 
                        type="questionnaire"
                        item={questionnaire}
                        onShare={openShareModal}
                        onDelete={(type, id, title) => setDeleteModal({ show: true, type, id, title })}
                        navigate={navigate}
                        t={t}
                      />
                    )}
                  </div>
                  )
                })}
              </div>
            )
          ) : activeTab === 'events' ? (
            events.length === 0 ? (
              <div className="text-center py-12">
                <FiGift className="text-6xl text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">{t('dashboard.noEvents')}</p>
                <LocalizedLink to="/event/create" className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-pink-600 hover:to-rose-600 transition-all inline-flex items-center gap-2">
                  <FiPlus />
                  {t('dashboard.createFirstEvent')}
                </LocalizedLink>
              </div>
            ) : (
              <div className="grid gap-4">
                {events.map((event) => {
                  const eventEmoji = EVENT_TYPE_EMOJIS[event.type] || EVENT_TYPE_EMOJIS.autre
                  const isExpanded = expandedItem?.type === 'event' && expandedItem?.id === event.id
                  return (
                    <div 
                      key={event.id} 
                      className={`border rounded-xl p-5 transition-all duration-200 cursor-pointer ${
                        isExpanded 
                          ? 'border-pink-300 shadow-lg bg-pink-50/30' 
                          : 'border-gray-200 hover:shadow-lg hover:border-gray-300'
                      }`}
                      onClick={() => toggleExpand('event', event.id)}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1 flex gap-4">
                          {event.imageUrl && (
                            <img 
                              src={event.imageUrl} 
                              alt={event.name}
                              className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                              onError={(e) => e.target.style.display = 'none'}
                            />
                          )}
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                              <span>{eventEmoji}</span>
                              {event.name}
                            </h3>
                            <p className="text-gray-500 text-sm mt-1">{event.description || t('dashboard.noDescription')}</p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                              <span className="flex items-center gap-1">
                                <FiCalendar />
                                {event.date || t('dashboard.dateNotSet')}
                              </span>
                              <span className="flex items-center gap-1">
                                <FiClock />
                                {formatDate(event.createdAt)}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                event.isPublic !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                              }`}>
                                {event.isPublic !== false ? t('common.public') : t('common.private')}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <LocalizedLink
                            to={`/event/${event.id}/guests`}
                            className="p-2 rounded-lg text-pink-500 hover:bg-pink-50 transition-colors"
                            title={t('dashboard.actions.manageGuests')}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <FiUsers />
                          </LocalizedLink>
                          <LocalizedLink
                            to={`/event/${event.id}/responses`}
                            className="p-2 rounded-lg text-orange-500 hover:bg-orange-50 transition-colors"
                            title={t('dashboard.actions.statistics')}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <FiBarChart2 />
                          </LocalizedLink>
                          <button
                            onClick={(e) => { e.stopPropagation(); openShareModal('event', event.id, event.name) }}
                            className="p-2 rounded-lg text-purple-500 hover:bg-purple-50 transition-colors"
                            title={t('dashboard.actions.share')}
                          >
                            <FiShare2 />
                          </button>
                          <LocalizedLink
                            to={`/event/${event.id}`}
                            className="p-2 rounded-lg text-green-500 hover:bg-green-50 transition-colors"
                            title={t('dashboard.actions.view')}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <FiEye />
                          </LocalizedLink>
                          <LocalizedLink
                            to={`/event/${event.id}/edit`}
                            className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
                            title={t('dashboard.actions.edit')}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <FiEdit2 />
                          </LocalizedLink>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteModal({ show: true, type: 'event', id: event.id, title: event.name }) }}
                            className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                            title={t('dashboard.actions.delete')}
                          >
                            <FiTrash2 />
                          </button>
                          <div className={`p-2 rounded-lg text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                            <FiChevronDown />
                          </div>
                        </div>
                      </div>
                      
                      {/* Panneau d'actions explicites */}
                      {isExpanded && (
                        <ActionPanel 
                          type="event"
                          item={event}
                          onShare={openShareModal}
                          onDelete={(type, id, title) => setDeleteModal({ show: true, type, id, title })}
                          navigate={navigate}
                          t={t}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            )
          ) : activeTab === 'services' ? (
            services.length === 0 ? (
              <div className="text-center py-12">
                <FiBriefcase className="text-6xl text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">{t('dashboard.noServices', "Vous n'avez pas encore publié de service.")}</p>
                <LocalizedLink to="/service/create" className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-amber-600 hover:to-orange-600 transition-all inline-flex items-center gap-2">
                  <FiPlus />
                  {t('dashboard.createFirstService', 'Proposer mon premier service')}
                </LocalizedLink>
              </div>
            ) : (
              <div className="grid gap-4">
                <div className="flex justify-end">
                  <LocalizedLink to="/service/messages" className="inline-flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700 font-medium">
                    <FiMessageSquare /> {t('services.messages.title', 'Messages reçus')}
                  </LocalizedLink>
                </div>
                {services.map((service) => {
                  const statusStyles = {
                    pending: 'bg-amber-100 text-amber-700',
                    approved: 'bg-green-100 text-green-700',
                    rejected: 'bg-red-100 text-red-700',
                    restricted: 'bg-gray-200 text-gray-700',
                  }
                  const statusLabel = {
                    pending: t('services.status.pending', 'En attente de validation'),
                    approved: t('services.status.approved', 'Publié'),
                    rejected: t('services.status.rejected', 'Rejeté'),
                    restricted: t('services.status.restricted', 'Restreint'),
                  }
                  return (
                    <div key={service.id} className="border border-gray-200 rounded-xl p-5 hover:shadow-lg hover:border-gray-300 transition-all">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1 flex gap-4 items-center min-w-0">
                          <ServiceAvatar name={service.businessName} photoURL={service.ownerPhotoURL} size={48} />
                          <div className="min-w-0">
                            <h3 className="text-lg font-semibold text-gray-800 truncate">{service.businessName}</h3>
                            <p className="text-gray-500 text-sm truncate">
                              {categoryLabel(t, service.category)} · {typeLabel(t, service.serviceType)}
                            </p>
                            {service.location?.city && (
                              <p className="text-gray-400 text-xs truncate flex items-center gap-1 mt-0.5">
                                <span className="text-sm leading-none">{service.location.flag}</span>
                                {service.location.city}
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-400">
                              <span className="flex items-center gap-1"><FiEye /> {service.views || 0} {t('services.views', 'vues')}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[service.status] || 'bg-gray-100 text-gray-600'}`}>
                                {statusLabel[service.status] || service.status}
                              </span>
                            </div>
                            {service.status === 'rejected' && service.adminMessage && (
                              <p className="text-xs text-red-500 mt-1">{service.adminMessage}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <LocalizedLink
                            to={`/service/${service.id}`}
                            className="p-2 rounded-lg text-green-500 hover:bg-green-50 transition-colors"
                            title={t('common.view', 'Voir')}
                          >
                            <FiEye />
                          </LocalizedLink>
                          <LocalizedLink
                            to={`/service/edit/${service.id}`}
                            className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
                            title={t('dashboard.actions.edit')}
                          >
                            <FiEdit2 />
                          </LocalizedLink>
                          <LocalizedLink
                            to="/service/messages"
                            className="p-2 rounded-lg text-amber-500 hover:bg-amber-50 transition-colors"
                            title={t('services.messages.title', 'Messages')}
                          >
                            <FiMessageSquare />
                          </LocalizedLink>
                          <button
                            onClick={() => setDeleteModal({ show: true, type: 'service', id: service.id, title: service.businessName })}
                            className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                            title={t('dashboard.actions.delete')}
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          ) : null}
        </div>
      </div>

      {/* Share Modal */}
      {shareModal.show && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShareModal({ show: false, type: null, id: null, title: '' })}
        >
          <div 
            className="bg-white rounded-2xl p-6 max-w-sm w-full animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">{t('dashboard.share.title')}</h3>
              <button
                onClick={() => setShareModal({ show: false, type: null, id: null, title: '' })}
                className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <FiX />
              </button>
            </div>
            <p className="text-gray-600 mb-6 truncate">{shareModal.title}</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => shareViaWhatsApp(shareModal.type, shareModal.id, shareModal.title)}
                className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl bg-green-500 text-white hover:bg-green-600 transition-colors font-medium"
              >
                <FaWhatsapp className="text-xl" />
                {t('dashboard.share.whatsapp')}
              </button>
              <button
                onClick={() => shareViaEmail(shareModal.type, shareModal.id, shareModal.title)}
                className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-colors font-medium"
              >
                <FiMail className="text-xl" />
                {t('dashboard.share.email')}
              </button>
              <button
                onClick={() => {
                  copyShareLink(shareModal.type, shareModal.id)
                  setShareModal({ show: false, type: null, id: null, title: '' })
                }}
                className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors font-medium"
              >
                <FiCopy className="text-xl" />
                {t('dashboard.share.copyLink')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full animate-scale-in">
            <h3 className="text-xl font-bold text-gray-800 mb-4">{t('dashboard.deleteModal.title')}</h3>
            <p className="text-gray-600 mb-6">
              {t('dashboard.deleteModal.message').replace('{title}', deleteModal.title)}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal({ show: false, type: null, id: null, title: '' })}
                className="flex-1 btn btn-ghost"
              >
                {t('dashboard.deleteModal.cancel')}
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 btn btn-danger"
              >
                {t('dashboard.deleteModal.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
