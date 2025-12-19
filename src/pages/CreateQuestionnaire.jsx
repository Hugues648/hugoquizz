import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { createQuestionnaire } from '../services/firestore'
import { 
  FiPlus, 
  FiTrash2, 
  FiSave, 
  FiArrowLeft, 
  FiChevronDown, 
  FiChevronUp,
  FiCopy,
  FiLink,
  FiLink2,
  FiAlertCircle,
  FiHelpCircle,
  FiList,
  FiChevronRight
} from 'react-icons/fi'
import toast from 'react-hot-toast'

// Types de questions disponibles
const QUESTION_TYPES = {
  YES_NO: 'yes_no',
  TRUE_FALSE: 'true_false',
  SINGLE_CHOICE: 'single_choice',
  MULTIPLE_CHOICE: 'multiple_choice',
  DROPDOWN: 'dropdown',
  SHORT_TEXT: 'short_text',
  LONG_TEXT: 'long_text',
  NUMBER: 'number',
  EMAIL: 'email',
  DATE: 'date',
  RATING: 'rating'
}

// Labels et icônes pour chaque type
const QUESTION_TYPE_INFO = {
  [QUESTION_TYPES.YES_NO]: { label: 'Oui / Non', icon: '👍', description: 'Question binaire Oui ou Non' },
  [QUESTION_TYPES.TRUE_FALSE]: { label: 'Vrai / Faux', icon: '✓✗', description: 'Question binaire Vrai ou Faux' },
  [QUESTION_TYPES.SINGLE_CHOICE]: { label: 'Choix unique (Radio)', icon: '⭕', description: 'Une seule réponse possible' },
  [QUESTION_TYPES.MULTIPLE_CHOICE]: { label: 'Cases à cocher', icon: '☑️', description: 'Plusieurs réponses possibles' },
  [QUESTION_TYPES.DROPDOWN]: { label: 'Liste déroulante', icon: '📋', description: 'Sélection dans une liste' },
  [QUESTION_TYPES.SHORT_TEXT]: { label: 'Texte court', icon: '📝', description: 'Réponse courte (1 ligne)' },
  [QUESTION_TYPES.LONG_TEXT]: { label: 'Texte long', icon: '📄', description: 'Réponse détaillée (paragraphe)' },
  [QUESTION_TYPES.NUMBER]: { label: 'Nombre', icon: '🔢', description: 'Valeur numérique' },
  [QUESTION_TYPES.EMAIL]: { label: 'Email', icon: '📧', description: 'Adresse email' },
  [QUESTION_TYPES.DATE]: { label: 'Date', icon: '📅', description: 'Sélection de date' },
  [QUESTION_TYPES.RATING]: { label: 'Évaluation (1-5)', icon: '⭐', description: 'Note de 1 à 5 étoiles' }
}

// Types qui supportent les conditions (réponses prédéfinies)
const CONDITIONAL_TYPES = [
  QUESTION_TYPES.YES_NO,
  QUESTION_TYPES.TRUE_FALSE,
  QUESTION_TYPES.SINGLE_CHOICE,
  QUESTION_TYPES.DROPDOWN
]

const CreateQuestionnaire = () => {
  const { user, userData } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    description: ''
  })

  const [questions, setQuestions] = useState([
    createNewQuestion(1)
  ])

  const [expandedQuestion, setExpandedQuestion] = useState(1)

  // Créer une nouvelle question
  function createNewQuestion(id) {
    return {
      id,
      text: '',
      type: QUESTION_TYPES.YES_NO,
      options: [],
      required: true,
      isConditional: false,
      conditions: [],
      defaultNext: null,
      placeholder: ''
    }
  }

  const addQuestion = () => {
    const newId = Math.max(...questions.map(q => q.id), 0) + 1
    setQuestions([...questions, createNewQuestion(newId)])
    setExpandedQuestion(newId)
  }

  const duplicateQuestion = (questionId) => {
    const questionToDuplicate = questions.find(q => q.id === questionId)
    if (!questionToDuplicate) return

    const newId = Math.max(...questions.map(q => q.id), 0) + 1
    const duplicated = {
      ...JSON.parse(JSON.stringify(questionToDuplicate)),
      id: newId,
      text: `${questionToDuplicate.text} (copie)`,
      conditions: []
    }

    const index = questions.findIndex(q => q.id === questionId)
    const newQuestions = [...questions]
    newQuestions.splice(index + 1, 0, duplicated)
    setQuestions(newQuestions)
    setExpandedQuestion(newId)
    toast.success('Question dupliquée')
  }

  const removeQuestion = (questionId) => {
    if (questions.length <= 1) {
      toast.error('Le questionnaire doit avoir au moins une question')
      return
    }
    
    const updatedQuestions = questions
      .filter(q => q.id !== questionId)
      .map(q => ({
        ...q,
        conditions: q.conditions.filter(c => c.goToQuestion !== questionId),
        defaultNext: q.defaultNext === questionId ? null : q.defaultNext
      }))
    
    setQuestions(updatedQuestions)
    toast.success('Question supprimée')
  }

  const moveQuestion = (questionId, direction) => {
    const index = questions.findIndex(q => q.id === questionId)
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === questions.length - 1)) {
      return
    }

    const newQuestions = [...questions]
    const newIndex = direction === 'up' ? index - 1 : index + 1
    ;[newQuestions[index], newQuestions[newIndex]] = [newQuestions[newIndex], newQuestions[index]]
    setQuestions(newQuestions)
  }

  const updateQuestion = (questionId, field, value) => {
    setQuestions(questions.map(q => {
      if (q.id !== questionId) return q
      
      const updated = { ...q, [field]: value }
      
      if (field === 'type') {
        if ([QUESTION_TYPES.SINGLE_CHOICE, QUESTION_TYPES.MULTIPLE_CHOICE, QUESTION_TYPES.DROPDOWN].includes(value)) {
          updated.options = updated.options.length >= 2 ? updated.options : ['', '']
        } else {
          updated.options = []
        }
        if (!CONDITIONAL_TYPES.includes(value)) {
          updated.isConditional = false
          updated.conditions = []
        }
      }

      if (field === 'isConditional' && !value) {
        updated.conditions = []
        updated.defaultNext = null
      }
      
      return updated
    }))
  }

  const addOption = (questionId) => {
    setQuestions(questions.map(q => {
      if (q.id !== questionId) return q
      return { ...q, options: [...q.options, ''] }
    }))
  }

  const updateOption = (questionId, optionIndex, value) => {
    setQuestions(questions.map(q => {
      if (q.id !== questionId) return q
      const newOptions = [...q.options]
      newOptions[optionIndex] = value
      return { ...q, options: newOptions }
    }))
  }

  const removeOption = (questionId, optionIndex) => {
    setQuestions(questions.map(q => {
      if (q.id !== questionId) return q
      if (q.options.length <= 2) {
        toast.error('Minimum 2 options requises')
        return q
      }
      const removedOption = q.options[optionIndex]
      return { 
        ...q, 
        options: q.options.filter((_, i) => i !== optionIndex),
        conditions: q.conditions.filter(c => c.ifAnswer !== removedOption)
      }
    }))
  }

  const addCondition = (questionId) => {
    setQuestions(questions.map(q => {
      if (q.id !== questionId) return q
      return {
        ...q,
        conditions: [...q.conditions, { ifAnswer: '', goToQuestion: null }]
      }
    }))
  }

  const updateCondition = (questionId, conditionIndex, field, value) => {
    setQuestions(questions.map(q => {
      if (q.id !== questionId) return q
      const newConditions = [...q.conditions]
      newConditions[conditionIndex] = { ...newConditions[conditionIndex], [field]: value }
      return { ...q, conditions: newConditions }
    }))
  }

  const removeCondition = (questionId, conditionIndex) => {
    setQuestions(questions.map(q => {
      if (q.id !== questionId) return q
      return { ...q, conditions: q.conditions.filter((_, i) => i !== conditionIndex) }
    }))
  }

  const getAnswerOptions = (question) => {
    switch (question.type) {
      case QUESTION_TYPES.YES_NO:
        return ['Oui', 'Non']
      case QUESTION_TYPES.TRUE_FALSE:
        return ['Vrai', 'Faux']
      case QUESTION_TYPES.SINGLE_CHOICE:
      case QUESTION_TYPES.DROPDOWN:
        return question.options.filter(o => o.trim())
      default:
        return []
    }
  }

  const getNextQuestionOptions = (currentQuestionId) => {
    // Retourne toutes les autres questions (pas seulement celles après)
    return questions
      .filter(q => q.id !== currentQuestionId)
      .map(q => ({ 
        id: q.id, 
        text: `Q${questions.findIndex(qq => qq.id === q.id) + 1}: ${q.text || '(Sans titre)'}` 
      }))
  }

  const validateForm = () => {
    if (!formData.title.trim()) {
      toast.error('Veuillez entrer un titre')
      return false
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.text.trim()) {
        toast.error(`Question ${i + 1}: Veuillez entrer le texte de la question`)
        setExpandedQuestion(q.id)
        return false
      }

      if ([QUESTION_TYPES.SINGLE_CHOICE, QUESTION_TYPES.MULTIPLE_CHOICE, QUESTION_TYPES.DROPDOWN].includes(q.type)) {
        const filledOptions = q.options.filter(o => o.trim())
        if (filledOptions.length < 2) {
          toast.error(`Question ${i + 1}: Au moins 2 options sont requises`)
          setExpandedQuestion(q.id)
          return false
        }
      }

      if (q.isConditional && q.conditions.length > 0) {
        for (let j = 0; j < q.conditions.length; j++) {
          if (!q.conditions[j].ifAnswer) {
            toast.error(`Question ${i + 1}: Condition ${j + 1} incomplète`)
            setExpandedQuestion(q.id)
            return false
          }
        }
      }
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)

    try {
      await createQuestionnaire({
        ...formData,
        userId: user.uid,
        userName: userData?.displayName || 'Anonyme',
        questions: questions.map((q, index) => ({
          ...q,
          order: index,
          options: [QUESTION_TYPES.SINGLE_CHOICE, QUESTION_TYPES.MULTIPLE_CHOICE, QUESTION_TYPES.DROPDOWN].includes(q.type) 
            ? q.options.filter(o => o.trim()) 
            : []
        }))
      })

      toast.success('Questionnaire créé avec succès ! 🎉')
      navigate('/dashboard')
    } catch (error) {
      console.error('Create questionnaire error:', error)
      toast.error('Erreur lors de la création')
    } finally {
      setLoading(false)
    }
  }

  const conditionalCount = questions.filter(q => q.isConditional).length

  return (
    <div className="animate-fade-in max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <FiArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-white">Créer un Questionnaire 📋</h1>
          <p className="text-white/70">
            Questionnaire conditionnel avec logique de branchement avancée
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Info Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">📝 Informations générales</h2>
          
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Titre du questionnaire *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="input"
                placeholder="Ex: Enquête de satisfaction client"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input resize-none"
                rows={3}
                placeholder="Décrivez l'objectif de ce questionnaire..."
              />
            </div>
          </div>

          <div className="flex gap-4 mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <FiList className="text-purple-500" />
              <span>{questions.length} question(s)</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <FiLink className="text-blue-500" />
              <span>{conditionalCount} conditionnelle(s)</span>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-4 mb-6 border border-blue-200">
          <div className="flex items-start gap-3">
            <FiHelpCircle className="text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-blue-800 mb-1">💡 Comment fonctionne la logique conditionnelle ?</p>
              <p className="text-blue-600">
                Activez l'option <strong>"Question dépendante"</strong> pour créer des branchements. 
                Exemple : si l'utilisateur répond "Oui" à "Buvez-vous de l'alcool ?", passez à la question sur les types d'alcool. 
                Si "Non", passez à la question sur les boissons non-alcoolisées.
              </p>
            </div>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-4">
          {questions.map((question, index) => (
            <div 
              key={question.id} 
              className={`bg-white rounded-2xl shadow-xl overflow-hidden transition-all ${
                question.isConditional ? 'ring-2 ring-blue-400 ring-offset-2' : ''
              }`}
            >
              {/* Question Header */}
              <div 
                className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${
                  question.isConditional ? 'bg-blue-50' : 'bg-gray-50'
                }`}
                onClick={() => setExpandedQuestion(expandedQuestion === question.id ? null : question.id)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow ${
                    question.isConditional 
                      ? 'bg-gradient-to-br from-blue-500 to-purple-500' 
                      : 'bg-gradient-to-br from-purple-500 to-pink-500'
                  }`}>
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-800 truncate">
                      {question.text || 'Nouvelle question'}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        {QUESTION_TYPE_INFO[question.type]?.icon} {QUESTION_TYPE_INFO[question.type]?.label}
                      </span>
                      {question.isConditional && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full flex items-center gap-1">
                          <FiLink2 size={10} />
                          Dépendante
                        </span>
                      )}
                      {question.conditions.length > 0 && (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                          {question.conditions.length} branche(s)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); moveQuestion(question.id, 'up') }}
                    className="p-2 rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-600 disabled:opacity-30"
                    disabled={index === 0}
                  >
                    <FiChevronUp size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); moveQuestion(question.id, 'down') }}
                    className="p-2 rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-600 disabled:opacity-30"
                    disabled={index === questions.length - 1}
                  >
                    <FiChevronDown size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); duplicateQuestion(question.id) }}
                    className="p-2 rounded-lg text-gray-400 hover:bg-blue-100 hover:text-blue-600"
                  >
                    <FiCopy size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeQuestion(question.id) }}
                    className="p-2 rounded-lg text-gray-400 hover:bg-red-100 hover:text-red-600"
                  >
                    <FiTrash2 size={18} />
                  </button>
                  {expandedQuestion === question.id ? <FiChevronUp /> : <FiChevronDown />}
                </div>
              </div>

              {/* Question Body */}
              {expandedQuestion === question.id && (
                <div className="p-6 space-y-6">
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
                      placeholder="Ex: Buvez-vous de l'alcool ?"
                    />
                  </div>

                  {/* Question Type Selector */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type de réponse
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {Object.entries(QUESTION_TYPE_INFO).map(([type, info]) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => updateQuestion(question.id, 'type', type)}
                          className={`p-3 rounded-xl border-2 text-left transition-all ${
                            question.type === type
                              ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200'
                              : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                          }`}
                        >
                          <span className="text-lg">{info.icon}</span>
                          <p className={`text-xs font-medium mt-1 ${
                            question.type === type ? 'text-purple-700' : 'text-gray-700'
                          }`}>
                            {info.label}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Options for Choice-based questions */}
                  {[QUESTION_TYPES.SINGLE_CHOICE, QUESTION_TYPES.MULTIPLE_CHOICE, QUESTION_TYPES.DROPDOWN].includes(question.type) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Options de réponse
                        {question.type === QUESTION_TYPES.MULTIPLE_CHOICE && (
                          <span className="text-gray-400 font-normal ml-2">(cases à cocher - plusieurs choix possibles)</span>
                        )}
                      </label>
                      <div className="space-y-2">
                        {question.options.map((option, optIndex) => (
                          <div key={optIndex} className="flex gap-2 items-center">
                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium ${
                              question.type === QUESTION_TYPES.MULTIPLE_CHOICE
                                ? 'bg-green-100 text-green-700'
                                : 'bg-purple-100 text-purple-700'
                            }`}>
                              {String.fromCharCode(65 + optIndex)}
                            </span>
                            <input
                              type="text"
                              value={option}
                              onChange={(e) => updateOption(question.id, optIndex, e.target.value)}
                              className="input flex-1"
                              placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                            />
                            <button
                              type="button"
                              onClick={() => removeOption(question.id, optIndex)}
                              className="p-2 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600"
                            >
                              <FiTrash2 size={18} />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => addOption(question.id)}
                          className="btn btn-ghost text-purple-600 text-sm mt-2"
                        >
                          <FiPlus className="inline mr-1" />
                          Ajouter une option
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Placeholder for text inputs */}
                  {[QUESTION_TYPES.SHORT_TEXT, QUESTION_TYPES.LONG_TEXT, QUESTION_TYPES.EMAIL].includes(question.type) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Texte indicatif (placeholder)
                      </label>
                      <input
                        type="text"
                        value={question.placeholder || ''}
                        onChange={(e) => updateQuestion(question.id, 'placeholder', e.target.value)}
                        className="input"
                        placeholder="Ex: Entrez votre réponse ici..."
                      />
                    </div>
                  )}

                  {/* Settings Row */}
                  <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-xl">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={question.required}
                        onChange={(e) => updateQuestion(question.id, 'required', e.target.checked)}
                        className="w-5 h-5 rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700">Obligatoire</span>
                    </label>

                    {CONDITIONAL_TYPES.includes(question.type) && questions.length > 1 && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={question.isConditional}
                          onChange={(e) => updateQuestion(question.id, 'isConditional', e.target.checked)}
                          className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 flex items-center gap-1">
                          <FiLink2 size={14} className="text-blue-500" />
                          Question dépendante (avec branchement)
                        </span>
                      </label>
                    )}
                  </div>

                  {/* Conditional Logic Section */}
                  {question.isConditional && CONDITIONAL_TYPES.includes(question.type) && (
                    <div className="border-2 border-blue-200 rounded-xl p-5 bg-blue-50/50">
                      <h4 className="font-bold text-blue-800 mb-4 flex items-center gap-2">
                        <FiLink className="text-blue-500" />
                        Logique de branchement
                      </h4>

                      <p className="text-sm text-blue-600 mb-4">
                        Définissez quelle question afficher selon la réponse de l'utilisateur.
                      </p>
                      
                      <div className="space-y-3">
                        {question.conditions.map((condition, condIndex) => (
                          <div key={condIndex} className="flex flex-wrap items-center gap-2 p-4 bg-white rounded-xl border border-blue-200 shadow-sm">
                            <span className="text-sm font-medium text-gray-600 whitespace-nowrap">Si réponse =</span>
                            <select
                              value={condition.ifAnswer}
                              onChange={(e) => updateCondition(question.id, condIndex, 'ifAnswer', e.target.value)}
                              className="input py-2 px-3 w-auto text-sm font-medium"
                            >
                              <option value="">-- Choisir --</option>
                              {getAnswerOptions(question).map((opt, i) => (
                                <option key={i} value={opt}>{opt}</option>
                              ))}
                            </select>
                            <FiChevronRight className="text-blue-400" />
                            <span className="text-sm font-medium text-gray-600 whitespace-nowrap">Aller à</span>
                            <select
                              value={condition.goToQuestion || ''}
                              onChange={(e) => {
                                const val = e.target.value
                                updateCondition(question.id, condIndex, 'goToQuestion', val === 'end' ? 'end' : (parseInt(val) || null))
                              }}
                              className="input py-2 px-3 w-auto text-sm font-medium flex-1 min-w-[180px]"
                            >
                              <option value="">Question suivante (défaut)</option>
                              <option value="end">🏁 Fin du questionnaire</option>
                              {getNextQuestionOptions(question.id).map((opt) => (
                                <option key={opt.id} value={opt.id}>{opt.text}</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => removeCondition(question.id, condIndex)}
                              className="p-2 text-red-500 hover:bg-red-100 rounded-lg"
                            >
                              <FiTrash2 size={16} />
                            </button>
                          </div>
                        ))}
                        
                        {getAnswerOptions(question).length > question.conditions.length && (
                          <button
                            type="button"
                            onClick={() => addCondition(question.id)}
                            className="btn btn-ghost text-blue-600 text-sm"
                          >
                            <FiPlus className="inline mr-1" />
                            Ajouter une branche conditionnelle
                          </button>
                        )}
                      </div>

                      <div className="mt-4 pt-4 border-t border-blue-200">
                        <label className="block text-sm font-medium text-blue-800 mb-2">
                          Si aucune condition ne correspond :
                        </label>
                        <select
                          value={question.defaultNext || ''}
                          onChange={(e) => {
                            const val = e.target.value
                            updateQuestion(question.id, 'defaultNext', val === 'end' ? 'end' : (parseInt(val) || null))
                          }}
                          className="input py-2"
                        >
                          <option value="">Question suivante (ordre normal)</option>
                          <option value="end">🏁 Fin du questionnaire</option>
                          {getNextQuestionOptions(question.id).map((opt) => (
                            <option key={opt.id} value={opt.id}>{opt.text}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {!CONDITIONAL_TYPES.includes(question.type) && questions.length > 1 && (
                    <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
                      <FiAlertCircle className="text-amber-500 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-amber-700">
                        <p className="font-medium">Type non compatible avec le branchement</p>
                        <p className="mt-1">
                          Les questions de type "{QUESTION_TYPE_INFO[question.type]?.label}" ne supportent pas la logique conditionnelle. 
                          Utilisez Oui/Non, Vrai/Faux, Choix unique ou Liste déroulante pour créer des branchements.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add Question Button */}
        <button
          type="button"
          onClick={addQuestion}
          className="w-full mt-6 py-5 border-2 border-dashed border-white/50 rounded-2xl text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-3 font-medium text-lg"
        >
          <FiPlus size={24} />
          Ajouter une question
        </button>

        {/* Submit */}
        <div className="mt-8 flex gap-4">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex-1 btn btn-ghost bg-white"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 btn btn-secondary flex items-center justify-center gap-2 text-lg py-4"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <FiSave />
                Créer le Questionnaire
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CreateQuestionnaire
