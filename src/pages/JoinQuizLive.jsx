import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from '../config/firebase'
import { getQuizById, getLiveQuizSession } from '../services/firestore'
import LoadingSpinner from '../components/LoadingSpinner'
import FloatingLanguageSelector from '../components/FloatingLanguageSelector'
import { FiUser, FiPlay, FiClock, FiUsers, FiRadio } from 'react-icons/fi'
import toast from 'react-hot-toast'

/**
 * Page pour rejoindre une session de quiz en direct
 * Cette page cherche automatiquement une session active pour le quiz
 * ou permet d'entrer un code de session
 */
const JoinQuizLive = () => {
  const { quizId } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [loading, setLoading] = useState(true)
  const [quiz, setQuiz] = useState(null)
  const [activeSession, setActiveSession] = useState(null)
  const [sessionCode, setSessionCode] = useState('')
  const [noSession, setNoSession] = useState(false)

  // Chercher une session active pour ce quiz
  useEffect(() => {
    const findActiveSession = async () => {
      try {
        // Charger les infos du quiz
        const quizData = await getQuizById(quizId)
        if (!quizData) {
          toast.error(t('messages.error.quizNotFound'))
          navigate('/')
          return
        }
        setQuiz(quizData)

        // Chercher une session en attente pour ce quiz
        const sessionsRef = collection(db, 'liveQuizSessions')
        const q = query(
          sessionsRef,
          where('quizId', '==', quizId),
          where('status', '==', 'waiting'),
          orderBy('createdAt', 'desc'),
          limit(1)
        )

        const snapshot = await getDocs(q)
        
        if (!snapshot.empty) {
          const sessionDoc = snapshot.docs[0]
          setActiveSession({ id: sessionDoc.id, ...sessionDoc.data() })
        } else {
          setNoSession(true)
        }
      } catch (error) {
        console.error('Error finding session:', error)
        setNoSession(true)
      } finally {
        setLoading(false)
      }
    }

    findActiveSession()
  }, [quizId, navigate])

  // Rejoindre la session active trouvée
  const handleJoinActiveSession = () => {
    if (activeSession) {
      navigate(`/play/quiz/${quizId}/live/${activeSession.sessionId || activeSession.id}`)
    }
  }

  // Rejoindre avec un code de session
  const handleJoinWithCode = async () => {
    if (!sessionCode.trim()) {
      toast.error(t('messages.validation.sessionCodeRequired'))
      return
    }

    try {
      const session = await getLiveQuizSession(sessionCode.trim())
      if (session) {
        if (session.status === 'waiting') {
          navigate(`/play/quiz/${quizId}/live/${sessionCode.trim()}`)
        } else {
          toast.error(t('messages.error.sessionStarted'))
        }
      } else {
        toast.error(t('messages.error.sessionNotFound'))
      }
    } catch (error) {
      console.error('Error joining with code:', error)
      toast.error(t('messages.error.loading'))
    }
  }

  // Jouer en mode solo
  const handlePlaySolo = () => {
    navigate(`/play/quiz/${quizId}`)
  }

  if (loading) {
    return <LoadingSpinner fullScreen text={t('joinQuizLive.loading', "Recherche d'une session en cours...")} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 flex items-center justify-center p-4">
      <FloatingLanguageSelector position="top-right" />
      <div className="max-w-md w-full">
        {/* En-tête du quiz */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎮</div>
          <h1 className="text-3xl font-bold text-white mb-2">{quiz?.title}</h1>
          <p className="text-white/70">{quiz?.description}</p>
        </div>

        {/* Session active trouvée */}
        {activeSession && (
          <div className="bg-white rounded-3xl shadow-2xl p-6 mb-4 animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                <FiRadio className="text-white text-xl animate-pulse" />
              </div>
              <div>
                <h2 className="font-bold text-gray-800">{t('joinQuizLive.liveSession', 'Session en direct !')}</h2>
                <p className="text-sm text-gray-500">
                  {t('joinQuizLive.playersWaiting', '{{count}} joueur(s) en attente', { count: activeSession.participants?.length || 0 })}
                </p>
              </div>
            </div>

            <button
              onClick={handleJoinActiveSession}
              className="w-full py-4 bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 hover:scale-105 transition-transform shadow-lg"
            >
              <FiPlay />
              {t('joinQuizLive.joinSession', 'Rejoindre la session')}
            </button>
          </div>
        )}

        {/* Pas de session active */}
        {noSession && (
          <div className="bg-white rounded-3xl shadow-2xl p-6 mb-4 animate-slide-up">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <FiClock className="text-gray-400 text-2xl" />
              </div>
              <h2 className="font-bold text-gray-800 mb-1">{t('joinQuizLive.noSession', 'Aucune session en cours')}</h2>
              <p className="text-sm text-gray-500">
                {t('joinQuizLive.hostNotStarted', "L'animateur n'a pas encore lancé de session")}
              </p>
            </div>

            {/* Entrer un code de session */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('joinQuizLive.hasSessionCode', 'Avez-vous un code de session ?')}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={sessionCode}
                  onChange={(e) => setSessionCode(e.target.value)}
                  placeholder={t('joinQuizLive.sessionCodePlaceholder', 'Code de session...')}
                  className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 outline-none"
                />
                <button
                  onClick={handleJoinWithCode}
                  className="px-4 py-3 bg-purple-500 text-white rounded-xl font-bold hover:bg-purple-600 transition-colors"
                >
                  OK
                </button>
              </div>
            </div>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-4 text-gray-400 text-sm">{t('joinQuizLive.or', 'ou')}</span>
              </div>
            </div>

            {/* Jouer en solo */}
            <button
              onClick={handlePlaySolo}
              className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 hover:scale-105 transition-transform"
            >
              <FiUser />
              {t('joinQuizLive.playSolo', 'Jouer en solo')}
            </button>
          </div>
        )}

        {/* Info sur le quiz */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
          <div className="flex items-center justify-center gap-6 text-white">
            <div className="flex items-center gap-2">
              <FiUsers />
              <span>{quiz?.questionsCount || quiz?.questions?.length || 0} {t('joinQuizLive.questions', 'questions')}</span>
            </div>
            <div className="flex items-center gap-2">
              <FiClock />
              <span>{quiz?.timePerQuestion || 30}{t('joinQuizLive.perQuestion', 's par question')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default JoinQuizLive
