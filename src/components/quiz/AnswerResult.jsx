import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FiCheck, FiX } from 'react-icons/fi'

const AnswerResult = ({
  isCorrect,
  pointsEarned = 0,
  correctAnswer = '',
  yourAnswer = '',
  questionType = 'single_choice'
}) => {
  const { t } = useTranslation()
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    setTimeout(() => setShowContent(true), 300)
  }, [])

  return (
    <div className={`
      w-full max-w-lg mx-auto text-center p-8 rounded-3xl backdrop-blur-lg border border-white/20
      transition-all duration-500 transform
      ${showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}
      ${isCorrect 
        ? 'bg-gradient-to-br from-green-500/80 to-emerald-600/80' 
        : 'bg-gradient-to-br from-red-500/80 to-rose-600/80'
      }
    `}>
      {/* Icon */}
      <div className={`
        w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center
        ${isCorrect ? 'bg-green-400' : 'bg-red-400'}
        animate-bounce-in
      `}>
        {isCorrect ? (
          <FiCheck className="text-white text-5xl" />
        ) : (
          <FiX className="text-white text-5xl" />
        )}
      </div>

      {/* Message */}
      <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
        {isCorrect ? `🎉 ${t('quiz.correct')} !` : `😔 ${t('quiz.incorrect')}`}
      </h2>

      {/* Points */}
      {isCorrect && (
        <div className="mb-6">
          <span className="inline-block px-6 py-3 bg-white/20 rounded-full text-white text-xl font-bold animate-pulse">
            +{pointsEarned} {t('quiz.points')}
          </span>
        </div>
      )}

      {/* Correct answer (if wrong) */}
      {!isCorrect && correctAnswer && (
        <div className="mt-4 p-4 bg-white/10 rounded-2xl">
          <p className="text-white/80 text-sm mb-2">{t('quiz.live.correctAnswerWas')} :</p>
          <p className="text-white text-lg font-bold">{correctAnswer}</p>
        </div>
      )}

      {/* Your answer */}
      {yourAnswer && (
        <div className="mt-4 p-3 bg-white/10 rounded-xl">
          <p className="text-white/70 text-sm">
            {t('quiz.yourAnswer')} : <span className="font-medium">{yourAnswer}</span>
          </p>
        </div>
      )}

      {/* Decorative elements */}
      {isCorrect && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="absolute text-2xl animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`
              }}
            >
              {['⭐', '✨', '🌟', '💫'][Math.floor(Math.random() * 4)]}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AnswerResult
