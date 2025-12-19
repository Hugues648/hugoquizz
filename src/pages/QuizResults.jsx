import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getQuizSession } from '../services/firestore'
import { FiCheck, FiX, FiArrowLeft, FiHome, FiRefreshCw } from 'react-icons/fi'
import LoadingSpinner from '../components/LoadingSpinner'

const QuizResults = () => {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)

  useEffect(() => {
    fetchSession()
  }, [sessionId])

  const fetchSession = async () => {
    try {
      const data = await getQuizSession(sessionId)
      if (!data) {
        navigate('/')
        return
      }
      setSession(data)
    } catch (error) {
      console.error('Fetch session error:', error)
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingSpinner fullScreen text="Chargement des résultats..." />
  }

  if (!session) return null

  const correctCount = session.answers?.filter(a => a.isCorrect).length || 0
  const totalQuestions = session.totalQuestions || session.answers?.length || 0
  const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <FiArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Résultats du Quiz</h1>
            <p className="text-white/70">{session.quizTitle}</p>
          </div>
        </div>

        {/* Score Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6 text-center">
          <div className="text-6xl mb-4">
            {percentage >= 80 ? '🏆' : percentage >= 50 ? '🎉' : '💪'}
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">{session.playerName}</h2>
          
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white my-6">
            <p className="text-sm opacity-80">Score total</p>
            <p className="text-5xl font-bold">{session.score || 0}</p>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-2xl font-bold text-green-600">{correctCount}</p>
              <p className="text-sm text-green-600">Correctes</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4">
              <p className="text-2xl font-bold text-red-600">{totalQuestions - correctCount}</p>
              <p className="text-sm text-red-600">Incorrectes</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4">
              <p className="text-2xl font-bold text-purple-600">{percentage}%</p>
              <p className="text-sm text-purple-600">Réussite</p>
            </div>
          </div>
        </div>

        {/* Answers Detail */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Détail des réponses</h3>
          
          <div className="space-y-4">
            {session.answers?.map((answer, index) => (
              <div 
                key={index} 
                className={`p-4 rounded-xl border-2 ${
                  answer.isCorrect 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    answer.isCorrect ? 'bg-green-500' : 'bg-red-500'
                  }`}>
                    {answer.isCorrect ? (
                      <FiCheck className="text-white" />
                    ) : (
                      <FiX className="text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800 mb-2">
                      {index + 1}. {answer.questionText}
                    </p>
                    <div className="text-sm space-y-1">
                      <p className={answer.isCorrect ? 'text-green-700' : 'text-red-700'}>
                        <span className="font-medium">Votre réponse:</span> {answer.selectedAnswer || 'Pas de réponse'}
                      </p>
                      {!answer.isCorrect && (
                        <p className="text-green-700">
                          <span className="font-medium">Bonne réponse:</span> {answer.correctAnswer}
                        </p>
                      )}
                      <p className="text-gray-500">
                        Points: {answer.points} | Temps: {answer.timeSpent}s
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex gap-4">
          <button
            onClick={() => navigate(`/play/quiz/${session.quizId}`)}
            className="flex-1 btn bg-white text-purple-600 flex items-center justify-center gap-2"
          >
            <FiRefreshCw />
            Rejouer
          </button>
          <Link
            to="/"
            className="flex-1 btn btn-primary flex items-center justify-center gap-2"
          >
            <FiHome />
            Accueil
          </Link>
        </div>
      </div>
    </div>
  )
}

export default QuizResults
