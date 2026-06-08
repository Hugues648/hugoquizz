import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getQuizById, createQuizSession, updateQuizSession } from '../services/firestore'
import { FiPlay, FiClock, FiUsers, FiArrowRight, FiCheck, FiX, FiStar, FiHash, FiMail, FiChevronUp, FiChevronDown } from 'react-icons/fi'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'
import FloatingLanguageSelector from '../components/FloatingLanguageSelector'

// Types de questions
const QUESTION_TYPES = {
  SINGLE_CHOICE: 'single_choice',
  MULTIPLE_CHOICE: 'multiple_choice',
  TRUE_FALSE: 'true_false',
  DROPDOWN: 'dropdown',
  SHORT_TEXT: 'short_text',
  NUMBER: 'number',
  RATING: 'rating',
  PUZZLE: 'puzzle'
}

const PlayQuiz = () => {
  const { quizId } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [loading, setLoading] = useState(true)
  const [quiz, setQuiz] = useState(null)
  const [questions, setQuestions] = useState([])
  const [gameState, setGameState] = useState('intro') // intro, playing, finished
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [selectedMultiple, setSelectedMultiple] = useState([]) // Pour multiple_choice
  const [textAnswer, setTextAnswer] = useState('')
  const [numberAnswer, setNumberAnswer] = useState('')
  const [ratingAnswer, setRatingAnswer] = useState(0)
  const [puzzleOrder, setPuzzleOrder] = useState([]) // Pour puzzle
  const [timeLeft, setTimeLeft] = useState(0)
  const [score, setScore] = useState(0)
  const [answers, setAnswers] = useState([])
  const [playerName, setPlayerName] = useState('')
  const [sessionId, setSessionId] = useState(null)
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)

  useEffect(() => {
    fetchQuizData()
  }, [quizId])

  const fetchQuizData = async () => {
    try {
      const quizData = await getQuizById(quizId)
      if (!quizData) {
        toast.error(t('quiz.notFound', 'Quiz introuvable'))
        navigate('/')
        return
      }

      if (!quizData.questions?.length) {
        toast.error(t('quiz.noQuestions', 'Ce quiz n\'a pas de questions'))
        navigate('/')
        return
      }

      setQuiz(quizData)
      
      // Randomize questions if enabled
      let orderedQuestions = [...quizData.questions]
      if (quizData.randomizeQuestions) {
        orderedQuestions = orderedQuestions.sort(() => Math.random() - 0.5)
      }
      setQuestions(orderedQuestions)
    } catch (error) {
      console.error('Fetch quiz error:', error)
      toast.error(t('quiz.loadError', 'Erreur lors du chargement du quiz'))
    } finally {
      setLoading(false)
    }
  }

  const startGame = async () => {
    if (!playerName.trim()) {
      toast.error(t('quiz.live.enterName', 'Veuillez entrer votre nom'))
      return
    }

    try {
      const session = await createQuizSession({
        quizId,
        quizTitle: quiz.title,
        playerName,
        score: 0,
        totalQuestions: questions.length,
        answers: [],
        status: 'in_progress'
      })
      setSessionId(session)
      setGameState('playing')
      setTimeLeft(questions[0].timeLimit || quiz.timePerQuestion || 30)
    } catch (error) {
      console.error('Start game error:', error)
      toast.error(t('quiz.startError', 'Erreur lors du démarrage'))
    }
  }

  const currentQuestion = questions[currentQuestionIndex]

  // Timer
  useEffect(() => {
    if (gameState !== 'playing' || showCorrectAnswer || hasSubmitted) return

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleTimeout()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [gameState, currentQuestionIndex, showCorrectAnswer, hasSubmitted])

  const handleTimeout = useCallback(() => {
    if (hasSubmitted) return
    submitAnswer(null, true)
  }, [hasSubmitted, currentQuestionIndex])

  // Réinitialiser l'état pour chaque nouvelle question
  const resetQuestionState = () => {
    setSelectedAnswer(null)
    setSelectedMultiple([])
    setTextAnswer('')
    setNumberAnswer('')
    setRatingAnswer(0)
    setPuzzleOrder([])
    setHasSubmitted(false)
    setShowCorrectAnswer(false)
  }

  // Initialiser l'ordre puzzle mélangé au début de chaque question puzzle
  useEffect(() => {
    if (gameState === 'playing' && currentQuestion?.type === QUESTION_TYPES.PUZZLE) {
      // Mélanger les options pour le puzzle
      const shuffled = [...currentQuestion.options].sort(() => Math.random() - 0.5)
      setPuzzleOrder(shuffled)
    }
  }, [currentQuestionIndex, gameState])

  // Déplacer un élément puzzle
  const movePuzzleItem = (fromIndex, direction) => {
    const toIndex = fromIndex + direction
    if (toIndex < 0 || toIndex >= puzzleOrder.length) return
    
    const newOrder = [...puzzleOrder]
    const temp = newOrder[fromIndex]
    newOrder[fromIndex] = newOrder[toIndex]
    newOrder[toIndex] = temp
    setPuzzleOrder(newOrder)
  }

  // Vérifier si la réponse est correcte
  const checkAnswer = (question, answer) => {
    switch (question.type) {
      case QUESTION_TYPES.SINGLE_CHOICE:
      case QUESTION_TYPES.DROPDOWN:
      case QUESTION_TYPES.TRUE_FALSE:
        const correctOption = question.options.find(opt => opt.isCorrect)
        return answer?.id === correctOption?.id
      
      case QUESTION_TYPES.MULTIPLE_CHOICE:
        const correctIds = question.options.filter(opt => opt.isCorrect).map(opt => opt.id).sort()
        const selectedIds = (answer || []).map(opt => opt.id).sort()
        return JSON.stringify(correctIds) === JSON.stringify(selectedIds)
      
      case QUESTION_TYPES.SHORT_TEXT:
        // Support pour plusieurs réponses séparées par des virgules
        if (!question.correctAnswer || !answer) return false
        const acceptedAnswers = question.correctAnswer.split(',').map(a => a.toLowerCase().trim())
        return acceptedAnswers.includes(answer.toLowerCase().trim())
      
      case QUESTION_TYPES.NUMBER:
        return parseFloat(answer) === parseFloat(question.correctAnswer)
      
      case QUESTION_TYPES.RATING:
        return answer === question.correctRating
      
      case QUESTION_TYPES.PUZZLE:
        // answer est un array d'options dans l'ordre du joueur
        if (!answer || !Array.isArray(answer)) return false
        const playerOrder = answer.map(opt => opt.id)
        const correctOrder = question.puzzleOrder || question.options.map(opt => opt.id)
        return JSON.stringify(playerOrder) === JSON.stringify(correctOrder)
      
      default:
        return false
    }
  }

  // Obtenir la bonne réponse formatée
  const getCorrectAnswerText = (question) => {
    switch (question.type) {
      case QUESTION_TYPES.SINGLE_CHOICE:
      case QUESTION_TYPES.DROPDOWN:
      case QUESTION_TYPES.TRUE_FALSE:
        return question.options.find(opt => opt.isCorrect)?.text
      
      case QUESTION_TYPES.MULTIPLE_CHOICE:
        return question.options.filter(opt => opt.isCorrect).map(opt => opt.text).join(', ')
      
      case QUESTION_TYPES.SHORT_TEXT:
      case QUESTION_TYPES.NUMBER:
        return question.correctAnswer
      
      case QUESTION_TYPES.RATING:
        return '⭐'.repeat(question.correctRating)
      
      case QUESTION_TYPES.PUZZLE:
        const correctOrder = question.puzzleOrder || question.options.map(opt => opt.id)
        return correctOrder.map((id, i) => {
          const opt = question.options.find(o => o.id === id)
          return `${i + 1}. ${opt?.text || ''}`
        }).join(' → ')
      
      default:
        return ''
    }
  }

  // Soumettre la réponse
  const submitAnswer = (answer, isTimeout = false) => {
    if (hasSubmitted) return
    setHasSubmitted(true)

    const timeSpent = (currentQuestion.timeLimit || quiz.timePerQuestion || 30) - timeLeft
    const isCorrect = !isTimeout && checkAnswer(currentQuestion, answer)
    const pointsEarned = isCorrect ? Math.round(currentQuestion.points * (1 - timeSpent / (currentQuestion.timeLimit || 30) * 0.5)) : 0

    if (isCorrect) {
      setScore(prev => prev + pointsEarned)
    }

    // Formater la réponse pour le stockage
    let answerText = ''
    if (answer) {
      if (Array.isArray(answer)) {
        answerText = answer.map(a => a.text).join(', ')
      } else if (typeof answer === 'object') {
        answerText = answer.text
      } else {
        answerText = String(answer)
      }
    }

    setAnswers(prev => [...prev, {
      questionId: currentQuestion.id,
      questionText: currentQuestion.text,
      questionType: currentQuestion.type,
      selectedAnswer: answerText || t('quiz.live.noAnswer', 'Pas de réponse'),
      correctAnswer: getCorrectAnswerText(currentQuestion),
      isCorrect,
      timeSpent,
      points: pointsEarned
    }])

    setShowCorrectAnswer(true)

    setTimeout(() => {
      nextQuestion()
    }, 2500)
  }

  // Gérer la sélection selon le type
  const handleSelectOption = (option) => {
    if (hasSubmitted || showCorrectAnswer) return

    if (currentQuestion.type === QUESTION_TYPES.MULTIPLE_CHOICE) {
      setSelectedMultiple(prev => {
        const exists = prev.find(o => o.id === option.id)
        if (exists) {
          return prev.filter(o => o.id !== option.id)
        }
        return [...prev, option]
      })
    } else {
      setSelectedAnswer(option)
      submitAnswer(option)
    }
  }

  // Soumettre pour multiple choice
  const handleSubmitMultiple = () => {
    if (selectedMultiple.length === 0) {
      toast.error(t('quiz.selectAtLeastOne', 'Sélectionnez au moins une réponse'))
      return
    }
    submitAnswer(selectedMultiple)
  }

  // Soumettre réponse texte
  const handleSubmitText = () => {
    if (!textAnswer.trim()) {
      toast.error(t('quiz.enterAnswer', 'Entrez une réponse'))
      return
    }
    submitAnswer(textAnswer)
  }

  // Soumettre réponse nombre
  const handleSubmitNumber = () => {
    if (numberAnswer === '' || isNaN(numberAnswer)) {
      toast.error(t('quiz.enterValidNumber', 'Entrez un nombre valide'))
      return
    }
    submitAnswer(numberAnswer)
  }

  // Soumettre rating
  const handleSubmitRating = () => {
    if (ratingAnswer === 0) {
      toast.error(t('quiz.selectRating', 'Sélectionnez une note'))
      return
    }
    submitAnswer(ratingAnswer)
  }

  // Question suivante
  const nextQuestion = async () => {
    if (currentQuestionIndex >= questions.length - 1) {
      setGameState('finished')
      
      const finalScore = score
      if (sessionId) {
        await updateQuizSession(sessionId, {
          score: finalScore,
          answers,
          status: 'completed',
          completedAt: new Date()
        })
      }
    } else {
      const nextQ = questions[currentQuestionIndex + 1]
      setCurrentQuestionIndex(prev => prev + 1)
      resetQuestionState()
      setTimeLeft(nextQ.timeLimit || quiz.timePerQuestion || 30)
    }
  }

  // Style des options
  const getOptionClass = (option, index) => {
    const colors = ['bg-red-500', 'bg-blue-500', 'bg-yellow-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500']
    const baseColor = colors[index % colors.length]
    
    if (!showCorrectAnswer) {
      const isSelected = currentQuestion.type === QUESTION_TYPES.MULTIPLE_CHOICE
        ? selectedMultiple.find(o => o.id === option.id)
        : selectedAnswer?.id === option.id
      
      return `${baseColor} ${isSelected ? 'ring-4 ring-white scale-105' : 'hover:scale-105'} text-white`
    }

    if (option.isCorrect) {
      return 'bg-green-500 text-white ring-4 ring-green-300'
    }

    const wasSelected = currentQuestion.type === QUESTION_TYPES.MULTIPLE_CHOICE
      ? selectedMultiple.find(o => o.id === option.id)
      : selectedAnswer?.id === option.id

    if (wasSelected && !option.isCorrect) {
      return 'bg-red-500 text-white opacity-70'
    }

    return `${baseColor} opacity-40 text-white`
  }

  if (loading) {
    return <LoadingSpinner fullScreen text={t('quiz.loading', 'Chargement du quiz...')} />
  }

  // Écran d'introduction
  if (gameState === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
        <FloatingLanguageSelector position="top-right" />
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center animate-fade-in">
          <div className="w-20 h-20 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <FiPlay className="text-white text-3xl" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-800 mb-2">{quiz.title}</h1>
          <p className="text-gray-500 mb-6">{quiz.description || t('quiz.prepareToPlay', 'Préparez-vous à jouer !')}</p>
          
          <div className="flex justify-center gap-6 mb-8 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <FiClock className="text-purple-500" />
              <span>{quiz.timePerQuestion}s / {t('quiz.question', 'question')}</span>
            </div>
            <div className="flex items-center gap-2">
              <FiUsers className="text-purple-500" />
              <span>{questions.length} {t('quiz.questions', 'questions')}</span>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
              {t('quiz.yourName', 'Votre nom')}
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="input"
              placeholder={t('quiz.enterNamePlaceholder', 'Entrez votre nom...')}
              maxLength={30}
              onKeyDown={(e) => e.key === 'Enter' && startGame()}
            />
          </div>

          <button
            onClick={startGame}
            className="w-full btn btn-primary flex items-center justify-center gap-2 text-lg py-4"
          >
            <FiPlay />
            {t('common.start', 'Commencer')}
          </button>
        </div>
      </div>
    )
  }

  // Écran de jeu
  if (gameState === 'playing' && currentQuestion) {
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100
    const timerPercent = (timeLeft / (currentQuestion.timeLimit || quiz.timePerQuestion || 30)) * 100

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-6 text-white">
            <div className="text-lg font-bold">{playerName}</div>
            <div className="text-2xl font-bold">🏆 {score}</div>
          </div>

          {/* Progress */}
          <div className="mb-4">
            <div className="flex justify-between text-white text-sm mb-1">
              <span>{t('quiz.question', 'Question')} {currentQuestionIndex + 1} / {questions.length}</span>
              <span>{currentQuestion.points} {t('quiz.points', 'points')}</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Timer */}
          <div className="mb-6">
            <div className="flex items-center justify-center gap-3 mb-2">
              <FiClock className="text-white text-2xl" />
              <span className={`text-4xl font-bold ${timeLeft <= 5 ? 'text-red-300 animate-pulse' : 'text-white'}`}>
                {timeLeft}
              </span>
            </div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-1000 rounded-full ${
                  timerPercent > 50 ? 'bg-green-400' : timerPercent > 25 ? 'bg-yellow-400' : 'bg-red-400'
                }`}
                style={{ width: `${timerPercent}%` }}
              />
            </div>
          </div>

          {/* Question Card */}
          <div className="bg-white rounded-3xl shadow-2xl p-8 mb-6 animate-fade-in">
            <div className="text-center">
              <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-4">
                {currentQuestion.type === QUESTION_TYPES.SINGLE_CHOICE && `🎯 ${t('quiz.questionTypes.singleChoice', 'Choix unique')}`}
                {currentQuestion.type === QUESTION_TYPES.MULTIPLE_CHOICE && `☑️ ${t('quiz.questionTypes.multipleChoice', 'Plusieurs réponses')}`}
                {currentQuestion.type === QUESTION_TYPES.TRUE_FALSE && `✓✗ ${t('quiz.questionTypes.trueFalse', 'Vrai ou Faux')}`}
                {currentQuestion.type === QUESTION_TYPES.DROPDOWN && `📋 ${t('quiz.questionTypes.dropdown', 'Liste déroulante')}`}
                {currentQuestion.type === QUESTION_TYPES.SHORT_TEXT && `📝 ${t('quiz.questionTypes.shortText', 'Réponse texte')}`}
                {currentQuestion.type === QUESTION_TYPES.NUMBER && `🔢 ${t('quiz.questionTypes.number', 'Réponse numérique')}`}
                {currentQuestion.type === QUESTION_TYPES.RATING && `⭐ ${t('quiz.questionTypes.rating', 'Évaluation')}`}
                {currentQuestion.type === QUESTION_TYPES.PUZZLE && `🧩 ${t('quiz.puzzleReorder', 'Remettez dans l\'ordre')}`}
              </span>
              <h2 className="text-2xl font-bold text-gray-800">{currentQuestion.text}</h2>
              
              {/* Image de la question */}
              {currentQuestion.imageUrl && (
                <div className="mt-4">
                  <img 
                    src={currentQuestion.imageUrl} 
                    alt="Question" 
                    className="max-h-64 mx-auto rounded-xl shadow-lg object-contain"
                  />
                </div>
              )}
            </div>
          </div>

          {/* ========== CHOIX UNIQUE / VRAI-FAUX ========== */}
          {(currentQuestion.type === QUESTION_TYPES.SINGLE_CHOICE || 
            currentQuestion.type === QUESTION_TYPES.TRUE_FALSE) && (
            <div className={`grid gap-4 ${currentQuestion.options.length <= 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
              {currentQuestion.options.map((option, index) => (
                <button
                  key={option.id}
                  onClick={() => handleSelectOption(option)}
                  disabled={hasSubmitted}
                  className={`p-6 rounded-2xl font-bold text-lg transition-all transform ${getOptionClass(option, index)} ${
                    hasSubmitted ? 'cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  {option.text}
                  {showCorrectAnswer && option.isCorrect && (
                    <FiCheck className="inline ml-2" size={24} />
                  )}
                  {showCorrectAnswer && selectedAnswer?.id === option.id && !option.isCorrect && (
                    <FiX className="inline ml-2" size={24} />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* ========== CASES À COCHER (Multiple) ========== */}
          {currentQuestion.type === QUESTION_TYPES.MULTIPLE_CHOICE && (
            <div>
              <p className="text-white text-center mb-4">{t('quiz.checkAllCorrect', 'Cochez toutes les bonnes réponses')}</p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={option.id}
                    onClick={() => handleSelectOption(option)}
                    disabled={hasSubmitted}
                    className={`p-6 rounded-2xl font-bold text-lg transition-all transform ${getOptionClass(option, index)} ${
                      hasSubmitted ? 'cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    {option.text}
                    {showCorrectAnswer && option.isCorrect && (
                      <FiCheck className="inline ml-2" size={24} />
                    )}
                  </button>
                ))}
              </div>
              {!hasSubmitted && (
                <button
                  onClick={handleSubmitMultiple}
                  className="w-full btn btn-success py-4 text-lg"
                >
                  {t('quiz.validateAnswer', 'Valider ma réponse')}
                </button>
              )}
            </div>
          )}

          {/* ========== LISTE DÉROULANTE ========== */}
          {currentQuestion.type === QUESTION_TYPES.DROPDOWN && (
            <div className="bg-white rounded-2xl p-6">
              <select
                value={selectedAnswer?.id || ''}
                onChange={(e) => {
                  const opt = currentQuestion.options.find(o => o.id === parseInt(e.target.value))
                  if (opt) {
                    setSelectedAnswer(opt)
                    submitAnswer(opt)
                  }
                }}
                disabled={hasSubmitted}
                className="input text-lg py-4"
              >
                <option value="">{t('quiz.selectAnswer', '-- Sélectionnez une réponse --')}</option>
                {currentQuestion.options.map((option) => (
                  <option key={option.id} value={option.id}>{option.text}</option>
                ))}
              </select>
              {showCorrectAnswer && (
                <p className={`mt-4 text-center font-bold ${
                  selectedAnswer?.isCorrect ? 'text-green-600' : 'text-red-600'
                }`}>
                  {selectedAnswer?.isCorrect ? `✓ ${t('quiz.correct', 'Correct !')}` : `✗ ${t('quiz.correctAnswerWas', 'La bonne réponse était')} : ${getCorrectAnswerText(currentQuestion)}`}
                </p>
              )}
            </div>
          )}

          {/* ========== TEXTE COURT ========== */}
          {currentQuestion.type === QUESTION_TYPES.SHORT_TEXT && (
            <div className="bg-white rounded-2xl p-6">
              <input
                type="text"
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                disabled={hasSubmitted}
                className="input text-lg py-4 mb-4"
                placeholder={t('quiz.typeYourAnswer', 'Tapez votre réponse...')}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmitText()}
                autoFocus
              />
              {!hasSubmitted && (
                <button
                  onClick={handleSubmitText}
                  className="w-full btn btn-success py-4 text-lg"
                >
                  {t('quiz.validate', 'Valider')}
                </button>
              )}
              {showCorrectAnswer && (
                <p className={`mt-4 text-center font-bold ${
                  checkAnswer(currentQuestion, textAnswer) ? 'text-green-600' : 'text-red-600'
                }`}>
                  {checkAnswer(currentQuestion, textAnswer) 
                    ? `✓ ${t('quiz.correct', 'Correct !')}` 
                    : `✗ ${t('quiz.correctAnswerWas', 'La bonne réponse était')} : ${currentQuestion.correctAnswer}`
                  }
                </p>
              )}
            </div>
          )}

          {/* ========== NOMBRE ========== */}
          {currentQuestion.type === QUESTION_TYPES.NUMBER && (
            <div className="bg-white rounded-2xl p-6">
              <div className="relative">
                <FiHash className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
                <input
                  type="number"
                  value={numberAnswer}
                  onChange={(e) => setNumberAnswer(e.target.value)}
                  disabled={hasSubmitted}
                  className="input text-lg py-4 pl-12 mb-4"
                  placeholder={t('quiz.enterNumber', 'Entrez un nombre...')}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmitNumber()}
                  autoFocus
                />
              </div>
              {!hasSubmitted && (
                <button
                  onClick={handleSubmitNumber}
                  className="w-full btn btn-success py-4 text-lg"
                >
                  {t('quiz.validate', 'Valider')}
                </button>
              )}
              {showCorrectAnswer && (
                <p className={`mt-4 text-center font-bold ${
                  checkAnswer(currentQuestion, numberAnswer) ? 'text-green-600' : 'text-red-600'
                }`}>
                  {checkAnswer(currentQuestion, numberAnswer) 
                    ? `✓ ${t('quiz.correct', 'Correct !')}` 
                    : `✗ ${t('quiz.correctAnswerWas', 'La bonne réponse était')} : ${currentQuestion.correctAnswer}`
                  }
                </p>
              )}
            </div>
          )}

          {/* ========== RATING ========== */}
          {currentQuestion.type === QUESTION_TYPES.RATING && (
            <div className="bg-white rounded-2xl p-4 sm:p-6">
              <div className="flex justify-center gap-1 sm:gap-4 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => !hasSubmitted && setRatingAnswer(star)}
                    disabled={hasSubmitted}
                    className={`p-1 sm:p-4 transition-all ${
                      ratingAnswer >= star ? 'text-yellow-400 scale-110 sm:scale-125' : 'text-gray-300 hover:text-yellow-300'
                    }`}
                  >
                    <FiStar className="w-8 h-8 sm:w-12 sm:h-12" fill={ratingAnswer >= star ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>
              {!hasSubmitted && (
                <button
                  onClick={handleSubmitRating}
                  className="w-full btn btn-success py-4 text-lg"
                >
                  {t('quiz.validate', 'Valider')}
                </button>
              )}
              {showCorrectAnswer && (
                <p className={`mt-4 text-center font-bold ${
                  checkAnswer(currentQuestion, ratingAnswer) ? 'text-green-600' : 'text-red-600'
                }`}>
                  {checkAnswer(currentQuestion, ratingAnswer) 
                    ? `✓ ${t('quiz.correct', 'Correct !')}` 
                    : `✗ ${t('quiz.correctAnswerWas', 'La bonne réponse était')} : ${'⭐'.repeat(currentQuestion.correctRating)}`
                  }
                </p>
              )}
            </div>
          )}

          {/* ========== PUZZLE - Remettre dans l'ordre ========== */}
          {currentQuestion.type === QUESTION_TYPES.PUZZLE && (
            <div className="bg-white rounded-2xl p-6">
              <p className="text-center text-gray-600 mb-4">
                🧩 {t('quiz.puzzleInstruction', 'Utilisez les flèches pour réordonner les éléments')}
              </p>
              <div className="space-y-3 mb-6">
                {puzzleOrder.map((option, index) => {
                  // Déterminer la couleur après soumission
                  let itemClass = 'bg-gradient-to-r from-orange-100 to-amber-100 border-orange-300'
                  if (showCorrectAnswer) {
                    const correctOrder = currentQuestion.puzzleOrder || currentQuestion.options.map(o => o.id)
                    if (correctOrder[index] === option.id) {
                      itemClass = 'bg-gradient-to-r from-green-100 to-emerald-100 border-green-400'
                    } else {
                      itemClass = 'bg-gradient-to-r from-red-100 to-pink-100 border-red-400'
                    }
                  }
                  
                  return (
                    <div 
                      key={option.id} 
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 ${itemClass} transition-all`}
                    >
                      <span className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 text-white rounded-lg flex items-center justify-center font-bold">
                        {index + 1}
                      </span>
                      <span className="flex-1 font-medium text-gray-800">{option.text}</span>
                      {!hasSubmitted && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => movePuzzleItem(index, -1)}
                            disabled={index === 0}
                            className="p-2 bg-white rounded-lg shadow hover:bg-gray-50 disabled:opacity-30 transition-all"
                          >
                            <FiChevronUp className="text-gray-600" />
                          </button>
                          <button
                            onClick={() => movePuzzleItem(index, 1)}
                            disabled={index === puzzleOrder.length - 1}
                            className="p-2 bg-white rounded-lg shadow hover:bg-gray-50 disabled:opacity-30 transition-all"
                          >
                            <FiChevronDown className="text-gray-600" />
                          </button>
                        </div>
                      )}
                      {showCorrectAnswer && (
                        <span className="text-xl">
                          {(currentQuestion.puzzleOrder || currentQuestion.options.map(o => o.id))[index] === option.id ? '✓' : '✗'}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
              {!hasSubmitted && (
                <button
                  onClick={() => submitAnswer(puzzleOrder)}
                  className="w-full btn btn-success py-4 text-lg"
                >
                  {t('quiz.validateOrder', 'Valider mon ordre')}
                </button>
              )}
              {showCorrectAnswer && (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm font-medium text-gray-700 mb-2">{t('quiz.correctOrder', 'Ordre correct')} :</p>
                  <p className="text-gray-600">{getCorrectAnswerText(currentQuestion)}</p>
                </div>
              )}
            </div>
          )}

          {/* Feedback après réponse */}
          {showCorrectAnswer && (
            <div className={`mt-6 text-center text-white text-xl font-bold animate-fade-in ${
              answers[answers.length - 1]?.isCorrect ? 'text-green-300' : 'text-red-300'
            }`}>
              {answers[answers.length - 1]?.isCorrect 
                ? `🎉 ${t('quiz.correct', 'Correct')} ! +${answers[answers.length - 1]?.points} ${t('quiz.points', 'points')}` 
                : `😔 ${t('quiz.incorrect', 'Incorrect')}`
              }
            </div>
          )}
        </div>
      </div>
    )
  }

  // Écran de fin
  if (gameState === 'finished') {
    const totalPossible = questions.reduce((sum, q) => sum + q.points, 0)
    const percentage = Math.round((score / totalPossible) * 100)
    const correctCount = answers.filter(a => a.isCorrect).length

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full text-center animate-fade-in">
          <div className="text-7xl mb-6">
            {percentage >= 80 ? '🏆' : percentage >= 50 ? '👏' : '💪'}
          </div>
          
          <h1 className="text-3xl font-bold text-gray-800 mb-2">{t('quiz.live.quizEnded', 'Quiz terminé !')}</h1>
          <p className="text-gray-500 mb-6">{t('quiz.bravo', 'Bravo')} {playerName} !</p>

          <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-6 mb-6">
            <div className="text-5xl font-bold text-purple-600 mb-2">{score}</div>
            <div className="text-gray-500">{t('quiz.points', 'points')} / {totalPossible}</div>
            <div className="mt-4 flex justify-center gap-8 text-sm">
              <div>
                <div className="text-2xl font-bold text-green-600">{correctCount}</div>
                <div className="text-gray-500">{t('quiz.correct', 'Correct')}</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{questions.length - correctCount}</div>
                <div className="text-gray-500">{t('quiz.incorrect', 'Incorrect')}</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{percentage}%</div>
                <div className="text-gray-500">Score</div>
              </div>
            </div>
          </div>

          {/* Résumé des réponses */}
          <div className="text-left mb-6 max-h-64 overflow-y-auto">
            <h3 className="font-bold text-gray-700 mb-3">{t('quiz.answerDetails', 'Détail des réponses')} :</h3>
            {answers.map((answer, index) => (
              <div key={index} className={`p-3 rounded-lg mb-2 ${
                answer.isCorrect ? 'bg-green-50 border-l-4 border-green-500' : 'bg-red-50 border-l-4 border-red-500'
              }`}>
                <p className="text-sm font-medium text-gray-700">{answer.questionText}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {t('quiz.yourAnswer', 'Votre réponse')} : <span className={answer.isCorrect ? 'text-green-600' : 'text-red-600'}>{answer.selectedAnswer}</span>
                  {!answer.isCorrect && (
                    <span className="text-green-600 ml-2">→ {answer.correctAnswer}</span>
                  )}
                </p>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <button
              onClick={() => {
                setGameState('intro')
                setCurrentQuestionIndex(0)
                setScore(0)
                setAnswers([])
                resetQuestionState()
                setPlayerName('')
                setSessionId(null)
              }}
              className="w-full btn btn-primary flex items-center justify-center gap-2"
            >
              <FiPlay />
              {t('quiz.replay', 'Rejouer')}
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full btn btn-ghost text-gray-500"
            >
              {t('quiz.live.backToHome', 'Retour à l\'accueil')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default PlayQuiz
