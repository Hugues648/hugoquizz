import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getQuizById, updateQuiz } from '../services/firestore'
import { 
  FiPlus, FiTrash2, FiSave, FiArrowLeft, FiChevronDown, FiChevronUp,
  FiCopy, FiCheck, FiClock, FiStar
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'

// Types de questions disponibles pour le quiz
const QUESTION_TYPES = {
  SINGLE_CHOICE: 'single_choice',
  MULTIPLE_CHOICE: 'multiple_choice',
  TRUE_FALSE: 'true_false',
  DROPDOWN: 'dropdown',
  SHORT_TEXT: 'short_text',
  NUMBER: 'number',
  RATING: 'rating'
}

// Configuration des types de questions
const QUESTION_TYPE_CONFIG = {
  [QUESTION_TYPES.SINGLE_CHOICE]: { 
    label: 'Choix unique', 
    icon: '🎯', 
    color: 'purple',
    hasOptions: true,
    description: 'Une seule bonne réponse parmi les options'
  },
  [QUESTION_TYPES.MULTIPLE_CHOICE]: { 
    label: 'Cases à cocher', 
    icon: '☑️', 
    color: 'green',
    hasOptions: true,
    description: 'Plusieurs bonnes réponses possibles'
  },
  [QUESTION_TYPES.TRUE_FALSE]: { 
    label: 'Vrai / Faux', 
    icon: '✓✗', 
    color: 'blue',
    description: 'Question vrai ou faux'
  },
  [QUESTION_TYPES.DROPDOWN]: { 
    label: 'Liste déroulante', 
    icon: '📋', 
    color: 'cyan',
    hasOptions: true,
    description: 'Sélection dans une liste déroulante'
  },
  [QUESTION_TYPES.SHORT_TEXT]: { 
    label: 'Texte court', 
    icon: '📝', 
    color: 'gray',
    description: 'Réponse textuelle à saisir'
  },
  [QUESTION_TYPES.NUMBER]: { 
    label: 'Nombre', 
    icon: '🔢', 
    color: 'indigo',
    description: 'Réponse numérique exacte'
  },
  [QUESTION_TYPES.RATING]: { 
    label: 'Évaluation (1-5)', 
    icon: '⭐', 
    color: 'yellow',
    description: 'Note de 1 à 5 étoiles'
  }
}

const OPTION_COLORS = ['red', 'blue', 'yellow', 'green', 'purple', 'orange']

const EditQuiz = () => {
  const { quizId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [expandedQuestion, setExpandedQuestion] = useState(null)

  const [quizData, setQuizData] = useState({
    title: '',
    description: '',
    isPublic: true,
    timePerQuestion: 30,
    showCorrectAnswer: true,
    randomizeQuestions: false
  })

  const [questions, setQuestions] = useState([])

  useEffect(() => {
    fetchQuiz()
  }, [quizId])

  const fetchQuiz = async () => {
    try {
      const data = await getQuizById(quizId)
      if (!data) {
        toast.error('Quiz introuvable')
        navigate('/dashboard')
        return
      }

      if (data.userId !== user.uid) {
        toast.error('Non autorisé')
        navigate('/dashboard')
        return
      }

      setQuizData({
        title: data.title || '',
        description: data.description || '',
        isPublic: data.isPublic ?? true,
        timePerQuestion: data.timePerQuestion || 30,
        showCorrectAnswer: data.showCorrectAnswer ?? true,
        randomizeQuestions: data.randomizeQuestions ?? false
      })

      if (data.questions?.length > 0) {
        setQuestions(data.questions.map((q, i) => ({
          ...q,
          id: q.id || i + 1,
          type: q.type || QUESTION_TYPES.SINGLE_CHOICE,
          options: q.options || [],
          correctAnswer: q.correctAnswer || '',
          correctRating: q.correctRating || 3,
          timeLimit: q.timeLimit || data.timePerQuestion || 30,
          points: q.points || 100
        })))
        setExpandedQuestion(data.questions[0]?.id || 1)
      }
    } catch (error) {
      console.error('Fetch error:', error)
      toast.error('Erreur de chargement')
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  // Générer un ID unique
  const generateId = () => Math.max(...questions.map(q => q.id), 0) + 1
  const generateOptionId = (options) => Math.max(...options.map(o => o.id), 0) + 1

  // Ajouter une question
  const addQuestion = () => {
    const newId = generateId()
    const newQuestion = {
      id: newId,
      text: '',
      type: QUESTION_TYPES.SINGLE_CHOICE,
      options: [
        { id: 1, text: '', isCorrect: true },
        { id: 2, text: '', isCorrect: false },
        { id: 3, text: '', isCorrect: false },
        { id: 4, text: '', isCorrect: false }
      ],
      correctAnswer: '',
      correctRating: 3,
      timeLimit: quizData.timePerQuestion,
      points: 100
    }
    setQuestions([...questions, newQuestion])
    setExpandedQuestion(newId)
  }

  // Dupliquer une question
  const duplicateQuestion = (questionId) => {
    const original = questions.find(q => q.id === questionId)
    if (!original) return

    const newId = generateId()
    const duplicated = {
      ...original,
      id: newId,
      text: `${original.text} (copie)`,
      options: original.options.map((opt, i) => ({ ...opt, id: i + 1 }))
    }

    const originalIndex = questions.findIndex(q => q.id === questionId)
    const newQuestions = [...questions]
    newQuestions.splice(originalIndex + 1, 0, duplicated)
    setQuestions(newQuestions)
    setExpandedQuestion(newId)
    toast.success('Question dupliquée')
  }

  // Supprimer une question
  const removeQuestion = (questionId) => {
    if (questions.length <= 1) {
      toast.error('Le quiz doit avoir au moins une question')
      return
    }
    setQuestions(questions.filter(q => q.id !== questionId))
    if (expandedQuestion === questionId) {
      setExpandedQuestion(questions[0]?.id)
    }
  }

  // Mettre à jour une question
  const updateQuestion = (questionId, field, value) => {
    setQuestions(questions.map(q => {
      if (q.id !== questionId) return q

      const updated = { ...q, [field]: value }

      if (field === 'type') {
        if (value === QUESTION_TYPES.TRUE_FALSE) {
          updated.options = [
            { id: 1, text: 'Vrai', isCorrect: true },
            { id: 2, text: 'Faux', isCorrect: false }
          ]
        } else if (QUESTION_TYPE_CONFIG[value]?.hasOptions && !QUESTION_TYPE_CONFIG[q.type]?.hasOptions) {
          updated.options = [
            { id: 1, text: '', isCorrect: true },
            { id: 2, text: '', isCorrect: false },
            { id: 3, text: '', isCorrect: false },
            { id: 4, text: '', isCorrect: false }
          ]
        }
      }

      return updated
    }))
  }

  // Gérer les options
  const addOption = (questionId) => {
    setQuestions(questions.map(q => {
      if (q.id !== questionId) return q
      if (q.options.length >= 6) {
        toast.error('Maximum 6 options')
        return q
      }
      const newId = generateOptionId(q.options)
      return { 
        ...q, 
        options: [...q.options, { id: newId, text: '', isCorrect: false }] 
      }
    }))
  }

  const updateOption = (questionId, optionId, field, value) => {
    setQuestions(questions.map(q => {
      if (q.id !== questionId) return q

      let newOptions = q.options.map(opt => {
        if (opt.id !== optionId) return opt
        return { ...opt, [field]: value }
      })

      if (field === 'isCorrect' && value === true && 
          (q.type === QUESTION_TYPES.SINGLE_CHOICE || q.type === QUESTION_TYPES.DROPDOWN || q.type === QUESTION_TYPES.TRUE_FALSE)) {
        newOptions = newOptions.map(opt => ({
          ...opt,
          isCorrect: opt.id === optionId
        }))
      }

      return { ...q, options: newOptions }
    }))
  }

  const removeOption = (questionId, optionId) => {
    setQuestions(questions.map(q => {
      if (q.id !== questionId) return q
      if (q.options.length <= 2) {
        toast.error('Minimum 2 options requises')
        return q
      }
      return { ...q, options: q.options.filter(opt => opt.id !== optionId) }
    }))
  }

  // Déplacer une question
  const moveQuestion = (index, direction) => {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= questions.length) return

    const newQuestions = [...questions]
    const temp = newQuestions[index]
    newQuestions[index] = newQuestions[newIndex]
    newQuestions[newIndex] = temp
    setQuestions(newQuestions)
  }

  // Validation
  const validateForm = () => {
    if (!quizData.title.trim()) {
      toast.error('Veuillez entrer un titre pour le quiz')
      return false
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.text.trim()) {
        toast.error(`Question ${i + 1}: Veuillez entrer le texte de la question`)
        setExpandedQuestion(q.id)
        return false
      }

      const config = QUESTION_TYPE_CONFIG[q.type]

      if (config.hasOptions) {
        const filledOptions = q.options.filter(opt => opt.text.trim())
        if (filledOptions.length < 2) {
          toast.error(`Question ${i + 1}: Au moins 2 options sont requises`)
          setExpandedQuestion(q.id)
          return false
        }

        const hasCorrect = q.options.some(opt => opt.isCorrect && opt.text.trim())
        if (!hasCorrect) {
          toast.error(`Question ${i + 1}: Veuillez sélectionner au moins une bonne réponse`)
          setExpandedQuestion(q.id)
          return false
        }
      }

      if (q.type === QUESTION_TYPES.SHORT_TEXT || q.type === QUESTION_TYPES.NUMBER) {
        if (!q.correctAnswer && q.correctAnswer !== 0) {
          toast.error(`Question ${i + 1}: Veuillez entrer la bonne réponse`)
          setExpandedQuestion(q.id)
          return false
        }
      }
    }

    return true
  }

  // Soumettre
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setSaving(true)

    try {
      await updateQuiz(quizId, {
        ...quizData,
        questionsCount: questions.length,
        questions: questions.map((q, index) => ({
          id: q.id,
          text: q.text,
          type: q.type,
          options: q.options.filter(opt => opt.text.trim()),
          correctAnswer: q.correctAnswer,
          correctRating: q.correctRating,
          timeLimit: q.timeLimit,
          points: q.points,
          order: index
        }))
      })

      toast.success('Quiz mis à jour !')
      navigate('/dashboard')
    } catch (error) {
      console.error('Update quiz error:', error)
      toast.error('Erreur lors de la mise à jour')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <LoadingSpinner fullScreen text="Chargement..." />
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-gray-600 hover:text-gray-800 flex items-center gap-2 mb-4"
          >
            <FiArrowLeft />
            Retour au tableau de bord
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Modifier le Quiz 🎯</h1>
          <p className="text-gray-500 mt-2">Modifiez les questions et paramètres</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Quiz Info Card */}
          <div className="card p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Informations du Quiz</h2>
            
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titre du quiz *
                </label>
                <input
                  type="text"
                  value={quizData.title}
                  onChange={(e) => setQuizData({ ...quizData, title: e.target.value })}
                  className="input"
                  placeholder="Ex: Culture générale"
                  maxLength={100}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={quizData.description}
                  onChange={(e) => setQuizData({ ...quizData, description: e.target.value })}
                  className="input resize-none"
                  rows={2}
                  placeholder="Décrivez votre quiz..."
                  maxLength={500}
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FiClock className="inline mr-1" />
                    Temps (sec)
                  </label>
                  <input
                    type="number"
                    value={quizData.timePerQuestion}
                    onChange={(e) => setQuizData({ ...quizData, timePerQuestion: parseInt(e.target.value) || 30 })}
                    className="input"
                    min={5}
                    max={120}
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={quizData.isPublic}
                    onChange={(e) => setQuizData({ ...quizData, isPublic: e.target.checked })}
                    className="w-5 h-5 rounded text-purple-600"
                  />
                  <span className="text-sm text-gray-700">Public</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={quizData.showCorrectAnswer}
                    onChange={(e) => setQuizData({ ...quizData, showCorrectAnswer: e.target.checked })}
                    className="w-5 h-5 rounded text-purple-600"
                  />
                  <span className="text-sm text-gray-700">Montrer réponses</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={quizData.randomizeQuestions}
                    onChange={(e) => setQuizData({ ...quizData, randomizeQuestions: e.target.checked })}
                    className="w-5 h-5 rounded text-purple-600"
                  />
                  <span className="text-sm text-gray-700">Mélanger</span>
                </label>
              </div>
            </div>
          </div>

          {/* Questions */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                Questions ({questions.length})
              </h2>
              <button
                type="button"
                onClick={addQuestion}
                className="btn btn-primary flex items-center gap-2"
              >
                <FiPlus />
                Ajouter
              </button>
            </div>

            <div className="space-y-4">
              {questions.map((question, index) => {
                const isExpanded = expandedQuestion === question.id
                const config = QUESTION_TYPE_CONFIG[question.type]

                return (
                  <div key={question.id} className="card overflow-hidden">
                    {/* Question Header */}
                    <div 
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                      onClick={() => setExpandedQuestion(isExpanded ? null : question.id)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold shadow">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-800 truncate">
                            {question.text || 'Question sans texte'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                              {config.icon} {config.label}
                            </span>
                            <span className="text-xs text-gray-500">
                              {question.timeLimit}s • {question.points} pts
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); moveQuestion(index, -1) }}
                          disabled={index === 0}
                          className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          <FiChevronUp />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); moveQuestion(index, 1) }}
                          disabled={index === questions.length - 1}
                          className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          <FiChevronDown />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); duplicateQuestion(question.id) }}
                          className="p-2 text-gray-400 hover:text-blue-600"
                        >
                          <FiCopy />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeQuestion(question.id) }}
                          className="p-2 text-gray-400 hover:text-red-600"
                        >
                          <FiTrash2 />
                        </button>
                        {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                      </div>
                    </div>

                    {/* Question Body */}
                    {isExpanded && (
                      <div className="p-6 border-t space-y-6 bg-gray-50">
                        {/* Question Text */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Texte de la question *
                          </label>
                          <input
                            type="text"
                            value={question.text}
                            onChange={(e) => updateQuestion(question.id, 'text', e.target.value)}
                            className="input"
                            placeholder="Entrez votre question..."
                          />
                        </div>

                        {/* Question Type */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Type de question
                          </label>
                          <select
                            value={question.type}
                            onChange={(e) => updateQuestion(question.id, 'type', e.target.value)}
                            className="input"
                          >
                            {Object.entries(QUESTION_TYPE_CONFIG).map(([type, cfg]) => (
                              <option key={type} value={type}>
                                {cfg.icon} {cfg.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Options pour les types avec options */}
                        {config.hasOptions && question.type !== QUESTION_TYPES.TRUE_FALSE && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Options de réponse
                            </label>
                            <div className="space-y-3">
                              {question.options.map((option, optIndex) => (
                                <div key={option.id} className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() => updateOption(question.id, option.id, 'isCorrect', !option.isCorrect)}
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                                      option.isCorrect
                                        ? 'bg-green-500 text-white shadow-lg scale-110'
                                        : 'bg-gray-200 text-gray-400 hover:bg-gray-300'
                                    }`}
                                  >
                                    <FiCheck size={20} />
                                  </button>
                                  <input
                                    type="text"
                                    value={option.text}
                                    onChange={(e) => updateOption(question.id, option.id, 'text', e.target.value)}
                                    className={`input flex-1 border-l-4 border-l-${OPTION_COLORS[optIndex % OPTION_COLORS.length]}-500`}
                                    placeholder={`Option ${optIndex + 1}`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeOption(question.id, option.id)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                  >
                                    <FiTrash2 />
                                  </button>
                                </div>
                              ))}
                              {question.options.length < 6 && (
                                <button
                                  type="button"
                                  onClick={() => addOption(question.id)}
                                  className="text-purple-600 text-sm font-medium hover:text-purple-700 flex items-center gap-1"
                                >
                                  <FiPlus size={14} />
                                  Ajouter une option
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Vrai / Faux */}
                        {question.type === QUESTION_TYPES.TRUE_FALSE && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Bonne réponse
                            </label>
                            <div className="flex gap-4">
                              {question.options.map((option) => (
                                <button
                                  key={option.id}
                                  type="button"
                                  onClick={() => updateOption(question.id, option.id, 'isCorrect', true)}
                                  className={`flex-1 p-4 rounded-xl border-2 font-medium transition-all ${
                                    option.isCorrect
                                      ? option.text === 'Vrai'
                                        ? 'bg-green-500 border-green-500 text-white shadow-lg'
                                        : 'bg-red-500 border-red-500 text-white shadow-lg'
                                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                  }`}
                                >
                                  {option.text === 'Vrai' ? '✓' : '✗'} {option.text}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Texte court */}
                        {question.type === QUESTION_TYPES.SHORT_TEXT && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Bonne réponse (texte exact) *
                            </label>
                            <input
                              type="text"
                              value={question.correctAnswer}
                              onChange={(e) => updateQuestion(question.id, 'correctAnswer', e.target.value)}
                              className="input"
                              placeholder="La réponse attendue..."
                            />
                          </div>
                        )}

                        {/* Nombre */}
                        {question.type === QUESTION_TYPES.NUMBER && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Bonne réponse (nombre exact) *
                            </label>
                            <input
                              type="number"
                              value={question.correctAnswer}
                              onChange={(e) => updateQuestion(question.id, 'correctAnswer', e.target.value)}
                              className="input"
                              placeholder="42"
                            />
                          </div>
                        )}

                        {/* Rating */}
                        {question.type === QUESTION_TYPES.RATING && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Bonne réponse (nombre d'étoiles)
                            </label>
                            <div className="flex gap-2">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => updateQuestion(question.id, 'correctRating', star)}
                                  className={`p-3 rounded-xl transition-all ${
                                    question.correctRating >= star
                                      ? 'text-yellow-400 scale-110'
                                      : 'text-gray-300 hover:text-yellow-300'
                                  }`}
                                >
                                  <FiStar size={28} fill={question.correctRating >= star ? 'currentColor' : 'none'} />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Timer et Points */}
                        <div className="grid grid-cols-2 gap-4 p-4 bg-white rounded-xl">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              <FiClock className="inline mr-1" />
                              Temps (secondes)
                            </label>
                            <input
                              type="number"
                              value={question.timeLimit}
                              onChange={(e) => updateQuestion(question.id, 'timeLimit', parseInt(e.target.value) || 30)}
                              className="input"
                              min={5}
                              max={120}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              🏆 Points
                            </label>
                            <input
                              type="number"
                              value={question.points}
                              onChange={(e) => updateQuestion(question.id, 'points', parseInt(e.target.value) || 100)}
                              className="input"
                              min={10}
                              max={1000}
                              step={10}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-4 justify-end">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="btn btn-ghost"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <FiSave />
                  Enregistrer
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditQuiz
