import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getQuizzesByUser, getQuestionnairesByUser, deleteQuiz, deleteQuestionnaire } from '../services/firestore'
import { FiPlus, FiPlay, FiEdit2, FiTrash2, FiShare2, FiClock, FiHelpCircle, FiList, FiCopy, FiX, FiMail, FiBarChart2 } from 'react-icons/fi'
import { FaWhatsapp } from 'react-icons/fa'
import { getShareableLink } from '../config/app'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'

const Dashboard = () => {
  const { user, userData } = useAuth()
  const [quizzes, setQuizzes] = useState([])
  const [questionnaires, setQuestionnaires] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('quizzes')
  const [deleteModal, setDeleteModal] = useState({ show: false, type: null, id: null, title: '' })
  const [shareModal, setShareModal] = useState({ show: false, type: null, id: null, title: '' })

  useEffect(() => {
    fetchData()
  }, [user])

  const fetchData = async () => {
    try {
      const [quizzesData, questionnairesData] = await Promise.all([
        getQuizzesByUser(user.uid),
        getQuestionnairesByUser(user.uid)
      ])
      setQuizzes(quizzesData)
      setQuestionnaires(questionnairesData)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    try {
      if (deleteModal.type === 'quiz') {
        await deleteQuiz(deleteModal.id)
        setQuizzes(quizzes.filter(q => q.id !== deleteModal.id))
      } else {
        await deleteQuestionnaire(deleteModal.id)
        setQuestionnaires(questionnaires.filter(q => q.id !== deleteModal.id))
      }
      toast.success('Supprimé avec succès')
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Erreur lors de la suppression')
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
        toast.success('Lien copié !')
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
          toast.success('Lien copié !')
        } else {
          toast.error('Impossible de copier le lien')
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
        toast.success('Lien copié !')
      } catch (e) {
        toast.error('Impossible de copier. Lien: ' + link)
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
    const message = type === 'quiz' 
      ? `🎯 Venez jouer à mon quiz "${title}" !\n\n${link}`
      : `📋 Répondez à mon questionnaire "${title}" !\n\n${link}`
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
    setShareModal({ show: false, type: null, id: null, title: '' })
  }

  const shareViaEmail = (type, id, title) => {
    const link = getShareLink(type, id)
    const subject = type === 'quiz' 
      ? `Invitation à jouer au quiz : ${title}`
      : `Invitation à répondre au questionnaire : ${title}`
    const body = type === 'quiz'
      ? `Bonjour,\n\nJe vous invite à jouer à mon quiz "${title}" !\n\nCliquez sur le lien suivant pour commencer :\n${link}\n\nBonne chance ! 🎯`
      : `Bonjour,\n\nJe vous invite à répondre à mon questionnaire "${title}".\n\nCliquez sur le lien suivant pour participer :\n${link}\n\nMerci pour votre participation ! 📋`
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
        <LoadingSpinner text="Chargement..." />
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Bonjour, {userData?.displayName || 'Utilisateur'} 👋
        </h1>
        <p className="text-white/70">Gérez vos quiz et questionnaires</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <FiHelpCircle className="text-white text-xl" />
            </div>
            <div>
              <p className="text-white/70 text-sm">Quiz créés</p>
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
              <p className="text-white/70 text-sm">Questionnaires</p>
              <p className="text-2xl font-bold text-white">{questionnaires.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
              <FiPlay className="text-white text-xl" />
            </div>
            <div>
              <p className="text-white/70 text-sm">Total contenus</p>
              <p className="text-2xl font-bold text-white">{quizzes.length + questionnaires.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4 mb-8">
        <Link to="/quiz/create" className="btn btn-primary flex items-center gap-2">
          <FiPlus />
          Créer un Quiz
        </Link>
        <Link to="/questionnaire/create" className="btn btn-secondary flex items-center gap-2">
          <FiPlus />
          Créer un Questionnaire
        </Link>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('quizzes')}
            className={`flex-1 px-6 py-4 font-medium transition-colors ${
              activeTab === 'quizzes'
                ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FiHelpCircle className="inline mr-2" />
            Mes Quiz ({quizzes.length})
          </button>
          <button
            onClick={() => setActiveTab('questionnaires')}
            className={`flex-1 px-6 py-4 font-medium transition-colors ${
              activeTab === 'questionnaires'
                ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FiList className="inline mr-2" />
            Mes Questionnaires ({questionnaires.length})
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'quizzes' ? (
            quizzes.length === 0 ? (
              <div className="text-center py-12">
                <FiHelpCircle className="text-6xl text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">Vous n'avez pas encore créé de quiz</p>
                <Link to="/quiz/create" className="btn btn-primary inline-flex items-center gap-2">
                  <FiPlus />
                  Créer mon premier quiz
                </Link>
              </div>
            ) : (
              <div className="grid gap-4">
                {quizzes.map((quiz) => (
                  <div key={quiz.id} className="border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-shadow">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-800">{quiz.title}</h3>
                        <p className="text-gray-500 text-sm mt-1">{quiz.description || 'Aucune description'}</p>
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
                            {quiz.isPublic ? 'Public' : 'Privé'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/quiz/${quiz.id}/responses`}
                          className="p-2 rounded-lg text-orange-500 hover:bg-orange-50 transition-colors"
                          title="Voir les réponses"
                        >
                          <FiBarChart2 />
                        </Link>
                        <button
                          onClick={() => openShareModal('quiz', quiz.id, quiz.title)}
                          className="p-2 rounded-lg text-purple-500 hover:bg-purple-50 transition-colors"
                          title="Partager"
                        >
                          <FiShare2 />
                        </button>
                        <Link
                          to={`/play/quiz/${quiz.id}`}
                          className="p-2 rounded-lg text-green-500 hover:bg-green-50 transition-colors"
                          title="Jouer"
                        >
                          <FiPlay />
                        </Link>
                        <Link
                          to={`/quiz/edit/${quiz.id}`}
                          className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
                          title="Modifier"
                        >
                          <FiEdit2 />
                        </Link>
                        <button
                          onClick={() => setDeleteModal({ show: true, type: 'quiz', id: quiz.id, title: quiz.title })}
                          className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                          title="Supprimer"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            questionnaires.length === 0 ? (
              <div className="text-center py-12">
                <FiList className="text-6xl text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">Vous n'avez pas encore créé de questionnaire</p>
                <Link to="/questionnaire/create" className="btn btn-secondary inline-flex items-center gap-2">
                  <FiPlus />
                  Créer mon premier questionnaire
                </Link>
              </div>
            ) : (
              <div className="grid gap-4">
                {questionnaires.map((questionnaire) => (
                  <div key={questionnaire.id} className="border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-shadow">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-800">{questionnaire.title}</h3>
                        <p className="text-gray-500 text-sm mt-1">{questionnaire.description || 'Aucune description'}</p>
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
                        <Link
                          to={`/questionnaire/${questionnaire.id}/responses`}
                          className="p-2 rounded-lg text-orange-500 hover:bg-orange-50 transition-colors"
                          title="Voir les réponses"
                        >
                          <FiBarChart2 />
                        </Link>
                        <button
                          onClick={() => openShareModal('questionnaire', questionnaire.id, questionnaire.title)}
                          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                          title="Partager"
                        >
                          <FiShare2 />
                        </button>
                        <Link
                          to={`/play/questionnaire/${questionnaire.id}`}
                          className="p-2 rounded-lg text-green-500 hover:bg-green-50 transition-colors"
                          title="Répondre"
                        >
                          <FiPlay />
                        </Link>
                        <Link
                          to={`/questionnaire/edit/${questionnaire.id}`}
                          className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
                          title="Modifier"
                        >
                          <FiEdit2 />
                        </Link>
                        <button
                          onClick={() => setDeleteModal({ show: true, type: 'questionnaire', id: questionnaire.id, title: questionnaire.title })}
                          className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                          title="Supprimer"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
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
              <h3 className="text-xl font-bold text-gray-800">Partager</h3>
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
                Partager sur WhatsApp
              </button>
              <button
                onClick={() => shareViaEmail(shareModal.type, shareModal.id, shareModal.title)}
                className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-colors font-medium"
              >
                <FiMail className="text-xl" />
                Envoyer par Email
              </button>
              <button
                onClick={() => {
                  copyShareLink(shareModal.type, shareModal.id)
                  setShareModal({ show: false, type: null, id: null, title: '' })
                }}
                className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors font-medium"
              >
                <FiCopy className="text-xl" />
                Copier le lien
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full animate-scale-in">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Confirmer la suppression</h3>
            <p className="text-gray-600 mb-6">
              Êtes-vous sûr de vouloir supprimer "{deleteModal.title}" ? Cette action est irréversible.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal({ show: false, type: null, id: null, title: '' })}
                className="flex-1 btn btn-ghost"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 btn btn-danger"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
