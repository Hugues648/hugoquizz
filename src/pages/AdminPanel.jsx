import { useState, useEffect } from 'react'
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
  FiCalendar
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'

const AdminPanel = () => {
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
      toast.error('Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }

  // Statistics calculations
  const stats = {
    totalUsers: users.length,
    pendingUsers: users.filter(u => !u.validated).length,
    validatedUsers: users.filter(u => u.validated).length,
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
        action: 'inscription',
        name: u.displayName || u.email, 
        date: u.createdAt,
        validated: u.validated,
        icon: FiUsers,
        color: 'blue'
      })),
      ...quizzes.map(q => ({ 
        type: 'quiz', 
        action: 'création quiz',
        name: q.title, 
        date: q.createdAt,
        userName: q.userName,
        icon: FiHelpCircle,
        color: 'purple'
      })),
      ...questionnaires.map(q => ({ 
        type: 'questionnaire', 
        action: 'création questionnaire',
        name: q.title, 
        date: q.createdAt,
        userName: q.userName,
        icon: FiList,
        color: 'pink'
      })),
      ...quizSessions.map(s => ({ 
        type: 'session', 
        action: 'quiz joué',
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

  const handleValidateUser = async (userId, validated) => {
    try {
      await validateUser(userId, validated)
      setUsers(users.map(u => u.id === userId ? { ...u, validated } : u))
      toast.success(validated ? 'Utilisateur validé ✅' : 'Utilisateur bloqué ❌')
    } catch (error) {
      console.error('Validate error:', error)
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const handleSetRole = async (userId, role) => {
    try {
      await setUserRole(userId, role)
      setUsers(users.map(u => u.id === userId ? { ...u, role } : u))
      toast.success(`Rôle mis à jour: ${role === 'admin' ? '🛡️ Admin' : '👤 Utilisateur'}`)
    } catch (error) {
      console.error('Role error:', error)
      toast.error('Erreur lors de la mise à jour du rôle')
    }
  }

  const handleDeleteContent = async () => {
    try {
      if (deleteModal.type === 'quiz') {
        await deleteQuiz(deleteModal.id)
        setQuizzes(quizzes.filter(q => q.id !== deleteModal.id))
        toast.success('Quiz supprimé')
      } else if (deleteModal.type === 'questionnaire') {
        await deleteQuestionnaire(deleteModal.id)
        setQuestionnaires(questionnaires.filter(q => q.id !== deleteModal.id))
        toast.success('Questionnaire supprimé')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Erreur lors de la suppression')
    } finally {
      setDeleteModal({ show: false, type: null, id: null, title: '' })
    }
  }

  const handleValidateAllPending = async () => {
    const pendingUsers = users.filter(u => !u.validated)
    if (pendingUsers.length === 0) {
      toast.info('Aucun utilisateur en attente')
      return
    }
    
    try {
      for (const u of pendingUsers) {
        await validateUser(u.id, true)
      }
      setUsers(users.map(u => ({ ...u, validated: true })))
      toast.success(`${pendingUsers.length} utilisateur(s) validé(s) !`)
    } catch (error) {
      toast.error('Erreur lors de la validation groupée')
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
    toast.success(`Export "${filename}" téléchargé !`)
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (userFilter === 'all') return matchesSearch
    if (userFilter === 'pending') return matchesSearch && !user.validated
    if (userFilter === 'validated') return matchesSearch && user.validated
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

    if (diffMins < 1) return 'À l\'instant'
    if (diffMins < 60) return `Il y a ${diffMins} min`
    if (diffHours < 24) return `Il y a ${diffHours}h`
    if (diffDays < 7) return `Il y a ${diffDays}j`
    return formatDate(timestamp)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner text="Chargement du dashboard admin..." />
      </div>
    )
  }

  // Tabs configuration
  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: FiBarChart2 },
    { id: 'users', label: 'Utilisateurs', icon: FiUsers, badge: stats.pendingUsers },
    { id: 'content', label: 'Contenus', icon: FiList },
    { id: 'activity', label: 'Activité', icon: FiActivity },
    { id: 'settings', label: 'Paramètres', icon: FiSettings }
  ]

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Dashboard Administrateur 🛡️</h1>
            <p className="text-white/70">Gérez les utilisateurs, contenus et consultez les statistiques</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={fetchAllData}
              className="btn bg-white/20 text-white hover:bg-white/30 flex items-center gap-2"
            >
              <FiRefreshCw className={loading ? 'animate-spin' : ''} />
              Actualiser
            </button>
            <div className="relative group">
              <button className="btn bg-white text-purple-600 hover:bg-gray-100 flex items-center gap-2">
                <FiDownload />
                Exporter
              </button>
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 border border-gray-100">
                <div className="p-2">
                  <button 
                    onClick={() => exportData('users')}
                    className="w-full px-4 py-3 text-left text-gray-700 hover:bg-purple-50 rounded-lg flex items-center gap-3"
                  >
                    <FiUsers className="text-blue-500" />
                    <div>
                      <p className="font-medium">Utilisateurs</p>
                      <p className="text-xs text-gray-400">Format JSON</p>
                    </div>
                  </button>
                  <button 
                    onClick={() => exportData('quizzes')}
                    className="w-full px-4 py-3 text-left text-gray-700 hover:bg-purple-50 rounded-lg flex items-center gap-3"
                  >
                    <FiHelpCircle className="text-purple-500" />
                    <div>
                      <p className="font-medium">Quiz</p>
                      <p className="text-xs text-gray-400">Format JSON</p>
                    </div>
                  </button>
                  <button 
                    onClick={() => exportData('statistics')}
                    className="w-full px-4 py-3 text-left text-gray-700 hover:bg-purple-50 rounded-lg flex items-center gap-3"
                  >
                    <FiBarChart2 className="text-green-500" />
                    <div>
                      <p className="font-medium">Statistiques</p>
                      <p className="text-xs text-gray-400">Format JSON</p>
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
              <p className="text-white/60 text-xs font-medium">Utilisateurs</p>
              <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20 hover:bg-white/15 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg">
              <FiClock className="text-white text-xl" />
            </div>
            <div>
              <p className="text-amber-300 text-xs font-medium">En attente</p>
              <p className="text-2xl font-bold text-white">{stats.pendingUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20 hover:bg-white/15 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg">
              <FiUserCheck className="text-white text-xl" />
            </div>
            <div>
              <p className="text-green-300 text-xs font-medium">Validés</p>
              <p className="text-2xl font-bold text-white">{stats.validatedUsers}</p>
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
              <p className="text-pink-300 text-xs font-medium">Questionnaires</p>
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
              <p className="text-cyan-300 text-xs font-medium">Sessions</p>
              <p className="text-2xl font-bold text-white">{stats.totalSessions}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Users Alert */}
      {stats.pendingUsers > 0 && (
        <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 backdrop-blur-lg border border-amber-400/30 rounded-2xl p-5 mb-8 flex flex-col md:flex-row items-center gap-4">
          <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg">
            <FiAlertCircle className="text-white text-2xl" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h4 className="font-bold text-white text-lg">
              {stats.pendingUsers} utilisateur{stats.pendingUsers > 1 ? 's' : ''} en attente de validation
            </h4>
            <p className="text-white/70 text-sm">
              Ces utilisateurs ne peuvent pas accéder à l'application tant qu'ils ne sont pas validés.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setActiveTab('users')}
              className="btn bg-white/20 text-white hover:bg-white/30"
            >
              Voir la liste
            </button>
            <button
              onClick={handleValidateAllPending}
              className="btn bg-amber-500 text-white hover:bg-amber-600"
            >
              Valider tous
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
                    <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-medium">Utilisateurs</span>
                  </div>
                  <p className="text-4xl font-bold mb-3">{stats.totalUsers}</p>
                  <div className="space-y-1 text-sm opacity-90">
                    <div className="flex justify-between">
                      <span>✅ Validés</span>
                      <span className="font-medium">{stats.validatedUsers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>⏳ En attente</span>
                      <span className="font-medium">{stats.pendingUsers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>🛡️ Admins</span>
                      <span className="font-medium">{stats.adminUsers}</span>
                    </div>
                  </div>
                </div>

                {/* Content Stats */}
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <FiDatabase size={28} />
                    <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-medium">Contenus</span>
                  </div>
                  <p className="text-4xl font-bold mb-3">{stats.totalQuizzes + stats.totalQuestionnaires}</p>
                  <div className="space-y-1 text-sm opacity-90">
                    <div className="flex justify-between">
                      <span>🎯 Quiz</span>
                      <span className="font-medium">{stats.totalQuizzes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>📋 Questionnaires</span>
                      <span className="font-medium">{stats.totalQuestionnaires}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>❓ Questions</span>
                      <span className="font-medium">{stats.totalQuestions}</span>
                    </div>
                  </div>
                </div>

                {/* Sessions Stats */}
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <FiActivity size={28} />
                    <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-medium">Sessions</span>
                  </div>
                  <p className="text-4xl font-bold mb-3">{stats.totalSessions}</p>
                  <div className="space-y-1 text-sm opacity-90">
                    <div className="flex justify-between">
                      <span>🎮 Quiz joués</span>
                      <span className="font-medium">{stats.totalQuizSessions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>📝 Questionnaires</span>
                      <span className="font-medium">{stats.totalQuestionnaireSessions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>✅ Terminés</span>
                      <span className="font-medium">{stats.completedQuizSessions + stats.completedQuestionnaireSessions}</span>
                    </div>
                  </div>
                </div>

                {/* Performance Stats */}
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <FiAward size={28} />
                    <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-medium">Performance</span>
                  </div>
                  <p className="text-4xl font-bold mb-3">{stats.avgQuizScore}%</p>
                  <div className="space-y-1 text-sm opacity-90">
                    <div className="flex justify-between">
                      <span>Score moyen quiz</span>
                    </div>
                    <div className="flex justify-between">
                      <span>🏆 Quiz terminés</span>
                      <span className="font-medium">{stats.completedQuizSessions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>📊 Taux complétion</span>
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
                    Distribution des utilisateurs
                  </h3>
                  <div className="space-y-5">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600 flex items-center gap-2">
                          <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                          Utilisateurs validés
                        </span>
                        <span className="font-bold text-gray-800">{stats.validatedUsers}</span>
                      </div>
                      <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-500"
                          style={{ width: `${stats.totalUsers ? (stats.validatedUsers / stats.totalUsers) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600 flex items-center gap-2">
                          <span className="w-3 h-3 bg-amber-500 rounded-full"></span>
                          En attente de validation
                        </span>
                        <span className="font-bold text-gray-800">{stats.pendingUsers}</span>
                      </div>
                      <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                          style={{ width: `${stats.totalUsers ? (stats.pendingUsers / stats.totalUsers) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600 flex items-center gap-2">
                          <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
                          Administrateurs
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
                    Activité récente
                  </h3>
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                    {getRecentActivity().length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <FiActivity className="mx-auto text-4xl mb-2 opacity-50" />
                        <p>Aucune activité récente</p>
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
                      Voir toute l'activité →
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
                      <p className="text-sm text-gray-500">Publics</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 text-center">
                      <p className="text-3xl font-bold text-gray-600">{stats.privateQuizzes}</p>
                      <p className="text-sm text-gray-500">Privés</p>
                    </div>
                  </div>
                </div>

                {/* Top Creators */}
                <div className="bg-gray-50 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <FiTrendingUp className="text-purple-500" />
                    Top créateurs
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
                              {user.stats.quizzes} quiz
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
                        Aucun contenu créé pour le moment
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
                    placeholder="Rechercher par nom ou email..."
                    className="input pl-11"
                  />
                </div>
                <select
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  className="input w-auto font-medium"
                >
                  <option value="all">Tous ({stats.totalUsers})</option>
                  <option value="pending">⏳ En attente ({stats.pendingUsers})</option>
                  <option value="validated">✅ Validés ({stats.validatedUsers})</option>
                  <option value="admin">🛡️ Admins ({stats.adminUsers})</option>
                </select>
              </div>

              {/* Users Table */}
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Utilisateur</th>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Rôle</th>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Statut</th>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Contenus</th>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Inscrit le</th>
                      <th className="text-right py-4 px-4 text-sm font-semibold text-gray-600">Actions</th>
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
                                <p className="font-semibold text-gray-800">{user.displayName || 'Sans nom'}</p>
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
                              <option value="user">👤 Utilisateur</option>
                              <option value="admin">🛡️ Administrateur</option>
                            </select>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium ${
                              user.validated 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {user.validated ? <FiCheck size={14} /> : <FiClock size={14} />}
                              {user.validated ? 'Validé' : 'En attente'}
                            </span>
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
                                title="Voir détails"
                              >
                                <FiEye size={18} />
                              </button>
                              {user.validated ? (
                                <button
                                  onClick={() => handleValidateUser(user.id, false)}
                                  className="p-2.5 rounded-xl text-red-500 hover:bg-red-50 transition-colors"
                                  title="Bloquer l'utilisateur"
                                >
                                  <FiUserX size={18} />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleValidateUser(user.id, true)}
                                  className="p-2.5 rounded-xl text-green-500 hover:bg-green-50 transition-colors"
                                  title="Valider l'utilisateur"
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
                  <p className="text-lg">Aucun utilisateur trouvé</p>
                  <p className="text-sm">Modifiez vos critères de recherche</p>
                </div>
              )}

              {/* Bulk Actions */}
              {stats.pendingUsers > 0 && userFilter !== 'validated' && (
                <div className="mt-6 p-5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                      <FiAlertCircle className="text-amber-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-amber-800">
                        {stats.pendingUsers} utilisateur{stats.pendingUsers > 1 ? 's' : ''} en attente
                      </p>
                      <p className="text-sm text-amber-600">Action groupée disponible</p>
                    </div>
                  </div>
                  <button
                    onClick={handleValidateAllPending}
                    className="btn bg-amber-500 text-white hover:bg-amber-600 shadow-lg"
                  >
                    <FiUserCheck className="mr-2" />
                    Valider tous les utilisateurs en attente
                  </button>
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
                    Quiz ({quizzes.length})
                  </h3>
                  <div className="flex gap-2 text-sm">
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full">
                      {stats.publicQuizzes} publics
                    </span>
                    <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                      {stats.privateQuizzes} privés
                    </span>
                  </div>
                </div>
                {quizzes.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-2xl">
                    <FiHelpCircle className="mx-auto text-4xl mb-2 opacity-50" />
                    <p>Aucun quiz créé</p>
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
                                {quiz.isPublic ? '🌐 Public' : '🔒 Privé'}
                              </span>
                            </div>
                            <p className="text-gray-500 mb-3">{quiz.description || 'Aucune description'}</p>
                            <div className="flex flex-wrap gap-4 text-sm">
                              <span className="text-gray-400 flex items-center gap-1">
                                <FiUsers size={14} />
                                {quiz.userName || 'Inconnu'}
                              </span>
                              <span className="text-gray-400 flex items-center gap-1">
                                <FiHelpCircle size={14} />
                                {quiz.questionsCount || 0} questions
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
                            title="Supprimer ce quiz"
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
                  Questionnaires conditionnels ({questionnaires.length})
                </h3>
                {questionnaires.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-2xl">
                    <FiList className="mx-auto text-4xl mb-2 opacity-50" />
                    <p>Aucun questionnaire créé</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {questionnaires.map((q) => (
                      <div key={q.id} className="border border-gray-200 rounded-2xl p-5 hover:shadow-lg transition-all hover:border-pink-200 bg-white">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-800 text-lg mb-2">{q.title}</h4>
                            <p className="text-gray-500 mb-3">{q.description || 'Aucune description'}</p>
                            <div className="flex flex-wrap gap-4 text-sm">
                              <span className="text-gray-400 flex items-center gap-1">
                                <FiUsers size={14} />
                                {q.userName || 'Inconnu'}
                              </span>
                              <span className="text-gray-400 flex items-center gap-1">
                                <FiList size={14} />
                                {q.questions?.length || 0} questions
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
                            title="Supprimer ce questionnaire"
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
                <h3 className="text-xl font-bold text-gray-800">Historique d'activité complet</h3>
                <span className="text-sm text-gray-500">{getRecentActivity().length} événements</span>
              </div>
              <div className="space-y-3">
                {getRecentActivity().length === 0 ? (
                  <div className="text-center py-16 text-gray-400">
                    <FiActivity className="mx-auto text-5xl mb-3 opacity-50" />
                    <p className="text-lg">Aucune activité enregistrée</p>
                    <p className="text-sm">L'historique apparaîtra ici</p>
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
                          {activity.userName && ` • Créé par ${activity.userName}`}
                          {activity.playerName && ` • Joueur: ${activity.playerName}`}
                          {activity.score !== undefined && ` • Score: ${activity.score}%`}
                          {activity.validated === false && ' • ⏳ En attente de validation'}
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

          {/* ==================== SETTINGS TAB ==================== */}
          {activeTab === 'settings' && (
            <div className="space-y-8">
              {/* Firebase Console Link */}
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-6 border border-orange-200">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  🔥 Console Firebase
                </h3>
                <p className="text-gray-600 mb-4">
                  Accédez à la console Firebase pour gérer les services avancés : Authentication, Firestore, Storage, Hosting.
                </p>
                <a 
                  href="https://console.firebase.google.com/project/hugoquiz" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 btn bg-orange-500 text-white hover:bg-orange-600"
                >
                  <FiSettings />
                  Ouvrir Firebase Console
                </a>
              </div>

              {/* Export Section */}
              <div className="bg-gray-50 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <FiDownload className="text-purple-500" />
                  Exporter les données
                </h3>
                <p className="text-gray-600 mb-6">
                  Téléchargez les données de l'application au format JSON pour sauvegarde ou analyse.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button 
                    onClick={() => exportData('users')}
                    className="p-5 bg-white border-2 border-gray-200 rounded-2xl hover:border-blue-400 hover:shadow-lg transition-all text-left group"
                  >
                    <FiUsers className="text-blue-500 text-2xl mb-3 group-hover:scale-110 transition-transform" />
                    <p className="font-bold text-gray-800">Utilisateurs</p>
                    <p className="text-sm text-gray-500">{stats.totalUsers} entrées • JSON</p>
                  </button>
                  <button 
                    onClick={() => exportData('quizzes')}
                    className="p-5 bg-white border-2 border-gray-200 rounded-2xl hover:border-purple-400 hover:shadow-lg transition-all text-left group"
                  >
                    <FiHelpCircle className="text-purple-500 text-2xl mb-3 group-hover:scale-110 transition-transform" />
                    <p className="font-bold text-gray-800">Quiz</p>
                    <p className="text-sm text-gray-500">{stats.totalQuizzes} entrées • JSON</p>
                  </button>
                  <button 
                    onClick={() => exportData('statistics')}
                    className="p-5 bg-white border-2 border-gray-200 rounded-2xl hover:border-green-400 hover:shadow-lg transition-all text-left group"
                  >
                    <FiBarChart2 className="text-green-500 text-2xl mb-3 group-hover:scale-110 transition-transform" />
                    <p className="font-bold text-gray-800">Statistiques</p>
                    <p className="text-sm text-gray-500">Rapport complet • JSON</p>
                  </button>
                </div>
              </div>

              {/* Database Info */}
              <div className="bg-gray-50 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <FiDatabase className="text-purple-500" />
                  Informations base de données
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-blue-600">{stats.totalUsers}</p>
                    <p className="text-sm text-gray-500">Utilisateurs</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-purple-600">{stats.totalQuizzes}</p>
                    <p className="text-sm text-gray-500">Quiz</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-pink-600">{stats.totalQuestionnaires}</p>
                    <p className="text-sm text-gray-500">Questionnaires</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-green-600">{stats.totalSessions}</p>
                    <p className="text-sm text-gray-500">Sessions</p>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-red-800 mb-2 flex items-center gap-2">
                  <FiAlertCircle className="text-red-500" />
                  Zone dangereuse
                </h3>
                <p className="text-red-600 mb-6">
                  Ces actions sont irréversibles. Utilisez-les avec une extrême précaution.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button 
                    className="btn bg-red-100 text-red-700 hover:bg-red-200 border border-red-300"
                    onClick={() => toast.error('Cette fonctionnalité nécessite une confirmation dans Firebase Console')}
                  >
                    <FiTrash2 className="mr-2" />
                    Supprimer tous les quiz
                  </button>
                  <button 
                    className="btn bg-red-100 text-red-700 hover:bg-red-200 border border-red-300"
                    onClick={() => toast.error('Cette fonctionnalité nécessite une confirmation dans Firebase Console')}
                  >
                    <FiTrash2 className="mr-2" />
                    Réinitialiser les sessions
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
              <h3 className="text-2xl font-bold text-gray-800">Confirmer la suppression</h3>
              <p className="text-gray-600 mt-3">
                Voulez-vous vraiment supprimer 
                <span className="font-bold text-gray-800"> "{deleteModal.title}"</span> ?
              </p>
              <p className="text-red-500 text-sm mt-2 font-medium">⚠️ Cette action est irréversible</p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setDeleteModal({ show: false, type: null, id: null, title: '' })}
                className="flex-1 btn btn-ghost py-3"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteContent}
                className="flex-1 btn btn-danger py-3"
              >
                <FiTrash2 className="mr-2" />
                Supprimer
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
              <h3 className="text-xl font-bold text-gray-800">Détails de l'utilisateur</h3>
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
                <p className="text-2xl font-bold text-gray-800">{selectedUser.displayName || 'Sans nom'}</p>
                <p className="text-gray-500 flex items-center gap-1">
                  <FiMail size={14} />
                  {selectedUser.email}
                </p>
              </div>
            </div>

            {/* User Details */}
            <div className="space-y-4 mb-6">
              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-gray-500">ID utilisateur</span>
                <span className="font-mono text-sm text-gray-800 bg-gray-100 px-2 py-1 rounded">{selectedUser.id.slice(0, 12)}...</span>
              </div>
              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-gray-500">Rôle</span>
                <span className={`px-4 py-1.5 rounded-xl text-sm font-medium ${
                  selectedUser.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {selectedUser.role === 'admin' ? '🛡️ Administrateur' : '👤 Utilisateur'}
                </span>
              </div>
              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-gray-500">Statut du compte</span>
                <span className={`px-4 py-1.5 rounded-xl text-sm font-medium ${
                  selectedUser.validated ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {selectedUser.validated ? '✅ Validé' : '⏳ En attente de validation'}
                </span>
              </div>
              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-gray-500">Date d'inscription</span>
                <span className="text-gray-800">{formatDate(selectedUser.createdAt)}</span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-gray-500">Contenus créés</span>
                <div className="flex gap-2">
                  <span className="bg-purple-50 text-purple-600 text-sm px-3 py-1 rounded-lg">
                    {getUserStats(selectedUser.id).quizzes} quiz
                  </span>
                  <span className="bg-pink-50 text-pink-600 text-sm px-3 py-1 rounded-lg">
                    {getUserStats(selectedUser.id).questionnaires} quest.
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              {selectedUser.validated ? (
                <button
                  onClick={() => {
                    handleValidateUser(selectedUser.id, false)
                    setSelectedUser({ ...selectedUser, validated: false })
                  }}
                  className="flex-1 btn btn-danger py-3 flex items-center justify-center gap-2"
                >
                  <FiUserX />
                  Bloquer ce compte
                </button>
              ) : (
                <button
                  onClick={() => {
                    handleValidateUser(selectedUser.id, true)
                    setSelectedUser({ ...selectedUser, validated: true })
                  }}
                  className="flex-1 btn btn-success py-3 flex items-center justify-center gap-2"
                >
                  <FiUserCheck />
                  Valider ce compte
                </button>
              )}
              <button
                onClick={() => setSelectedUser(null)}
                className="flex-1 btn btn-ghost py-3"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPanel