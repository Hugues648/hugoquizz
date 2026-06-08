import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { FiUsers, FiVolume2, FiVolumeX, FiCopy, FiCheck } from 'react-icons/fi'
import QRCode from 'qrcode'

// Animated emojis for participants - tous distincts
const PARTICIPANT_EMOJIS = [
  '😀', '😎', '🤓', '🥳', '😍', '🤩', '😋', '🧐', '🤗', '😇',
  '🦊', '🐱', '🐶', '🦁', '🐯', '🐼', '🐨', '🐸', '🐵', '🦄',
  '🌟', '⭐', '💫', '✨', '🔥', '💎', '🎯', '🎮', '🎲', '🎪',
  '🚀', '🛸', '🎸', '🎺', '🎭', '👑', '🎩', '🦸', '🧙', '🧚',
  '🐲', '🦋', '🌈', '🍀', '🌺', '🍄', '🦉', '🐧', '🦩', '🦚',
  '🌻', '🍕', '🎂', '🧁', '🍩', '🎈', '🎀', '💝', '🔮', '🎪'
]

// Types d'animations différentes pour chaque participant
const ANIMATION_TYPES = [
  'bounce-emoji',
  'spin-emoji', 
  'pulse-emoji',
  'swing-emoji',
  'wobble-emoji',
  'float-emoji',
  'shake-emoji',
  'pop-emoji'
]

// Obtenir un emoji aléatoire non utilisé
export const getRandomEmoji = (usedEmojis = []) => {
  const available = PARTICIPANT_EMOJIS.filter(e => !usedEmojis.includes(e))
  if (available.length === 0) {
    return PARTICIPANT_EMOJIS[Math.floor(Math.random() * PARTICIPANT_EMOJIS.length)]
  }
  return available[Math.floor(Math.random() * available.length)]
}

const WaitingRoom = ({ 
  quiz, 
  participants = [], 
  isHost = false, 
  onStart, 
  onMuteToggle,
  isMuted = false,
  sessionLink = '',
  playerName = '',
  playerEmoji = '😀'
}) => {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const [animationPhase, setAnimationPhase] = useState(0)
  const [qrCodeUrl, setQrCodeUrl] = useState('')

  // Generate QR code for host
  useEffect(() => {
    if (isHost && sessionLink) {
      QRCode.toDataURL(sessionLink, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      }).then(url => {
        setQrCodeUrl(url)
      }).catch(err => {
        console.error('QR Code generation error:', err)
      })
    }
  }, [isHost, sessionLink])

  // Animate emojis
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationPhase(prev => (prev + 1) % 360)
    }, 50)
    return () => clearInterval(interval)
  }, [])

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(sessionLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 relative overflow-hidden">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/10 animate-float"
            style={{
              width: Math.random() * 100 + 50,
              height: Math.random() * 100 + 50,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 5}s`
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 p-4 md:p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-4 animate-pulse-soft">
            {quiz?.title || 'Quiz'}
          </h1>
          <p className="text-white/80 text-lg md:text-xl">
            {isHost ? t('quiz.live.waitingForPlayers') : t('quiz.live.waitingForHost')}
          </p>
        </div>

        {/* Sound control */}
        <div className="absolute top-4 right-4">
          <button
            onClick={onMuteToggle}
            className="p-3 rounded-full bg-white/20 hover:bg-white/30 transition-all text-white"
          >
            {isMuted ? <FiVolumeX size={24} /> : <FiVolume2 size={24} />}
          </button>
        </div>

        {/* Host controls */}
        {isHost && (
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 mb-8 border border-white/20">
            <div className="flex flex-col lg:flex-row items-center gap-6">
              {/* QR Code */}
              {qrCodeUrl && (
                <div className="flex-shrink-0 bg-white rounded-2xl p-3 shadow-lg">
                  <img src={qrCodeUrl} alt="QR Code" className="w-40 h-40" />
                  <p className="text-center text-xs text-gray-500 mt-1">{t('quiz.live.scanQR')}</p>
                </div>
              )}
              
              <div className="flex-1 w-full">
                <p className="text-white/70 text-sm mb-2">{t('quiz.live.shareLink')} :</p>
                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="text"
                    value={sessionLink}
                    readOnly
                    className="flex-1 px-4 py-3 rounded-xl bg-white/10 text-white border border-white/20 text-sm"
                  />
                  <button
                    onClick={copyLink}
                    className="p-3 rounded-xl bg-white/20 hover:bg-white/30 transition-all text-white"
                  >
                    {copied ? <FiCheck size={20} /> : <FiCopy size={20} />}
                  </button>
                </div>
                
                <button
                  onClick={onStart}
                  disabled={participants.length === 0}
                  className={`w-full lg:w-auto px-8 py-4 rounded-2xl font-bold text-lg transition-all transform hover:scale-105 ${
                    participants.length === 0
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 text-white shadow-lg shadow-green-500/30'
                  }`}
                >
                  🚀 {t('quiz.live.startQuiz')} ({t('quiz.live.playersCount', { count: participants.length })})
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Participant info for non-host */}
        {!isHost && (
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-4 bg-white/10 backdrop-blur-lg rounded-2xl px-6 py-4 border border-white/20">
              <span className="text-5xl animate-bounce-slow">{playerEmoji}</span>
              <div className="text-left">
                <p className="text-white/70 text-sm">{t('quiz.live.playingAs')}</p>
                <p className="text-white text-xl font-bold">{playerName}</p>
              </div>
            </div>
          </div>
        )}

        {/* Participants count */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <FiUsers className="text-white text-2xl" />
          <span className="text-white text-2xl font-bold">
            {t('quiz.live.playersConnected', { count: participants.length })}
          </span>
        </div>

        {/* Participants grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {participants.map((participant, index) => {
            // Chaque participant a une animation différente
            const animationType = ANIMATION_TYPES[index % ANIMATION_TYPES.length]
            const animationDuration = 1 + (index % 5) * 0.2 // Durées variées
            const hue = (index * 40) % 360 // Couleurs de fond variées
            
            return (
              <div
                key={participant.id}
                className="backdrop-blur-lg rounded-2xl p-4 border border-white/30 text-center transform hover:scale-110 transition-all animate-slide-up participant-card"
                style={{ 
                  animationDelay: `${index * 0.08}s`,
                  background: `linear-gradient(135deg, hsla(${hue}, 70%, 60%, 0.3), hsla(${(hue + 60) % 360}, 70%, 50%, 0.2))`
                }}
              >
                <div 
                  className="text-5xl mb-2 inline-block"
                  style={{
                    animation: `${animationType} ${animationDuration}s ease-in-out infinite`,
                    animationDelay: `${index * 0.15}s`
                  }}
                >
                  {participant.emoji}
                </div>
                <p className="text-white font-semibold truncate text-shadow">{participant.name}</p>
              </div>
            )
          })}
          
          {/* Empty state */}
          {participants.length === 0 && (
            <div className="col-span-full text-center py-12">
              <div className="text-6xl mb-4 animate-bounce">👀</div>
              <p className="text-white/70 text-lg">
                {isHost ? t('quiz.live.waitingForPlayers') : t('quiz.live.youAreFirst')}
              </p>
            </div>
          )}
        </div>

        {/* Waiting animation for players */}
        {!isHost && (
          <div className="text-center mt-12">
            <div className="inline-flex items-center gap-3 text-white/80">
              <div className="flex gap-1">
                <div className="w-3 h-3 rounded-full bg-white animate-bounce" style={{ animationDelay: '0s' }} />
                <div className="w-3 h-3 rounded-full bg-white animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="w-3 h-3 rounded-full bg-white animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
              <span className="text-lg">{t('quiz.live.hostAboutToStart')}</span>
            </div>
          </div>
        )}
      </div>

      {/* CSS for special animations */}
      <style>{`
        @keyframes bounce-emoji {
          0%, 100% { transform: translateY(0) rotate(-5deg); }
          50% { transform: translateY(-15px) rotate(5deg); }
        }
        
        @keyframes spin-emoji {
          0% { transform: rotate(0deg) scale(1); }
          25% { transform: rotate(10deg) scale(1.1); }
          50% { transform: rotate(0deg) scale(1); }
          75% { transform: rotate(-10deg) scale(1.1); }
          100% { transform: rotate(0deg) scale(1); }
        }
        
        @keyframes pulse-emoji {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.8; }
        }
        
        @keyframes swing-emoji {
          0%, 100% { transform: rotate(-15deg); }
          50% { transform: rotate(15deg); }
        }
        
        @keyframes wobble-emoji {
          0%, 100% { transform: translateX(0) rotate(0); }
          15% { transform: translateX(-8px) rotate(-5deg); }
          30% { transform: translateX(6px) rotate(3deg); }
          45% { transform: translateX(-4px) rotate(-3deg); }
          60% { transform: translateX(2px) rotate(2deg); }
          75% { transform: translateX(-1px) rotate(-1deg); }
        }
        
        @keyframes float-emoji {
          0%, 100% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-8px) translateX(4px); }
          50% { transform: translateY(-4px) translateX(-4px); }
          75% { transform: translateY(-12px) translateX(2px); }
        }
        
        @keyframes shake-emoji {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-3px); }
          20%, 40%, 60%, 80% { transform: translateX(3px); }
        }
        
        @keyframes pop-emoji {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
        
        .animate-bounce-slow {
          animation: bounce-emoji 2s ease-in-out infinite;
        }
        
        .text-shadow {
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        
        .participant-card {
          box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        }
        
        .participant-card:hover {
          box-shadow: 0 12px 40px rgba(255,255,255,0.2);
        }
      `}</style>
    </div>
  )
}

export default WaitingRoom
