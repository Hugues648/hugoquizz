import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getQuizById, getQuizSessionsByQuiz } from '../services/firestore'
import { FiArrowLeft, FiClock, FiTarget, FiAward, FiUsers, FiShare2, FiStar } from 'react-icons/fi'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'

// Avatars générés à partir du nom
const getAvatarColor = (name) => {
  const colors = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
    'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
    'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500',
    'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500'
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

const getInitials = (name) => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const getMedalEmoji = (rank) => {
  switch (rank) {
    case 1: return '🥇'
    case 2: return '🥈'
    case 3: return '🥉'
    default: return null
  }
}

const QuizLeaderboard = () => {
  const { quizId } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [quiz, setQuiz] = useState(null)
  const [sessions, setSessions] = useState([])
  const [timeFilter, setTimeFilter] = useState('all') // all, today, week, month

  useEffect(() => {
    fetchData()
  }, [quizId])

  const fetchData = async () => {
    try {
      const [quizData, sessionsData] = await Promise.all([
        getQuizById(quizId),
        getQuizSessionsByQuiz(quizId)
      ])
      
      if (!quizData) {
        toast.error(t('messages.error.quizNotFound'))
        navigate('/')
        return
      }
      
      setQuiz(quizData)
      setSessions(sessionsData.filter(s => s.status === 'completed'))
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
      toast.error(t('messages.error.loading'))
    } finally {
      setLoading(false)
    }
  }

  // Filtrer par période
  const filterByTime = (sessions) => {
    const now = new Date()
    switch (timeFilter) {
      case 'today':
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        return sessions.filter(s => {
          const date = s.createdAt?.toDate?.() || new Date(0)
          return date >= todayStart
        })
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        return sessions.filter(s => {
          const date = s.createdAt?.toDate?.() || new Date(0)
          return date >= weekAgo
        })
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        return sessions.filter(s => {
          const date = s.createdAt?.toDate?.() || new Date(0)
          return date >= monthAgo
        })
      default:
        return sessions
    }
  }

  // Trier par score (meilleur score pour chaque joueur unique)
  const getLeaderboard = () => {
    const filteredSessions = filterByTime(sessions)
    
    // Grouper par joueur et garder le meilleur score
    const playerBest = {}
    filteredSessions.forEach(session => {
      const playerName = session.playerName || 'Anonyme'
      const existing = playerBest[playerName]
      if (!existing || session.score > existing.score) {
        playerBest[playerName] = session
      }
    })
    
    // Convertir en tableau et trier
    return Object.values(playerBest)
      .sort((a, b) => {
        // Trier par score décroissant
        if (b.score !== a.score) return b.score - a.score
        // En cas d'égalité, par temps total croissant
        const timeA = a.answers?.reduce((acc, ans) => acc + (ans.timeSpent || 0), 0) || 0
        const timeB = b.answers?.reduce((acc, ans) => acc + (ans.timeSpent || 0), 0) || 0
        return timeA - timeB
      })
  }

  const leaderboard = getLeaderboard()
  
  // Statistiques
  const stats = {
    totalPlayers: sessions.length,
    uniquePlayers: new Set(sessions.map(s => s.playerName)).size,
    avgScore: sessions.length > 0 
      ? Math.round(sessions.reduce((acc, s) => acc + (s.score || 0), 0) / sessions.length)
      : 0,
    highestScore: Math.max(...sessions.map(s => s.score || 0), 0)
  }

  const shareLeaderboard = async () => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Classement - ${quiz?.title}`,
          text: `Découvrez le classement du quiz "${quiz?.title}" !`,
          url
        })
      } catch (err) {
        copyToClipboard(url)
      }
    } else {
      copyToClipboard(url)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    toast.success(t('messages.success.linkCopied'))
  }

  if (loading) {
    return <LoadingSpinner fullScreen text={t('quizLeaderboard.loading', 'Chargement du classement...')} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <FiArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <FiAward /> {t('quizLeaderboard.title', 'Classement')}
              </h1>
              <p className="text-white/70">{quiz?.title}</p>
            </div>
          </div>
          <button
            onClick={shareLeaderboard}
            className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            title={t('quizLeaderboard.share', 'Partager')}
          >
            <FiShare2 size={20} />
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
            <FiUsers className="text-white/70 mx-auto mb-1" size={20} />
            <p className="text-2xl font-bold text-white">{stats.uniquePlayers}</p>
            <p className="text-xs text-white/70">{t('quizLeaderboard.uniquePlayers', 'Joueurs uniques')}</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
            <FiTarget className="text-white/70 mx-auto mb-1" size={20} />
            <p className="text-2xl font-bold text-white">{stats.totalPlayers}</p>
            <p className="text-xs text-white/70">{t('quizLeaderboard.gamesPlayed', 'Parties jouées')}</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
            <FiAward className="text-white/70 mx-auto mb-1" size={20} />
            <p className="text-2xl font-bold text-white">{stats.highestScore}</p>
            <p className="text-xs text-white/70">{t('quizLeaderboard.highestScore', 'Meilleur score')}</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
            <FiStar className="text-white/70 mx-auto mb-1" size={20} />
            <p className="text-2xl font-bold text-white">{stats.avgScore}</p>
            <p className="text-xs text-white/70">{t('quizLeaderboard.averageScore', 'Score moyen')}</p>
          </div>
        </div>

        {/* Time Filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { value: 'all', label: t('quizLeaderboard.filterAll', 'Tout') },
            { value: 'today', label: t('quizLeaderboard.filterToday', "Aujourd'hui") },
            { value: 'week', label: t('quizLeaderboard.filterWeek', '7 jours') },
            { value: 'month', label: t('quizLeaderboard.filterMonth', '30 jours') }
          ].map(filter => (
            <button
              key={filter.value}
              onClick={() => setTimeFilter(filter.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                timeFilter === filter.value
                  ? 'bg-white text-orange-600'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Leaderboard */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {leaderboard.length === 0 ? (
            <div className="text-center py-16">
              <FiAward className="text-6xl text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">{t('quizLeaderboard.noScores', 'Aucun score pour le moment')}</p>
              <p className="text-gray-400 text-sm mt-2">{t('quizLeaderboard.beFirst', 'Soyez le premier à jouer !')}</p>
              <Link
                to={`/play/quiz/${quizId}`}
                className="inline-block mt-6 btn btn-primary"
              >
                {t('quizLeaderboard.playNow', 'Jouer maintenant')}
              </Link>
            </div>
          ) : (
            <>
              {/* Top 3 Podium */}
              {leaderboard.length >= 3 && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-6">
                  <div className="flex items-end justify-center gap-4">
                    {/* 2nd Place */}
                    <div className="text-center order-1">
                      <div className="relative inline-block">
                        <div className={`w-16 h-16 rounded-full ${getAvatarColor(leaderboard[1].playerName)} flex items-center justify-center text-white font-bold text-xl shadow-lg`}>
                          {getInitials(leaderboard[1].playerName)}
                        </div>
                        <span className="absolute -top-1 -right-1 text-2xl">{getMedalEmoji(2)}</span>
                      </div>
                      <p className="font-semibold text-gray-800 mt-2 text-sm truncate max-w-[100px]">
                        {leaderboard[1].playerName}
                      </p>
                      <p className="text-orange-600 font-bold">{leaderboard[1].score} pts</p>
                      <div className="bg-gray-300 h-16 w-20 rounded-t-lg mt-2" />
                    </div>
                    
                    {/* 1st Place */}
                    <div className="text-center order-2">
                      <div className="relative inline-block">
                        <div className={`w-20 h-20 rounded-full ${getAvatarColor(leaderboard[0].playerName)} flex items-center justify-center text-white font-bold text-2xl shadow-lg ring-4 ring-amber-400`}>
                          {getInitials(leaderboard[0].playerName)}
                        </div>
                        <span className="absolute -top-2 -right-2 text-3xl">{getMedalEmoji(1)}</span>
                      </div>
                      <p className="font-bold text-gray-800 mt-2 truncate max-w-[120px]">
                        {leaderboard[0].playerName}
                      </p>
                      <p className="text-orange-600 font-bold text-lg">{leaderboard[0].score} pts</p>
                      <div className="bg-amber-400 h-24 w-24 rounded-t-lg mt-2" />
                    </div>
                    
                    {/* 3rd Place */}
                    <div className="text-center order-3">
                      <div className="relative inline-block">
                        <div className={`w-14 h-14 rounded-full ${getAvatarColor(leaderboard[2].playerName)} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                          {getInitials(leaderboard[2].playerName)}
                        </div>
                        <span className="absolute -top-1 -right-1 text-xl">{getMedalEmoji(3)}</span>
                      </div>
                      <p className="font-semibold text-gray-800 mt-2 text-sm truncate max-w-[80px]">
                        {leaderboard[2].playerName}
                      </p>
                      <p className="text-orange-600 font-bold text-sm">{leaderboard[2].score} pts</p>
                      <div className="bg-amber-700 h-12 w-16 rounded-t-lg mt-2" />
                    </div>
                  </div>
                </div>
              )}

              {/* Full List */}
              <div className="divide-y divide-gray-100">
                {leaderboard.map((entry, index) => {
                  const rank = index + 1
                  const totalTime = entry.answers?.reduce((acc, ans) => acc + (ans.timeSpent || 0), 0) || 0
                  const correctCount = entry.answers?.filter(a => a.isCorrect).length || 0
                  const totalQuestions = entry.totalQuestions || entry.answers?.length || 0
                  
                  return (
                    <div
                      key={entry.id}
                      className={`flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors ${
                        rank <= 3 ? 'bg-gradient-to-r from-amber-50/50 to-transparent' : ''
                      }`}
                    >
                      {/* Rank */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                        rank === 1 ? 'bg-amber-400 text-white' :
                        rank === 2 ? 'bg-gray-300 text-gray-700' :
                        rank === 3 ? 'bg-amber-700 text-white' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {getMedalEmoji(rank) || rank}
                      </div>
                      
                      {/* Avatar */}
                      <div className={`w-12 h-12 rounded-full ${getAvatarColor(entry.playerName)} flex items-center justify-center text-white font-bold shadow`}>
                        {getInitials(entry.playerName)}
                      </div>
                      
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 truncate">{entry.playerName}</p>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <FiTarget className="text-green-500" />
                            {correctCount}/{totalQuestions}
                          </span>
                          <span className="flex items-center gap-1">
                            <FiClock className="text-blue-500" />
                            {totalTime}s
                          </span>
                        </div>
                      </div>
                      
                      {/* Score */}
                      <div className="text-right">
                        <p className="text-xl font-bold text-orange-600">{entry.score}</p>
                        <p className="text-xs text-gray-500">{t('quizLeaderboard.points', 'points')}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Play Button */}
        <div className="mt-6 text-center">
          <Link
            to={`/play/quiz/${quizId}`}
            className="inline-flex items-center gap-2 btn btn-primary bg-white text-orange-600 hover:bg-white/90"
          >
            🎮 {t('quizLeaderboard.joinLeaderboard', 'Jouer et rejoindre le classement')}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default QuizLeaderboard
