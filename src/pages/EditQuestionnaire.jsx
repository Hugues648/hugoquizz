import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { getQuestionnaireById, updateQuestionnaire } from '../services/firestore'
import { 
  FiPlus, FiTrash2, FiSave, FiArrowLeft, FiArrowRight, FiChevronDown, FiChevronUp,
  FiCopy, FiToggleLeft, FiToggleRight, FiCheckCircle, FiList, FiAlignLeft,
  FiHash, FiMail, FiCalendar, FiStar, FiCheck, FiX, FiGitBranch
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'

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

// Configuration for each question type (labels are fetched dynamically via getQuestionTypeConfig)
const QUESTION_TYPE_CONFIG_BASE = {
  [QUESTION_TYPES.YES_NO]: { labelKey: 'questionnaire.questionTypes.yesNo', icon: FiToggleLeft, color: 'green', optionsKeys: ['common.yes', 'common.no'] },
  [QUESTION_TYPES.TRUE_FALSE]: { labelKey: 'questionnaire.questionTypes.trueFalse', icon: FiCheck, color: 'blue', optionsKeys: ['common.true', 'common.false'] },
  [QUESTION_TYPES.SINGLE_CHOICE]: { labelKey: 'questionnaire.questionTypes.singleChoice', icon: FiCheckCircle, color: 'purple', hasOptions: true },
  [QUESTION_TYPES.MULTIPLE_CHOICE]: { labelKey: 'questionnaire.questionTypes.multipleChoice', icon: FiList, color: 'orange', hasOptions: true },
  [QUESTION_TYPES.DROPDOWN]: { labelKey: 'questionnaire.questionTypes.dropdown', icon: FiChevronDown, color: 'cyan', hasOptions: true },
  [QUESTION_TYPES.SHORT_TEXT]: { labelKey: 'questionnaire.questionTypes.shortText', icon: FiAlignLeft, color: 'gray', hasPlaceholder: true },
  [QUESTION_TYPES.LONG_TEXT]: { labelKey: 'questionnaire.questionTypes.longText', icon: FiAlignLeft, color: 'gray', hasPlaceholder: true },
  [QUESTION_TYPES.NUMBER]: { labelKey: 'questionnaire.questionTypes.number', icon: FiHash, color: 'indigo' },
  [QUESTION_TYPES.EMAIL]: { labelKey: 'questionnaire.questionTypes.email', icon: FiMail, color: 'pink', hasPlaceholder: true },
  [QUESTION_TYPES.DATE]: { labelKey: 'questionnaire.questionTypes.date', icon: FiCalendar, color: 'amber' },
  [QUESTION_TYPES.RATING]: { labelKey: 'questionnaire.questionTypes.rating', icon: FiStar, color: 'yellow' }
}

// Types qui supportent les conditions (branchement)
const CONDITIONAL_TYPES = [
  QUESTION_TYPES.YES_NO,
  QUESTION_TYPES.TRUE_FALSE,
  QUESTION_TYPES.SINGLE_CHOICE,
  QUESTION_TYPES.DROPDOWN
]

const EditQuestionnaire = () => {
  const { t } = useTranslation()
  const { questionnaireId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  
  // Helper to get translated question type config
  const getQuestionTypeConfig = (type) => {
    const base = QUESTION_TYPE_CONFIG_BASE[type]
    if (!base) return { label: type, icon: null, color: 'gray' }
    return {
      ...base,
      label: t(base.labelKey, base.labelKey.split('.').pop()),
      options: base.optionsKeys ? base.optionsKeys.map(k => t(k)) : undefined
    }
  }
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: ''
  })
  const [questions, setQuestions] = useState([])
  const [expandedQuestion, setExpandedQuestion] = useState(null)

  useEffect(() => {
    fetchQuestionnaire()
  }, [questionnaireId])

  const fetchQuestionnaire = async () => {
    try {
      const data = await getQuestionnaireById(questionnaireId)
      if (!data) {
        toast.error(t('messages.error.questionnaireNotFound'))
        navigate('/dashboard')
        return
      }

      if (data.userId !== user.uid) {
        toast.error(t('messages.error.unauthorized'))
        navigate('/dashboard')
        return
      }

      setFormData({
        title: data.title || '',
        description: data.description || ''
      })

      if (data.questions?.length > 0) {
        setQuestions(data.questions.map((q, i) => ({
          ...q,
          id: q.id || i + 1,
          type: q.type || QUESTION_TYPES.YES_NO,
          options: q.options || [],
          conditions: q.conditions || [],
          isConditional: q.isConditional || false,
          defaultNext: q.defaultNext || null,
          placeholder: q.placeholder || ''
        })))
        setExpandedQuestion(data.questions[0].id || 1)
      }
    } catch (error) {
      console.error('Fetch error:', error)
      toast.error(t('messages.error.loading'))
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  // Générer un ID unique
  const generateId = () => Math.max(...questions.map(q => q.id), 0) + 1

  // Ajouter une question
  const addQuestion = () => {
    const newId = generateId()
    const newQuestion = {
      id: newId,
      text: '',
      type: QUESTION_TYPES.YES_NO,
      options: [],
      required: true,
      isConditional: false,
      conditions: [],
      defaultNext: null,
      placeholder: ''
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
      text: `${original.text} (${t('common.copy')})`,
      isConditional: false,
      conditions: [],
      defaultNext: null
    }

    const originalIndex = questions.findIndex(q => q.id === questionId)
    const newQuestions = [...questions]
    newQuestions.splice(originalIndex + 1, 0, duplicated)
    setQuestions(newQuestions)
    setExpandedQuestion(newId)
    toast.success(t('messages.success.questionDuplicated'))
  }

  // Supprimer une question
  const removeQuestion = (questionId) => {
    if (questions.length <= 1) {
      toast.error(t('messages.validation.minOneQuestion'))
      return
    }

    const updatedQuestions = questions
      .filter(q => q.id !== questionId)
      .map(q => ({
        ...q,
        conditions: q.conditions?.filter(c => c.goToQuestion !== questionId) || [],
        defaultNext: q.defaultNext === questionId ? null : q.defaultNext
      }))

    setQuestions(updatedQuestions)

    if (expandedQuestion === questionId) {
      setExpandedQuestion(updatedQuestions[0]?.id || null)
    }
  }

  // Mettre à jour une question
  const updateQuestion = (questionId, field, value) => {
    setQuestions(questions.map(q => {
      if (q.id !== questionId) return q

      const updated = { ...q, [field]: value }

      // Si on change le type, réinitialiser les options et conditions
      if (field === 'type') {
        const config = getQuestionTypeConfig(value)
        
        if (config.options) {
          updated.options = config.options
        } else if (config.hasOptions) {
          updated.options = q.options.length > 0 ? q.options : ['Option 1', 'Option 2']
        } else {
          updated.options = []
        }

        // Réinitialiser les conditions si le type ne supporte pas
        if (!CONDITIONAL_TYPES.includes(value)) {
          updated.isConditional = false
          updated.conditions = []
          updated.defaultNext = null
        }
      }

      return updated
    }))
  }

  // Gérer les options
  const addOption = (questionId) => {
    setQuestions(questions.map(q => {
      if (q.id !== questionId) return q
      return { ...q, options: [...q.options, `Option ${q.options.length + 1}`] }
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
        toast.error(t('messages.validation.minOptions'))
        return q
      }
      const newOptions = q.options.filter((_, i) => i !== optionIndex)
      // Nettoyer les conditions associées
      const newConditions = q.conditions.filter(c => c.ifAnswer !== q.options[optionIndex])
      return { ...q, options: newOptions, conditions: newConditions }
    }))
  }

  // Gérer les conditions de branchement
  const updateCondition = (questionId, answer, goToQuestion) => {
    setQuestions(questions.map(q => {
      if (q.id !== questionId) return q

      const existingIndex = q.conditions.findIndex(c => c.ifAnswer === answer)
      let newConditions = [...q.conditions]

      if (goToQuestion === '') {
        // Supprimer la condition
        newConditions = newConditions.filter(c => c.ifAnswer !== answer)
      } else if (existingIndex >= 0) {
        // Mettre à jour la condition existante
        newConditions[existingIndex] = { ifAnswer: answer, goToQuestion }
      } else {
        // Ajouter une nouvelle condition
        newConditions.push({ ifAnswer: answer, goToQuestion })
      }

      return { ...q, conditions: newConditions }
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

  // Obtenir les options disponibles pour une question conditionnelle
  const getAvailableOptions = (question) => {
    const config = getQuestionTypeConfig(question.type)
    if (config.options) {
      return config.options
    }
    return question.options || []
  }

  // Valider et sauvegarder
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      toast.error(t('messages.validation.titleRequired'))
      return
    }

    if (questions.length === 0) {
      toast.error(t('messages.validation.minQuestions'))
      return
    }

    const emptyQuestions = questions.filter(q => !q.text.trim())
    if (emptyQuestions.length > 0) {
      toast.error(t('messages.validation.questionTextRequired'))
      setExpandedQuestion(emptyQuestions[0].id)
      return
    }

    // Vérifier les options pour les types qui en nécessitent
    for (const q of questions) {
      const config = getQuestionTypeConfig(q.type)
      if (config.hasOptions && (!q.options || q.options.length < 2)) {
        toast.error(t('messages.validation.minOptions'))
        setExpandedQuestion(q.id)
        return
      }
    }

    setSaving(true)

    try {
      await updateQuestionnaire(questionnaireId, {
        title: formData.title.trim(),
        description: formData.description.trim(),
        questions: questions.map(q => ({
          id: q.id,
          text: q.text.trim(),
          type: q.type,
          options: q.options,
          required: q.required,
          isConditional: q.isConditional,
          conditions: q.conditions,
          defaultNext: q.defaultNext,
          placeholder: q.placeholder
        }))
      })

      toast.success(t('messages.success.questionnaireUpdated'))
      navigate('/dashboard')
    } catch (error) {
      console.error('Update error:', error)
      toast.error(t('messages.error.updating'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <LoadingSpinner fullScreen text={t('common.loading')} />
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
            {t('common.backToDashboard')}
          </button>
          <h1 className="text-3xl font-bold text-gray-800">{t('questionnaire.edit')}</h1>
          <p className="text-gray-500 mt-2">{t('questionnaire.editDescription')}</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Informations générales */}
          <div className="card p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('questionnaire.generalInfo')}</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('questionnaire.title')} *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input"
                  placeholder={t('questionnaire.placeholders.title')}
                  maxLength={100}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('questionnaire.descriptionOptional')}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input resize-none"
                  rows={3}
                  placeholder={t('questionnaire.placeholders.description')}
                  maxLength={500}
                />
              </div>
            </div>
          </div>

          {/* Questions */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                {t('questionnaire.questions')} ({questions.length})
              </h2>
              <button
                type="button"
                onClick={addQuestion}
                className="btn btn-primary flex items-center gap-2"
              >
                <FiPlus />
                {t('questionnaire.addQuestion')}
              </button>
            </div>

            <div className="space-y-4">
              {questions.map((question, index) => {
                const isExpanded = expandedQuestion === question.id
                const config = getQuestionTypeConfig(question.type)
                const Icon = config.icon
                const canBeConditional = CONDITIONAL_TYPES.includes(question.type)
                const availableOptions = getAvailableOptions(question)

                return (
                  <div 
                    key={question.id} 
                    className={`card overflow-hidden transition-all ${
                      question.isConditional 
                        ? 'ring-2 ring-blue-400 ring-offset-2' 
                        : ''
                    }`}
                  >
                    {/* En-tête de la question */}
                    <div
                      className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50"
                      onClick={() => setExpandedQuestion(isExpanded ? null : question.id)}
                    >
                      <span className="text-gray-400 font-medium w-8">#{index + 1}</span>
                      
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${config.color}-100`}>
                        <Icon className={`text-${config.color}-500`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 truncate">
                          {question.text || <span className="text-gray-400 italic">{t('questionnaire.questionWithoutText')}</span>}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">{config.label}</span>
                          {question.isConditional && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <FiGitBranch size={10} />
                              {t('questionnaire.conditional')}
                            </span>
                          )}
                          {question.required && (
                            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{t('questionnaire.requiredShort')}</span>
                          )}
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
                        {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                      </div>
                    </div>

                    {/* Contenu développé */}
                    {isExpanded && (
                      <div className="border-t p-4 bg-gray-50 space-y-4">
                        {/* Texte de la question */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('questionnaire.questionText')} *
                          </label>
                          <input
                            type="text"
                            value={question.text}
                            onChange={(e) => updateQuestion(question.id, 'text', e.target.value)}
                            className="input"
                            placeholder={t('questionnaire.placeholders.questionText')}
                          />
                        </div>

                        {/* Type de question */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('questionnaire.responseType')}
                          </label>
                          <select
                            value={question.type}
                            onChange={(e) => updateQuestion(question.id, 'type', e.target.value)}
                            className="input"
                          >
                            {Object.keys(QUESTION_TYPE_CONFIG_BASE).map((type) => {
                              const cfg = getQuestionTypeConfig(type)
                              return (
                                <option key={type} value={type}>{cfg.label}</option>
                              )
                            })}
                          </select>
                        </div>

                        {/* Placeholder pour certains types */}
                        {config.hasPlaceholder && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {t('questionnaire.placeholderLabel')}
                            </label>
                            <input
                              type="text"
                              value={question.placeholder || ''}
                              onChange={(e) => updateQuestion(question.id, 'placeholder', e.target.value)}
                              className="input"
                              placeholder={t('questionnaire.placeholders.placeholder')}
                            />
                          </div>
                        )}

                        {/* Options pour les types qui en ont */}
                        {config.hasOptions && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {t('questionnaire.responseOptions')}
                            </label>
                            <div className="space-y-2">
                              {question.options.map((option, optIndex) => (
                                <div key={optIndex} className="flex gap-2">
                                  <input
                                    type="text"
                                    value={option}
                                    onChange={(e) => updateOption(question.id, optIndex, e.target.value)}
                                    className="input flex-1"
                                    placeholder={`${t('questionnaire.placeholders.option')} ${optIndex + 1}`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeOption(question.id, optIndex)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                  >
                                    <FiTrash2 />
                                  </button>
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() => addOption(question.id)}
                                className="text-purple-600 text-sm font-medium hover:text-purple-700 flex items-center gap-1"
                              >
                                <FiPlus size={14} />
                                {t('questionnaire.addOption')}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Question obligatoire */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateQuestion(question.id, 'required', !question.required)}
                            className={`relative w-12 h-6 rounded-full transition-colors ${
                              question.required ? 'bg-purple-500' : 'bg-gray-300'
                            }`}
                          >
                            <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                              question.required ? 'translate-x-6' : ''
                            }`} />
                          </button>
                          <span className="text-sm text-gray-700">{t('questionnaire.required')}</span>
                        </div>

                        {/* Question conditionnelle */}
                        {canBeConditional && (
                          <div className="border-t pt-4 mt-4">
                            <div className="flex items-center gap-2 mb-3">
                              <button
                                type="button"
                                onClick={() => updateQuestion(question.id, 'isConditional', !question.isConditional)}
                                className={`relative w-12 h-6 rounded-full transition-colors ${
                                  question.isConditional ? 'bg-blue-500' : 'bg-gray-300'
                                }`}
                              >
                                <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                  question.isConditional ? 'translate-x-6' : ''
                                }`} />
                              </button>
                              <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                <FiGitBranch className="text-blue-500" />
                                {t('questionnaire.conditionalBranching')}
                              </span>
                            </div>

                            {question.isConditional && (
                              <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                                <p className="text-sm text-blue-700 mb-3">
                                  {t('questionnaire.defineWhereToGo')}
                                </p>
                                
                                {availableOptions.map((option, optIndex) => {
                                  const condition = question.conditions?.find(c => c.ifAnswer === option)
                                  return (
                                    <div key={optIndex} className="flex items-center gap-2 bg-white rounded-lg p-3">
                                      <span className="text-sm font-medium text-gray-700 min-w-0 flex-shrink-0">
                                        {t('questionnaire.ifAnswer', { answer: option })}
                                      </span>
                                      <select
                                        value={condition?.goToQuestion || ''}
                                        onChange={(e) => updateCondition(question.id, option, e.target.value)}
                                        className="input flex-1"
                                      >
                                        <option value="">{t('questionnaire.nextQuestionDefault')}</option>
                                        {questions
                                          .filter(q => q.id !== question.id)
                                          .map((q, i) => (
                                            <option key={q.id} value={q.id}>
                                              Q{questions.findIndex(qq => qq.id === q.id) + 1}: {q.text?.substring(0, 40) || t('questionnaire.noText')}...
                                            </option>
                                          ))
                                        }
                                        <option value="end">🏁 {t('questionnaire.endOfQuestionnaire')}</option>
                                      </select>
                                    </div>
                                  )
                                })}

                                <div className="flex items-center gap-2 bg-white rounded-lg p-3 mt-2">
                                  <span className="text-sm font-medium text-gray-700 flex-shrink-0">
                                    {t('questionnaire.byDefault')}
                                  </span>
                                  <select
                                    value={question.defaultNext || ''}
                                    onChange={(e) => updateQuestion(question.id, 'defaultNext', e.target.value || null)}
                                    className="input flex-1"
                                  >
                                    <option value="">{t('questionnaire.nextQuestion')}</option>
                                    {questions
                                      .filter(q => q.id !== question.id)
                                      .map((q) => (
                                        <option key={q.id} value={q.id}>
                                          Q{questions.findIndex(qq => qq.id === q.id) + 1}: {q.text?.substring(0, 40) || t('questionnaire.noText')}...
                                        </option>
                                      ))
                                    }
                                    <option value="end">🏁 {t('questionnaire.endOfQuestionnaire')}</option>
                                  </select>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-between pt-4 border-t">
                          <button
                            type="button"
                            onClick={() => duplicateQuestion(question.id)}
                            className="text-gray-600 hover:text-gray-800 flex items-center gap-1 text-sm"
                          >
                            <FiCopy size={14} />
                            {t('common.duplicate')}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeQuestion(question.id)}
                            className="text-red-500 hover:text-red-700 flex items-center gap-1 text-sm"
                          >
                            <FiTrash2 size={14} />
                            {t('common.delete')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {questions.length === 0 && (
                <div className="card p-8 text-center">
                  <p className="text-gray-500 mb-4">{t('questionnaire.noQuestionsAdded')}</p>
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="btn btn-primary"
                  >
                    <FiPlus className="mr-2" />
                    {t('questionnaire.addFirstQuestion')}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex gap-4 justify-end">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="btn btn-ghost"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t('common.saving')}
                </>
              ) : (
                <>
                  <FiSave />
                  {t('common.saveChanges')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditQuestionnaire
