import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getQuestionnaireSession } from '../services/firestore'
import { FiArrowLeft, FiHome, FiCheck } from 'react-icons/fi'
import LoadingSpinner from '../components/LoadingSpinner'

const QuestionnaireResults = () => {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)

  useEffect(() => {
    fetchSession()
  }, [sessionId])

  const fetchSession = async () => {
    try {
      const data = await getQuestionnaireSession(sessionId)
      if (!data) {
        navigate('/')
        return
      }
      setSession(data)
    } catch (error) {
      console.error('Fetch error:', error)
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingSpinner fullScreen text="Chargement des résultats..." />
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 p-4">
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
            <h1 className="text-2xl font-bold text-white">Vos Réponses</h1>
            <p className="text-white/70">{session.questionnaireTitle}</p>
          </div>
        </div>

        {/* Summary Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 text-center">
          <div className="text-4xl mb-4">📋</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">{session.respondentName}</h2>
          <p className="text-gray-500">
            Questionnaire complété le {session.completedAt?.toDate?.()?.toLocaleDateString('fr-FR') || 'Date inconnue'}
          </p>
          
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full">
            <FiCheck />
            {session.answers?.length || 0} réponses enregistrées
          </div>
        </div>

        {/* Answers Detail */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Détail des réponses</h3>
          
          <div className="space-y-4">
            {session.answers?.map((answer, index) => (
              <div 
                key={index} 
                className="p-4 rounded-xl border border-gray-200 bg-gray-50"
              >
                <p className="font-medium text-gray-700 mb-2">
                  {index + 1}. {answer.questionText}
                </p>
                <p className="text-purple-600 font-medium bg-purple-50 inline-block px-3 py-1 rounded-lg">
                  {answer.answer || 'Pas de réponse'}
                </p>
              </div>
            ))}

            {(!session.answers || session.answers.length === 0) && (
              <p className="text-center text-gray-500 py-8">
                Aucune réponse enregistrée
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8">
          <Link
            to="/"
            className="w-full btn btn-primary flex items-center justify-center gap-2"
          >
            <FiHome />
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  )
}

export default QuestionnaireResults
