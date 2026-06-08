import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { 
  getQuizById, 
  createLiveQuizSession, 
  subscribeLiveQuizSession,
  updateLiveQuizSession,
  startLiveQuiz,
  nextLiveQuestion,
  showQuestionResults,
  showLeaderboard,
  showPodium,
  endLiveQuiz
} from '../services/firestore'
import { 
  playLobbyMusic, 
  playGameplayMusic, 
  playSuspenseMusic, 
  playVictoryMusic,
  playLeaderboardMusic,
  playNewQuestionSFX,
  playLeaderboardSFX,
  playDrumrollSFX,
  playPlayerJoinSFX,
  playCountdown3SFX,
  stopMusic,
  setMuted,
  getMuted,
  resetMusicPlaylist,
  initAudio
} from '../services/audioService'
import {
  getAllMusic,
  playLobbyPlaylist,
  playGameplayMusic as playGameplayMusicFromBank,
  playTrack,
  stopTrack,
  getRandomMusic,
  getGameplayCategory,
  MUSIC_CATEGORIES
} from '../services/quizMusicService'
import WaitingRoom from '../components/quiz/WaitingRoom'
import QuestionDisplay from '../components/quiz/QuestionDisplay'
import Leaderboard from '../components/quiz/Leaderboard'
import Podium from '../components/quiz/Podium'
import LoadingSpinner from '../components/LoadingSpinner'
import { FiPlay, FiSkipForward, FiUsers, FiVolume2, FiVolumeX, FiHome, FiBarChart2, FiAward, FiStopCircle } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { getShareableLink } from '../config/app'

const HostQuiz = () => {
  const { quizId } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user, getParticipantLimit } = useAuth()

  const [loading, setLoading] = useState(true)
  const [quiz, setQuiz] = useState(null)
  const [questions, setQuestions] = useState([])
  const [sessionId, setSessionId] = useState(null)
  const [session, setSession] = useState(null)
  const [isMuted, setIsMuted] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [previousRankings, setPreviousRankings] = useState([])
  const lastParticipantCountRef = useRef(0)
  
  // New states for enhanced quiz experience
  const [musicData, setMusicData] = useState({})
  const [showCountdown, setShowCountdown] = useState(false)
  const [countdownValue, setCountdownValue] = useState(3)
  const [showTransition, setShowTransition] = useState(false)
  const [currentMusicDuration, setCurrentMusicDuration] = useState(null)

  // Load quiz data and music
  useEffect(() => {
    // Attendre que l'utilisateur soit chargé
    if (!user) {
      return
    }

    const loadQuiz = async () => {
      try {
        // Load admin music data
        const allMusic = await getAllMusic()
        setMusicData(allMusic)
        
        const quizData = await getQuizById(quizId)
        
        if (!quizData) {
          toast.error(t('quiz.live.notFound', 'Quiz introuvable'))
          navigate('/dashboard')
          return
        }

        if (quizData.userId !== user.uid) {
          toast.error(t('quiz.live.notOwner', 'Vous n\'êtes pas le propriétaire de ce quiz'))
          navigate('/dashboard')
          return
        }

        if (!quizData.questions?.length) {
          toast.error(t('quiz.live.noQuestions', 'Ce quiz n\'a pas de questions'))
          navigate('/dashboard')
          return
        }

        setQuiz(quizData)
        
        // Randomize if needed
        let orderedQuestions = [...quizData.questions]
        if (quizData.randomizeQuestions) {
          orderedQuestions = orderedQuestions.sort(() => Math.random() - 0.5)
        }
        setQuestions(orderedQuestions)

        // Get participant limit based on subscription
        const maxParticipants = getParticipantLimit()

        // Create live session
        const newSessionId = await createLiveQuizSession({
          quizId,
          quizTitle: quizData.title,
          hostId: user.uid,
          questions: orderedQuestions,
          totalQuestions: orderedQuestions.length,
          maxParticipants: maxParticipants // -1 for unlimited, 5 for free users
        })
        
        setSessionId(newSessionId)
        
        // Reset music playlist and init audio (requires user interaction)
        resetMusicPlaylist()
        await initAudio()
        
        // Play lobby music from admin uploads or fallback to synthesized
        const lobbyMusic = allMusic[MUSIC_CATEGORIES.LOBBY] || []
        if (lobbyMusic.length > 0) {
          playLobbyPlaylist(lobbyMusic, 0.5)
        } else {
          playLobbyMusic()
        }
      } catch (error) {
        console.error('Error loading quiz:', error)
        toast.error(t('quiz.live.loadError', 'Erreur lors du chargement du quiz'))
      } finally {
        setLoading(false)
      }
    }

    loadQuiz()

    return () => {
      stopMusic()
      stopTrack()
    }
  }, [quizId, user, navigate])

  // Subscribe to session updates
  useEffect(() => {
    if (!sessionId) return

    const unsubscribe = subscribeLiveQuizSession(sessionId, (sessionData) => {
      // Play sound when new player joins
      const currentCount = sessionData?.participants?.length || 0
      if (currentCount > lastParticipantCountRef.current && sessionData?.status === 'waiting') {
        playPlayerJoinSFX()
      }
      lastParticipantCountRef.current = currentCount
      setSession(sessionData)
    })

    return () => unsubscribe()
  }, [sessionId])

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
      
      // Calculate remaining time
      const remaining = Math.max(0, Math.ceil((endTime - now) / 1000))
      
      // Cap at displayTimeLimit
      setTimeLeft(Math.min(remaining, displayTime))

      if (remaining === 0) {
        // Auto-show results when time is up
        handleShowResults()
      }
    }, 100)

    return () => clearInterval(interval)
  }, [session?.status, session?.questionEndTime, session?.timerStartTime])

  // Toggle mute
  const handleToggleMute = () => {
    const newMuted = !isMuted
    setIsMuted(newMuted)
    setMuted(newMuted)
    if (newMuted) {
      stopTrack()
    }
  }

  // Play countdown sound effect
  const playCountdownSound = () => {
    const countdownMusic = musicData[MUSIC_CATEGORIES.COUNTDOWN] || []
    if (countdownMusic.length > 0) {
      const sound = getRandomMusic(countdownMusic)
      playTrack(sound.url, { volume: 0.7 })
    } else {
      playCountdown3SFX()
    }
  }

  // Play transition sound
  const playTransitionSound = async () => {
    const transitionMusic = musicData[MUSIC_CATEGORIES.TRANSITION] || []
    if (transitionMusic.length > 0) {
      const sound = getRandomMusic(transitionMusic)
      await playTrack(sound.url, { volume: 0.6 })
    }
  }

  // Play results/statistics music
  const playResultsMusic = () => {
    const resultsMusic = musicData[MUSIC_CATEGORIES.RESULTS] || []
    if (resultsMusic.length > 0) {
      const music = getRandomMusic(resultsMusic)
      playTrack(music.url, { volume: 0.5, loop: true })
    } else {
      playSuspenseMusic()
    }
  }

  // Play podium music
  const playPodiumMusic = () => {
    const podiumMusic = musicData[MUSIC_CATEGORIES.PODIUM] || []
    if (podiumMusic.length > 0) {
      const music = getRandomMusic(podiumMusic)
      playTrack(music.url, { volume: 0.6, loop: true })
    } else {
      playVictoryMusic()
    }
  }

  // Play gameplay music based on question duration
  const playQuestionMusic = (duration) => {
    const category = getGameplayCategory(duration)
    const gameplayMusic = musicData[category] || []
    
    if (gameplayMusic.length > 0) {
      const music = getRandomMusic(gameplayMusic)
      setCurrentMusicDuration(music.duration || duration + 4)
      playTrack(music.url, { volume: 0.5 })
      return music
    } else {
      // Fallback to synthesized music
      playGameplayMusic()
      return null
    }
  }

  // Start the quiz with countdown
  const handleStartQuiz = async () => {
    try {
      stopMusic()
      stopTrack()
      
      // Show 3-2-1 countdown
      setShowCountdown(true)
      setCountdownValue(3)
      playCountdownSound()
      
      // Countdown animation
      for (let i = 3; i >= 1; i--) {
        setCountdownValue(i)
        if (i < 3) playCountdown3SFX() // Tick sound for each second
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      
      setShowCountdown(false)
      
      await startLiveQuiz(sessionId)
      
      // Start first question with transition
      const firstQuestion = questions[0]
      const timeLimit = firstQuestion.timeLimit || quiz.timePerQuestion || 30
      
      // Show brief transition
      setShowTransition(true)
      await playTransitionSound()
      await new Promise(resolve => setTimeout(resolve, 800))
      setShowTransition(false)
      
      // Play gameplay music
      playQuestionMusic(timeLimit)
      
      await nextLiveQuestion(sessionId, 0, timeLimit)
      setTimeLeft(timeLimit)
    } catch (error) {
      console.error('Error starting quiz:', error)
      toast.error(t('quiz.live.startError', 'Erreur lors du démarrage'))
    }
  }

  // Show results for current question
  const handleShowResults = async () => {
    try {
      stopMusic()
      stopTrack()
      playResultsMusic()
      await showQuestionResults(sessionId)
    } catch (error) {
      console.error('Error showing results:', error)
    }
  }

  // Show leaderboard
  const handleShowLeaderboard = async () => {
    try {
      stopMusic()
      stopTrack()
      playLeaderboardSFX()
      setTimeout(() => playResultsMusic(), 500)
      setPreviousRankings([...(session?.participants || [])])
      await showLeaderboard(sessionId)
    } catch (error) {
      console.error('Error showing leaderboard:', error)
    }
  }

  // Go to next question
  const handleNextQuestion = async () => {
    const nextIndex = (session?.currentQuestionIndex || 0) + 1
    
    if (nextIndex >= questions.length) {
      // Quiz finished - show final scores then podium
      handleShowFinalScores()
      return
    }

    try {
      stopMusic()
      stopTrack()
      
      // Show transition between questions
      setShowTransition(true)
      await playTransitionSound()
      await new Promise(resolve => setTimeout(resolve, 800))
      setShowTransition(false)
      
      const nextQ = questions[nextIndex]
      const timeLimit = nextQ.timeLimit || quiz.timePerQuestion || 30
      
      // Play gameplay music for this duration
      playQuestionMusic(timeLimit)
      
      await nextLiveQuestion(sessionId, nextIndex, timeLimit)
      setTimeLeft(timeLimit)
    } catch (error) {
      console.error('Error going to next question:', error)
      toast.error(t('quiz.live.nextQuestionError', 'Erreur lors du passage à la question suivante'))
    }
  }

  // Show final scores
  const handleShowFinalScores = async () => {
    try {
      stopMusic()
      stopTrack()
      playLeaderboardSFX()
      playResultsMusic()
      await showLeaderboard(sessionId)
      await updateLiveQuizSession(sessionId, { showFinalScores: true })
    } catch (error) {
      console.error('Error showing final scores:', error)
    }
  }

  // Show podium
  const handleShowPodium = async () => {
    try {
      stopMusic()
      stopTrack()
      // Play podium music immediately when podium page shows
      playPodiumMusic()
      await showPodium(sessionId)
    } catch (error) {
      console.error('Error showing podium:', error)
    }
  }

  // End quiz immediately (host can stop at any moment)
  const handleForceEndQuiz = async () => {
    if (!confirm(t('quiz.live.confirmStop', 'Êtes-vous sûr de vouloir arrêter le quiz maintenant ?'))) return
    
    try {
      stopMusic()
      stopTrack()
      // Go directly to final scores
      playLeaderboardSFX()
      await showLeaderboard(sessionId)
      await updateLiveQuizSession(sessionId, { showFinalScores: true, forcedEnd: true })
    } catch (error) {
      console.error('Error force ending quiz:', error)
    }
  }

  // End quiz
  const handleEndQuiz = async () => {
    try {
      stopMusic()
      stopTrack()
      await endLiveQuiz(sessionId)
      toast.success(t('quiz.live.quizEnded', 'Quiz terminé !'))
      navigate('/dashboard')
    } catch (error) {
      console.error('Error ending quiz:', error)
    }
  }

  // Get current question
  const currentQuestion = questions[session?.currentQuestionIndex || 0]

  // Get share link
  const getSessionLink = () => {
    return `${window.location.origin}/play/quiz/${quizId}/live/${sessionId}`
  }

  // Get participant answers for current question
  const getParticipantAnswers = () => {
    if (!session?.participants) return []
    const questionIndex = session.currentQuestionIndex
    return session.participants
      .map(p => p.answers?.find(a => a.questionIndex === questionIndex))
      .filter(Boolean)
  }

  if (loading) {
    return <LoadingSpinner fullScreen text={t('quiz.live.preparing', 'Préparation du quiz...')} />
  }

  // 3-2-1 Countdown overlay
  if (showCountdown) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center">
        <div className="text-center">
          <div 
            className="text-[200px] font-black text-white animate-pulse drop-shadow-2xl"
            style={{
              textShadow: '0 0 60px rgba(255,255,255,0.5), 0 0 100px rgba(255,255,255,0.3)',
              animation: 'pulse 1s ease-in-out infinite'
            }}
          >
            {countdownValue}
          </div>
          <p className="text-2xl text-white/80 mt-4">{t('quiz.live.getReady', 'Préparez-vous !')}</p>
        </div>
      </div>
    )
  }

  // Transition between questions
  if (showTransition) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-600 to-red-600 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="text-6xl mb-6">🎯</div>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-4 drop-shadow-lg">
            {quiz?.title}
          </h1>
          <p className="text-xl text-white/80">
            Question {(session?.currentQuestionIndex || 0) + 1} / {questions.length}
          </p>
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
        isHost={true}
        onStart={handleStartQuiz}
        onMuteToggle={handleToggleMute}
        isMuted={isMuted}
        sessionLink={getSessionLink()}
      />
    )
  }

  // Question phase
  if (session?.status === 'question' && currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-4">
        {/* Host header */}
        <div className="max-w-6xl mx-auto mb-4">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-4">
              <span className="px-4 py-2 bg-white/20 rounded-full font-bold">
                🎮 {t('quiz.live.hostMode', 'MODE ANIMATEUR')}
              </span>
              <span className="flex items-center gap-2">
                <FiUsers />
                {session?.participants?.length || 0} {t('quiz.live.players', 'joueurs')}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleForceEndQuiz}
                className="p-2 rounded-full bg-red-500/80 hover:bg-red-600 text-white"
                title={t('quiz.live.stopQuiz', 'Arrêter le quiz')}
              >
                <FiStopCircle size={20} />
              </button>
              <button
                onClick={handleToggleMute}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30"
              >
                {isMuted ? <FiVolumeX size={20} /> : <FiVolume2 size={20} />}
              </button>
              <button
                onClick={handleShowResults}
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 rounded-xl font-bold flex items-center gap-2"
              >
                <FiSkipForward />
                {t('quiz.live.revealAnswers', 'Révéler les réponses')}
              </button>
            </div>
          </div>
        </div>

        <QuestionDisplay
          question={currentQuestion}
          questionNumber={(session?.currentQuestionIndex || 0) + 1}
          totalQuestions={questions.length}
          timeLimit={currentQuestion.timeLimit || quiz.timePerQuestion || 30}
          timeLeft={timeLeft}
          isHost={true}
          participantAnswers={getParticipantAnswers()}
        />

        {/* Participants who answered */}
        <div className="max-w-4xl mx-auto mt-6">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
            <p className="text-white text-center font-medium">
              {getParticipantAnswers().length} / {session?.participants?.length || 0} {t('quiz.live.answersReceived', 'réponses reçues')}
            </p>
            <div className="flex justify-center gap-2 mt-3 flex-wrap">
              {session?.participants?.map(p => {
                const hasAnswered = p.answers?.some(a => a.questionIndex === session.currentQuestionIndex)
                return (
                  <span
                    key={p.id}
                    className={`px-3 py-1 rounded-full text-sm ${
                      hasAnswered ? 'bg-green-500 text-white' : 'bg-white/20 text-white/70'
                    }`}
                  >
                    {p.emoji} {p.name}
                  </span>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Results phase
  if (session?.status === 'results') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-600 to-red-600 p-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between text-white mb-6">
            <span className="px-4 py-2 bg-white/20 rounded-full font-bold">
              📊 {t('quiz.results', 'RÉSULTATS').toUpperCase()}
            </span>
            <button
              onClick={handleToggleMute}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30"
            >
              {isMuted ? <FiVolumeX size={20} /> : <FiVolume2 size={20} />}
            </button>
          </div>

          {/* Correct answer display */}
          {currentQuestion && (
            <div className="bg-white rounded-3xl p-6 mb-6 text-center">
              <h3 className="text-xl font-bold text-gray-800 mb-4">{currentQuestion.text}</h3>
              {currentQuestion.imageUrl && (
                <div className="flex justify-center mb-4">
                  <img
                    src={currentQuestion.imageUrl}
                    alt={currentQuestion.text}
                    className="max-h-48 md:max-h-64 rounded-2xl object-contain shadow-lg"
                  />
                </div>
              )}
              <div className="flex flex-wrap justify-center gap-3">
                {currentQuestion.options?.map((opt, i) => (
                  <span
                    key={opt.id}
                    className={`px-4 py-2 rounded-full font-bold ${
                      opt.isCorrect 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {opt.isCorrect && '✓ '}{opt.text}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 text-center border border-white/20">
              <p className="text-white/70">{t('quiz.correctAnswers', 'Bonnes réponses')}</p>
              <p className="text-3xl font-bold text-green-400">
                {getParticipantAnswers().filter(a => a.isCorrect).length}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 text-center border border-white/20">
              <p className="text-white/70">{t('quiz.wrongAnswer', 'Mauvaises réponses')}</p>
              <p className="text-3xl font-bold text-red-400">
                {getParticipantAnswers().filter(a => !a.isCorrect).length}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-center gap-4">
            <button
              onClick={handleShowLeaderboard}
              className="px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-transform"
            >
              <FiBarChart2 />
              {t('quiz.live.showLeaderboard', 'Voir le classement')}
            </button>
            <button
              onClick={handleNextQuestion}
              className="px-6 py-3 bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-transform"
            >
              <FiSkipForward />
              {(session?.currentQuestionIndex || 0) + 1 >= questions.length 
                ? t('quiz.live.viewFinalScores', 'Voir les scores finaux') 
                : t('quiz.nextQuestion', 'Question suivante')
              }
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Leaderboard phase
  if (session?.status === 'leaderboard') {
    const isLastQuestion = (session?.currentQuestionIndex || 0) + 1 >= questions.length

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-4">
        <div className="max-w-4xl mx-auto pt-8">
          {/* Header */}
          <div className="flex items-center justify-between text-white mb-8">
            <span className="px-4 py-2 bg-white/20 rounded-full font-bold">
              {isLastQuestion && session?.showFinalScores ? `🏆 ${t('quiz.live.finalScores', 'SCORES FINAUX')}` : `📊 ${t('quiz.leaderboard', 'CLASSEMENT').toUpperCase()}`}
            </span>
            <button
              onClick={handleToggleMute}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30"
            >
              {isMuted ? <FiVolumeX size={20} /> : <FiVolume2 size={20} />}
            </button>
          </div>

          <Leaderboard
            participants={session?.participants || []}
            limit={isLastQuestion ? 100 : 5}
            showAll={isLastQuestion}
            previousRankings={previousRankings}
            animated={true}
          />

          {/* Action buttons */}
          <div className="flex justify-center gap-4 mt-8">
            {isLastQuestion && session?.showFinalScores ? (
              <button
                onClick={handleShowPodium}
                className="px-8 py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-2xl font-bold text-lg flex items-center gap-2 hover:scale-105 transition-transform shadow-lg"
              >
                <FiAward />
                🏆 {t('quiz.live.showPodium', 'Voir le Podium')}
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="px-6 py-3 bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-transform"
              >
                <FiSkipForward />
                {t('quiz.nextQuestion', 'Question suivante')}
              </button>
            )}
          </div>
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
          onComplete={() => {}}
        />
        
        {/* End button */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <button
            onClick={handleEndQuiz}
            className="px-8 py-4 bg-white text-gray-800 rounded-2xl font-bold text-lg flex items-center gap-2 hover:scale-105 transition-transform shadow-lg"
          >
            <FiHome />
            {t('quiz.live.endQuiz', 'Terminer le quiz')}
          </button>
        </div>
      </div>
    )
  }

  // Finished
  if (session?.status === 'finished') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <div className="text-8xl mb-6">🎉</div>
          <h1 className="text-4xl font-bold mb-4">{t('quiz.live.quizEnded', 'Quiz terminé !')}</h1>
          <p className="text-xl mb-8">{t('quiz.live.thanksHost', 'Merci d\'avoir animé ce quiz.')}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-8 py-4 bg-white text-gray-800 rounded-2xl font-bold flex items-center gap-2 mx-auto hover:scale-105 transition-transform"
          >
            <FiHome />
            {t('nav.backToDashboard', 'Retour au tableau de bord')}
          </button>
        </div>
      </div>
    )
  }

  return null
}

export default HostQuiz
