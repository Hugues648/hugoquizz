import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { createQuiz } from '../services/firestore'
import { 
  FiPlus, FiTrash2, FiSave, FiArrowLeft, FiChevronDown, FiChevronUp,
  FiCopy, FiCheck, FiX, FiList, FiAlignLeft, FiHash, FiStar, FiClock,
  FiToggleLeft, FiCheckCircle, FiImage, FiMove
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import ImageUpload from '../components/ImageUpload'

// Durées prédéfinies pour les questions (en secondes)
const QUESTION_DURATIONS = [5, 10, 20, 30, 60, 90, 120, 240]

// Types de questions disponibles pour le quiz
const QUESTION_TYPES = {
  SINGLE_CHOICE: 'single_choice',      // Choix unique (style Kahoot classique)
  MULTIPLE_CHOICE: 'multiple_choice',  // Cases à cocher (plusieurs bonnes réponses)
  TRUE_FALSE: 'true_false',            // Vrai ou Faux
  DROPDOWN: 'dropdown',                // Liste déroulante
  SHORT_TEXT: 'short_text',            // Réponse texte courte
  NUMBER: 'number',                    // Réponse numérique
  RATING: 'rating',                    // Évaluation 1-5
  PUZZLE: 'puzzle'                     // Remettre dans l'ordre
}

// Configuration des types de questions
// Configuration des types - labels et descriptions sont traduits via getQuestionTypeConfig()
const QUESTION_TYPE_CONFIG_BASE = {
  [QUESTION_TYPES.SINGLE_CHOICE]: { 
    labelKey: 'quiz.questionTypes.singleChoice', 
    icon: '🎯', 
    color: 'purple',
    hasOptions: true,
    descriptionKey: 'quiz.questionTypes.singleChoiceDesc'
  },
  [QUESTION_TYPES.MULTIPLE_CHOICE]: { 
    labelKey: 'quiz.questionTypes.multipleChoice', 
    icon: '☑️', 
    color: 'green',
    hasOptions: true,
    descriptionKey: 'quiz.questionTypes.multipleChoiceDesc'
  },
  [QUESTION_TYPES.TRUE_FALSE]: { 
    labelKey: 'quiz.questionTypes.trueFalse', 
    icon: '✓✗', 
    color: 'blue',
    descriptionKey: 'quiz.questionTypes.trueFalseDesc'
  },
  [QUESTION_TYPES.DROPDOWN]: { 
    labelKey: 'quiz.questionTypes.dropdown', 
    icon: '📋', 
    color: 'cyan',
    hasOptions: true,
    descriptionKey: 'quiz.questionTypes.dropdownDesc'
  },
  [QUESTION_TYPES.SHORT_TEXT]: { 
    labelKey: 'quiz.questionTypes.shortText', 
    icon: '📝', 
    color: 'gray',
    descriptionKey: 'quiz.questionTypes.shortTextDesc'
  },
  [QUESTION_TYPES.NUMBER]: { 
    labelKey: 'quiz.questionTypes.number', 
    icon: '🔢', 
    color: 'indigo',
    descriptionKey: 'quiz.questionTypes.numberDesc'
  },
  [QUESTION_TYPES.RATING]: { 
    labelKey: 'quiz.questionTypes.rating', 
    icon: '⭐', 
    color: 'yellow',
    descriptionKey: 'quiz.questionTypes.ratingDesc'
  },
  [QUESTION_TYPES.PUZZLE]: { 
    labelKey: 'quiz.questionTypes.puzzle', 
    icon: '🧩', 
    color: 'orange',
    hasOptions: true,
    descriptionKey: 'quiz.questionTypes.puzzleDesc'
  }
}

// Couleurs des options style Kahoot
const OPTION_COLORS = ['red', 'blue', 'yellow', 'green', 'purple', 'orange']

const CreateQuiz = () => {
  const { t } = useTranslation()
  const { user, userData } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [expandedQuestion, setExpandedQuestion] = useState(1)

  // Helper function to get translated question type config
  const getQuestionTypeConfig = (type) => {
    const base = QUESTION_TYPE_CONFIG_BASE[type]
    if (!base) return null
    return {
      ...base,
      label: t(base.labelKey),
      description: t(base.descriptionKey)
    }
  }

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
      imageUrl: '',  // Image de la question
      options: [
        { id: 1, text: '', isCorrect: true },
        { id: 2, text: '', isCorrect: false },
        { id: 3, text: '', isCorrect: false },
        { id: 4, text: '', isCorrect: false }
      ],
      correctAnswer: '',  // Pour texte, nombre
      correctRating: 3,   // Pour évaluation
      puzzleOrder: [],    // Ordre correct pour puzzle (array d'IDs)
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
      imageUrl: '',
      options: [
        { id: 1, text: '', isCorrect: true },
        { id: 2, text: '', isCorrect: false },
        { id: 3, text: '', isCorrect: false },
        { id: 4, text: '', isCorrect: false }
      ],
      correctAnswer: '',
      correctRating: 3,
      puzzleOrder: [],
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
      text: `${original.text} (${t('quiz.create.copy')})`,
      options: original.options.map((opt, i) => ({ ...opt, id: i + 1 }))
    }

    const originalIndex = questions.findIndex(q => q.id === questionId)
    const newQuestions = [...questions]
    newQuestions.splice(originalIndex + 1, 0, duplicated)
    setQuestions(newQuestions)
    setExpandedQuestion(newId)
    toast.success(t('quiz.create.questionDuplicated'))
  }

  // Supprimer une question
  const removeQuestion = (questionId) => {
    if (questions.length <= 1) {
      toast.error(t('quiz.create.minQuestions'))
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
            { id: 1, text: t('common.true'), isCorrect: true },
            { id: 2, text: t('common.false'), isCorrect: false }
          ]
          updated.puzzleOrder = []
        } else if (value === QUESTION_TYPES.PUZZLE) {
          // Pour puzzle, on initialise avec des options vides
          updated.options = [
            { id: 1, text: '', isCorrect: false },
            { id: 2, text: '', isCorrect: false },
            { id: 3, text: '', isCorrect: false },
            { id: 4, text: '', isCorrect: false }
          ]
          updated.puzzleOrder = [1, 2, 3, 4] // L'ordre correct est l'ordre initial
        } else if (QUESTION_TYPE_CONFIG_BASE[value]?.hasOptions && !QUESTION_TYPE_CONFIG_BASE[q.type]?.hasOptions) {
          updated.options = [
            { id: 1, text: '', isCorrect: true },
            { id: 2, text: '', isCorrect: false },
            { id: 3, text: '', isCorrect: false },
            { id: 4, text: '', isCorrect: false }
          ]
          updated.puzzleOrder = []
        }
      }

      return updated
    }))
  }

  // Déplacer un élément puzzle vers le haut ou le bas
  const movePuzzleOption = (questionId, optionIndex, direction) => {
    setQuestions(questions.map(q => {
      if (q.id !== questionId) return q
      
      const newIndex = optionIndex + direction
      if (newIndex < 0 || newIndex >= q.options.length) return q
      
      const newOptions = [...q.options]
      const temp = newOptions[optionIndex]
      newOptions[optionIndex] = newOptions[newIndex]
      newOptions[newIndex] = temp
      
      // Mettre à jour puzzleOrder avec le nouvel ordre
      const newPuzzleOrder = newOptions.map(opt => opt.id)
      
      return { ...q, options: newOptions, puzzleOrder: newPuzzleOrder }
    }))
  }

  // Gérer les options
  const addOption = (questionId) => {
    setQuestions(questions.map(q => {
      if (q.id !== questionId) return q
      if (q.options.length >= 6) {
        toast.error(t('quiz.create.maxOptions'))
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
        toast.error(t('quiz.create.minAnswers'))
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
      toast.error(t('quiz.create.enterTitle'))
      return false
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.text.trim()) {
        toast.error(t('quiz.create.enterQuestionText', { number: i + 1 }))
        setExpandedQuestion(q.id)
        return false
      }

      const config = getQuestionTypeConfig(q.type)
      if (!config) {
        console.error('Unknown question type:', q.type)
        toast.error(t('quiz.create.saveError'))
        return false
      }

      // Validation selon le type
      if (config.hasOptions) {
        const filledOptions = q.options.filter(opt => opt.text.trim())
        if (filledOptions.length < 2) {
          toast.error(t('quiz.create.minOptionsRequired', { number: i + 1 }))
          setExpandedQuestion(q.id)
          return false
        }

        // Pour les types avec bonne réponse (pas PUZZLE)
        if (q.type !== QUESTION_TYPES.PUZZLE) {
          const hasCorrect = q.options.some(opt => opt.isCorrect && opt.text.trim())
          if (!hasCorrect) {
            toast.error(t('quiz.create.selectCorrectAnswer', { number: i + 1 }))
            setExpandedQuestion(q.id)
            return false
          }
        }
      }

      if (q.type === QUESTION_TYPES.SHORT_TEXT || q.type === QUESTION_TYPES.NUMBER) {
        if (!q.correctAnswer && q.correctAnswer !== 0) {
          toast.error(t('quiz.create.enterCorrectAnswer', { number: i + 1 }))
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
    
    setLoading(true)

    try {
      if (!validateForm()) {
        setLoading(false)
        return
      }

      await createQuiz({
        ...quizData,
        userId: user.uid,
        userName: userData?.displayName || userData?.email || '',
        questionsCount: questions.length,
        questions: questions.map((q, index) => ({
          id: q.id,
          text: q.text,
          type: q.type,
          imageUrl: q.imageUrl || '',
          options: q.options.filter(opt => opt.text.trim()).map(opt => ({
            id: opt.id,
            text: opt.text,
            isCorrect: opt.isCorrect || false
          })),
          correctAnswer: q.correctAnswer || '',
          correctRating: q.correctRating || 3,
          puzzleOrder: q.type === QUESTION_TYPES.PUZZLE ? q.options.filter(opt => opt.text.trim()).map(opt => opt.id) : [],
          timeLimit: q.timeLimit || 30,
          points: q.points || 100,
          order: index
        }))
      })

      toast.success(t('quiz.create.saveSuccess'))
      navigate('/dashboard')
    } catch (error) {
      console.error('Create quiz error:', error)
      console.error('Error details:', error.code, error.message)
      toast.error(t('quiz.create.saveError'))
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
          <h1 className="text-3xl font-bold text-white">{t('quiz.create.title')} 🎯</h1>
          <p className="text-white/70">{t('quiz.create.subtitle')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Quiz Info Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">{t('quiz.create.quizInfo')}</h2>
          
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('quiz.create.quizTitle')} *
              </label>
              <input
                type="text"
                value={quizData.title}
                onChange={(e) => setQuizData({ ...quizData, title: e.target.value })}
                className="input"
                placeholder={t('quiz.create.quizTitlePlaceholder')}
                maxLength={100}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('quiz.create.quizDescription')}
              </label>
              <textarea
                value={quizData.description}
                onChange={(e) => setQuizData({ ...quizData, description: e.target.value })}
                className="input resize-none"
                rows={2}
                placeholder={t('quiz.create.quizDescriptionPlaceholder')}
                maxLength={500}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FiClock className="inline mr-1" />
                  {t('quiz.create.timeSec')}
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
                <span className="text-sm text-gray-700">{t('quiz.create.isPublic')}</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer col-span-1">
                <input
                  type="checkbox"
                  checked={quizData.showCorrectAnswer}
                  onChange={(e) => setQuizData({ ...quizData, showCorrectAnswer: e.target.checked })}
                  className="w-5 h-5 rounded text-purple-600"
                />
                <span className="text-sm text-gray-700">{t('quiz.create.showAnswers')}</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer col-span-1">
                <input
                  type="checkbox"
                  checked={quizData.randomizeQuestions}
                  onChange={(e) => setQuizData({ ...quizData, randomizeQuestions: e.target.checked })}
                  className="w-5 h-5 rounded text-purple-600"
                />
                <span className="text-sm text-gray-700">{t('quiz.create.shuffle')}</span>
              </label>
            </div>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-4 mb-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">
              {t('quiz.questions')} ({questions.length})
            </h2>
            <button
              type="button"
              onClick={addQuestion}
              className="btn btn-primary flex items-center gap-2"
            >
              <FiPlus />
              {t('common.add')}
            </button>
          </div>

          {questions.map((question, index) => {
            const isExpanded = expandedQuestion === question.id
            const config = getQuestionTypeConfig(question.type)

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
                        {question.text || t('quiz.create.newQuestion')}
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
                        {t('quiz.create.questionText')} *
                      </label>
                      <input
                        type="text"
                        value={question.text}
                        onChange={(e) => updateQuestion(question.id, 'text', e.target.value)}
                        className="input"
                        placeholder={t('quiz.create.questionTextPlaceholder')}
                      />
                    </div>

                    {/* Image de la question */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <FiImage className="inline mr-1" />
                        {t('quiz.create.questionImage')}
                      </label>
                      {question.imageUrl ? (
                        <div className="relative inline-block">
                          <img 
                            src={question.imageUrl} 
                            alt="Question" 
                            className="max-h-48 rounded-xl shadow-lg"
                          />
                          <button
                            type="button"
                            onClick={() => updateQuestion(question.id, 'imageUrl', '')}
                            className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600"
                          >
                            <FiX size={16} />
                          </button>
                        </div>
                      ) : (
                        <ImageUpload
                          value={question.imageUrl}
                          onChange={(url) => updateQuestion(question.id, 'imageUrl', url)}
                          folder={`quizzes/${user.uid}/questions`}
                        />
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        💡 {t('quiz.create.imageHint')}
                      </p>
                    </div>

                    {/* Question Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('quiz.create.questionType')}
                      </label>
                      <select
                        value={question.type}
                        onChange={(e) => updateQuestion(question.id, 'type', e.target.value)}
                        className="input"
                      >
                        {Object.entries(QUESTION_TYPE_CONFIG_BASE).map(([type, cfg]) => (
                          <option key={type} value={type}>
                            {cfg.icon} {t(cfg.labelKey)} - {t(cfg.descriptionKey)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Options pour les types avec options (sauf PUZZLE et TRUE_FALSE) */}
                    {config.hasOptions && question.type !== QUESTION_TYPES.TRUE_FALSE && question.type !== QUESTION_TYPES.PUZZLE && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('quiz.create.answerOptions')}
                          {question.type === QUESTION_TYPES.MULTIPLE_CHOICE && (
                            <span className="text-gray-400 font-normal ml-2">({t('quiz.create.checkCorrectAnswers')})</span>
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
                                title={option.isCorrect ? t('quiz.correctAnswer') : t('quiz.create.markCorrect')}
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
                              {t('quiz.create.addAnswer')}
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Vrai / Faux */}
                    {question.type === QUESTION_TYPES.TRUE_FALSE && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('quiz.correctAnswer')}
                        </label>
                        <div className="flex gap-4">
                          {question.options.map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => updateOption(question.id, option.id, 'isCorrect', true)}
                              className={`flex-1 p-4 rounded-xl border-2 font-medium transition-all ${
                                option.isCorrect
                                  ? option.text === t('common.true')
                                    ? 'bg-green-500 border-green-500 text-white shadow-lg'
                                    : 'bg-red-500 border-red-500 text-white shadow-lg'
                                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
                              }`}
                            >
                              {option.text === t('common.true') ? '✓' : '✗'} {option.text}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* PUZZLE - Remettre dans l'ordre */}
                    {question.type === QUESTION_TYPES.PUZZLE && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          🧩 {t('quiz.create.elementsToOrder')}
                          <span className="text-gray-400 font-normal ml-2">({t('quiz.create.orderHint')})</span>
                        </label>
                        <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg mb-4">
                          💡 <strong>{t('quiz.create.important')}:</strong> {t('quiz.create.puzzleInstructions')}
                        </p>
                        <div className="space-y-3">
                          {question.options.map((option, optIndex) => (
                            <div key={option.id} className="flex items-center gap-3 bg-white p-3 rounded-xl border-2 border-orange-200 shadow-sm">
                              <span className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-500 text-white rounded-lg flex items-center justify-center font-bold text-sm">
                                {optIndex + 1}
                              </span>
                              <input
                                type="text"
                                value={option.text}
                                onChange={(e) => updateOption(question.id, option.id, 'text', e.target.value)}
                                className="input flex-1"
                                placeholder={`${t('quiz.create.step')} ${optIndex + 1}...`}
                              />
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => movePuzzleOption(question.id, optIndex, -1)}
                                  disabled={optIndex === 0}
                                  className="p-2 text-gray-400 hover:text-orange-600 disabled:opacity-30"
                                  title={t('quiz.create.moveUp')}
                                >
                                  <FiChevronUp size={18} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => movePuzzleOption(question.id, optIndex, 1)}
                                  disabled={optIndex === question.options.length - 1}
                                  className="p-2 text-gray-400 hover:text-orange-600 disabled:opacity-30"
                                  title={t('quiz.create.moveDown')}
                                >
                                  <FiChevronDown size={18} />
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeOption(question.id, option.id)}
                                disabled={question.options.length <= 2}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-30"
                              >
                                <FiTrash2 />
                              </button>
                            </div>
                          ))}
                          {question.options.length < 8 && (
                            <button
                              type="button"
                              onClick={() => addOption(question.id)}
                              className="text-orange-600 text-sm font-medium hover:text-orange-700 flex items-center gap-1"
                            >
                              <FiPlus size={14} />
                              {t('quiz.create.addElement')}
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Texte court - Bonnes réponses multiples */}
                    {question.type === QUESTION_TYPES.SHORT_TEXT && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('quiz.create.acceptedAnswers')} *
                        </label>
                        <textarea
                          value={question.correctAnswer}
                          onChange={(e) => updateQuestion(question.id, 'correctAnswer', e.target.value)}
                          className="input min-h-[80px]"
                          placeholder={t('quiz.create.acceptedAnswersPlaceholder')}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          💡 {t('quiz.create.acceptedAnswersHint')}
                        </p>
                        {question.correctAnswer && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {question.correctAnswer.split(',').map((ans, idx) => (
                              <span key={idx} className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                                ✓ {ans.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Nombre - Bonne réponse */}
                    {question.type === QUESTION_TYPES.NUMBER && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('quiz.create.correctAnswerNumber')} *
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
                          {t('quiz.create.correctAnswerStars')}
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
                          {t('quiz.create.questionDuration')}
                        </label>
                        <select
                          value={question.timeLimit}
                          onChange={(e) => updateQuestion(question.id, 'timeLimit', parseInt(e.target.value))}
                          className="input"
                        >
                          {QUESTION_DURATIONS.map(duration => (
                            <option key={duration} value={duration}>
                              {duration} {t('time.seconds')}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          🏆 {t('quiz.points')}
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
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-success flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {t('quiz.create.saving')}
              </>
            ) : (
              <>
                <FiSave />
                {t('quiz.create.saveQuiz')}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CreateQuiz
