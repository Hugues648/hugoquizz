import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const Podium = ({ 
  participants = [], 
  animated = true,
  onComplete = () => {}
}) => {
  const { t } = useTranslation()
  const [revealStage, setRevealStage] = useState(0) // 0: none, 1: 3rd, 2: 2nd, 3: 1st, 4: all revealed
  const [confetti, setConfetti] = useState([])

  // Sort by score (descending) and get top 3
  const sortedParticipants = [...participants].sort((a, b) => b.score - a.score)
  const topThree = sortedParticipants.slice(0, 3)
  
  const first = topThree[0] || null
  const second = topThree[1] || null
  const third = topThree[2] || null

  // Animated reveal with specific timing:
  // 4s before 3rd, 4s after 3rd for 2nd, 6s after 2nd for 1st
  useEffect(() => {
    if (!animated) {
      setRevealStage(4)
      return
    }

    const stages = [
      { delay: 4000, stage: 1 },   // 4s wait then reveal 3rd
      { delay: 8000, stage: 2 },   // 4s after 3rd, reveal 2nd
      { delay: 14000, stage: 3 },  // 6s after 2nd, reveal 1st
      { delay: 17000, stage: 4 },  // Final celebration
    ]

    const timeouts = stages.map(({ delay, stage }) =>
      setTimeout(() => setRevealStage(stage), delay)
    )

    return () => timeouts.forEach(clearTimeout)
  }, [animated])

  // Generate confetti
  useEffect(() => {
    if (revealStage === 3) {
      const newConfetti = []
      for (let i = 0; i < 100; i++) {
        newConfetti.push({
          id: i,
          left: Math.random() * 100,
          delay: Math.random() * 2,
          duration: 2 + Math.random() * 2,
          color: ['#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'][Math.floor(Math.random() * 8)]
        })
      }
      setConfetti(newConfetti)
      setTimeout(onComplete, 3000)
    }
  }, [revealStage])

  // Podium block component
  const PodiumBlock = ({ participant, place, isRevealed }) => {
    const heights = { 1: 'h-48', 2: 'h-36', 3: 'h-28' }
    const colors = {
      1: 'from-yellow-400 via-yellow-300 to-yellow-500',
      2: 'from-gray-300 via-gray-200 to-gray-400',
      3: 'from-orange-400 via-orange-300 to-orange-500'
    }
    const medals = { 1: '🥇', 2: '🥈', 3: '🥉' }
    const crowns = { 1: '👑', 2: '', 3: '' }

    return (
      <div 
        className={`
          flex flex-col items-center transition-all duration-1000
          ${isRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'}
        `}
      >
        {/* Winner info */}
        {participant && (
          <div className={`
            text-center mb-4 transition-all duration-500
            ${isRevealed ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}
          `}>
            {/* Crown for 1st place */}
            {place === 1 && (
              <div className="text-5xl mb-2 animate-bounce">
                {crowns[place]}
              </div>
            )}
            
            {/* Avatar */}
            <div className={`
              text-6xl md:text-7xl mb-2 inline-block
              ${place === 1 ? 'animate-wiggle' : ''}
            `}>
              {participant.emoji}
            </div>
            
            {/* Name */}
            <p className={`
              font-extrabold text-white text-lg md:text-xl mb-1
              ${place === 1 ? 'text-2xl md:text-3xl' : ''}
            `}>
              {participant.name}
            </p>
            
            {/* Score */}
            <div className={`
              inline-block px-4 py-2 rounded-full bg-white/20 backdrop-blur-lg
              font-bold text-white text-lg
              ${place === 1 ? 'text-xl bg-yellow-500/30' : ''}
            `}>
              {participant.score.toLocaleString()} pts
            </div>
          </div>
        )}

        {/* Podium block */}
        <div className={`
          w-28 md:w-40 ${heights[place]} rounded-t-2xl
          bg-gradient-to-b ${colors[place]}
          flex items-start justify-center pt-4
          shadow-2xl
          transition-all duration-1000
          ${isRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-32'}
        `}>
          <span className="text-4xl md:text-5xl">{medals[place]}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Confetti */}
      {confetti.map(c => (
        <div
          key={c.id}
          className="absolute top-0 pointer-events-none"
          style={{
            left: `${c.left}%`,
            animation: `confetti-fall ${c.duration}s linear ${c.delay}s forwards`,
          }}
        >
          <div
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: c.color }}
          />
        </div>
      ))}

      {/* Title */}
      <div className={`
        text-center mb-12 transition-all duration-1000
        ${revealStage >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}
      `}>
        <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-2">
          🏆 {t('quiz.live.podium.title')} 🏆
        </h1>
        <p className="text-white/70 text-lg">{t('quiz.live.podium.bestPlayers')}</p>
      </div>

      {/* Podium */}
      <div className="flex items-end justify-center gap-2 md:gap-4">
        {/* 2nd place (left) */}
        <PodiumBlock 
          participant={second} 
          place={2} 
          isRevealed={revealStage >= 2} 
        />
        
        {/* 1st place (center, higher) */}
        <PodiumBlock 
          participant={first} 
          place={1} 
          isRevealed={revealStage >= 3} 
        />
        
        {/* 3rd place (right) */}
        <PodiumBlock 
          participant={third} 
          place={3} 
          isRevealed={revealStage >= 1} 
        />
      </div>

      {/* Spotlight effect for 1st place */}
      {revealStage >= 3 && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-full bg-gradient-to-b from-yellow-400/30 to-transparent opacity-50" />
        </div>
      )}

      {/* CSS for confetti animation */}
      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(-100%) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        
        @keyframes wiggle {
          0%, 100% { transform: rotate(-5deg); }
          50% { transform: rotate(5deg); }
        }
        
        .animate-wiggle {
          animation: wiggle 0.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}

export default Podium
