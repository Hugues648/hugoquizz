import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { getQuestionnaireById, getQuestionnaireSessionsByQuestionnaire, deleteQuestionnaireSession } from '../services/firestore'
import { FiArrowLeft, FiUser, FiCalendar, FiList, FiChevronDown, FiChevronUp, FiEye, FiCheck, FiTrash2 } from 'react-icons/fi'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'

const QuestionnaireResponses = () => {
  const { questionnaireId } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [questionnaire, setQuestionnaire] = useState(null)
  const [sessions, setSessions] = useState([])
  const [expandedSession, setExpandedSession] = useState(null)
  const [deleteModal, setDeleteModal] = useState({ show: false, sessionId: null, respondentName: '' })

  useEffect(() => {
    fetchData()
  }, [questionnaireId])

  const fetchData = async () => {
    try {
      const questionnaireData = await getQuestionnaireById(questionnaireId)
      
      if (!questionnaireData) {
        toast.error(t('messages.error.questionnaireNotFound'))
        navigate('/dashboard')
        return
      }

      // Vérifier que l'utilisateur est le propriétaire
      if (questionnaireData.userId !== user.uid) {
        toast.error(t('messages.error.unauthorized'))
        navigate('/dashboard')
        return
      }

      setQuestionnaire(questionnaireData)

      const sessionsData = await getQuestionnaireSessionsByQuestionnaire(questionnaireId)
      setSessions(sessionsData)
    } catch (error) {
      console.error('Fetch error:', error)
      toast.error(t('messages.error.loading'))
      navigate('/dashboard')
    } finally {
      setLoading(false)
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

  const toggleSession = (sessionId) => {
    setExpandedSession(expandedSession === sessionId ? null : sessionId)
  }

  const handleDeleteSession = async () => {
    try {
      await deleteQuestionnaireSession(deleteModal.sessionId)
      setSessions(sessions.filter(s => s.id !== deleteModal.sessionId))
      toast.success(t('messages.success.responseDeleted'))
    } catch (error) {
      console.error('Delete error:', error)
      toast.error(t('messages.error.deleting'))
    } finally {
      setDeleteModal({ show: false, sessionId: null, respondentName: '' })
    }
  }

  // Formater la réponse pour l'affichage
  const formatAnswer = (answer) => {
    if (!answer) return '-'
    if (Array.isArray(answer)) return answer.join(', ')
    return String(answer)
  }

  if (loading) {
    return <LoadingSpinner fullScreen text={t('questionnaireResponses.loading', 'Chargement des réponses...')} />
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <FiArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">{t('questionnaireResponses.title', 'Réponses au Questionnaire')}</h1>
          <p className="text-white/70">{questionnaire?.title}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <FiUser className="text-white text-xl" />
            </div>
            <div>
              <p className="text-white/70 text-sm">{t('questionnaireResponses.respondents', 'Répondants')}</p>
              <p className="text-2xl font-bold text-white">{sessions.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <FiList className="text-white text-xl" />
            </div>
            <div>
              <p className="text-white/70 text-sm">{t('questionnaireResponses.questions', 'Questions')}</p>
              <p className="text-2xl font-bold text-white">{questionnaire?.questions?.length || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
              <FiCheck className="text-white text-xl" />
            </div>
            <div>
              <p className="text-white/70 text-sm">{t('questionnaireResponses.completed', 'Complétés')}</p>
              <p className="text-2xl font-bold text-white">
                {sessions.filter(s => s.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sessions List */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">
            {t('questionnaireResponses.respondentList', 'Liste des répondants')} ({sessions.length})
          </h2>
        </div>

        {sessions.length === 0 ? (
          <div className="p-12 text-center">
            <FiUser className="text-6xl text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">{t('questionnaireResponses.noResponses', 'Aucune réponse pour le moment')}</p>
            <p className="text-gray-400 text-sm mt-2">
              {t('questionnaireResponses.shareToReceive', 'Partagez votre questionnaire pour recevoir des réponses')}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {sessions.map((session) => {
              // Calculer le nombre de réponses (gère tableau ou objet)
              const answersCount = Array.isArray(session.answers) 
                ? session.answers.length 
                : (session.answers && typeof session.answers === 'object' ? Object.keys(session.answers).length : 0)

              return (
                <div key={session.id} className="hover:bg-gray-50 transition-colors">
                  <div 
                    className="p-5 cursor-pointer"
                    onClick={() => toggleSession(session.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                          {session.respondentName?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-800">{session.respondentName || t('questionnaireResponses.anonymous', 'Anonyme')}</h3>
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <FiCalendar size={14} />
                            {formatDate(session.completedAt || session.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-medium text-gray-700">
                            {answersCount === 0 ? (
                              <span className="text-orange-500">{t('questionnaireResponses.noAnswer', 'Aucune réponse')}</span>
                            ) : (
                              `${answersCount} ${t('questionnaireResponses.answers', 'réponses')}`
                            )}
                          </p>
                          <p className={`text-sm ${
                            answersCount === 0 ? 'text-orange-500' : 
                            session.status === 'completed' ? 'text-green-600' : 'text-orange-500'
                          }`}>
                            {answersCount === 0 ? t('questionnaireResponses.abandoned', 'Abandonné') : session.status === 'completed' ? t('questionnaireResponses.completedStatus', 'Complété') : t('questionnaireResponses.inProgress', 'En cours')}
                          </p>
                        </div>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          answersCount === 0 ? 'bg-orange-100' :
                          session.status === 'completed' ? 'bg-green-100' : 'bg-orange-100'
                        }`}>
                          {answersCount === 0 ? '⚠️' : session.status === 'completed' ? '✅' : '⏳'}
                        </div>
                        {expandedSession === session.id ? <FiChevronUp /> : <FiChevronDown />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedSession === session.id && (
                    <div className="px-5 pb-5 bg-gray-50">
                      <div className="border-t border-gray-200 pt-4">
                        <h4 className="font-medium text-gray-700 mb-3">{t('questionnaireResponses.responseDetails', 'Détail des réponses')}</h4>
                        <div className="space-y-2">
                          {session.answers?.map((answer, index) => (
                            <div 
                              key={index}
                              className="p-3 rounded-lg border bg-white border-gray-200"
                            >
                              <p className="text-sm font-medium text-gray-700">
                                {index + 1}. {answer.questionText}
                              </p>
                              <p className="text-sm mt-1 text-purple-600 bg-purple-50 inline-block px-2 py-1 rounded mt-2">
                                {formatAnswer(answer.answer)}
                              </p>
                            </div>
                          ))}

                          {answersCount === 0 && (
                            <div className="text-center py-6 bg-orange-50 rounded-xl border border-orange-200">
                              <div className="text-4xl mb-2">⚠️</div>
                              <p className="text-orange-700 font-medium">{t('questionnaireResponses.sessionAbandoned', 'Session abandonnée')}</p>
                              <p className="text-orange-600 text-sm mt-1">
                                {t('questionnaireResponses.noQuestionsAnswered', 'Cette personne a commencé le questionnaire mais n\'a répondu à aucune question.')}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          {answersCount > 0 ? (
                            <Link
                              to={`/results/questionnaire/${session.id}`}
                              className="btn btn-ghost text-purple-600 text-sm inline-flex items-center gap-1"
                            >
                              <FiEye size={14} />
                              {t('questionnaireResponses.viewFullResults', 'Voir la page de résultats complète')}
                            </Link>
                          ) : (
                            <span></span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteModal({ show: true, sessionId: session.id, respondentName: session.respondentName || t('questionnaireResponses.anonymous', 'Anonyme') })
                            }}
                            className="btn btn-ghost text-red-500 text-sm inline-flex items-center gap-1 hover:bg-red-50"
                          >
                            <FiTrash2 size={14} />
                            {t('common.delete', 'Supprimer')}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
      
      {/* Delete Modal */}
      {deleteModal.show && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setDeleteModal({ show: false, sessionId: null, respondentName: '' })}
        >
          <div 
            className="bg-white rounded-2xl p-6 max-w-sm w-full animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiTrash2 className="text-red-500 text-2xl" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">{t('questionnaireResponses.deleteResponse', 'Supprimer cette réponse ?')}</h3>
              <p className="text-gray-600 mb-6">
                {t('questionnaireResponses.responseOf', 'La réponse de')} <strong>{deleteModal.respondentName}</strong> {t('messages.willBePermanentlyDeleted', 'sera définitivement supprimée')}.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteModal({ show: false, sessionId: null, respondentName: '' })}
                  className="flex-1 btn btn-ghost"
                >
                  {t('common.cancel', 'Annuler')}
                </button>
                <button
                  onClick={handleDeleteSession}
                  className="flex-1 btn bg-red-500 hover:bg-red-600 text-white"
                >
                  {t('common.delete', 'Supprimer')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default QuestionnaireResponses
