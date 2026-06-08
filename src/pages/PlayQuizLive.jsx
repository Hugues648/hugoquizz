import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { 
  getQuizById,
  getLiveQuizSession,
  subscribeLiveQuizSession,
  joinLiveQuiz,
  leaveLiveQuiz,
  submitLiveAnswer
} from '../services/firestore'
import { 
  playLobbyMusic, 
  playGameplayMusic, 
  playSuspenseMusic, 
  playVictoryMusic,
  playCorrectSFX,
  playWrongSFX,
  playTimeUpSFX,
  playLeaderboardSFX,
  playCountdown3SFX,
  stopMusic,
  setMuted,
  getMuted
} from '../services/audioService'
import {
  getAllMusic,
  playLobbyPlaylist,
  playTrack,
  stopTrack,
  getRandomMusic,
  getGameplayCategory,
  MUSIC_CATEGORIES
} from '../services/quizMusicService'
import WaitingRoom, { getRandomEmoji } from '../components/quiz/WaitingRoom'
import QuestionDisplay from '../components/quiz/QuestionDisplay'
import AnswerResult from '../components/quiz/AnswerResult'
import Leaderboard from '../components/quiz/Leaderboard'
import Podium from '../components/quiz/Podium'
import LoadingSpinner from '../components/LoadingSpinner'
import FloatingLanguageSelector from '../components/FloatingLanguageSelector'
import { FiVolume2, FiVolumeX, FiUser, FiPlay } from 'react-icons/fi'
import toast from 'react-hot-toast'

// Question types for checking answers
const QUESTION_TYPES = {
  SINGLE_CHOICE: 'single_choice',
  MULTIPLE_CHOICE: 'multiple_choice',
  TRUE_FALSE: 'true_false',
  DROPDOWN: 'dropdown',
  SHORT_TEXT: 'short_text',
  NUMBER: 'number',
  RATING: 'rating'
}

const PlayQuizLive = () => {
  const { quizId, sessionId } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [loading, setLoading] = useState(true)
  const [quiz, setQuiz] = useState(null)
  const [session, setSession] = useState(null)
  const [participantId, setParticipantId] = useState(null)
  const [playerName, setPlayerName] = useState('')
  const [playerEmoji, setPlayerEmoji] = useState(getRandomEmoji())
  const [isMuted, setIsMuted] = useState(false)
  const [hasJoined, setHasJoined] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [hasAnswered, setHasAnswered] = useState(false)
  const [lastAnswer, setLastAnswer] = useState(null)
  const [showingResult, setShowingResult] = useState(false)
  const [previousRankings, setPreviousRankings] = useState([])
  
  // New states for enhanced experience
  const [musicData, setMusicData] = useState({})
  const [showCountdown, setShowCountdown] = useState(false)
  const [countdownValue, setCountdownValue] = useState(3)
  const [showTransition, setShowTransition] = useState(false)

  // Load quiz and session data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load admin music data
        const allMusic = await getAllMusic()
        setMusicData(allMusic)
        
        const [quizData, sessionData] = await Promise.all([
          getQuizById(quizId),
          getLiveQuizSession(sessionId)
        ])

        if (!quizData) {
          toast.error(t('quiz.notFound', 'Quiz introuvable'))
          navigate('/')
          return
        }

        if (!sessionData) {
          toast.error(t('quiz.live.sessionNotFound', 'Session de jeu introuvable'))
          navigate('/')
          return
        }

        if (sessionData.status !== 'waiting') {
          toast.error(t('quiz.live.alreadyStarted', 'Ce quiz a déjà commencé'))
          navigate('/')
          return
        }

        setQuiz(quizData)
        setSession(sessionData)
      } catch (error) {
        console.error('Error loading data:', error)
        toast.error(t('quiz.loadError', 'Erreur lors du chargement'))
        navigate('/')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [quizId, sessionId, navigate])

  // Helper functions for admin music
  const playAdminLobbyMusic = () => {
    const lobbyMusic = musicData[MUSIC_CATEGORIES.LOBBY] || []
    if (lobbyMusic.length > 0) {
      playLobbyPlaylist(lobbyMusic, 0.5)
    } else {
      playLobbyMusic()
    }
  }

  const playAdminGameplayMusic = (duration) => {
    const category = getGameplayCategory(duration)
    const gameplayMusic = musicData[category] || []
    if (gameplayMusic.length > 0) {
      const music = getRandomMusic(gameplayMusic)
      playTrack(music.url, { volume: 0.5 })
    } else {
      playGameplayMusic()
    }
  }

  const playAdminResultsMusic = () => {
    const resultsMusic = musicData[MUSIC_CATEGORIES.RESULTS] || []
    if (resultsMusic.length > 0) {
      const music = getRandomMusic(resultsMusic)
      playTrack(music.url, { volume: 0.5 })
    } else {
      playSuspenseMusic()
    }
  }

  const playAdminPodiumMusic = () => {
    const podiumMusic = musicData[MUSIC_CATEGORIES.PODIUM] || []
    if (podiumMusic.length > 0) {
      const music = getRandomMusic(podiumMusic)
      playTrack(music.url, { volume: 0.6, loop: true })
    } else {
      playVictoryMusic()
    }
  }

  // Subscribe to session updates
  useEffect(() => {
    if (!sessionId || !hasJoined) return

    let prevQuestionIndex = -1

    const unsubscribe = subscribeLiveQuizSession(sessionId, async (sessionData) => {
      if (!sessionData) {
        toast.error(t('quiz.live.sessionClosed', 'La session a été fermée'))
        navigate('/')
        return
      }

      const prevStatus = session?.status
      const newStatus = sessionData.status
      const currentQuestionIndex = sessionData.currentQuestionIndex || 0

      // Handle status changes
      if (prevStatus !== newStatus) {
        switch (newStatus) {
          case 'started':
            // Show countdown when quiz starts
            stopMusic()
            stopTrack()
            setShowCountdown(true)
            setCountdownValue(3)
            
            // Countdown animation
            for (let i = 3; i >= 1; i--) {
              setCountdownValue(i)
              playCountdown3SFX()
              await new Promise(resolve => setTimeout(resolve, 1000))
            }
            setShowCountdown(false)
            break
            
          case 'question':
            // Show transition before question
            if (prevStatus !== 'started' && currentQuestionIndex !== prevQuestionIndex) {
              setShowTransition(true)
              await new Promise(resolve => setTimeout(resolve, 800))
              setShowTransition(false)
            }
            prevQuestionIndex = currentQuestionIndex
            
            setHasAnswered(false)
            setLastAnswer(null)
            setShowingResult(false)
            
            // Get question duration and play appropriate music
            const currentQ = sessionData.questions?.[currentQuestionIndex]
            const duration = currentQ?.timeLimit || 30
            playAdminGameplayMusic(duration)
            break
            
          case 'results':
            stopMusic()
            stopTrack()
            playAdminResultsMusic()
            // Play correct/incorrect sound
            if (lastAnswer?.isCorrect) {
              playCorrectSFX()
            } else {
              playWrongSFX()
            }
            setShowingResult(true)
            break
            
          case 'leaderboard':
            setPreviousRankings([...(session?.participants || [])])
            playLeaderboardSFX()
            break
            
          case 'podium':
            stopMusic()
            stopTrack()
            playAdminPodiumMusic()
            break
            
          case 'finished':
            stopMusic()
            stopTrack()
            break
        }
      }

      setSession(sessionData)
    })

    return () => {
      unsubscribe()
      stopTrack()
    }
  }, [sessionId, hasJoined, session?.status, musicData, lastAnswer])

  // Timer for questions - uses timerStartTime to add 3s grace period
  useEffect(() => {
    if (session?.status !== 'question' || !session?.questionEndTime) return

    const interval = setInterval(() => {
      const now = new Date()
      const endTime = new Date(session.questionEndTime)
      const timerStart = session.timerStartTime ? new Date(session.timerStartTime) : new Date(session.questionStartTime)
      const displayTime = session.displayTimeLimit || 30
      
      // If we're still in grace period, show full time
      if (now < timerStart) {
        setTimeLeft(displayTime)
        return
      }
      
      // Calculate remaining time from timerStartTime
      const remaining = Math.max(0, Math.ceil((endTime - now) / 1000))
      
      // Cap at displayTimeLimit so it shows the correct countdown
      setTimeLeft(Math.min(remaining, displayTime))

      if (remaining === 0 && !hasAnswered) {
        // Time's up - auto submit empty answer
        playTimeUpSFX()
        handleTimeout()
      }
    }, 100)

    return () => clearInterval(interval)
  }, [session?.status, session?.questionEndTime, session?.timerStartTime, hasAnswered])

  // Leave quiz on unmount
  useEffect(() => {
    return () => {
      if (participantId && sessionId) {
        leaveLiveQuiz(sessionId, participantId)
      }
      stopMusic()
    }
  }, [participantId, sessionId])

  // Join the quiz
  const handleJoin = async () => {
    if (!playerName.trim()) {
      toast.error(t('quiz.live.enterName', 'Veuillez entrer votre nom'))
      return
    }

    try {
      const id = await joinLiveQuiz(sessionId, {
        name: playerName.trim(),
        emoji: playerEmoji
      })
      setParticipantId(id)
      setHasJoined(true)
      playAdminLobbyMusic()
      toast.success(t('quiz.live.welcome', 'Bienvenue dans le quiz !'))
    } catch (error) {
      console.error('Error joining quiz:', error)
      toast.error(error.message || t('quiz.live.joinError', 'Erreur lors de la connexion'))
    }
  }

  // Toggle mute
  const handleToggleMute = () => {
    const newMuted = !isMuted
    setIsMuted(newMuted)
    setMuted(newMuted)
    if (newMuted) {
      stopTrack()
    }
  }

  // Get current question
  const getCurrentQuestion = () => {
    if (!session?.questions || session.currentQuestionIndex === undefined) return null
    return session.questions[session.currentQuestionIndex]
  }

  // Check if answer is correct
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
      
      default:
        return false
    }
  }

  // Get correct answer text
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
      default:
        return ''
    }
  }

  // Handle answer submission
  const handleAnswer = async (answer) => {
    if (hasAnswered) return
    setHasAnswered(true)

    const question = getCurrentQuestion()
    const timeLimit = question.timeLimit || quiz.timePerQuestion || 30
    const timeSpent = timeLimit - timeLeft
    const isCorrect = checkAnswer(question, answer)
    const basePoints = question.points || 1000
    const pointsEarned = isCorrect 
      ? Math.round(basePoints * (1 - timeSpent / timeLimit * 0.5)) 
      : 0

    // Ne pas jouer de son ici - les résultats seront révélés plus tard par l'animateur

    // Format answer text
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

    const answerData = {
      questionIndex: session.currentQuestionIndex,
      answer,
      answerText,
      isCorrect,
      pointsEarned,
      timeSpent
    }

    setLastAnswer(answerData)

    try {
      await submitLiveAnswer(sessionId, participantId, answerData)
    } catch (error) {
      console.error('Error submitting answer:', error)
    }
  }

  // Handle timeout
  const handleTimeout = async () => {
    if (hasAnswered) return
    
    const question = getCurrentQuestion()
    const answerData = {
      questionIndex: session.currentQuestionIndex,
      answer: null,
      answerText: t('quiz.timeUp', 'Temps écoulé'),
      isCorrect: false,
      pointsEarned: 0,
      timeSpent: question.timeLimit || quiz.timePerQuestion || 30
    }

    setHasAnswered(true)
    setLastAnswer(answerData)
    // Ne pas jouer de son - l'animateur révélera les résultats

    try {
      await submitLiveAnswer(sessionId, participantId, answerData)
    } catch (error) {
      console.error('Error submitting timeout:', error)
    }
  }

  // Get current participant data
  const getCurrentParticipant = () => {
    return session?.participants?.find(p => p.id === participantId)
  }

  if (loading) {
    return <LoadingSpinner fullScreen text={t('quiz.loading', 'Chargement du quiz...')} />
  }

  // 3-2-1 Countdown overlay for players
  if (showCountdown) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center">
        <div className="text-center">
          <div 
            className="text-[150px] md:text-[200px] font-black text-white animate-pulse drop-shadow-2xl"
            style={{
              textShadow: '0 0 60px rgba(255,255,255,0.5), 0 0 100px rgba(255,255,255,0.3)',
            }}
          >
            {countdownValue}
          </div>
          <p className="text-xl md:text-2xl text-white/80 mt-4">{t('quiz.live.getReady', 'C\'est parti !')}</p>
        </div>
      </div>
    )
  }

  // Transition between questions for players
  if (showTransition) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-600 to-red-600 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="text-5xl md:text-6xl mb-6">🎯</div>
          <h1 className="text-3xl md:text-5xl font-black text-white mb-4 drop-shadow-lg">
            {quiz?.title}
          </h1>
          <p className="text-lg md:text-xl text-white/80">
            {t('quiz.nextQuestion', 'Question suivante...')}
          </p>
        </div>
      </div>
    )
  }

  // Join screen
  if (!hasJoined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 flex items-center justify-center p-4">
        <FloatingLanguageSelector position="top-right" />
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center animate-slide-up">
          <div className="text-6xl mb-4">🎮</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">{quiz?.title}</h1>
          <p className="text-gray-500 mb-8">{t('quiz.live.joinLiveQuiz', 'Rejoindre le quiz en direct')}</p>

          {/* Emoji selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {t('quiz.live.chooseAvatar', 'Choisissez votre avatar')}
            </label>
            <div className="flex justify-center gap-3 flex-wrap mb-4">
              {['😀', '😎', '🤓', '🥳', '😍', '🦊', '🐱', '🦄', '🔥', '⭐'].map(emoji => (
                <button
                  key={emoji}
                  onClick={() => setPlayerEmoji(emoji)}
                  className={`text-3xl p-2 rounded-xl transition-all ${
                    playerEmoji === emoji 
                      ? 'bg-purple-100 scale-125 ring-2 ring-purple-500' 
                      : 'hover:bg-gray-100'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPlayerEmoji(getRandomEmoji())}
              className="text-sm text-purple-600 hover:text-purple-800"
            >
              🎲 {t('quiz.live.randomEmoji', 'Emoji aléatoire')}
            </button>
          </div>

          {/* Name input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
              {t('quiz.yourName', 'Votre nom')}
            </label>
            <div className="relative">
              <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="input pl-12"
                placeholder={t('quiz.enterNamePlaceholder', 'Entrez votre nom...')}
                maxLength={20}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              />
            </div>
          </div>

          <button
            onClick={handleJoin}
            disabled={!playerName.trim()}
            className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
              playerName.trim()
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:scale-105'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <FiUser />
            {t('quiz.live.joinWaitingRoom', 'Rejoindre la salle d\'attente')}
          </button>
        </div>
      </div>
    )
  }

  // Waiting room
  if (session?.status === 'waiting') {
    return (
      <WaitingRoom
        quiz={quiz}
        participants={session?.participants || []}
        isHost={false}
        onMuteToggle={handleToggleMute}
        isMuted={isMuted}
        playerName={playerName}
        playerEmoji={playerEmoji}
      />
    )
  }

  // Question phase
  if (session?.status === 'question') {
    const currentQuestion = getCurrentQuestion()
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-4">
        {/* Player header */}
        <div className="max-w-4xl mx-auto mb-4">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{playerEmoji}</span>
              <span className="font-bold">{playerName}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="px-4 py-2 bg-white/20 rounded-full font-bold">
                🏆 {getCurrentParticipant()?.score || 0}
              </span>
              <button
                onClick={handleToggleMute}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30"
              >
                {isMuted ? <FiVolumeX size={20} /> : <FiVolume2 size={20} />}
              </button>
            </div>
          </div>
        </div>

        {currentQuestion && (
          <QuestionDisplay
            question={currentQuestion}
            questionNumber={(session?.currentQuestionIndex || 0) + 1}
            totalQuestions={session?.questions?.length || 0}
            timeLimit={currentQuestion.timeLimit || quiz.timePerQuestion || 30}
            timeLeft={timeLeft}
            onAnswer={handleAnswer}
            hasAnswered={hasAnswered}
            selectedAnswer={lastAnswer?.answer}
          />
        )}
      </div>
    )
  }

  // Results phase - show player's result
  if (session?.status === 'results') {
    const currentQuestion = getCurrentQuestion()
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-600 to-red-600 flex items-center justify-center p-4">
        {/* Player header */}
        <div className="absolute top-4 left-4 right-4">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{playerEmoji}</span>
              <span className="font-bold">{playerName}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="px-4 py-2 bg-white/20 rounded-full font-bold">
                🏆 {getCurrentParticipant()?.score || 0}
              </span>
              <button
                onClick={handleToggleMute}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30"
              >
                {isMuted ? <FiVolumeX size={20} /> : <FiVolume2 size={20} />}
              </button>
            </div>
          </div>
        </div>

        <AnswerResult
          isCorrect={lastAnswer?.isCorrect || false}
          pointsEarned={lastAnswer?.pointsEarned || 0}
          correctAnswer={currentQuestion ? getCorrectAnswerText(currentQuestion) : ''}
          yourAnswer={lastAnswer?.answerText || 'Pas de réponse'}
        />
      </div>
    )
  }

  // Leaderboard phase
  if (session?.status === 'leaderboard') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-4">
        {/* Player header */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{playerEmoji}</span>
              <span className="font-bold">{playerName}</span>
            </div>
            <button
              onClick={handleToggleMute}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30"
            >
              {isMuted ? <FiVolumeX size={20} /> : <FiVolume2 size={20} />}
            </button>
          </div>
        </div>

        <Leaderboard
          participants={session?.participants || []}
          limit={5}
          showAll={session?.showFinalScores}
          currentPlayerId={participantId}
          previousRankings={previousRankings}
          animated={true}
        />

        {/* Waiting message */}
        <div className="text-center mt-8 text-white/70">
          <p>{t('quiz.live.waitingForHost', 'En attente de l\'animateur...')}</p>
        </div>
      </div>
    )
  }

  // Podium phase
  if (session?.status === 'podium') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-500 via-orange-500 to-red-500">
        <Podium
          participants={session?.participants || []}
          animated={true}
        />
        
        {/* Player's final position */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center">
          {(() => {
            const sorted = [...(session?.participants || [])].sort((a, b) => b.score - a.score)
            const rank = sorted.findIndex(p => p.id === participantId) + 1
            return (
              <div className="bg-white/20 backdrop-blur-lg rounded-2xl px-6 py-4 text-white">
                <p className="text-sm opacity-80">{t('quiz.live.yourFinalRanking', 'Votre classement final')}</p>
                <p className="text-3xl font-bold">{rank}ème / {sorted.length}</p>
              </div>
            )
          })()}
        </div>
      </div>
    )
  }

  // Finished
  if (session?.status === 'finished') {
    const participant = getCurrentParticipant()
    const sorted = [...(session?.participants || [])].sort((a, b) => b.score - a.score)
    const rank = sorted.findIndex(p => p.id === participantId) + 1

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center animate-slide-up">
          <div className="text-8xl mb-6">
            {rank === 1 ? '🏆' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🎉'}
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">{t('quiz.live.quizEnded', 'Quiz terminé !')}</h1>
          <p className="text-gray-500 mb-6">{t('quiz.bravo', 'Bravo')} {playerName} !</p>

          <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-6 mb-6">
            <div className="text-4xl font-bold text-purple-600 mb-2">
              {participant?.score || 0} points
            </div>
            <div className="text-gray-600">
              {rank}ème sur {sorted.length} joueurs
            </div>
          </div>

          <button
            onClick={() => navigate('/')}
            className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-bold hover:scale-105 transition-transform"
          >
            {t('quiz.live.backToHome', 'Retour à l\'accueil')}
          </button>
        </div>
      </div>
    )
  }

  return null
}

export default PlayQuizLive
