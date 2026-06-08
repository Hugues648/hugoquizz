import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FiCheck, FiX, FiClock, FiChevronUp, FiChevronDown } from 'react-icons/fi'
import { playTickSFX } from '../../services/audioService'

// Question types
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

// Option colors (Kahoot style)
const OPTION_COLORS = [
  'from-red-500 to-red-600',
  'from-blue-500 to-blue-600',
  'from-yellow-500 to-yellow-600',
  'from-green-500 to-green-600',
  'from-purple-500 to-purple-600',
  'from-orange-500 to-orange-600'
]

const OPTION_SHAPES = ['▲', '◆', '●', '■', '★', '♦']

const QuestionDisplay = ({
  question,
  questionNumber,
  totalQuestions,
  timeLimit,
  timeLeft,
  onAnswer,
  hasAnswered = false,
  showCorrectAnswer = false,
  selectedAnswer = null,
  isHost = false,
  participantAnswers = [] // For host: shows how many picked each option
}) => {
  const { t } = useTranslation()
  const [localTimeLeft, setLocalTimeLeft] = useState(timeLeft)
  const [selectedMultiple, setSelectedMultiple] = useState([])
  const [textAnswer, setTextAnswer] = useState('')
  const [numberAnswer, setNumberAnswer] = useState('')
  const [ratingAnswer, setRatingAnswer] = useState(0)
  const [tickPlayed, setTickPlayed] = useState(false)
  const [puzzleOrder, setPuzzleOrder] = useState([])

  // Initialize puzzle order when question changes
  useEffect(() => {
    if (question?.type === QUESTION_TYPES.PUZZLE && question.options) {
      // Shuffle options for the player to reorder
      const shuffled = [...question.options].sort(() => Math.random() - 0.5)
      setPuzzleOrder(shuffled)
    }
  }, [question])

  // Sync time with props
  useEffect(() => {
    setLocalTimeLeft(timeLeft)
  }, [timeLeft])

  // Tick sound for last 5 seconds
  useEffect(() => {
    if (localTimeLeft <= 5 && localTimeLeft > 0 && !tickPlayed) {
      playTickSFX()
      setTickPlayed(true)
    }
    if (localTimeLeft > 5) {
      setTickPlayed(false)
    }
  }, [localTimeLeft])

  // Timer percentage
  const timerPercent = (localTimeLeft / timeLimit) * 100

  // Get timer color based on time left
  const getTimerColor = () => {
    if (timerPercent > 50) return 'from-green-400 to-emerald-500'
    if (timerPercent > 25) return 'from-yellow-400 to-orange-500'
    return 'from-red-400 to-red-600'
  }

  // Handle option selection
  const handleOptionClick = (option, index) => {
    if (hasAnswered || showCorrectAnswer || isHost) return

    if (question.type === QUESTION_TYPES.MULTIPLE_CHOICE) {
      setSelectedMultiple(prev => {
        const exists = prev.find(o => o.id === option.id)
        if (exists) {
          return prev.filter(o => o.id !== option.id)
        }
        return [...prev, option]
      })
    } else {
      onAnswer(option)
    }
  }

  // Submit multiple choice
  const handleSubmitMultiple = () => {
    if (selectedMultiple.length === 0) return
    onAnswer(selectedMultiple)
  }

  // Submit text answer
  const handleSubmitText = () => {
    if (!textAnswer.trim()) return
    onAnswer(textAnswer)
  }

  // Submit number answer
  const handleSubmitNumber = () => {
    if (numberAnswer === '' || isNaN(numberAnswer)) return
    onAnswer(parseFloat(numberAnswer))
  }

  // Submit rating
  const handleSubmitRating = () => {
    if (ratingAnswer === 0) return
    onAnswer(ratingAnswer)
  }

  // Move puzzle item up or down
  const movePuzzleItem = (fromIndex, direction) => {
    const toIndex = fromIndex + direction
    if (toIndex < 0 || toIndex >= puzzleOrder.length) return
    
    const newOrder = [...puzzleOrder]
    const [removed] = newOrder.splice(fromIndex, 1)
    newOrder.splice(toIndex, 0, removed)
    setPuzzleOrder(newOrder)
  }

  // Submit puzzle answer
  const handleSubmitPuzzle = () => {
    if (puzzleOrder.length === 0) return
    onAnswer(puzzleOrder)
  }

  // Get option style
  const getOptionStyle = (option, index) => {
    const baseColor = OPTION_COLORS[index % OPTION_COLORS.length]
    
    if (showCorrectAnswer) {
      if (option.isCorrect) {
        return 'bg-gradient-to-r from-green-400 to-emerald-500 ring-4 ring-green-300 ring-opacity-50 scale-105'
      }
      const wasSelected = question.type === QUESTION_TYPES.MULTIPLE_CHOICE
        ? selectedMultiple.find(o => o.id === option.id)
        : selectedAnswer?.id === option.id
      
      if (wasSelected && !option.isCorrect) {
        return 'bg-gradient-to-r from-red-400 to-red-600 opacity-60'
      }
      return `bg-gradient-to-r ${baseColor} opacity-40`
    }

    const isSelected = question.type === QUESTION_TYPES.MULTIPLE_CHOICE
      ? selectedMultiple.find(o => o.id === option.id)
      : selectedAnswer?.id === option.id

    if (isSelected) {
      return `bg-gradient-to-r ${baseColor} ring-4 ring-white ring-opacity-75 scale-105`
    }

    return `bg-gradient-to-r ${baseColor} hover:scale-105 hover:brightness-110`
  }

  // Count answers for host view
  const getAnswerCount = (optionId) => {
    return participantAnswers.filter(a => {
      if (Array.isArray(a.answer)) {
        return a.answer.some(ans => ans.id === optionId)
      }
      return a.answer?.id === optionId
    }).length
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-white text-sm mb-2">
          <span className="font-bold">Question {questionNumber} / {totalQuestions}</span>
          <span className="font-bold">{question.points} points</span>
        </div>
        <div className="h-2 bg-white/20 rounded-full overflow-hidden">
          <div 
            className="h-full bg-white transition-all duration-300"
            style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* Timer */}
      <div className="mb-6">
        <div className="flex items-center justify-center gap-3 mb-2">
          <FiClock className={`text-3xl ${localTimeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-white'}`} />
          <span className={`text-5xl font-extrabold ${localTimeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
            {localTimeLeft}
          </span>
        </div>
        <div className="h-4 bg-white/20 rounded-full overflow-hidden">
          <div 
            className={`h-full bg-gradient-to-r ${getTimerColor()} transition-all duration-1000 rounded-full`}
            style={{ width: `${timerPercent}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 mb-6 animate-slide-up">
        {/* Question type badge */}
        <div className="text-center mb-4">
          <span className="inline-block px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 rounded-full text-sm font-bold">
            {question.type === QUESTION_TYPES.SINGLE_CHOICE && `🎯 ${t('quiz.questionTypes.singleChoice')}`}
            {question.type === QUESTION_TYPES.MULTIPLE_CHOICE && `☑️ ${t('quiz.questionTypes.multipleChoice')}`}
            {question.type === QUESTION_TYPES.TRUE_FALSE && `✓✗ ${t('quiz.questionTypes.trueFalse')}`}
            {question.type === QUESTION_TYPES.DROPDOWN && `📋 ${t('quiz.questionTypes.dropdown')}`}
            {question.type === QUESTION_TYPES.SHORT_TEXT && `📝 ${t('quiz.questionTypes.shortText')}`}
            {question.type === QUESTION_TYPES.NUMBER && `🔢 ${t('quiz.questionTypes.number')}`}
            {question.type === QUESTION_TYPES.RATING && `⭐ ${t('quiz.questionTypes.rating')}`}
            {question.type === QUESTION_TYPES.PUZZLE && `🔢 ${t('quiz.questionTypes.ordering')}`}
          </span>
        </div>
        
        {/* Question text */}
        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-800 text-center">
          {question.text}
        </h2>

        {/* Question image */}
        {question.imageUrl && (
          <div className="mt-4 flex justify-center">
            <img
              src={question.imageUrl}
              alt={question.text}
              className="max-h-64 md:max-h-80 rounded-2xl object-contain shadow-lg"
              loading="eager"
            />
          </div>
        )}
      </div>

      {/* Puzzle / Ordering question */}
      {question.type === QUESTION_TYPES.PUZZLE && (
        <div>
          <p className="text-center text-white mb-4 font-medium">
            {t('quiz.live.orderElements')}
          </p>
          <div className="space-y-3 mb-4">
            {puzzleOrder.map((option, index) => {
              const correctOrder = question.puzzleOrder || question.options.map(o => o.id)
              const isCorrectPosition = showCorrectAnswer && correctOrder[index] === option.id
              
              return (
                <div
                  key={option.id}
                  className={`
                    flex items-center gap-3 p-4 rounded-2xl transition-all
                    ${showCorrectAnswer 
                      ? isCorrectPosition 
                        ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white' 
                        : 'bg-gradient-to-r from-red-400 to-red-500 text-white'
                      : 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white'
                    }
                  `}
                >
                  <span className="w-8 h-8 flex items-center justify-center bg-white/20 rounded-full font-bold">
                    {index + 1}
                  </span>
                  <span className="flex-1 font-semibold">{option.text}</span>
                  
                  {!hasAnswered && !isHost && !showCorrectAnswer && (
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => movePuzzleItem(index, -1)}
                        disabled={index === 0}
                        className={`p-1 rounded ${index === 0 ? 'opacity-30' : 'hover:bg-white/20'}`}
                      >
                        <FiChevronUp size={20} />
                      </button>
                      <button
                        onClick={() => movePuzzleItem(index, 1)}
                        disabled={index === puzzleOrder.length - 1}
                        className={`p-1 rounded ${index === puzzleOrder.length - 1 ? 'opacity-30' : 'hover:bg-white/20'}`}
                      >
                        <FiChevronDown size={20} />
                      </button>
                    </div>
                  )}
                  
                  {showCorrectAnswer && (
                    <span className="text-xl">
                      {isCorrectPosition ? '✓' : '✗'}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          
          {!hasAnswered && !isHost && !showCorrectAnswer && (
            <button
              onClick={handleSubmitPuzzle}
              disabled={puzzleOrder.length === 0}
              className="w-full py-4 rounded-2xl font-bold text-lg bg-gradient-to-r from-green-400 to-emerald-500 text-white hover:scale-102 transition-all"
            >
              {t('quiz.live.validateOrder')}
            </button>
          )}
        </div>
      )}

      {/* Options for choice-based questions */}
      {(question.type === QUESTION_TYPES.SINGLE_CHOICE || 
        question.type === QUESTION_TYPES.TRUE_FALSE ||
        question.type === QUESTION_TYPES.DROPDOWN) && (
        <div className={`grid gap-3 ${question.options?.length <= 2 ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2'}`}>
          {question.options?.map((option, index) => (
            <button
              key={option.id}
              onClick={() => handleOptionClick(option, index)}
              disabled={hasAnswered || isHost}
              className={`
                relative p-4 md:p-6 rounded-2xl font-bold text-lg md:text-xl text-white
                transition-all duration-300 transform
                ${getOptionStyle(option, index)}
                ${hasAnswered || isHost ? 'cursor-default' : 'cursor-pointer'}
              `}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl opacity-80">{OPTION_SHAPES[index]}</span>
                <span className="flex-1 text-left">{option.text}</span>
                
                {/* Correct/Wrong indicators */}
                {showCorrectAnswer && option.isCorrect && (
                  <FiCheck className="text-2xl" />
                )}
                {showCorrectAnswer && selectedAnswer?.id === option.id && !option.isCorrect && (
                  <FiX className="text-2xl" />
                )}
                
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Multiple choice with submit button */}
      {question.type === QUESTION_TYPES.MULTIPLE_CHOICE && (
        <div>
          <p className="text-center text-white mb-4 font-medium">
            {t('quiz.live.checkAllCorrect')}
          </p>
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 mb-4">
            {question.options?.map((option, index) => (
              <button
                key={option.id}
                onClick={() => handleOptionClick(option, index)}
                disabled={hasAnswered || isHost}
                className={`
                  relative p-4 md:p-6 rounded-2xl font-bold text-lg md:text-xl text-white
                  transition-all duration-300 transform
                  ${getOptionStyle(option, index)}
                  ${hasAnswered || isHost ? 'cursor-default' : 'cursor-pointer'}
                `}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl opacity-80">{OPTION_SHAPES[index]}</span>
                  <span className="flex-1 text-left">{option.text}</span>
                  {showCorrectAnswer && option.isCorrect && <FiCheck className="text-2xl" />}
                </div>
              </button>
            ))}
          </div>
          {!hasAnswered && !isHost && (
            <button
              onClick={handleSubmitMultiple}
              disabled={selectedMultiple.length === 0}
              className={`
                w-full py-4 rounded-2xl font-bold text-lg transition-all
                ${selectedMultiple.length > 0
                  ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white hover:scale-102'
                  : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                }
              `}
            >
              {t('quiz.live.validateAnswer')}
            </button>
          )}
        </div>
      )}

      {/* Text input */}
      {question.type === QUESTION_TYPES.SHORT_TEXT && !isHost && (
        <div className="bg-white rounded-2xl p-6">
          <input
            type="text"
            value={textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
            disabled={hasAnswered}
            placeholder={t('quiz.live.typeYourAnswer')}
            className="input text-lg py-4 mb-4"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmitText()}
            autoFocus
          />
          {!hasAnswered && (
            <button
              onClick={handleSubmitText}
              disabled={!textAnswer.trim()}
              className={`
                w-full py-4 rounded-2xl font-bold text-lg transition-all
                ${textAnswer.trim()
                  ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white'
                  : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                }
              `}
            >
              {t('quiz.live.validate')}
            </button>
          )}
        </div>
      )}

      {/* Number input */}
      {question.type === QUESTION_TYPES.NUMBER && !isHost && (
        <div className="bg-white rounded-2xl p-6">
          <input
            type="number"
            value={numberAnswer}
            onChange={(e) => setNumberAnswer(e.target.value)}
            disabled={hasAnswered}
            placeholder={t('quiz.live.enterNumber')}
            className="input text-lg py-4 mb-4"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmitNumber()}
            autoFocus
          />
          {!hasAnswered && (
            <button
              onClick={handleSubmitNumber}
              disabled={numberAnswer === '' || isNaN(numberAnswer)}
              className={`
                w-full py-4 rounded-2xl font-bold text-lg transition-all
                ${numberAnswer !== '' && !isNaN(numberAnswer)
                  ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white'
                  : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                }
              `}
            >
              {t('quiz.live.validate')}
            </button>
          )}
        </div>
      )}

      {/* Rating */}
      {question.type === QUESTION_TYPES.RATING && !isHost && (
        <div className="bg-white rounded-2xl p-4 sm:p-6">
          <div className="flex justify-center gap-1 sm:gap-2 md:gap-4 mb-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => !hasAnswered && setRatingAnswer(star)}
                disabled={hasAnswered}
                className={`
                  p-1 sm:p-2 md:p-4 transition-all text-3xl sm:text-4xl md:text-5xl
                  ${ratingAnswer >= star ? 'text-yellow-400 scale-110 sm:scale-125' : 'text-gray-300 hover:text-yellow-300'}
                `}
              >
                {ratingAnswer >= star ? '★' : '☆'}
              </button>
            ))}
          </div>
          {!hasAnswered && (
            <button
              onClick={handleSubmitRating}
              disabled={ratingAnswer === 0}
              className={`
                w-full py-4 rounded-2xl font-bold text-lg transition-all
                ${ratingAnswer > 0
                  ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white'
                  : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                }
              `}
            >
              {t('quiz.live.validate')}
            </button>
          )}
        </div>
      )}

      {/* Answered state for player - waiting for results */}
      {hasAnswered && !showCorrectAnswer && !isHost && (
        <div className="text-center mt-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 animate-pulse-soft">
            <div className="text-7xl mb-4 animate-bounce">✋</div>
            <p className="text-white text-2xl font-bold mb-2">{t('quiz.live.answerSent')}</p>
            <p className="text-white/70 text-lg">{t('quiz.live.waitingForTimeEnd')}</p>
            <div className="flex justify-center gap-2 mt-6">
              <div className="w-3 h-3 rounded-full bg-white animate-bounce" style={{ animationDelay: '0s' }} />
              <div className="w-3 h-3 rounded-full bg-white animate-bounce" style={{ animationDelay: '0.2s' }} />
              <div className="w-3 h-3 rounded-full bg-white animate-bounce" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default QuestionDisplay
