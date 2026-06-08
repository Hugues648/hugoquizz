/**
 * Audio Service for Quiz - Kahoot-style music experience
 * Uses Web Audio API synthesized sounds with DIVERSE melodies
 */

// Audio context and state
let audioContext = null
let currentOscillators = []
let currentMusicCategory = null
let isMuted = false
let volume = 0.5
let isAudioUnlocked = false
let musicInterval = null
let currentMelodyIndex = {}

// Initialize AudioContext
const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume()
  }
  return audioContext
}

// ==================== DIVERSE MELODY BANKS ====================

// Lobby melodies (calme, accueillant) - 5 variantes
const LOBBY_MELODIES = [
  { notes: [261.63, 329.63, 392.00, 523.25, 392.00, 329.63], tempo: 400, wave: 'sine' }, // C Major arpège
  { notes: [293.66, 369.99, 440.00, 587.33, 440.00, 369.99], tempo: 380, wave: 'sine' }, // D Major
  { notes: [329.63, 392.00, 493.88, 659.25, 493.88, 392.00], tempo: 420, wave: 'triangle' }, // E Minor feel
  { notes: [349.23, 440.00, 523.25, 698.46, 523.25, 440.00], tempo: 360, wave: 'sine' }, // F Major bright
  { notes: [392.00, 493.88, 587.33, 783.99, 587.33, 493.88], tempo: 400, wave: 'triangle' }, // G Major joyful
]

// Gameplay melodies (énergique, rapide) - 6 variantes
const GAMEPLAY_MELODIES = [
  { notes: [196.00, 246.94, 293.66, 349.23, 392.00, 349.23, 293.66, 246.94], tempo: 180, wave: 'square' }, // G3 up-down
  { notes: [220.00, 277.18, 329.63, 440.00, 329.63, 277.18], tempo: 160, wave: 'sawtooth' }, // A minor drive
  { notes: [261.63, 329.63, 261.63, 392.00, 261.63, 329.63, 261.63, 293.66], tempo: 150, wave: 'square' }, // C bounce
  { notes: [293.66, 329.63, 392.00, 440.00, 392.00, 329.63], tempo: 170, wave: 'sawtooth' }, // D energetic
  { notes: [349.23, 392.00, 440.00, 523.25, 440.00, 392.00, 349.23, 329.63], tempo: 140, wave: 'square' }, // F power
  { notes: [196.00, 220.00, 246.94, 261.63, 293.66, 329.63, 349.23, 392.00], tempo: 120, wave: 'sawtooth' }, // Scale rush
]

// Suspense melodies (tension) - 4 variantes
const SUSPENSE_MELODIES = [
  { baseFreq: 100, range: 100, step: 10, tempo: 300, wave: 'sawtooth' }, // Classic rising
  { baseFreq: 80, range: 80, step: 8, tempo: 350, wave: 'square' }, // Deep tension
  { baseFreq: 120, range: 60, step: 5, tempo: 250, wave: 'sawtooth' }, // High suspense
  { baseFreq: 90, range: 120, step: 12, tempo: 280, wave: 'triangle' }, // Wide swing
]

// Victory fanfares - 4 variantes
const VICTORY_FANFARES = [
  [
    { freq: 392.00, start: 0, dur: 0.15 },    // G4
    { freq: 493.88, start: 0.15, dur: 0.15 }, // B4
    { freq: 587.33, start: 0.3, dur: 0.15 },  // D5
    { freq: 783.99, start: 0.45, dur: 0.4 },  // G5
    { freq: 659.25, start: 0.85, dur: 0.15 }, // E5
    { freq: 783.99, start: 1.0, dur: 0.5 },   // G5
  ],
  [
    { freq: 523.25, start: 0, dur: 0.12 },    // C5
    { freq: 659.25, start: 0.12, dur: 0.12 }, // E5
    { freq: 783.99, start: 0.24, dur: 0.12 }, // G5
    { freq: 1046.50, start: 0.36, dur: 0.5 }, // C6
    { freq: 987.77, start: 0.86, dur: 0.2 },  // B5
    { freq: 1046.50, start: 1.06, dur: 0.4 }, // C6
  ],
  [
    { freq: 440.00, start: 0, dur: 0.1 },     // A4
    { freq: 554.37, start: 0.1, dur: 0.1 },   // C#5
    { freq: 659.25, start: 0.2, dur: 0.1 },   // E5
    { freq: 880.00, start: 0.3, dur: 0.3 },   // A5
    { freq: 783.99, start: 0.6, dur: 0.1 },   // G5
    { freq: 880.00, start: 0.7, dur: 0.5 },   // A5
  ],
  [
    { freq: 349.23, start: 0, dur: 0.15 },    // F4
    { freq: 440.00, start: 0.15, dur: 0.15 }, // A4
    { freq: 523.25, start: 0.3, dur: 0.15 },  // C5
    { freq: 698.46, start: 0.45, dur: 0.35 }, // F5
    { freq: 783.99, start: 0.8, dur: 0.2 },   // G5
    { freq: 880.00, start: 1.0, dur: 0.5 },   // A5
  ],
]

// Get random melody from bank
const getRandomMelody = (bank, category) => {
  // Track used melodies to avoid immediate repetition
  if (!currentMelodyIndex[category]) {
    currentMelodyIndex[category] = Math.floor(Math.random() * bank.length)
  } else {
    // Pick a different one
    let newIndex
    do {
      newIndex = Math.floor(Math.random() * bank.length)
    } while (newIndex === currentMelodyIndex[category] && bank.length > 1)
    currentMelodyIndex[category] = newIndex
  }
  return bank[currentMelodyIndex[category]]
}

// Generate fun synth notes for lobby music
const playLobbyMusicSynth = () => {
  if (isMuted || musicInterval) return
  
  const ctx = getAudioContext()
  const melody = getRandomMelody(LOBBY_MELODIES, 'lobby')
  let noteIndex = 0
  
  const playNote = () => {
    if (isMuted || currentMusicCategory !== 'lobby') {
      if (musicInterval) {
        clearInterval(musicInterval)
        musicInterval = null
      }
      return
    }
    
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    
    osc.type = melody.wave
    osc.frequency.setValueAtTime(melody.notes[noteIndex], ctx.currentTime)
    
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(volume * 0.3, ctx.currentTime + 0.05)
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3)
    
    osc.connect(gain)
    gain.connect(ctx.destination)
    
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.35)
    
    noteIndex = (noteIndex + 1) % melody.notes.length
  }
  
  playNote()
  musicInterval = setInterval(playNote, melody.tempo)
  currentMusicCategory = 'lobby'
  console.log('Playing lobby music (melody variant', currentMelodyIndex['lobby'] + 1, ')')
}

// Generate energetic gameplay music
const playGameplayMusicSynth = () => {
  if (isMuted || musicInterval) return
  
  const ctx = getAudioContext()
  const melody = getRandomMelody(GAMEPLAY_MELODIES, 'gameplay')
  let noteIndex = 0
  
  const playNote = () => {
    if (isMuted || currentMusicCategory !== 'gameplay') {
      if (musicInterval) {
        clearInterval(musicInterval)
        musicInterval = null
      }
      return
    }
    
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    
    osc.type = melody.wave
    osc.frequency.setValueAtTime(melody.notes[noteIndex], ctx.currentTime)
    
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(volume * 0.22, ctx.currentTime + 0.02)
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.12)
    
    osc.connect(gain)
    gain.connect(ctx.destination)
    
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.15)
    
    noteIndex = (noteIndex + 1) % melody.notes.length
  }
  
  playNote()
  musicInterval = setInterval(playNote, melody.tempo)
  currentMusicCategory = 'gameplay'
  console.log('Playing gameplay music (melody variant', currentMelodyIndex['gameplay'] + 1, ')')
}

// Generate suspense music
const playSuspenseMusicSynth = () => {
  if (isMuted || musicInterval) return
  
  const ctx = getAudioContext()
  const melody = getRandomMelody(SUSPENSE_MELODIES, 'suspense')
  let freq = melody.baseFreq
  let direction = 1
  
  const playTone = () => {
    if (isMuted || currentMusicCategory !== 'suspense') {
      if (musicInterval) {
        clearInterval(musicInterval)
        musicInterval = null
      }
      return
    }
    
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    
    osc.type = melody.wave
    osc.frequency.setValueAtTime(freq, ctx.currentTime)
    osc.frequency.linearRampToValueAtTime(freq * 1.02, ctx.currentTime + 0.3)
    
    gain.gain.setValueAtTime(volume * 0.15, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3)
    
    osc.connect(gain)
    gain.connect(ctx.destination)
    
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.35)
    
    freq += direction * melody.step
    if (freq > melody.baseFreq + melody.range) direction = -1
    if (freq < melody.baseFreq) direction = 1
  }
  
  playTone()
  musicInterval = setInterval(playTone, melody.tempo)
  currentMusicCategory = 'suspense'
  console.log('Playing suspense music (variant', currentMelodyIndex['suspense'] + 1, ')')
}

// Generate victory fanfare
const playVictoryMusicSynth = () => {
  if (isMuted) return
  
  const ctx = getAudioContext()
  const fanfare = getRandomMelody(VICTORY_FANFARES, 'victory')
  
  fanfare.forEach(note => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(note.freq, ctx.currentTime + note.start)
    
    gain.gain.setValueAtTime(0, ctx.currentTime + note.start)
    gain.gain.linearRampToValueAtTime(volume * 0.4, ctx.currentTime + note.start + 0.02)
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + note.start + note.dur)
    
    osc.connect(gain)
    gain.connect(ctx.destination)
    
    osc.start(ctx.currentTime + note.start)
    osc.stop(ctx.currentTime + note.start + note.dur + 0.1)
  })
  
  currentMusicCategory = 'victory'
  console.log('Playing victory fanfare (variant', currentMelodyIndex['victory'] + 1, ')')
}

// Placeholder for backward compatibility with old URL-based system
const MUSIC_BANKS = {
  lobby: ['synth'],
  gameplay: ['synth'],
  countdown: ['synth'],
  suspense: ['synth'],
  victory: ['synth'],
  leaderboardMusic: ['synth'],
  correct: ['synth'],
  wrong: ['synth'],
  ticktock: ['synth'],
  timeup: ['synth'],
  newQuestion: ['synth'],
  leaderboard: ['synth'],
  podium: ['synth'],
  drumroll: ['synth'],
  playerJoin: ['synth'],
  countdown3: ['synth'],
}

// Alternative simple beep sounds as fallback (data URLs - always work)
const FALLBACK_SOUNDS = {
  correct: 'data:audio/mp3;base64,//uQxAAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV',
  wrong: 'data:audio/mp3;base64,//uQxAAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV',
  playerJoin: 'data:audio/mp3;base64,//uQxAAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV',
}

// Helper to get random item from array
const getRandomItem = (array) => array[Math.floor(Math.random() * array.length)]

// Shuffle array for variety
const shuffleArray = (array) => {
  const newArray = [...array]
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]]
  }
  return newArray
}

// Track used songs to avoid repetition
let usedSongs = {}

// Get next song from category (avoids repetition)
const getNextSong = (category) => {
  const bank = MUSIC_BANKS[category]
  if (!bank || bank.length === 0) return null
  
  if (!usedSongs[category]) {
    usedSongs[category] = shuffleArray([...bank])
  }
  
  if (usedSongs[category].length === 0) {
    usedSongs[category] = shuffleArray([...bank])
  }
  
  return usedSongs[category].pop()
}

// Unlock audio on user interaction (required by browsers)
export const unlockAudio = async () => {
  if (isAudioUnlocked) return true
  
  try {
    const ctx = getAudioContext()
    if (ctx.state === 'suspended') {
      await ctx.resume()
    }
    isAudioUnlocked = true
    console.log('Audio unlocked successfully')
    return true
  } catch (e) {
    console.log('Audio unlock failed:', e.message)
    return false
  }
}

// Initialize audio context (must be called after user interaction)
export const initAudio = async () => {
  await unlockAudio()
  return getAudioContext()
}

// Play a specific category of music (synthesized)
export const playMusic = async (category, options = {}) => {
  if (isMuted) return null
  
  await unlockAudio()
  stopMusic(false)
  
  switch (category) {
    case 'lobby':
    case 'leaderboardMusic':
      playLobbyMusicSynth()
      break
    case 'gameplay':
    case 'countdown':
      playGameplayMusicSynth()
      break
    case 'suspense':
      playSuspenseMusicSynth()
      break
    case 'victory':
    case 'podium':
      playVictoryMusicSynth()
      break
    default:
      console.log(`Unknown music category: ${category}`)
  }
  
  return { category }
}

// Play synthesized sound effects
const playSynthSFX = (type) => {
  const ctx = getAudioContext()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  
  switch (type) {
    case 'correct':
      // Rising happy tone
      osc.type = 'sine'
      osc.frequency.setValueAtTime(400, ctx.currentTime)
      osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.15)
      gain.gain.setValueAtTime(volume * 0.4, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.25)
      break
      
    case 'wrong':
      // Descending buzz
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(300, ctx.currentTime)
      osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.25)
      gain.gain.setValueAtTime(volume * 0.3, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.35)
      break
      
    case 'playerJoin':
      // Pop sound
      osc.type = 'sine'
      osc.frequency.setValueAtTime(600, ctx.currentTime)
      osc.frequency.linearRampToValueAtTime(900, ctx.currentTime + 0.05)
      osc.frequency.linearRampToValueAtTime(700, ctx.currentTime + 0.1)
      gain.gain.setValueAtTime(volume * 0.3, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.2)
      break
      
    case 'ticktock':
    case 'countdown3':
      // Tick sound
      osc.type = 'square'
      osc.frequency.setValueAtTime(1000, ctx.currentTime)
      gain.gain.setValueAtTime(volume * 0.2, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.05)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.1)
      break
      
    case 'timeup':
      // Alarm-like
      osc.type = 'square'
      osc.frequency.setValueAtTime(800, ctx.currentTime)
      osc.frequency.setValueAtTime(600, ctx.currentTime + 0.1)
      osc.frequency.setValueAtTime(800, ctx.currentTime + 0.2)
      gain.gain.setValueAtTime(volume * 0.3, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.35)
      break
      
    case 'newQuestion':
      // Notification ding
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      gain.gain.setValueAtTime(volume * 0.3, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.25)
      break
      
    case 'leaderboard':
      // Achievement fanfare
      const notes = [523.25, 659.25, 783.99]
      notes.forEach((freq, i) => {
        const o = ctx.createOscillator()
        const g = ctx.createGain()
        o.type = 'triangle'
        o.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1)
        g.gain.setValueAtTime(volume * 0.3, ctx.currentTime + i * 0.1)
        g.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.1 + 0.15)
        o.connect(g)
        g.connect(ctx.destination)
        o.start(ctx.currentTime + i * 0.1)
        o.stop(ctx.currentTime + i * 0.1 + 0.2)
      })
      return // Already handled
      
    case 'drumroll':
      // Rapid ticks
      for (let i = 0; i < 10; i++) {
        const o = ctx.createOscillator()
        const g = ctx.createGain()
        o.type = 'triangle'
        o.frequency.setValueAtTime(200 + Math.random() * 50, ctx.currentTime + i * 0.05)
        g.gain.setValueAtTime(volume * 0.2, ctx.currentTime + i * 0.05)
        g.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.05 + 0.04)
        o.connect(g)
        g.connect(ctx.destination)
        o.start(ctx.currentTime + i * 0.05)
        o.stop(ctx.currentTime + i * 0.05 + 0.05)
      }
      return // Already handled
      
    default:
      // Generic beep
      osc.type = 'sine'
      osc.frequency.setValueAtTime(440, ctx.currentTime)
      gain.gain.setValueAtTime(volume * 0.3, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.15)
  }
  
  console.log(`Playing ${type} SFX (synthesized)`)
}

// Play a sound effect (doesn't stop current music)
export const playSFX = async (category) => {
  if (isMuted) return null
  
  await unlockAudio()
  playSynthSFX(category)
  return { category }
}

// Stop current music
export const stopMusic = (fadeOut = true) => {
  if (musicInterval) {
    clearInterval(musicInterval)
    musicInterval = null
  }
  currentMusicCategory = null
  console.log('Music stopped')
}

// Set volume (0-1)
export const setVolume = (newVolume) => {
  volume = Math.max(0, Math.min(1, newVolume))
}

// Get current volume
export const getVolume = () => volume

// Toggle mute
export const toggleMute = () => {
  isMuted = !isMuted
  if (isMuted) {
    stopMusic(false)
  }
  return isMuted
}

// Get mute state
export const getMuted = () => isMuted

// Set mute state
export const setMuted = (muted) => {
  isMuted = muted
  if (isMuted) {
    stopMusic(false)
  }
}

// Play lobby music (loops continuously with variety)
export const playLobbyMusic = () => playMusic('lobby', { loop: true })

// Play gameplay music (loops during questions)
export const playGameplayMusic = () => playMusic('gameplay', { loop: true })

// Play countdown music (for last seconds)
export const playCountdownMusic = () => playMusic('countdown', { loop: false })

// Play suspense music for results (short, dramatic)
export const playSuspenseMusic = () => playMusic('suspense', { loop: false })

// Play victory music for podium
export const playVictoryMusic = () => playMusic('victory', { loop: true })

// Play leaderboard background music
export const playLeaderboardMusic = () => playMusic('leaderboardMusic', { loop: false })

// Sound effects
export const playCorrectSFX = () => playSFX('correct')
export const playWrongSFX = () => playSFX('wrong')
export const playTickSFX = () => playSFX('ticktock')
export const playTimeUpSFX = () => playSFX('timeup')
export const playNewQuestionSFX = () => playSFX('newQuestion')
export const playLeaderboardSFX = () => playSFX('leaderboard')
export const playPodiumSFX = () => playSFX('podium')
export const playDrumrollSFX = () => playSFX('drumroll')
export const playPlayerJoinSFX = () => playSFX('playerJoin')
export const playCountdown3SFX = () => playSFX('countdown3')

// Get current music category
export const getCurrentMusicCategory = () => currentMusicCategory

// Reset used songs (for new game)
export const resetMusicPlaylist = () => {
  usedSongs = {}
}

// Cleanup
export const cleanup = () => {
  stopMusic(false)
  currentMusicCategory = null
  if (audioContext) {
    audioContext.close()
    audioContext = null
  }
}

export default {
  initAudio,
  unlockAudio,
  playMusic,
  playSFX,
  stopMusic,
  setVolume,
  getVolume,
  toggleMute,
  getMuted,
  setMuted,
  playLobbyMusic,
  playGameplayMusic,
  playCountdownMusic,
  playSuspenseMusic,
  playVictoryMusic,
  playLeaderboardMusic,
  playCorrectSFX,
  playWrongSFX,
  playTickSFX,
  playTimeUpSFX,
  playNewQuestionSFX,
  playLeaderboardSFX,
  playPodiumSFX,
  playDrumrollSFX,
  playPlayerJoinSFX,
  playCountdown3SFX,
  getCurrentMusicCategory,
  resetMusicPlaylist,
  cleanup,
}
