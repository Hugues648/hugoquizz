import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { createQuiz } from '../services/firestore'
import { 
  FiPlus, FiTrash2, FiSave, FiArrowLeft, FiChevronDown, FiChevronUp,
  FiCopy, FiCheck, FiX, FiList, FiAlignLeft, FiHash, FiStar, FiClock,
  FiToggleLeft, FiCheckCircle
} from 'react-icons/fi'
import toast from 'react-hot-toast'

// Types de questions disponibles pour le quiz
const QUESTION_TYPES = {
  SINGLE_CHOICE: 'single_choice',      // Choix unique (style Kahoot classique)
  MULTIPLE_CHOICE: 'multiple_choice',  // Cases à cocher (plusieurs bonnes réponses)
  TRUE_FALSE: 'true_false',            // Vrai ou Faux
  DROPDOWN: 'dropdown',                // Liste déroulante
  SHORT_TEXT: 'short_text',            // Réponse texte courte
  NUMBER: 'number',                    // Réponse numérique
  RATING: 'rating'                     // Évaluation 1-5
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

// Couleurs des options style Kahoot
const OPTION_COLORS = ['red', 'blue', 'yellow', 'green', 'purple', 'orange']

const CreateQuiz = () => {
  const { user, userData } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [expandedQuestion, setExpandedQuestion] = useState(1)

  const [quizData, setQuizData] = useState({
    title: '',
    description: '',
    isPublic: true,
    timePerQuestion: 30,
    showCorrectAnswer: true,
    randomizeQuestions: false
  })

  const [questions, setQuestions] = useState([
    {
      id: 1,
      text: '',
      type: QUESTION_TYPES.SINGLE_CHOICE,
      options: [
        { id: 1, text: '', isCorrect: true },
        { id: 2, text: '', isCorrect: false },
        { id: 3, text: '', isCorrect: false },
        { id: 4, text: '', isCorrect: false }
      ],
      correctAnswer: '',  // Pour texte, nombre
      correctRating: 3,   // Pour évaluation
      timeLimit: 30,
      points: 100
    }
  ])

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

      // Si on change le type, réinitialiser les options
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

      // Pour choix unique et dropdown : une seule bonne réponse
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

      // Validation selon le type
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

    setLoading(true)

    try {
      await createQuiz({
        ...quizData,
        userId: user.uid,
        userName: userData.displayName,
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

      toast.success('Quiz créé avec succès !')
      navigate('/dashboard')
    } catch (error) {
      console.error('Create quiz error:', error)
      toast.error('Erreur lors de la création du quiz')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <FiArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-white">Créer un Quiz 🎯</h1>
          <p className="text-white/70">Avec différents types de questions et timer</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Quiz Info Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Informations du Quiz</h2>
          
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
                placeholder="Ex: Culture générale - Niveau Facile"
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

              <label className="flex items-center gap-2 cursor-pointer col-span-1">
                <input
                  type="checkbox"
                  checked={quizData.isPublic}
                  onChange={(e) => setQuizData({ ...quizData, isPublic: e.target.checked })}
                  className="w-5 h-5 rounded text-purple-600"
                />
                <span className="text-sm text-gray-700">Public</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer col-span-1">
                <input
                  type="checkbox"
                  checked={quizData.showCorrectAnswer}
                  onChange={(e) => setQuizData({ ...quizData, showCorrectAnswer: e.target.checked })}
                  className="w-5 h-5 rounded text-purple-600"
                />
                <span className="text-sm text-gray-700">Montrer réponses</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer col-span-1">
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
        <div className="space-y-4 mb-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">
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

          {questions.map((question, index) => {
            const isExpanded = expandedQuestion === question.id
            const config = QUESTION_TYPE_CONFIG[question.type]

            return (
              <div 
                key={question.id} 
                className="bg-white rounded-2xl shadow-xl overflow-hidden"
              >
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
                        {question.text || 'Nouvelle question'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                          {config.icon} {config.label}
                        </span>
                        <span className="text-xs text-gray-500">
                          <FiClock className="inline mr-1" size={10} />
                          {question.timeLimit}s
                        </span>
                        <span className="text-xs text-gray-500">
                          {question.points} pts
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
                            {cfg.icon} {cfg.label} - {cfg.description}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Options pour les types avec options */}
                    {config.hasOptions && question.type !== QUESTION_TYPES.TRUE_FALSE && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Options de réponse
                          {question.type === QUESTION_TYPES.MULTIPLE_CHOICE && (
                            <span className="text-gray-400 font-normal ml-2">(cochez les bonnes réponses)</span>
                          )}
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
                                title={option.isCorrect ? 'Bonne réponse' : 'Marquer comme bonne réponse'}
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

                    {/* Texte court - Bonne réponse */}
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
                        <p className="text-xs text-gray-500 mt-1">
                          La réponse de l'utilisateur sera comparée (insensible à la casse)
                        </p>
                      </div>
                    )}

                    {/* Nombre - Bonne réponse */}
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

                    {/* Rating - Bonne réponse */}
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

        {/* Submit */}
        <div className="flex gap-4 justify-end">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="btn btn-ghost bg-white/10 text-white hover:bg-white/20"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-success flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Création...
              </>
            ) : (
              <>
                <FiSave />
                Créer le Quiz
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CreateQuiz
