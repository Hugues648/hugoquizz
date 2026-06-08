import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FiTrendingUp, FiArrowUp, FiArrowDown, FiMinus } from 'react-icons/fi'

const Leaderboard = ({ 
  participants = [], 
  limit = 5, 
  showAll = false,
  currentPlayerId = null,
  previousRankings = [],
  animated = true
}) => {
  const { t } = useTranslation()
  const [displayedParticipants, setDisplayedParticipants] = useState([])
  const [revealIndex, setRevealIndex] = useState(-1)

  // Sort by score (descending)
  const sortedParticipants = [...participants].sort((a, b) => b.score - a.score)
  
  // Limit display
  const participantsToShow = showAll 
    ? sortedParticipants 
    : sortedParticipants.slice(0, limit)

  // Calculate rank changes
  const getRankChange = (participantId, currentRank) => {
    const previousIndex = previousRankings.findIndex(p => p.id === participantId)
    if (previousIndex === -1) return null
    const previousRank = previousIndex + 1
    return previousRank - currentRank
  }

  // Animate reveal
  useEffect(() => {
    if (animated) {
      setRevealIndex(-1)
      const totalParticipants = participantsToShow.length
      
      // Reveal from bottom to top (5th, 4th, 3rd, 2nd, 1st)
      let currentIndex = totalParticipants - 1
      
      const revealNext = () => {
        if (currentIndex >= 0) {
          setRevealIndex(totalParticipants - 1 - currentIndex)
          currentIndex--
          setTimeout(revealNext, 400)
        }
      }
      
      setTimeout(revealNext, 500)
    } else {
      setRevealIndex(participantsToShow.length - 1)
    }
  }, [participants, animated])

  // Medal colors
  const getMedalStyle = (rank) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500 text-yellow-900 shadow-lg shadow-yellow-500/50'
      case 2:
        return 'bg-gradient-to-r from-gray-300 via-gray-200 to-gray-400 text-gray-800 shadow-lg shadow-gray-400/50'
      case 3:
        return 'bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 text-orange-900 shadow-lg shadow-orange-500/50'
      default:
        return 'bg-white/20 text-white'
    }
  }

  const getMedalEmoji = (rank) => {
    switch (rank) {
      case 1: return '🥇'
      case 2: return '🥈'
      case 3: return '🥉'
      default: return ''
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <FiTrendingUp className="text-3xl text-yellow-400" />
        <h2 className="text-3xl font-extrabold text-white">{t('quiz.leaderboard')}</h2>
      </div>

      {/* Leaderboard list */}
      <div className="space-y-3">
        {participantsToShow.map((participant, index) => {
          const rank = index + 1
          const rankChange = getRankChange(participant.id, rank)
          const isCurrentPlayer = participant.id === currentPlayerId
          const isRevealed = index <= revealIndex

          return (
            <div
              key={participant.id}
              className={`
                transform transition-all duration-500
                ${isRevealed ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}
                ${isCurrentPlayer ? 'ring-4 ring-yellow-400 ring-opacity-75' : ''}
              `}
              style={{ 
                transitionDelay: isRevealed ? '0ms' : `${(participantsToShow.length - index) * 200}ms`
              }}
            >
              <div className={`
                flex items-center gap-4 p-4 rounded-2xl backdrop-blur-lg border border-white/20
                ${rank <= 3 ? getMedalStyle(rank) : 'bg-white/10'}
                ${isCurrentPlayer ? 'scale-105' : ''}
              `}>
                {/* Rank */}
                <div className={`
                  w-12 h-12 rounded-full flex items-center justify-center font-extrabold text-xl
                  ${rank <= 3 ? 'bg-white/30' : 'bg-white/10'}
                `}>
                  {rank <= 3 ? getMedalEmoji(rank) : rank}
                </div>

                {/* Avatar/Emoji */}
                <div className="text-3xl">{participant.emoji}</div>

                {/* Name */}
                <div className="flex-1">
                  <p className={`font-bold text-lg ${rank <= 3 ? '' : 'text-white'}`}>
                    {participant.name}
                    {isCurrentPlayer && <span className="ml-2 text-sm opacity-75">({t('quiz.live.you')})</span>}
                  </p>
                </div>

                {/* Rank change */}
                {rankChange !== null && rankChange !== 0 && (
                  <div className={`
                    flex items-center gap-1 px-2 py-1 rounded-full text-sm font-bold
                    ${rankChange > 0 ? 'bg-green-500/30 text-green-300' : 'bg-red-500/30 text-red-300'}
                  `}>
                    {rankChange > 0 ? <FiArrowUp /> : <FiArrowDown />}
                    {Math.abs(rankChange)}
                  </div>
                )}

                {/* Score */}
                <div className={`
                  px-4 py-2 rounded-xl font-extrabold text-xl
                  ${rank <= 3 ? 'bg-white/30' : 'bg-white/10 text-white'}
                `}>
                  {participant.score.toLocaleString()}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Current player if not in top list */}
      {currentPlayerId && !participantsToShow.find(p => p.id === currentPlayerId) && (
        <div className="mt-6 pt-6 border-t border-white/20">
          {(() => {
            const currentPlayer = sortedParticipants.find(p => p.id === currentPlayerId)
            const currentRank = sortedParticipants.findIndex(p => p.id === currentPlayerId) + 1
            
            if (!currentPlayer) return null
            
            return (
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/10 backdrop-blur-lg border-2 border-yellow-400/50">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center font-extrabold text-xl text-white">
                  {currentRank}
                </div>
                <div className="text-3xl">{currentPlayer.emoji}</div>
                <div className="flex-1">
                  <p className="font-bold text-lg text-white">
                    {currentPlayer.name} <span className="text-sm opacity-75">({t('quiz.live.you')})</span>
                  </p>
                </div>
                <div className="px-4 py-2 rounded-xl bg-white/10 font-extrabold text-xl text-white">
                  {currentPlayer.score.toLocaleString()}
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Empty state */}
      {participantsToShow.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📊</div>
          <p className="text-white/70 text-lg">{t('quiz.live.noScoresYet')}</p>
        </div>
      )}
    </div>
  )
}

export default Leaderboard
