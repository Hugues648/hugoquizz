import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getQuestionnaireById, createQuestionnaireSession, updateQuestionnaireSession } from '../services/firestore'
import { FiArrowRight, FiArrowLeft, FiCheck, FiUser, FiStar, FiMail, FiCalendar, FiHash } from 'react-icons/fi'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'
import FloatingLanguageSelector from '../components/FloatingLanguageSelector'

// Types de questions
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

const PlayQuestionnaire = () => {
  const { t } = useTranslation()
  const { questionnaireId } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [questionnaire, setQuestionnaire] = useState(null)
  const [gameState, setGameState] = useState('intro') // intro, playing, finished
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [respondentName, setRespondentName] = useState('')
  const [sessionId, setSessionId] = useState(null)
  const [questionPath, setQuestionPath] = useState([0]) // Track the path of questions

  useEffect(() => {
    fetchQuestionnaire()
  }, [questionnaireId])

  const fetchQuestionnaire = async () => {
    try {
      const data = await getQuestionnaireById(questionnaireId)
      if (!data) {
        toast.error(t('questionnaire.notFound'))
        navigate('/')
        return
      }

      if (!data.questions?.length) {
        toast.error(t('questionnaire.noQuestions'))
        navigate('/')
        return
      }

      setQuestionnaire(data)
    } catch (error) {
      console.error('Fetch error:', error)
      toast.error(t('common.loadError'))
    } finally {
      setLoading(false)
    }
  }

  const startQuestionnaire = async () => {
    if (!respondentName.trim()) {
      toast.error(t('questionnaire.enterName'))
      return
    }

    try {
      const session = await createQuestionnaireSession({
        questionnaireId,
        questionnaireTitle: questionnaire.title,
        respondentName,
        answers: {},
        status: 'in_progress'
      })
      setSessionId(session)
      setGameState('playing')
    } catch (error) {
      console.error('Start error:', error)
      toast.error(t('questionnaire.startError'))
    }
  }

  const currentQuestion = questionnaire?.questions?.[currentQuestionIndex]

  // Gestion des réponses selon le type
  const handleAnswer = (answer) => {
    const questionId = currentQuestion.id
    setAnswers(prev => ({ ...prev, [questionId]: answer }))
  }

  // Pour les cases à cocher (multiple choice)
  const handleMultipleChoiceToggle = (option) => {
    const questionId = currentQuestion.id
    const currentAnswers = answers[questionId] || []
    
    if (currentAnswers.includes(option)) {
      setAnswers(prev => ({
        ...prev,
        [questionId]: currentAnswers.filter(a => a !== option)
      }))
    } else {
      setAnswers(prev => ({
        ...prev,
        [questionId]: [...currentAnswers, option]
      }))
    }
  }

  // Déterminer la prochaine question en tenant compte de la logique conditionnelle
  const getNextQuestionIndex = () => {
    if (!currentQuestion) return -1
    
    const answer = answers[currentQuestion.id]
    
    // Si la question a une logique conditionnelle et des conditions définies
    if (currentQuestion.isConditional && currentQuestion.conditions?.length > 0) {
      // Chercher une condition correspondante à la réponse donnée
      for (const condition of currentQuestion.conditions) {
        // Comparer les réponses (en s'assurant que les types correspondent)
        const conditionAnswer = String(condition.ifAnswer).trim()
        const userAnswer = String(answer).trim()
        
        if (conditionAnswer === userAnswer) {
          if (condition.goToQuestion === 'end') {
            return -1 // Fin du questionnaire
          }
          
          // Trouver l'index de la question cible (comparer en nombre ou string)
          const targetQuestionId = condition.goToQuestion
          const targetIndex = questionnaire.questions.findIndex(q => 
            q.id === targetQuestionId || 
            String(q.id) === String(targetQuestionId) ||
            Number(q.id) === Number(targetQuestionId)
          )
          
          if (targetIndex !== -1) {
            return targetIndex
          }
        }
      }
      
      // Si aucune condition ne correspond, utiliser defaultNext
      if (currentQuestion.defaultNext) {
        if (currentQuestion.defaultNext === 'end') {
          return -1
        }
        const defaultIndex = questionnaire.questions.findIndex(q => 
          q.id === currentQuestion.defaultNext || 
          String(q.id) === String(currentQuestion.defaultNext) ||
          Number(q.id) === Number(currentQuestion.defaultNext)
        )
        if (defaultIndex !== -1) {
          return defaultIndex
        }
      }
      
      // Si aucune condition ne correspond et pas de defaultNext, passer à la question suivante
      return currentQuestionIndex + 1
    }

    // Par défaut : question suivante
    return currentQuestionIndex + 1
  }

  // Valider la réponse actuelle
  const validateCurrentAnswer = () => {
    const answer = answers[currentQuestion.id]
    
    if (!currentQuestion.required) return true
    
    switch (currentQuestion.type) {
      case QUESTION_TYPES.MULTIPLE_CHOICE:
        return Array.isArray(answer) && answer.length > 0
      case QUESTION_TYPES.EMAIL:
        return answer && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answer)
      case QUESTION_TYPES.NUMBER:
        return answer !== undefined && answer !== '' && !isNaN(answer)
      default:
        return answer && (typeof answer === 'string' ? answer.trim() : true)
    }
  }

  const handleNext = async () => {
    if (!validateCurrentAnswer()) {
      if (currentQuestion.type === QUESTION_TYPES.EMAIL) {
        toast.error(t('questionnaire.invalidEmail'))
      } else if (currentQuestion.type === QUESTION_TYPES.MULTIPLE_CHOICE) {
        toast.error(t('questionnaire.selectAtLeastOne'))
      } else {
        toast.error(t('questionnaire.requiredQuestion'))
      }
      return
    }

    const nextIndex = getNextQuestionIndex()

    if (nextIndex === -1 || nextIndex >= questionnaire.questions.length) {
      await finishQuestionnaire()
    } else {
      setQuestionPath(prev => [...prev, nextIndex])
      setCurrentQuestionIndex(nextIndex)
    }
  }

  const handlePrevious = () => {
    if (questionPath.length > 1) {
      const newPath = [...questionPath]
      newPath.pop()
      setQuestionPath(newPath)
      setCurrentQuestionIndex(newPath[newPath.length - 1])
    }
  }

  const finishQuestionnaire = async () => {
    setGameState('finished')

    if (sessionId) {
      const formattedAnswers = questionnaire.questions.map(q => ({
        questionId: q.id,
        questionText: q.text,
        questionType: q.type,
        answer: answers[q.id] || null
      })).filter(a => a.answer !== null)

      await updateQuestionnaireSession(sessionId, {
        answers: formattedAnswers,
        status: 'completed',
        completedAt: new Date()
      })
    }
  }

  // Formater la réponse pour l'affichage
  const formatAnswer = (answer, type) => {
    if (!answer) return '-'
    if (Array.isArray(answer)) return answer.join(', ')
    if (type === QUESTION_TYPES.RATING) return '⭐'.repeat(answer)
    return answer
  }

  if (loading) {
    return <LoadingSpinner fullScreen text={t('common.loading')} />
  }

  // Écran d'introduction
  if (gameState === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 flex items-center justify-center p-4">
        <FloatingLanguageSelector position="top-right" />
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center animate-fade-in">
          <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <span className="text-3xl">📋</span>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-800 mb-2">{questionnaire.title}</h1>
          <p className="text-gray-500 mb-6">{questionnaire.description || t('questionnaire.play.description')}</p>
          
          <div className="text-sm text-gray-500 mb-8">
            {questionnaire.questions.length} questions
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
              <FiUser className="inline mr-1" />
              {t('questionnaire.play.yourName')}
            </label>
            <input
              type="text"
              value={respondentName}
              onChange={(e) => setRespondentName(e.target.value)}
              className="input"
              placeholder={t('questionnaire.play.enterName')}
              maxLength={50}
              onKeyDown={(e) => e.key === 'Enter' && startQuestionnaire()}
            />
          </div>

          <button
            onClick={startQuestionnaire}
            className="w-full btn btn-secondary flex items-center justify-center gap-2 text-lg py-4"
          >
            {t('questionnaire.play.start')}
            <FiArrowRight />
          </button>
        </div>
      </div>
    )
  }

  // Écran de jeu
  if (gameState === 'playing' && currentQuestion) {
    const progress = ((questionPath.length) / questionnaire.questions.length) * 100
    const currentAnswer = answers[currentQuestion.id]

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 p-4">
        <div className="max-w-2xl mx-auto">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex justify-between text-white text-sm mb-2">
              <span>{respondentName}</span>
              <span>{t('questionnaire.play.questionOf', { current: questionPath.length, total: questionnaire.questions.length })}</span>
            </div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-500 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Question Card */}
          <div className="bg-white rounded-3xl shadow-2xl p-8 animate-fade-in">
            <h2 className="text-xl font-bold text-gray-800 mb-6">
              {currentQuestion.text}
              {currentQuestion.required && <span className="text-red-500 ml-1">*</span>}
            </h2>

            {/* ========== OUI / NON ========== */}
            {currentQuestion.type === QUESTION_TYPES.YES_NO && (
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => handleAnswer(t('common.yes'))}
                  className={`p-6 rounded-2xl border-2 font-medium transition-all ${
                    currentAnswer === t('common.yes')
                      ? 'bg-green-500 border-green-500 text-white scale-105 shadow-lg'
                      : 'border-gray-200 text-gray-700 hover:border-green-300 hover:bg-green-50'
                  }`}
                >
                  <span className="text-4xl block mb-2">👍</span>
                  {t('common.yes')}
                </button>
                <button
                  type="button"
                  onClick={() => handleAnswer(t('common.no'))}
                  className={`p-6 rounded-2xl border-2 font-medium transition-all ${
                    currentAnswer === t('common.no')
                      ? 'bg-red-500 border-red-500 text-white scale-105 shadow-lg'
                      : 'border-gray-200 text-gray-700 hover:border-red-300 hover:bg-red-50'
                  }`}
                >
                  <span className="text-4xl block mb-2">👎</span>
                  {t('common.no')}
                </button>
              </div>
            )}

            {/* ========== VRAI / FAUX ========== */}
            {currentQuestion.type === QUESTION_TYPES.TRUE_FALSE && (
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => handleAnswer(t('common.true'))}
                  className={`p-6 rounded-2xl border-2 font-medium transition-all ${
                    currentAnswer === t('common.true')
                      ? 'bg-green-500 border-green-500 text-white scale-105 shadow-lg'
                      : 'border-gray-200 text-gray-700 hover:border-green-300 hover:bg-green-50'
                  }`}
                >
                  <span className="text-4xl block mb-2">✓</span>
                  {t('common.true')}
                </button>
                <button
                  type="button"
                  onClick={() => handleAnswer(t('common.false'))}
                  className={`p-6 rounded-2xl border-2 font-medium transition-all ${
                    currentAnswer === t('common.false')
                      ? 'bg-red-500 border-red-500 text-white scale-105 shadow-lg'
                      : 'border-gray-200 text-gray-700 hover:border-red-300 hover:bg-red-50'
                  }`}
                >
                  <span className="text-4xl block mb-2">✗</span>
                  {t('common.false')}
                </button>
              </div>
            )}

            {/* ========== CHOIX UNIQUE (Radio) ========== */}
            {currentQuestion.type === QUESTION_TYPES.SINGLE_CHOICE && (
              <div className="space-y-3">
                {currentQuestion.options?.map((option, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleAnswer(option)}
                    className={`w-full p-4 rounded-xl border-2 text-left font-medium transition-all flex items-center gap-3 ${
                      currentAnswer === option
                        ? 'bg-purple-500 border-purple-500 text-white shadow-lg'
                        : 'border-gray-200 text-gray-700 hover:border-purple-300 hover:bg-purple-50'
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      currentAnswer === option
                        ? 'bg-white border-white'
                        : 'border-gray-300'
                    }`}>
                      {currentAnswer === option && <FiCheck className="text-purple-500" />}
                    </span>
                    {option}
                  </button>
                ))}
              </div>
            )}

            {/* ========== CASES À COCHER (Multiple Choice) ========== */}
            {currentQuestion.type === QUESTION_TYPES.MULTIPLE_CHOICE && (
              <div className="space-y-3">
                <p className="text-sm text-gray-500 mb-3">{t('questionnaire.play.multipleAnswersPossible')}</p>
                {currentQuestion.options?.map((option, index) => {
                  const isSelected = Array.isArray(currentAnswer) && currentAnswer.includes(option)
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleMultipleChoiceToggle(option)}
                      className={`w-full p-4 rounded-xl border-2 text-left font-medium transition-all flex items-center gap-3 ${
                        isSelected
                          ? 'bg-green-500 border-green-500 text-white shadow-lg'
                          : 'border-gray-200 text-gray-700 hover:border-green-300 hover:bg-green-50'
                      }`}
                    >
                      <span className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected
                          ? 'bg-white border-white'
                          : 'border-gray-300'
                      }`}>
                        {isSelected && <FiCheck className="text-green-500" />}
                      </span>
                      {option}
                    </button>
                  )
                })}
              </div>
            )}

            {/* ========== LISTE DÉROULANTE ========== */}
            {currentQuestion.type === QUESTION_TYPES.DROPDOWN && (
              <div>
                <select
                  value={currentAnswer || ''}
                  onChange={(e) => handleAnswer(e.target.value)}
                  className="input text-lg py-4"
                >
                  <option value="">{t('questionnaire.play.selectOption')}</option>
                  {currentQuestion.options?.map((option, index) => (
                    <option key={index} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            )}

            {/* ========== TEXTE COURT ========== */}
            {currentQuestion.type === QUESTION_TYPES.SHORT_TEXT && (
              <input
                type="text"
                value={currentAnswer || ''}
                onChange={(e) => handleAnswer(e.target.value)}
                className="input text-lg py-4"
                placeholder={currentQuestion.placeholder || t('questionnaire.play.yourAnswer')}
                maxLength={255}
              />
            )}

            {/* ========== TEXTE LONG ========== */}
            {currentQuestion.type === QUESTION_TYPES.LONG_TEXT && (
              <textarea
                value={currentAnswer || ''}
                onChange={(e) => handleAnswer(e.target.value)}
                className="input resize-none text-lg"
                rows={5}
                placeholder={currentQuestion.placeholder || t('questionnaire.play.yourDetailedAnswer')}
                maxLength={2000}
              />
            )}

            {/* ========== NOMBRE ========== */}
            {currentQuestion.type === QUESTION_TYPES.NUMBER && (
              <div className="relative">
                <FiHash className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="number"
                  value={currentAnswer || ''}
                  onChange={(e) => handleAnswer(e.target.value)}
                  className="input text-lg py-4 pl-12"
                  placeholder={t('questionnaire.play.enterNumber')}
                />
              </div>
            )}

            {/* ========== EMAIL ========== */}
            {currentQuestion.type === QUESTION_TYPES.EMAIL && (
              <div className="relative">
                <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={currentAnswer || ''}
                  onChange={(e) => handleAnswer(e.target.value)}
                  className="input text-lg py-4 pl-12"
                  placeholder={currentQuestion.placeholder || 'exemple@email.com'}
                />
              </div>
            )}

            {/* ========== DATE ========== */}
            {currentQuestion.type === QUESTION_TYPES.DATE && (
              <div className="relative">
                <FiCalendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={currentAnswer || ''}
                  onChange={(e) => handleAnswer(e.target.value)}
                  className="input text-lg py-4 pl-12"
                />
              </div>
            )}

            {/* ========== ÉVALUATION (1-5 étoiles) ========== */}
            {currentQuestion.type === QUESTION_TYPES.RATING && (
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleAnswer(star)}
                    className={`p-4 rounded-xl transition-all ${
                      currentAnswer >= star
                        ? 'text-yellow-400 scale-110'
                        : 'text-gray-300 hover:text-yellow-300'
                    }`}
                  >
                    <FiStar 
                      size={40} 
                      fill={currentAnswer >= star ? 'currentColor' : 'none'}
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-4 mt-8">
              {questionPath.length > 1 && (
                <button
                  type="button"
                  onClick={handlePrevious}
                  className="btn btn-ghost flex items-center gap-2"
                >
                  <FiArrowLeft />
                  {t('questionnaire.play.previous')}
                </button>
              )}
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 btn btn-secondary flex items-center justify-center gap-2 text-lg py-4"
              >
                {getNextQuestionIndex() === -1 || getNextQuestionIndex() >= questionnaire.questions.length 
                  ? t('questionnaire.play.finish') 
                  : t('questionnaire.play.next')
                }
                <FiArrowRight />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Écran de fin
  if (gameState === 'finished') {
    // Calculer les réponses données
    const answeredQuestions = Object.keys(answers).length

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full text-center animate-fade-in">
          <div className="text-7xl mb-6">🎉</div>
          
          <h1 className="text-3xl font-bold text-gray-800 mb-2">{t('questionnaire.play.thanks', { name: respondentName })}</h1>
          <p className="text-gray-500 mb-8">
            {t('questionnaire.play.responsesRecorded')}
          </p>

          {/* Résumé */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 mb-8 text-left">
            <h3 className="font-bold text-purple-800 mb-4">📊 {t('questionnaire.play.summary')}</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {questionnaire.questions
                .filter(q => answers[q.id] !== undefined)
                .map((q, index) => (
                  <div key={q.id} className="pb-3 border-b border-purple-100 last:border-0">
                    <p className="text-sm text-purple-600 font-medium">{q.text}</p>
                    <p className="text-purple-800 mt-1">
                      {formatAnswer(answers[q.id], q.type)}
                    </p>
                  </div>
                ))
              }
            </div>
            <div className="mt-4 pt-4 border-t border-purple-200">
              <p className="text-sm text-purple-600">
                {t('questionnaire.play.questionsAnswered', { count: answeredQuestions })}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => navigate(`/results/questionnaire/${sessionId}`)}
              className="w-full btn btn-secondary flex items-center justify-center gap-2"
            >
              {t('questionnaire.play.seeDetails')}
              <FiArrowRight />
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full btn btn-ghost text-gray-500"
            >
              {t('common.backToHome')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default PlayQuestionnaire
