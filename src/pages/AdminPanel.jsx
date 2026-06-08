import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { 
  getUsers, 
  validateUser, 
  setUserRole, 
  getAllQuizzes, 
  getAllQuestionnaires,
  deleteQuiz,
  deleteQuestionnaire,
  getQuizSessionsByQuiz,
  getQuestionnaireSessionsByQuestionnaire
} from '../services/firestore'
import {
  getAllUsersStorageUsage,
  updateUserStorageLimit,
  recalculateUserStorage,
  formatBytes,
  STORAGE_LIMIT_BYTES,
  STORAGE_WARNING_THRESHOLD,
  STORAGE_CRITICAL_THRESHOLD
} from '../services/storage'
import { 
  FiUsers, 
  FiCheck, 
  FiX, 
  FiSearch, 
  FiRefreshCw, 
  FiHelpCircle, 
  FiList,
  FiActivity,
  FiTrash2,
  FiEye,
  FiUserCheck,
  FiUserX,
  FiBarChart2,
  FiPieChart,
  FiDownload,
  FiSettings,
  FiAlertCircle,
  FiClock,
  FiAward,
  FiPlay,
  FiTrendingUp,
  FiDatabase,
  FiShield,
  FiMail,
  FiCalendar,
  FiGift,
  FiZap,
  FiHardDrive,
  FiEdit3,
  FiImage,
  FiUpload,
  FiMessageCircle,
  FiBriefcase
} from 'react-icons/fi'
import { getSiteConfig, updateLogo } from '../services/siteConfig'
import { uploadImage } from '../services/storage'
import AdminServices from '../components/services/AdminServices'
import { useSiteConfig } from '../contexts/SiteConfigContext'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'
import { getFunctions, httpsCallable } from 'firebase/functions'

const AdminPanel = () => {
  const { t } = useTranslation()
  const [users, setUsers] = useState([])
  const [quizzes, setQuizzes] = useState([])
  const [questionnaires, setQuestionnaires] = useState([])
  const [quizSessions, setQuizSessions] = useState([])
  const [questionnaireSessions, setQuestionnaireSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [userFilter, setUserFilter] = useState('all')
  const [deleteModal, setDeleteModal] = useState({ show: false, type: null, id: null, title: '' })
  const [selectedUser, setSelectedUser] = useState(null)
  
  // Grant free access state
  const [grantAccessUserId, setGrantAccessUserId] = useState('')
  const [grantAccessPlanType, setGrantAccessPlanType] = useState('complete_monthly')
  const [grantAccessLoading, setGrantAccessLoading] = useState(false)
  const [grantAccessSearch, setGrantAccessSearch] = useState('')
  
  // Revoke access state
  const [revokeAccessLoading, setRevokeAccessLoading] = useState(false)
  
  // Storage management state
  const [usersStorage, setUsersStorage] = useState([])
  const [storageLoading, setStorageLoading] = useState(false)
  const [storageSearchTerm, setStorageSearchTerm] = useState('')
  const [editingStorageLimit, setEditingStorageLimit] = useState(null)
  const [newStorageLimit, setNewStorageLimit] = useState('')
  const [recalculatingUser, setRecalculatingUser] = useState(null)
  
  // Branding/Logo management state
  const { refreshConfig } = useSiteConfig()
  const [logos, setLogos] = useState({
    favicon: '',
    header: '',
    footer: '',
    ogImage: '',
    loginPage: '',
    registerPage: '',
    hero: ''
  })
  const [logoUploading, setLogoUploading] = useState(null)
  const [logosLoading, setLogosLoading] = useState(false)
  
  // Plan options for admin grant
  const planOptions = [
    { value: 'free', label: 'Gratuit (réinitialiser)', icon: '🆓' },
    { value: 'quiz_monthly', label: 'Quiz Pro - 1 mois', icon: '🎯' },
    { value: 'quiz_yearly', label: 'Quiz Pro - 1 an', icon: '🎯' },
    { value: 'events_monthly', label: 'Événements Pro - 1 mois', icon: '🎉' },
    { value: 'events_yearly', label: 'Événements Pro - 1 an', icon: '🎉' },
    { value: 'complete_monthly', label: 'Complet Pro - 1 mois', icon: '⭐' },
    { value: 'complete_yearly', label: 'Complet Pro - 1 an', icon: '⭐' },
  ]

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      const [usersData, quizzesData, questionnairesData] = await Promise.all([
        getUsers(),
        getAllQuizzes(),
        getAllQuestionnaires()
      ])
      
      setUsers(usersData)
      setQuizzes(quizzesData)
      setQuestionnaires(questionnairesData)

      // Fetch all sessions for statistics
      let allQuizSessions = []
      let allQuestionnaireSessions = []

      for (const quiz of quizzesData) {
        try {
          const sessions = await getQuizSessionsByQuiz(quiz.id)
          allQuizSessions = [...allQuizSessions, ...sessions]
        } catch (e) {
          // No sessions for this quiz
        }
      }

      for (const q of questionnairesData) {
        try {
          const sessions = await getQuestionnaireSessionsByQuestionnaire(q.id)
          allQuestionnaireSessions = [...allQuestionnaireSessions, ...sessions]
        } catch (e) {
          // No sessions for this questionnaire
        }
      }

      setQuizSessions(allQuizSessions)
      setQuestionnaireSessions(allQuestionnaireSessions)

    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error(t('admin.errorLoadingData'))
    } finally {
      setLoading(false)
    }
  }

  // Fetch storage data for all users
  const fetchStorageData = async () => {
    setStorageLoading(true)
    try {
      const storageData = await getAllUsersStorageUsage()
      setUsersStorage(storageData)
    } catch (error) {
      console.error('Error fetching storage data:', error)
      toast.error('Erreur lors du chargement des données de stockage')
    } finally {
      setStorageLoading(false)
    }
  }

  // Update user's storage limit
  const handleUpdateStorageLimit = async (userId) => {
    if (!newStorageLimit || isNaN(parseFloat(newStorageLimit))) {
      toast.error('Veuillez entrer une valeur valide en Go')
      return
    }
    
    try {
      const limitInBytes = parseFloat(newStorageLimit) * 1024 * 1024 * 1024
      await updateUserStorageLimit(userId, limitInBytes)
      
      // Update local state
      setUsersStorage(prev => prev.map(u => 
        u.id === userId 
          ? { ...u, storageLimit: limitInBytes, percentage: (u.storageUsed / limitInBytes) * 100 }
          : u
      ))
      
      setEditingStorageLimit(null)
      setNewStorageLimit('')
      toast.success('Limite de stockage mise à jour')
    } catch (error) {
      console.error('Error updating storage limit:', error)
      toast.error('Erreur lors de la mise à jour')
    }
  }

  // Recalculate user's storage
  const handleRecalculateStorage = async (userId) => {
    setRecalculatingUser(userId)
    try {
      const newUsage = await recalculateUserStorage(userId)
      
      // Update local state
      setUsersStorage(prev => prev.map(u => 
        u.id === userId 
          ? { ...u, storageUsed: newUsage, percentage: (newUsage / u.storageLimit) * 100 }
          : u
      ))
      
      toast.success(`Stockage recalculé: ${formatBytes(newUsage)}`)
    } catch (error) {
      console.error('Error recalculating storage:', error)
      toast.error('Erreur lors du recalcul')
    } finally {
      setRecalculatingUser(null)
    }
  }

  // Load logos on mount
  useEffect(() => {
    const loadLogos = async () => {
      setLogosLoading(true)
      try {
        const config = await getSiteConfig()
        if (config.logos) {
          setLogos(config.logos)
        }
      } catch (error) {
        console.error('Error loading logos:', error)
      } finally {
        setLogosLoading(false)
      }
    }
    loadLogos()
  }, [])

  // Handle logo upload
  const handleLogoUpload = async (logoType, file) => {
    if (!file) return
    
    setLogoUploading(logoType)
    try {
      // Upload to Firebase Storage
      const url = await uploadImage(file, `site-logos`)
      
      // Update in Firestore
      await updateLogo(logoType, url)
      
      // Update local state
      setLogos(prev => ({ ...prev, [logoType]: url }))
      
      // Refresh site config
      await refreshConfig()
      
      toast.success(t('admin.logoUploaded', 'Logo mis à jour avec succès'))
    } catch (error) {
      console.error('Error uploading logo:', error)
      toast.error(t('admin.logoUploadError', 'Erreur lors de l\'upload du logo'))
    } finally {
      setLogoUploading(null)
    }
  }

  // Handle logo removal
  const handleLogoRemove = async (logoType) => {
    try {
      await updateLogo(logoType, null)
      setLogos(prev => ({ ...prev, [logoType]: null }))
      await refreshConfig()
      toast.success(t('admin.logoRemoved', 'Logo supprimé'))
    } catch (error) {
      console.error('Error removing logo:', error)
      toast.error(t('admin.logoRemoveError', 'Erreur lors de la suppression'))
    }
  }

  // Statistics calculations
  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.validated !== false).length,
    disabledUsers: users.filter(u => u.validated === false).length,
    pendingEmailVerification: users.filter(u => !u.emailVerified).length,
    adminUsers: users.filter(u => u.role === 'admin').length,
    totalQuizzes: quizzes.length,
    publicQuizzes: quizzes.filter(q => q.isPublic).length,
    privateQuizzes: quizzes.filter(q => !q.isPublic).length,
    totalQuestionnaires: questionnaires.length,
    totalQuizSessions: quizSessions.length,
    totalQuestionnaireSessions: questionnaireSessions.length,
    totalSessions: quizSessions.length + questionnaireSessions.length,
    avgQuizScore: quizSessions.length > 0 
      ? Math.round(quizSessions.reduce((acc, s) => acc + (s.score || 0), 0) / quizSessions.length)
      : 0,
    completedQuizSessions: quizSessions.filter(s => s.status === 'completed').length,
    completedQuestionnaireSessions: questionnaireSessions.filter(s => s.status === 'completed').length,
    totalQuestions: quizzes.reduce((acc, q) => acc + (q.questionsCount || 0), 0)
  }

  // Recent activity aggregation
  const getRecentActivity = () => {
    const activities = [
      ...users.map(u => ({ 
        type: 'user', 
        action: t('admin.activity.registration'),
        name: u.displayName || u.email, 
        date: u.createdAt,
        validated: u.validated,
        icon: FiUsers,
        color: 'blue'
      })),
      ...quizzes.map(q => ({ 
        type: 'quiz', 
        action: t('admin.activity.quizCreation'),
        name: q.title, 
        date: q.createdAt,
        userName: q.userName,
        icon: FiHelpCircle,
        color: 'purple'
      })),
      ...questionnaires.map(q => ({ 
        type: 'questionnaire', 
        action: t('admin.activity.questionnaireCreation'),
        name: q.title, 
        date: q.createdAt,
        userName: q.userName,
        icon: FiList,
        color: 'pink'
      })),
      ...quizSessions.map(s => ({ 
        type: 'session', 
        action: t('admin.activity.quizPlayed'),
        name: s.quizTitle || 'Quiz', 
        date: s.createdAt,
        playerName: s.playerName,
        score: s.score,
        icon: FiPlay,
        color: 'green'
      }))
    ]

    return activities
      .filter(a => a.date)
      .sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date)
        const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date)
        return dateB - dateA
      })
      .slice(0, 15)
  }

  // User statistics per user
  const getUserStats = (userId) => {
    const userQuizzes = quizzes.filter(q => q.userId === userId)
    const userQuestionnaires = questionnaires.filter(q => q.userId === userId)
    return {
      quizzes: userQuizzes.length,
      questionnaires: userQuestionnaires.length,
      total: userQuizzes.length + userQuestionnaires.length
    }
  }

  const handleToggleUserActive = async (userId, active) => {
    try {
      await validateUser(userId, active)
      setUsers(users.map(u => u.id === userId ? { ...u, validated: active } : u))
      toast.success(active ? t('admin.userActivatedSuccess', 'Compte activé avec succès') : t('admin.userDisabledSuccess', 'Compte désactivé avec succès'))
    } catch (error) {
      console.error('Validate error:', error)
      toast.error(t('admin.errorUpdating'))
    }
  }

  const handleSetRole = async (userId, role) => {
    try {
      await setUserRole(userId, role)
      setUsers(users.map(u => u.id === userId ? { ...u, role } : u))
      toast.success(`${t('admin.roleUpdated')}: ${role === 'admin' ? '🛡️ Admin' : '👤 ' + t('common.user')}`)
    } catch (error) {
      console.error('Role error:', error)
      toast.error(t('admin.errorUpdatingRole'))
    }
  }

  const handleGrantFreeAccess = async () => {
    if (!grantAccessUserId) {
      toast.error(t('admin.selectUserFirst', 'Veuillez sélectionner un utilisateur'))
      return
    }

    setGrantAccessLoading(true)
    try {
      const functions = getFunctions()
      const grantFreeAccess = httpsCallable(functions, 'grantFreeAccess')
      const result = await grantFreeAccess({
        targetUserId: grantAccessUserId,
        planType: grantAccessPlanType
      })
      
      const selectedUserObj = users.find(u => u.id === grantAccessUserId)
      const selectedPlan = planOptions.find(p => p.value === grantAccessPlanType)
      toast.success(
        t('admin.freeAccessGranted', 'Accès "{{plan}}" accordé à {{user}}', {
          user: selectedUserObj?.displayName || selectedUserObj?.email,
          plan: selectedPlan?.label || result.data?.planName
        })
      )
      
      // Refresh users to see updated subscription
      fetchAllData()
      setGrantAccessUserId('')
      setGrantAccessSearch('')
    } catch (error) {
      console.error('Grant access error:', error)
      toast.error(error.message || t('admin.errorGrantingAccess', 'Erreur lors de l\'attribution de l\'accès'))
    } finally {
      setGrantAccessLoading(false)
    }
  }

  const handleRevokeAccess = async (userId, userName) => {
    if (!confirm(t('admin.confirmRevokeAccess', 'Voulez-vous vraiment révoquer l\'accès gratuit de {{user}} ?', { user: userName }))) {
      return
    }

    setRevokeAccessLoading(true)
    try {
      const functions = getFunctions()
      const revokeAccess = httpsCallable(functions, 'revokeAccess')
      await revokeAccess({ targetUserId: userId })
      
      toast.success(t('admin.accessRevoked', 'Accès révoqué pour {{user}}', { user: userName }))
      
      // Refresh users and update selected user if open
      await fetchAllData()
      if (selectedUser?.id === userId) {
        const updatedUser = users.find(u => u.id === userId)
        if (updatedUser) {
          setSelectedUser({ ...updatedUser, subscription: { plan: 'FREE', planId: 'free' } })
        }
      }
    } catch (error) {
      console.error('Revoke access error:', error)
      toast.error(error.message || t('admin.errorRevokingAccess', 'Erreur lors de la révocation de l\'accès'))
    } finally {
      setRevokeAccessLoading(false)
    }
  }

  const handleDeleteContent = async () => {
    try {
      if (deleteModal.type === 'quiz') {
        await deleteQuiz(deleteModal.id)
        setQuizzes(quizzes.filter(q => q.id !== deleteModal.id))
        toast.success(t('admin.quizDeleted'))
      } else if (deleteModal.type === 'questionnaire') {
        await deleteQuestionnaire(deleteModal.id)
        setQuestionnaires(questionnaires.filter(q => q.id !== deleteModal.id))
        toast.success(t('admin.questionnaireDeleted'))
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error(t('admin.errorDeleting'))
    } finally {
      setDeleteModal({ show: false, type: null, id: null, title: '' })
    }
  }

  const exportData = (type) => {
    let data = []
    let filename = ''

    if (type === 'users') {
      data = users.map(u => ({
        id: u.id,
        email: u.email,
        displayName: u.displayName || '',
        role: u.role,
        validated: u.validated,
        createdAt: u.createdAt?.toDate?.()?.toISOString() || ''
      }))
      filename = `hugoquiz_users_${new Date().toISOString().split('T')[0]}.json`
    } else if (type === 'quizzes') {
      data = quizzes.map(q => ({
        id: q.id,
        title: q.title,
        description: q.description || '',
        userName: q.userName || '',
        isPublic: q.isPublic,
        questionsCount: q.questionsCount || 0,
        createdAt: q.createdAt?.toDate?.()?.toISOString() || ''
      }))
      filename = `hugoquiz_quizzes_${new Date().toISOString().split('T')[0]}.json`
    } else if (type === 'statistics') {
      data = {
        exportDate: new Date().toISOString(),
        statistics: stats,
        recentActivity: getRecentActivity().map(a => ({
          ...a,
          date: a.date?.toDate?.()?.toISOString() || ''
        }))
      }
      filename = `hugoquiz_stats_${new Date().toISOString().split('T')[0]}.json`
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success(t('admin.exportDownloaded', { filename }))
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (userFilter === 'all') return matchesSearch
    if (userFilter === 'active') return matchesSearch && user.validated !== false
    if (userFilter === 'disabled') return matchesSearch && user.validated === false
    if (userFilter === 'pendingEmail') return matchesSearch && !user.emailVerified
    if (userFilter === 'admin') return matchesSearch && user.role === 'admin'
    return matchesSearch
  })

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

  const formatRelativeDate = (timestamp) => {
    if (!timestamp) return '-'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return t('time.justNow')
    if (diffMins < 60) return t('admin.minutesAgo', { count: diffMins })
    if (diffHours < 24) return t('admin.hoursAgo', { count: diffHours })
    if (diffDays < 7) return t('admin.daysAgo', { count: diffDays })
    return formatDate(timestamp)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner text={t('admin.loadingDashboard')} />
      </div>
    )
  }

  // Tabs configuration
  const tabs = [
    { id: 'overview', label: t('admin.tabs.overview'), icon: FiBarChart2 },
    { id: 'users', label: t('admin.users'), icon: FiUsers, badge: stats.disabledUsers > 0 ? stats.disabledUsers : null },
    { id: 'storage', label: t('admin.tabs.storage', 'Stockage'), icon: FiHardDrive },
    { id: 'content', label: t('admin.tabs.content'), icon: FiList },
    { id: 'services', label: t('admin.tabs.services', 'Services'), icon: FiBriefcase },
    { id: 'activity', label: t('admin.tabs.activity'), icon: FiActivity },
    { id: 'settings', label: t('admin.tabs.settings'), icon: FiSettings }
  ]

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{t('admin.dashboardTitle')} 🛡️</h1>
            <p className="text-white/70">{t('admin.dashboardSubtitle')}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={fetchAllData}
              className="btn bg-white/20 text-white hover:bg-white/30 flex items-center gap-2"
            >
              <FiRefreshCw className={loading ? 'animate-spin' : ''} />
              {t('common.refresh')}
            </button>
            <div className="relative group">
              <button className="btn bg-white text-purple-600 hover:bg-gray-100 flex items-center gap-2">
                <FiDownload />
                {t('common.export')}
              </button>
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 border border-gray-100">
                <div className="p-2">
                  <button 
                    onClick={() => exportData('users')}
                    className="w-full px-4 py-3 text-left text-gray-700 hover:bg-purple-50 rounded-lg flex items-center gap-3"
                  >
                    <FiUsers className="text-blue-500" />
                    <div>
                      <p className="font-medium">{t('admin.users')}</p>
                      <p className="text-xs text-gray-400">{t('admin.formatJson')}</p>
                    </div>
                  </button>
                  <button 
                    onClick={() => exportData('quizzes')}
                    className="w-full px-4 py-3 text-left text-gray-700 hover:bg-purple-50 rounded-lg flex items-center gap-3"
                  >
                    <FiHelpCircle className="text-purple-500" />
                    <div>
                      <p className="font-medium">{t('admin.quiz')}</p>
                      <p className="text-xs text-gray-400">{t('admin.formatJson')}</p>
                    </div>
                  </button>
                  <button 
                    onClick={() => exportData('statistics')}
                    className="w-full px-4 py-3 text-left text-gray-700 hover:bg-purple-50 rounded-lg flex items-center gap-3"
                  >
                    <FiBarChart2 className="text-green-500" />
                    <div>
                      <p className="font-medium">{t('admin.statistics')}</p>
                      <p className="text-xs text-gray-400">{t('admin.formatJson')}</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20 hover:bg-white/15 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
              <FiUsers className="text-white text-xl" />
            </div>
            <div>
              <p className="text-white/60 text-xs font-medium">{t('admin.users')}</p>
              <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20 hover:bg-white/15 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg">
              <FiUserCheck className="text-white text-xl" />
            </div>
            <div>
              <p className="text-green-300 text-xs font-medium">Actifs</p>
              <p className="text-2xl font-bold text-white">{stats.activeUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20 hover:bg-white/15 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center shadow-lg">
              <FiUserX className="text-white text-xl" />
            </div>
            <div>
              <p className="text-red-300 text-xs font-medium">Désactivés</p>
              <p className="text-2xl font-bold text-white">{stats.disabledUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20 hover:bg-white/15 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg">
              <FiHelpCircle className="text-white text-xl" />
            </div>
            <div>
              <p className="text-purple-300 text-xs font-medium">Quiz</p>
              <p className="text-2xl font-bold text-white">{stats.totalQuizzes}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20 hover:bg-white/15 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-pink-500 rounded-xl flex items-center justify-center shadow-lg">
              <FiList className="text-white text-xl" />
            </div>
            <div>
              <p className="text-pink-300 text-xs font-medium">{t('admin.questionnaires')}</p>
              <p className="text-2xl font-bold text-white">{stats.totalQuestionnaires}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20 hover:bg-white/15 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
              <FiPlay className="text-white text-xl" />
            </div>
            <div>
              <p className="text-cyan-300 text-xs font-medium">{t('admin.sessions')}</p>
              <p className="text-2xl font-bold text-white">{stats.totalSessions}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Disabled Users Alert */}
      {stats.disabledUsers > 0 && (
        <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 backdrop-blur-lg border border-red-400/30 rounded-2xl p-5 mb-8 flex flex-col md:flex-row items-center gap-4">
          <div className="w-14 h-14 bg-red-500 rounded-2xl flex items-center justify-center shadow-lg">
            <FiUserX className="text-white text-2xl" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h4 className="font-bold text-white text-lg">
              {stats.disabledUsers} compte(s) désactivé(s)
            </h4>
            <p className="text-white/70 text-sm">
              Ces utilisateurs ne peuvent pas accéder à leur compte.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setActiveTab('users')}
              className="btn bg-white/20 text-white hover:bg-white/30"
            >
              Voir la liste
            </button>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex overflow-x-auto border-b border-gray-200">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 font-medium whitespace-nowrap transition-all relative ${
                activeTab === tab.id
                  ? 'text-purple-600 bg-purple-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
              {tab.badge > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">
                  {tab.badge}
                </span>
              )}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600" />
              )}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* ==================== OVERVIEW TAB ==================== */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Stats Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Users Stats */}
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <FiUsers size={28} />
                    <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-medium">{t('admin.users')}</span>
                  </div>
                  <p className="text-4xl font-bold mb-3">{stats.totalUsers}</p>
                  <div className="space-y-1 text-sm opacity-90">
                    <div className="flex justify-between">
                      <span>✅ Actifs</span>
                      <span className="font-medium">{stats.activeUsers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>🚫 Désactivés</span>
                      <span className="font-medium">{stats.disabledUsers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>🛡️ {t('admin.admins')}</span>
                      <span className="font-medium">{stats.adminUsers}</span>
                    </div>
                  </div>
                </div>

                {/* Content Stats */}
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <FiDatabase size={28} />
                    <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-medium">{t('admin.tabs.content')}</span>
                  </div>
                  <p className="text-4xl font-bold mb-3">{stats.totalQuizzes + stats.totalQuestionnaires}</p>
                  <div className="space-y-1 text-sm opacity-90">
                    <div className="flex justify-between">
                      <span>🎯 {t('admin.quiz')}</span>
                      <span className="font-medium">{stats.totalQuizzes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>📋 {t('admin.questionnaires')}</span>
                      <span className="font-medium">{stats.totalQuestionnaires}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>❓ {t('admin.questions')}</span>
                      <span className="font-medium">{stats.totalQuestions}</span>
                    </div>
                  </div>
                </div>

                {/* Sessions Stats */}
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <FiActivity size={28} />
                    <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-medium">{t('admin.sessions')}</span>
                  </div>
                  <p className="text-4xl font-bold mb-3">{stats.totalSessions}</p>
                  <div className="space-y-1 text-sm opacity-90">
                    <div className="flex justify-between">
                      <span>🎮 {t('admin.quizPlayed')}</span>
                      <span className="font-medium">{stats.totalQuizSessions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>📝 {t('admin.questionnaires')}</span>
                      <span className="font-medium">{stats.totalQuestionnaireSessions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>✅ {t('admin.completed')}</span>
                      <span className="font-medium">{stats.completedQuizSessions + stats.completedQuestionnaireSessions}</span>
                    </div>
                  </div>
                </div>

                {/* Performance Stats */}
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <FiAward size={28} />
                    <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-medium">{t('admin.performance')}</span>
                  </div>
                  <p className="text-4xl font-bold mb-3">{stats.avgQuizScore}%</p>
                  <div className="space-y-1 text-sm opacity-90">
                    <div className="flex justify-between">
                      <span>{t('admin.avgQuizScore')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>🏆 {t('admin.quizCompleted')}</span>
                      <span className="font-medium">{stats.completedQuizSessions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>📊 {t('admin.completionRate')}</span>
                      <span className="font-medium">
                        {stats.totalQuizSessions > 0 
                          ? Math.round((stats.completedQuizSessions / stats.totalQuizSessions) * 100) 
                          : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* User Distribution Chart */}
                <div className="bg-gray-50 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <FiPieChart className="text-purple-500" />
                    {t('admin.userDistribution')}
                  </h3>
                  <div className="space-y-5">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600 flex items-center gap-2">
                          <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                          Comptes actifs
                        </span>
                        <span className="font-bold text-gray-800">{stats.activeUsers}</span>
                      </div>
                      <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-500"
                          style={{ width: `${stats.totalUsers ? (stats.activeUsers / stats.totalUsers) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600 flex items-center gap-2">
                          <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                          Comptes désactivés
                        </span>
                        <span className="font-bold text-gray-800">{stats.disabledUsers}</span>
                      </div>
                      <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full transition-all duration-500"
                          style={{ width: `${stats.totalUsers ? (stats.disabledUsers / stats.totalUsers) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600 flex items-center gap-2">
                          <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
                          {t('admin.administrators')}
                        </span>
                        <span className="font-bold text-gray-800">{stats.adminUsers}</span>
                      </div>
                      <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-400 to-purple-500 rounded-full transition-all duration-500"
                          style={{ width: `${stats.totalUsers ? (stats.adminUsers / stats.totalUsers) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Activity Panel */}
                <div className="bg-gray-50 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <FiActivity className="text-purple-500" />
                    {t('admin.recentActivity')}
                  </h3>
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                    {getRecentActivity().length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <FiActivity className="mx-auto text-4xl mb-2 opacity-50" />
                        <p>{t('admin.noRecentActivity')}</p>
                      </div>
                    ) : (
                      getRecentActivity().slice(0, 8).map((activity, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-xl hover:shadow-md transition-all">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow ${
                            activity.color === 'blue' ? 'bg-blue-500' :
                            activity.color === 'purple' ? 'bg-purple-500' :
                            activity.color === 'green' ? 'bg-green-500' :
                            'bg-pink-500'
                          }`}>
                            <activity.icon size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">
                              {activity.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {activity.action}
                              {activity.playerName && ` • ${activity.playerName}`}
                              {activity.score !== undefined && ` • Score: ${activity.score}%`}
                            </p>
                          </div>
                          <span className="text-xs text-gray-400 whitespace-nowrap">
                            {formatRelativeDate(activity.date)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                  {getRecentActivity().length > 8 && (
                    <button
                      onClick={() => setActiveTab('activity')}
                      className="w-full mt-4 py-2 text-sm text-purple-600 hover:text-purple-700 font-medium"
                    >
                      {t('admin.viewAllActivity')} →
                    </button>
                  )}
                </div>
              </div>

              {/* Content Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Quiz Stats */}
                <div className="bg-gray-50 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <FiHelpCircle className="text-purple-500" />
                    Quiz ({stats.totalQuizzes})
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-xl p-4 text-center">
                      <p className="text-3xl font-bold text-green-600">{stats.publicQuizzes}</p>
                      <p className="text-sm text-gray-500">{t('common.public')}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 text-center">
                      <p className="text-3xl font-bold text-gray-600">{stats.privateQuizzes}</p>
                      <p className="text-sm text-gray-500">{t('common.private')}</p>
                    </div>
                  </div>
                </div>

                {/* Top Creators */}
                <div className="bg-gray-50 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <FiTrendingUp className="text-purple-500" />
                    {t('admin.topCreators')}
                  </h3>
                  <div className="space-y-3">
                    {users
                      .map(u => ({ ...u, stats: getUserStats(u.id) }))
                      .filter(u => u.stats.total > 0)
                      .sort((a, b) => b.stats.total - a.stats.total)
                      .slice(0, 5)
                      .map((user, index) => (
                        <div key={user.id} className="flex items-center gap-3 bg-white rounded-xl p-3">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            index === 0 ? 'bg-yellow-100 text-yellow-700' :
                            index === 1 ? 'bg-gray-100 text-gray-700' :
                            index === 2 ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-50 text-gray-500'
                          }`}>
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 truncate">{user.displayName || user.email}</p>
                          </div>
                          <div className="flex gap-2 text-xs">
                            <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                              {user.stats.quizzes} {t('admin.quiz').toLowerCase()}
                            </span>
                            <span className="bg-pink-100 text-pink-700 px-2 py-1 rounded-full">
                              {user.stats.questionnaires} quest.
                            </span>
                          </div>
                        </div>
                      ))
                    }
                    {users.filter(u => getUserStats(u.id).total > 0).length === 0 && (
                      <div className="text-center py-4 text-gray-400">
                        {t('admin.noContentCreated')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== USERS TAB ==================== */}
          {activeTab === 'users' && (
            <div>
              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={t('admin.searchByNameOrEmail')}
                    className="input pl-11"
                  />
                </div>
                <select
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  className="input w-auto font-medium"
                >
                  <option value="all">{t('common.all')} ({stats.totalUsers})</option>
                  <option value="active">✅ Actifs ({stats.activeUsers})</option>
                  <option value="disabled">🚫 Désactivés ({stats.disabledUsers})</option>
                  <option value="admin">🛡️ {t('admin.admins')} ({stats.adminUsers})</option>
                </select>
              </div>

              {/* Users Table */}
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">{t('common.user')}</th>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">{t('admin.role')}</th>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">{t('common.status')}</th>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">{t('admin.tabs.content')}</th>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">{t('admin.registeredOn')}</th>
                      <th className="text-right py-4 px-4 text-sm font-semibold text-gray-600">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => {
                      const userStats = getUserStats(user.id)
                      return (
                        <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold shadow ${
                                user.role === 'admin' 
                                  ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                                  : 'bg-gradient-to-br from-blue-500 to-cyan-500'
                              }`}>
                                {user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-800">{user.displayName || t('admin.noName')}</p>
                                <p className="text-sm text-gray-500 flex items-center gap-1">
                                  <FiMail size={12} />
                                  {user.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <select
                              value={user.role || 'user'}
                              onChange={(e) => handleSetRole(user.id, e.target.value)}
                              className={`px-3 py-2 rounded-xl text-sm font-medium border-0 cursor-pointer transition-colors ${
                                user.role === 'admin' 
                                  ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' 
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              <option value="user">👤 {t('common.user')}</option>
                              <option value="admin">🛡️ {t('admin.administrator')}</option>
                            </select>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex flex-col gap-1">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium ${
                                user.validated !== false 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {user.validated !== false ? <FiCheck size={14} /> : <FiX size={14} />}
                                {user.validated !== false ? 'Actif' : 'Désactivé'}
                              </span>
                              <span className={`inline-flex items-center gap-1 text-xs ${
                                user.emailVerified 
                                  ? 'text-green-600' 
                                  : 'text-orange-500'
                              }`}>
                                {user.emailVerified ? `✅ ${t('admin.emailVerified')}` : `📧 ${t('admin.emailNotVerified')}`}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex gap-2">
                              {userStats.quizzes > 0 && (
                                <span className="bg-purple-50 text-purple-600 text-xs px-2 py-1 rounded-lg">
                                  {userStats.quizzes} quiz
                                </span>
                              )}
                              {userStats.questionnaires > 0 && (
                                <span className="bg-pink-50 text-pink-600 text-xs px-2 py-1 rounded-lg">
                                  {userStats.questionnaires} quest.
                                </span>
                              )}
                              {userStats.total === 0 && (
                                <span className="text-gray-400 text-sm">-</span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <FiCalendar size={14} />
                              {formatDate(user.createdAt)}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setSelectedUser(user)}
                                className="p-2.5 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
                                title={t('admin.viewDetails')}
                              >
                                <FiEye size={18} />
                              </button>
                              {user.validated !== false ? (
                                <button
                                  onClick={() => handleToggleUserActive(user.id, false)}
                                  className="p-2.5 rounded-xl text-red-500 hover:bg-red-50 transition-colors"
                                  title="Désactiver le compte"
                                >
                                  <FiUserX size={18} />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleToggleUserActive(user.id, true)}
                                  className="p-2.5 rounded-xl text-green-500 hover:bg-green-50 transition-colors"
                                  title="Activer le compte"
                                >
                                  <FiUserCheck size={18} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {filteredUsers.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                  <FiUsers className="mx-auto text-5xl mb-3 opacity-50" />
                  <p className="text-lg">{t('admin.noUserFound')}</p>
                  <p className="text-sm">{t('admin.modifySearchCriteria')}</p>
                </div>
              )}
            </div>
          )}

          {/* ==================== STORAGE TAB ==================== */}
          {activeTab === 'storage' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <FiHardDrive className="text-blue-500" />
                    {t('admin.storage.title', 'Gestion du stockage')}
                  </h3>
                  <p className="text-gray-500 text-sm mt-1">
                    {t('admin.storage.description', 'Surveillez et gérez l\'espace de stockage de chaque utilisateur')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={fetchStorageData}
                    disabled={storageLoading}
                    className="btn bg-blue-500 text-white hover:bg-blue-600 flex items-center gap-2"
                  >
                    <FiRefreshCw className={storageLoading ? 'animate-spin' : ''} />
                    {t('common.refresh')}
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('admin.storage.searchUser', 'Rechercher un utilisateur...')}
                  value={storageSearchTerm}
                  onChange={(e) => setStorageSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Storage Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                      <FiUsers className="text-white" />
                    </div>
                    <div>
                      <p className="text-blue-600 text-xs font-medium">{t('admin.storage.totalUsers', 'Utilisateurs')}</p>
                      <p className="text-xl font-bold text-blue-700">{usersStorage.length}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                      <FiCheck className="text-white" />
                    </div>
                    <div>
                      <p className="text-green-600 text-xs font-medium">{t('admin.storage.usageOk', 'Utilisation OK')}</p>
                      <p className="text-xl font-bold text-green-700">
                        {usersStorage.filter(u => u.percentage < STORAGE_WARNING_THRESHOLD * 100).length}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4 border border-yellow-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center">
                      <FiAlertCircle className="text-white" />
                    </div>
                    <div>
                      <p className="text-yellow-600 text-xs font-medium">{t('admin.storage.nearLimit', 'Proche limite')}</p>
                      <p className="text-xl font-bold text-yellow-700">
                        {usersStorage.filter(u => u.percentage >= STORAGE_WARNING_THRESHOLD * 100 && u.percentage < 100).length}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                      <FiX className="text-white" />
                    </div>
                    <div>
                      <p className="text-red-600 text-xs font-medium">{t('admin.storage.exceeded', 'Limite dépassée')}</p>
                      <p className="text-xl font-bold text-red-700">
                        {usersStorage.filter(u => u.percentage >= 100).length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Users Storage List */}
              {storageLoading ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner text={t('admin.storage.loading', 'Chargement des données de stockage...')} />
                </div>
              ) : usersStorage.length === 0 ? (
                <div className="text-center py-12">
                  <FiHardDrive className="mx-auto text-5xl text-gray-300 mb-4" />
                  <p className="text-gray-500">{t('admin.storage.noData', 'Cliquez sur Rafraîchir pour charger les données')}</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 font-semibold text-gray-600">{t('admin.storage.user', 'Utilisateur')}</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-600">{t('admin.storage.usage', 'Utilisation')}</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-600">{t('admin.storage.limit', 'Limite')}</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-600">{t('admin.storage.status', 'Statut')}</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-600">{t('admin.storage.actions', 'Actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {usersStorage
                        .filter(u => 
                          !storageSearchTerm || 
                          u.email?.toLowerCase().includes(storageSearchTerm.toLowerCase()) ||
                          u.displayName?.toLowerCase().includes(storageSearchTerm.toLowerCase())
                        )
                        .map(user => {
                          const statusColor = user.percentage >= 100 
                            ? 'red' 
                            : user.percentage >= STORAGE_CRITICAL_THRESHOLD * 100 
                              ? 'orange'
                              : user.percentage >= STORAGE_WARNING_THRESHOLD * 100 
                                ? 'yellow' 
                                : 'green'
                          
                          return (
                            <tr key={user.id} className="hover:bg-gray-50">
                              <td className="py-3 px-4">
                                <div>
                                  <p className="font-medium text-gray-800">{user.displayName || 'Sans nom'}</p>
                                  <p className="text-sm text-gray-500">{user.email}</p>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="w-full max-w-xs">
                                  <div className="flex items-center justify-between text-sm mb-1">
                                    <span className="font-medium">{formatBytes(user.storageUsed)}</span>
                                    <span className="text-gray-400">{user.percentage.toFixed(1)}%</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                      className={`h-2 rounded-full transition-all ${
                                        statusColor === 'red' ? 'bg-red-500' :
                                        statusColor === 'orange' ? 'bg-orange-500' :
                                        statusColor === 'yellow' ? 'bg-yellow-500' :
                                        'bg-green-500'
                                      }`}
                                      style={{ width: `${Math.min(100, user.percentage)}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                {editingStorageLimit === user.id ? (
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      step="0.5"
                                      min="0.1"
                                      value={newStorageLimit}
                                      onChange={(e) => setNewStorageLimit(e.target.value)}
                                      placeholder="Go"
                                      className="w-20 px-2 py-1 border rounded text-sm"
                                    />
                                    <span className="text-gray-500 text-sm">Go</span>
                                    <button
                                      onClick={() => handleUpdateStorageLimit(user.id)}
                                      className="p-1 text-green-600 hover:bg-green-50 rounded"
                                    >
                                      <FiCheck size={16} />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingStorageLimit(null)
                                        setNewStorageLimit('')
                                      }}
                                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                                    >
                                      <FiX size={16} />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{formatBytes(user.storageLimit)}</span>
                                    <button
                                      onClick={() => {
                                        setEditingStorageLimit(user.id)
                                        setNewStorageLimit((user.storageLimit / (1024 * 1024 * 1024)).toFixed(1))
                                      }}
                                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                      title={t('admin.storage.editLimit', 'Modifier la limite')}
                                    >
                                      <FiEdit3 size={14} />
                                    </button>
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                  statusColor === 'red' ? 'bg-red-100 text-red-700' :
                                  statusColor === 'orange' ? 'bg-orange-100 text-orange-700' :
                                  statusColor === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-green-100 text-green-700'
                                }`}>
                                  {statusColor === 'red' ? <FiX size={12} /> :
                                   statusColor === 'orange' || statusColor === 'yellow' ? <FiAlertCircle size={12} /> :
                                   <FiCheck size={12} />}
                                  {statusColor === 'red' ? t('admin.storage.exceeded', 'Dépassé') :
                                   statusColor === 'orange' ? t('admin.storage.critical', 'Critique') :
                                   statusColor === 'yellow' ? t('admin.storage.warning', 'Attention') :
                                   t('admin.storage.ok', 'OK')}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  onClick={() => handleRecalculateStorage(user.id)}
                                  disabled={recalculatingUser === user.id}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                  title={t('admin.storage.recalculate', 'Recalculer le stockage')}
                                >
                                  <FiRefreshCw size={16} className={recalculatingUser === user.id ? 'animate-spin' : ''} />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ==================== CONTENT TAB ==================== */}
          {activeTab === 'content' && (
            <div className="space-y-8">
              {/* Quiz Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <FiHelpCircle className="text-purple-500" />
                    {t('admin.quiz')} ({quizzes.length})
                  </h3>
                  <div className="flex gap-2 text-sm">
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full">
                      {stats.publicQuizzes} {t('common.public').toLowerCase()}
                    </span>
                    <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                      {stats.privateQuizzes} {t('common.private').toLowerCase()}
                    </span>
                  </div>
                </div>
                {quizzes.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-2xl">
                    <FiHelpCircle className="mx-auto text-4xl mb-2 opacity-50" />
                    <p>{t('admin.noQuizCreated')}</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {quizzes.map((quiz) => (
                      <div key={quiz.id} className="border border-gray-200 rounded-2xl p-5 hover:shadow-lg transition-all hover:border-purple-200 bg-white">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-bold text-gray-800 text-lg">{quiz.title}</h4>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                quiz.isPublic ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                              }`}>
                                {quiz.isPublic ? `🌐 ${t('common.public')}` : `🔒 ${t('common.private')}`}
                              </span>
                            </div>
                            <p className="text-gray-500 mb-3">{quiz.description || t('admin.noDescription')}</p>
                            <div className="flex flex-wrap gap-4 text-sm">
                              <span className="text-gray-400 flex items-center gap-1">
                                <FiUsers size={14} />
                                {quiz.userName || t('admin.unknown')}
                              </span>
                              <span className="text-gray-400 flex items-center gap-1">
                                <FiHelpCircle size={14} />
                                {quiz.questionsCount || 0} {t('admin.questions').toLowerCase()}
                              </span>
                              <span className="text-gray-400 flex items-center gap-1">
                                <FiCalendar size={14} />
                                {formatDate(quiz.createdAt)}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => setDeleteModal({ show: true, type: 'quiz', id: quiz.id, title: quiz.title })}
                            className="p-3 rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title={t('admin.deleteThisQuiz')}
                          >
                            <FiTrash2 size={20} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Questionnaires Section */}
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <FiList className="text-pink-500" />
                  {t('admin.conditionalQuestionnaires')} ({questionnaires.length})
                </h3>
                {questionnaires.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-2xl">
                    <FiList className="mx-auto text-4xl mb-2 opacity-50" />
                    <p>{t('admin.noQuestionnaireCreated')}</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {questionnaires.map((q) => (
                      <div key={q.id} className="border border-gray-200 rounded-2xl p-5 hover:shadow-lg transition-all hover:border-pink-200 bg-white">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-800 text-lg mb-2">{q.title}</h4>
                            <p className="text-gray-500 mb-3">{q.description || t('admin.noDescription')}</p>
                            <div className="flex flex-wrap gap-4 text-sm">
                              <span className="text-gray-400 flex items-center gap-1">
                                <FiUsers size={14} />
                                {q.userName || t('admin.unknown')}
                              </span>
                              <span className="text-gray-400 flex items-center gap-1">
                                <FiList size={14} />
                                {q.questions?.length || 0} {t('admin.questions').toLowerCase()}
                              </span>
                              <span className="text-gray-400 flex items-center gap-1">
                                <FiCalendar size={14} />
                                {formatDate(q.createdAt)}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => setDeleteModal({ show: true, type: 'questionnaire', id: q.id, title: q.title })}
                            className="p-3 rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title={t('admin.deleteThisQuestionnaire')}
                          >
                            <FiTrash2 size={20} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== ACTIVITY TAB ==================== */}
          {activeTab === 'activity' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800">{t('admin.fullActivityHistory')}</h3>
                <span className="text-sm text-gray-500">{getRecentActivity().length} {t('admin.events')}</span>
              </div>
              <div className="space-y-3">
                {getRecentActivity().length === 0 ? (
                  <div className="text-center py-16 text-gray-400">
                    <FiActivity className="mx-auto text-5xl mb-3 opacity-50" />
                    <p className="text-lg">{t('admin.noActivityRecorded')}</p>
                    <p className="text-sm">{t('admin.historyWillAppear')}</p>
                  </div>
                ) : (
                  getRecentActivity().map((activity, index) => (
                    <div key={index} className="flex items-center gap-4 p-5 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${
                        activity.color === 'blue' ? 'bg-gradient-to-br from-blue-400 to-blue-600' :
                        activity.color === 'purple' ? 'bg-gradient-to-br from-purple-400 to-purple-600' :
                        activity.color === 'green' ? 'bg-gradient-to-br from-green-400 to-green-600' :
                        'bg-gradient-to-br from-pink-400 to-pink-600'
                      }`}>
                        <activity.icon size={24} />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">{activity.name}</p>
                        <p className="text-gray-500">
                          {activity.action}
                          {activity.userName && ` • ${t('admin.createdBy')} ${activity.userName}`}
                          {activity.playerName && ` • ${t('admin.player')}: ${activity.playerName}`}
                          {activity.score !== undefined && ` • Score: ${activity.score}%`}
                          {activity.validated === false && ` • ⏳ ${t('admin.awaitingValidation')}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-600">{formatRelativeDate(activity.date)}</p>
                        <p className="text-xs text-gray-400">{formatDate(activity.date)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ==================== SERVICES TAB ==================== */}
          {activeTab === 'services' && (
            <AdminServices />
          )}

          {/* ==================== SETTINGS TAB ==================== */}
          {activeTab === 'settings' && (
            <div className="space-y-8">
              {/* ========== BRANDING / LOGO MANAGEMENT ========== */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-200">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <FiImage className="text-indigo-500" />
                  {t('admin.branding.title', 'Logos & Branding')}
                </h3>
                <p className="text-gray-600 mb-6">
                  {t('admin.branding.description', 'Gérez les logos qui apparaissent sur votre site. Uploadez des images pour personnaliser l\'apparence de HugoQuiz.')}
                </p>
                
                {logosLoading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Favicon */}
                    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                          <span className="text-xl">🌐</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-800">{t('admin.branding.favicon', 'Favicon')}</h4>
                          <p className="text-xs text-gray-500">{t('admin.branding.faviconDesc', 'Icône dans l\'onglet du navigateur')}</p>
                        </div>
                      </div>
                      <div className="aspect-square w-20 mx-auto mb-3 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300">
                        {logos.favicon ? (
                          <img src={logos.favicon} alt="Favicon" className="w-full h-full object-contain" />
                        ) : (
                          <FiImage className="text-gray-400 text-2xl" />
                        )}
                      </div>
                      <div className="flex gap-2">
                        <label className="flex-1 btn bg-indigo-500 text-white hover:bg-indigo-600 text-sm cursor-pointer flex items-center justify-center gap-2">
                          <input
                            type="file"
                            accept="image/*,.ico,.svg"
                            className="hidden"
                            onChange={(e) => handleLogoUpload('favicon', e.target.files?.[0])}
                            disabled={logoUploading === 'favicon'}
                          />
                          {logoUploading === 'favicon' ? (
                            <FiRefreshCw className="animate-spin" />
                          ) : (
                            <FiUpload />
                          )}
                          {t('common.upload', 'Upload')}
                        </label>
                        {logos.favicon && (
                          <button
                            onClick={() => handleLogoRemove('favicon')}
                            className="btn bg-red-100 text-red-600 hover:bg-red-200"
                          >
                            <FiTrash2 />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Header Logo */}
                    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          <span className="text-xl">📱</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-800">{t('admin.branding.header', 'Logo Header')}</h4>
                          <p className="text-xs text-gray-500">{t('admin.branding.headerDesc', 'Logo dans la barre latérale')}</p>
                        </div>
                      </div>
                      <div className="aspect-square w-20 mx-auto mb-3 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300">
                        {logos.header ? (
                          <img src={logos.header} alt="Header Logo" className="w-full h-full object-contain" />
                        ) : (
                          <FiImage className="text-gray-400 text-2xl" />
                        )}
                      </div>
                      <div className="flex gap-2">
                        <label className="flex-1 btn bg-purple-500 text-white hover:bg-purple-600 text-sm cursor-pointer flex items-center justify-center gap-2">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleLogoUpload('header', e.target.files?.[0])}
                            disabled={logoUploading === 'header'}
                          />
                          {logoUploading === 'header' ? (
                            <FiRefreshCw className="animate-spin" />
                          ) : (
                            <FiUpload />
                          )}
                          {t('common.upload', 'Upload')}
                        </label>
                        {logos.header && (
                          <button
                            onClick={() => handleLogoRemove('header')}
                            className="btn bg-red-100 text-red-600 hover:bg-red-200"
                          >
                            <FiTrash2 />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Footer Logo */}
                    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                          <span className="text-xl">📄</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-800">{t('admin.branding.footer', 'Logo Footer')}</h4>
                          <p className="text-xs text-gray-500">{t('admin.branding.footerDesc', 'Logo en bas de page')}</p>
                        </div>
                      </div>
                      <div className="aspect-square w-20 mx-auto mb-3 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300">
                        {logos.footer ? (
                          <img src={logos.footer} alt="Footer Logo" className="w-full h-full object-contain" />
                        ) : (
                          <FiImage className="text-gray-400 text-2xl" />
                        )}
                      </div>
                      <div className="flex gap-2">
                        <label className="flex-1 btn bg-pink-500 text-white hover:bg-pink-600 text-sm cursor-pointer flex items-center justify-center gap-2">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleLogoUpload('footer', e.target.files?.[0])}
                            disabled={logoUploading === 'footer'}
                          />
                          {logoUploading === 'footer' ? (
                            <FiRefreshCw className="animate-spin" />
                          ) : (
                            <FiUpload />
                          )}
                          {t('common.upload', 'Upload')}
                        </label>
                        {logos.footer && (
                          <button
                            onClick={() => handleLogoRemove('footer')}
                            className="btn bg-red-100 text-red-600 hover:bg-red-200"
                          >
                            <FiTrash2 />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* OG Image (Social Sharing) */}
                    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <span className="text-xl">🔗</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-800">{t('admin.branding.ogImage', 'Image OG')}</h4>
                          <p className="text-xs text-gray-500">{t('admin.branding.ogImageDesc', 'Image pour le partage social')}</p>
                        </div>
                      </div>
                      <div className="aspect-video w-full mx-auto mb-3 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300">
                        {logos.ogImage ? (
                          <img src={logos.ogImage} alt="OG Image" className="w-full h-full object-contain" />
                        ) : (
                          <FiImage className="text-gray-400 text-2xl" />
                        )}
                      </div>
                      <div className="flex gap-2">
                        <label className="flex-1 btn bg-blue-500 text-white hover:bg-blue-600 text-sm cursor-pointer flex items-center justify-center gap-2">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleLogoUpload('ogImage', e.target.files?.[0])}
                            disabled={logoUploading === 'ogImage'}
                          />
                          {logoUploading === 'ogImage' ? (
                            <FiRefreshCw className="animate-spin" />
                          ) : (
                            <FiUpload />
                          )}
                          {t('common.upload', 'Upload')}
                        </label>
                        {logos.ogImage && (
                          <button
                            onClick={() => handleLogoRemove('ogImage')}
                            className="btn bg-red-100 text-red-600 hover:bg-red-200"
                          >
                            <FiTrash2 />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Login Page Logo */}
                    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <span className="text-xl">🔐</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-800">{t('admin.branding.loginPage', 'Page Connexion')}</h4>
                          <p className="text-xs text-gray-500">{t('admin.branding.loginPageDesc', 'Logo sur la page de connexion')}</p>
                        </div>
                      </div>
                      <div className="aspect-square w-20 mx-auto mb-3 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300">
                        {logos.loginPage ? (
                          <img src={logos.loginPage} alt="Login Logo" className="w-full h-full object-contain" />
                        ) : (
                          <FiImage className="text-gray-400 text-2xl" />
                        )}
                      </div>
                      <div className="flex gap-2">
                        <label className="flex-1 btn bg-green-500 text-white hover:bg-green-600 text-sm cursor-pointer flex items-center justify-center gap-2">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleLogoUpload('loginPage', e.target.files?.[0])}
                            disabled={logoUploading === 'loginPage'}
                          />
                          {logoUploading === 'loginPage' ? (
                            <FiRefreshCw className="animate-spin" />
                          ) : (
                            <FiUpload />
                          )}
                          {t('common.upload', 'Upload')}
                        </label>
                        {logos.loginPage && (
                          <button
                            onClick={() => handleLogoRemove('loginPage')}
                            className="btn bg-red-100 text-red-600 hover:bg-red-200"
                          >
                            <FiTrash2 />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Register Page Logo */}
                    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                          <span className="text-xl">📝</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-800">{t('admin.branding.registerPage', 'Page Inscription')}</h4>
                          <p className="text-xs text-gray-500">{t('admin.branding.registerPageDesc', 'Logo sur la page d\'inscription')}</p>
                        </div>
                      </div>
                      <div className="aspect-square w-20 mx-auto mb-3 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300">
                        {logos.registerPage ? (
                          <img src={logos.registerPage} alt="Register Logo" className="w-full h-full object-contain" />
                        ) : (
                          <FiImage className="text-gray-400 text-2xl" />
                        )}
                      </div>
                      <div className="flex gap-2">
                        <label className="flex-1 btn bg-amber-500 text-white hover:bg-amber-600 text-sm cursor-pointer flex items-center justify-center gap-2">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleLogoUpload('registerPage', e.target.files?.[0])}
                            disabled={logoUploading === 'registerPage'}
                          />
                          {logoUploading === 'registerPage' ? (
                            <FiRefreshCw className="animate-spin" />
                          ) : (
                            <FiUpload />
                          )}
                          {t('common.upload', 'Upload')}
                        </label>
                        {logos.registerPage && (
                          <button
                            onClick={() => handleLogoRemove('registerPage')}
                            className="btn bg-red-100 text-red-600 hover:bg-red-200"
                          >
                            <FiTrash2 />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Hero Logo (Homepage Main Logo) */}
                    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm md:col-span-2 lg:col-span-3">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                          <span className="text-xl">🏠</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-800">{t('admin.branding.hero', 'Logo Page d\'Accueil')}</h4>
                          <p className="text-xs text-gray-500">{t('admin.branding.heroDesc', 'Logo principal en haut de la page d\'accueil (le plus important)')}</p>
                        </div>
                      </div>
                      <div className="h-24 max-w-md mx-auto mb-3 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300">
                        {logos.hero ? (
                          <img src={logos.hero} alt="Hero Logo" className="h-full w-auto object-contain" />
                        ) : (
                          <div className="flex items-center gap-2 text-gray-400">
                            <FiImage className="text-2xl" />
                            <span className="text-sm">Logo principal</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 max-w-xs mx-auto">
                        <label className="flex-1 btn bg-violet-500 text-white hover:bg-violet-600 text-sm cursor-pointer flex items-center justify-center gap-2">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleLogoUpload('hero', e.target.files?.[0])}
                            disabled={logoUploading === 'hero'}
                          />
                          {logoUploading === 'hero' ? (
                            <FiRefreshCw className="animate-spin" />
                          ) : (
                            <FiUpload />
                          )}
                          {t('common.upload', 'Upload')}
                        </label>
                        {logos.hero && (
                          <button
                            onClick={() => handleLogoRemove('hero')}
                            className="btn bg-red-100 text-red-600 hover:bg-red-200"
                          >
                            <FiTrash2 />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Management */}
              <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-2xl p-6 border border-green-200">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  💬 {t('admin.chat.title', 'Gestion du Chat')}
                </h3>
                <p className="text-gray-600 mb-4">
                  {t('admin.chat.description', 'Répondez aux utilisateurs qui ont besoin d\'aide humaine.')}
                </p>
                <a 
                  href="/admin/chat"
                  className="inline-flex items-center gap-2 btn bg-green-500 text-white hover:bg-green-600"
                >
                  <FiMessageCircle />
                  {t('admin.chat.manage', 'Gérer les chats')}
                </a>
              </div>

              {/* Quiz Music Management */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  🎵 {t('admin.quizMusic.title')}
                </h3>
                <p className="text-gray-600 mb-4">
                  {t('admin.quizMusicDescription')}
                </p>
                <a 
                  href="/admin/quiz-music"
                  className="inline-flex items-center gap-2 btn bg-purple-500 text-white hover:bg-purple-600"
                >
                  <FiSettings />
                  {t('admin.manageMusic')}
                </a>
              </div>

              {/* Firebase Console Link */}
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-6 border border-orange-200">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  🔥 {t('admin.firebaseConsole')}
                </h3>
                <p className="text-gray-600 mb-4">
                  {t('admin.firebaseConsoleDesc')}
                </p>
                <a 
                  href="https://console.firebase.google.com/project/hugoquiz" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 btn bg-orange-500 text-white hover:bg-orange-600"
                >
                  <FiSettings />
                  {t('admin.openFirebaseConsole')}
                </a>
              </div>

              {/* Grant Free Access Section */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <FiGift className="text-green-500" />
                  {t('admin.grantFreeAccess', 'Accorder un accès gratuit')}
                </h3>
                <p className="text-gray-600 mb-4">
                  {t('admin.grantFreeAccessDesc', 'Offrir un accès complet gratuit à un utilisateur pour une durée limitée.')}
                </p>
                
                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  {/* User Search/Select */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.selectUser', 'Sélectionner un utilisateur')}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={grantAccessSearch}
                        onChange={(e) => {
                          setGrantAccessSearch(e.target.value)
                          setGrantAccessUserId('')
                        }}
                        placeholder={t('admin.searchUserPlaceholder', 'Rechercher par email ou nom...')}
                        className="w-full input pr-10"
                      />
                      <FiSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                    {grantAccessSearch && !grantAccessUserId && (
                      <div className="absolute z-10 w-full max-w-md mt-1 bg-white border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {users
                          .filter(u => 
                            u.email?.toLowerCase().includes(grantAccessSearch.toLowerCase()) ||
                            u.displayName?.toLowerCase().includes(grantAccessSearch.toLowerCase())
                          )
                          .slice(0, 5)
                          .map(u => (
                            <button
                              key={u.id}
                              onClick={() => {
                                setGrantAccessUserId(u.id)
                                setGrantAccessSearch(u.displayName || u.email)
                              }}
                              className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 border-b last:border-b-0"
                            >
                              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                                {(u.displayName || u.email)?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-gray-800">{u.displayName || 'Sans nom'}</p>
                                <p className="text-sm text-gray-500">{u.email}</p>
                              </div>
                              {u.subscription?.plan && u.subscription.plan !== 'FREE' && (
                                <span className="ml-auto px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                                  {u.subscription.plan}
                                </span>
                              )}
                            </button>
                          ))
                        }
                        {users.filter(u => 
                          u.email?.toLowerCase().includes(grantAccessSearch.toLowerCase()) ||
                          u.displayName?.toLowerCase().includes(grantAccessSearch.toLowerCase())
                        ).length === 0 && (
                          <p className="px-4 py-3 text-gray-500 text-sm">{t('admin.noUserFound', 'Aucun utilisateur trouvé')}</p>
                        )}
                      </div>
                    )}
                    {grantAccessUserId && (
                      <p className="mt-2 text-sm text-green-600 flex items-center gap-1">
                        <FiCheck /> {t('admin.userSelected', 'Utilisateur sélectionné')}
                      </p>
                    )}
                  </div>

                  {/* Plan Type Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.selectPlanType', 'Type de forfait')}
                    </label>
                    <select
                      value={grantAccessPlanType}
                      onChange={(e) => setGrantAccessPlanType(e.target.value)}
                      className="w-full input"
                    >
                      {planOptions.map(plan => (
                        <option key={plan.value} value={plan.value}>
                          {plan.icon} {plan.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleGrantFreeAccess}
                  disabled={!grantAccessUserId || grantAccessLoading}
                  className="btn bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {grantAccessLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <FiZap />
                      {t('admin.grantAccess', 'Accorder l\'accès')}
                    </>
                  )}
                </button>
              </div>

              {/* Export Section */}
              <div className="bg-gray-50 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <FiDownload className="text-purple-500" />
                  {t('admin.exportData')}
                </h3>
                <p className="text-gray-600 mb-6">
                  {t('admin.exportDataDesc')}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button 
                    onClick={() => exportData('users')}
                    className="p-5 bg-white border-2 border-gray-200 rounded-2xl hover:border-blue-400 hover:shadow-lg transition-all text-left group"
                  >
                    <FiUsers className="text-blue-500 text-2xl mb-3 group-hover:scale-110 transition-transform" />
                    <p className="font-bold text-gray-800">{t('admin.users')}</p>
                    <p className="text-sm text-gray-500">{stats.totalUsers} {t('admin.entries')} • JSON</p>
                  </button>
                  <button 
                    onClick={() => exportData('quizzes')}
                    className="p-5 bg-white border-2 border-gray-200 rounded-2xl hover:border-purple-400 hover:shadow-lg transition-all text-left group"
                  >
                    <FiHelpCircle className="text-purple-500 text-2xl mb-3 group-hover:scale-110 transition-transform" />
                    <p className="font-bold text-gray-800">{t('admin.quiz')}</p>
                    <p className="text-sm text-gray-500">{stats.totalQuizzes} {t('admin.entries')} • JSON</p>
                  </button>
                  <button 
                    onClick={() => exportData('statistics')}
                    className="p-5 bg-white border-2 border-gray-200 rounded-2xl hover:border-green-400 hover:shadow-lg transition-all text-left group"
                  >
                    <FiBarChart2 className="text-green-500 text-2xl mb-3 group-hover:scale-110 transition-transform" />
                    <p className="font-bold text-gray-800">{t('admin.statistics')}</p>
                    <p className="text-sm text-gray-500">{t('admin.fullReport')} • JSON</p>
                  </button>
                </div>
              </div>

              {/* Database Info */}
              <div className="bg-gray-50 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <FiDatabase className="text-purple-500" />
                  {t('admin.databaseInfo')}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-blue-600">{stats.totalUsers}</p>
                    <p className="text-sm text-gray-500">{t('admin.users')}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-purple-600">{stats.totalQuizzes}</p>
                    <p className="text-sm text-gray-500">{t('admin.quiz')}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-pink-600">{stats.totalQuestionnaires}</p>
                    <p className="text-sm text-gray-500">{t('admin.questionnaires')}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-green-600">{stats.totalSessions}</p>
                    <p className="text-sm text-gray-500">{t('admin.sessions')}</p>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-red-800 mb-2 flex items-center gap-2">
                  <FiAlertCircle className="text-red-500" />
                  {t('admin.dangerZone')}
                </h3>
                <p className="text-red-600 mb-6">
                  {t('admin.dangerZoneDesc')}
                </p>
                <div className="flex flex-wrap gap-3">
                  <button 
                    className="btn bg-red-100 text-red-700 hover:bg-red-200 border border-red-300"
                    onClick={() => toast.error(t('admin.requiresFirebaseConfirmation'))}
                  >
                    <FiTrash2 className="mr-2" />
                    {t('admin.deleteAllQuizzes')}
                  </button>
                  <button 
                    className="btn bg-red-100 text-red-700 hover:bg-red-200 border border-red-300"
                    onClick={() => toast.error(t('admin.requiresFirebaseConfirmation'))}
                  >
                    <FiTrash2 className="mr-2" />
                    {t('admin.resetSessions')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ==================== DELETE MODAL ==================== */}
      {deleteModal.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full animate-scale-in shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiTrash2 className="text-red-500 text-3xl" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">{t('admin.confirmDeletion')}</h3>
              <p className="text-gray-600 mt-3">
                {t('admin.confirmDeleteMessage')}
                <span className="font-bold text-gray-800"> "{deleteModal.title}"</span> ?
              </p>
              <p className="text-red-500 text-sm mt-2 font-medium">⚠️ {t('admin.actionIrreversible')}</p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setDeleteModal({ show: false, type: null, id: null, title: '' })}
                className="flex-1 btn btn-ghost py-3"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDeleteContent}
                className="flex-1 btn btn-danger py-3"
              >
                <FiTrash2 className="mr-2" />
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== USER DETAIL MODAL ==================== */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full animate-scale-in shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">{t('admin.userDetails')}</h3>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>
            
            {/* User Avatar & Info */}
            <div className="flex items-center gap-5 mb-6 p-4 bg-gray-50 rounded-2xl">
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-lg ${
                selectedUser.role === 'admin' 
                  ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                  : 'bg-gradient-to-br from-blue-500 to-cyan-500'
              }`}>
                {selectedUser.displayName?.charAt(0).toUpperCase() || selectedUser.email?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{selectedUser.displayName || t('admin.noName')}</p>
                <p className="text-gray-500 flex items-center gap-1">
                  <FiMail size={14} />
                  {selectedUser.email}
                </p>
              </div>
            </div>

            {/* User Details */}
            <div className="space-y-4 mb-6">
              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-gray-500">{t('admin.userId')}</span>
                <span className="font-mono text-sm text-gray-800 bg-gray-100 px-2 py-1 rounded">{selectedUser.id.slice(0, 12)}...</span>
              </div>
              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-gray-500">{t('admin.role')}</span>
                <span className={`px-4 py-1.5 rounded-xl text-sm font-medium ${
                  selectedUser.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {selectedUser.role === 'admin' ? `🛡️ ${t('admin.administrator')}` : `👤 ${t('common.user')}`}
                </span>
              </div>
              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-gray-500">{t('admin.accountStatus')}</span>
                <span className={`px-4 py-1.5 rounded-xl text-sm font-medium ${
                  selectedUser.validated ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {selectedUser.validated ? `✅ ${t('admin.validated')}` : `⏳ ${t('admin.awaitingValidation')}`}
                </span>
              </div>
              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-gray-500">{t('admin.registrationDate')}</span>
                <span className="text-gray-800">{formatDate(selectedUser.createdAt)}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-gray-500">{t('admin.subscription', 'Abonnement')}</span>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-xl text-sm font-medium ${
                    selectedUser.subscription?.plan && selectedUser.subscription.plan !== 'FREE'
                      ? 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {selectedUser.subscription?.plan || 'FREE'}
                  </span>
                  {selectedUser.subscription?.isAdminGranted && (
                    <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-lg flex items-center gap-1">
                      <FiGift size={12} />
                      {t('admin.adminGranted', 'Offert')}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-gray-500">{t('admin.createdContent')}</span>
                <div className="flex gap-2">
                  <span className="bg-purple-50 text-purple-600 text-sm px-3 py-1 rounded-lg">
                    {getUserStats(selectedUser.id).quizzes} {t('admin.quiz').toLowerCase()}
                  </span>
                  <span className="bg-pink-50 text-pink-600 text-sm px-3 py-1 rounded-lg">
                    {getUserStats(selectedUser.id).questionnaires} quest.
                  </span>
                </div>
              </div>
            </div>

            {/* Revoke Admin-Granted Access */}
            {selectedUser.subscription?.isAdminGranted && selectedUser.subscription?.plan !== 'FREE' && (
              <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-2xl">
                <p className="text-sm text-orange-700 mb-3 flex items-center gap-2">
                  <FiAlertCircle />
                  {t('admin.adminGrantedAccessInfo', 'Cet utilisateur bénéficie d\'un accès offert par l\'administrateur.')}
                </p>
                <button
                  onClick={() => handleRevokeAccess(selectedUser.id, selectedUser.displayName || selectedUser.email)}
                  disabled={revokeAccessLoading}
                  className="w-full btn bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 py-2 flex items-center justify-center gap-2"
                >
                  {revokeAccessLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <FiX />
                      {t('admin.revokeAccess', 'Révoquer l\'accès gratuit')}
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Sync Stripe Subscription */}
            {selectedUser.subscription?.stripeSubscriptionId && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                <p className="text-sm text-blue-700 mb-3 flex items-center gap-2">
                  <FiRefreshCw />
                  Abonnement Stripe: {selectedUser.subscription.stripeSubscriptionId}
                </p>
                <button
                  onClick={async () => {
                    try {
                      const functions = getFunctions()
                      const syncFn = httpsCallable(functions, 'adminSyncSubscription')
                      const result = await syncFn({ userId: selectedUser.id })
                      toast.success(`Synchronisé: ${result.data.planId} - ${result.data.status} (expire: ${result.data.expiresAt ? new Date(result.data.expiresAt).toLocaleDateString() : 'N/A'})`)
                      // Refresh user list
                      const allUsers = await getUsers()
                      setUsers(allUsers)
                      const updated = allUsers.find(u => u.id === selectedUser.id)
                      if (updated) setSelectedUser(updated)
                    } catch (err) {
                      console.error('Sync error:', err)
                      toast.error(`Erreur sync: ${err.message}`)
                    }
                  }}
                  className="w-full btn bg-blue-500 text-white hover:bg-blue-600 py-2 flex items-center justify-center gap-2"
                >
                  <FiRefreshCw />
                  Synchroniser depuis Stripe
                </button>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              {selectedUser.validated !== false ? (
                <button
                  onClick={() => {
                    handleToggleUserActive(selectedUser.id, false)
                    setSelectedUser({ ...selectedUser, validated: false })
                  }}
                  className="flex-1 btn btn-danger py-3 flex items-center justify-center gap-2"
                >
                  <FiUserX />
                  Désactiver ce compte
                </button>
              ) : (
                <button
                  onClick={() => {
                    handleToggleUserActive(selectedUser.id, true)
                    setSelectedUser({ ...selectedUser, validated: true })
                  }}
                  className="flex-1 btn btn-success py-3 flex items-center justify-center gap-2"
                >
                  <FiUserCheck />
                  Activer ce compte
                </button>
              )}
              <button
                onClick={() => setSelectedUser(null)}
                className="flex-1 btn btn-ghost py-3"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPanel