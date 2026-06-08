/**
 * Quiz Music Service - Manages admin-uploaded music for quizzes
 * Handles lobby music, gameplay music (per duration), and sound effects
 */

import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy,
  onSnapshot
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, storage } from '../config/firebase'

// Collection names
const MUSIC_COLLECTION = 'quizMusic'

// Predefined question durations
export const QUESTION_DURATIONS = [5, 10, 20, 30, 60, 90, 120, 240]

// Music categories
export const MUSIC_CATEGORIES = {
  LOBBY: 'lobby',
  COUNTDOWN: 'countdown', // 3-2-1 countdown before game starts
  TRANSITION: 'transition', // Between questions
  RESULTS: 'results', // During statistics
  PODIUM: 'podium', // Final podium display
  // Gameplay music per duration
  GAMEPLAY_5: 'gameplay_5',
  GAMEPLAY_10: 'gameplay_10',
  GAMEPLAY_20: 'gameplay_20',
  GAMEPLAY_30: 'gameplay_30',
  GAMEPLAY_60: 'gameplay_60',
  GAMEPLAY_90: 'gameplay_90',
  GAMEPLAY_120: 'gameplay_120',
  GAMEPLAY_240: 'gameplay_240',
}

// Get gameplay category for a duration
export const getGameplayCategory = (duration) => {
  return `gameplay_${duration}`
}

// Get all music for a category
export const getMusicByCategory = async (category) => {
  try {
    const musicRef = collection(db, MUSIC_COLLECTION)
    const q = query(musicRef, orderBy('createdAt', 'desc'))
    const snapshot = await getDocs(q)
    
    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(m => m.category === category)
  } catch (error) {
    console.error('Error fetching music:', error)
    return []
  }
}

// Get all music grouped by category
export const getAllMusic = async () => {
  try {
    const musicRef = collection(db, MUSIC_COLLECTION)
    const q = query(musicRef, orderBy('createdAt', 'desc'))
    const snapshot = await getDocs(q)
    
    const allMusic = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    
    // Group by category
    const grouped = {}
    Object.values(MUSIC_CATEGORIES).forEach(cat => {
      grouped[cat] = allMusic.filter(m => m.category === cat)
    })
    
    return grouped
  } catch (error) {
    console.error('Error fetching all music:', error)
    return {}
  }
}

// Subscribe to music changes
export const subscribeToMusic = (callback) => {
  const musicRef = collection(db, MUSIC_COLLECTION)
  
  // Use simple query without orderBy to avoid index requirement
  return onSnapshot(musicRef, 
    (snapshot) => {
      const allMusic = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      
      // Sort by createdAt client-side
      allMusic.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0)
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0)
        return dateB - dateA
      })
      
      // Group by category
      const grouped = {}
      Object.values(MUSIC_CATEGORIES).forEach(cat => {
        grouped[cat] = allMusic.filter(m => m.category === cat)
      })
      
      callback(grouped)
    },
    (error) => {
      console.error('Error subscribing to music:', error)
      // Return empty grouped object on error
      const grouped = {}
      Object.values(MUSIC_CATEGORIES).forEach(cat => {
        grouped[cat] = []
      })
      callback(grouped)
    }
  )
}

// Supported audio extensions
const SUPPORTED_AUDIO_EXTENSIONS = [
  '.mp3', '.ogg', '.ogx', '.oga', '.wav', '.flac', 
  '.aac', '.m4a', '.wma', '.opus', '.webm', '.mp4'
]

// Check if file is a valid audio file
const isValidAudioFile = (file) => {
  // Check MIME type
  if (file.type.startsWith('audio/')) return true
  if (file.type === 'video/webm' || file.type === 'video/ogg') return true // Some audio files use video MIME
  
  // Check extension as fallback
  const extension = '.' + file.name.split('.').pop().toLowerCase()
  return SUPPORTED_AUDIO_EXTENSIONS.includes(extension)
}

// Upload music file
export const uploadMusic = async (file, category, name, duration = null) => {
  try {
    // Validate file type
    if (!isValidAudioFile(file)) {
      throw new Error('Le fichier doit être un fichier audio (MP3, OGG, WAV, FLAC, AAC, etc.)')
    }
    
    // Max 20MB for audio
    if (file.size > 20 * 1024 * 1024) {
      throw new Error('Le fichier ne doit pas dépasser 20 Mo')
    }
    
    // Generate unique filename
    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `quizMusic/${category}/${timestamp}_${safeName}`
    
    // Determine content type - default to audio/mpeg if unknown
    let contentType = file.type
    if (!contentType || contentType === 'application/octet-stream') {
      const ext = file.name.split('.').pop().toLowerCase()
      const mimeTypes = {
        'mp3': 'audio/mpeg',
        'ogg': 'audio/ogg',
        'wav': 'audio/wav',
        'flac': 'audio/flac',
        'aac': 'audio/aac',
        'm4a': 'audio/mp4',
        'opus': 'audio/opus',
        'webm': 'audio/webm'
      }
      contentType = mimeTypes[ext] || 'audio/mpeg'
    }
    
    // Upload to storage with explicit content type
    const storageRef = ref(storage, fileName)
    const metadata = { contentType }
    const snapshot = await uploadBytes(storageRef, file, metadata)
    const downloadURL = await getDownloadURL(snapshot.ref)
    
    // Save to Firestore
    const musicId = `${category}_${timestamp}`
    const musicDoc = {
      id: musicId,
      name: name || file.name,
      category,
      url: downloadURL,
      storagePath: fileName,
      duration: duration, // Duration of the audio file in seconds
      fileSize: file.size,
      mimeType: file.type,
      createdAt: new Date().toISOString()
    }
    
    await setDoc(doc(db, MUSIC_COLLECTION, musicId), musicDoc)
    
    return musicDoc
  } catch (error) {
    console.error('Error uploading music:', error)
    throw error
  }
}

// Delete music
export const deleteMusic = async (musicId, storagePath) => {
  try {
    // Delete from storage
    if (storagePath) {
      const storageRef = ref(storage, storagePath)
      try {
        await deleteObject(storageRef)
      } catch (e) {
        console.log('File may already be deleted:', e.message)
      }
    }
    
    // Delete from Firestore
    await deleteDoc(doc(db, MUSIC_COLLECTION, musicId))
    
    return true
  } catch (error) {
    console.error('Error deleting music:', error)
    throw error
  }
}

// Get random music from category
export const getRandomMusic = (musicList) => {
  if (!musicList || musicList.length === 0) return null
  return musicList[Math.floor(Math.random() * musicList.length)]
}

// Audio player state
let currentAudio = null
let lobbyPlaylist = []
let lobbyCurrentIndex = 0
let isLooping = false

// Play a single track
export const playTrack = async (url, options = {}) => {
  const { loop = false, volume = 0.5, onEnded = null } = options
  
  // Stop current audio without resetting isLooping
  // (stopTrack resets isLooping which breaks lobby playlist chaining)
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.currentTime = 0
    currentAudio = null
  }
  
  return new Promise((resolve, reject) => {
    currentAudio = new Audio(url)
    currentAudio.volume = volume
    currentAudio.loop = loop
    
    currentAudio.onended = () => {
      if (onEnded) onEnded()
      resolve()
    }
    
    currentAudio.onerror = (e) => {
      console.error('Audio playback error:', e)
      reject(e)
    }
    
    currentAudio.play()
      .then(() => {
        if (!loop && !onEnded) resolve()
      })
      .catch(reject)
  })
}

// Play lobby music in loop (random start, continuous)
export const playLobbyPlaylist = async (musicList, volume = 0.5) => {
  if (!musicList || musicList.length === 0) {
    console.log('No lobby music available')
    return
  }
  
  // Shuffle playlist
  lobbyPlaylist = [...musicList].sort(() => Math.random() - 0.5)
  lobbyCurrentIndex = 0
  isLooping = true
  
  const playNext = async () => {
    if (!isLooping || lobbyPlaylist.length === 0) return
    
    const track = lobbyPlaylist[lobbyCurrentIndex]
    
    try {
      await playTrack(track.url, {
        volume,
        onEnded: () => {
          lobbyCurrentIndex = (lobbyCurrentIndex + 1) % lobbyPlaylist.length
          if (isLooping) playNext()
        }
      })
    } catch (e) {
      console.error('Error playing lobby track:', e)
      // Try next track
      lobbyCurrentIndex = (lobbyCurrentIndex + 1) % lobbyPlaylist.length
      if (isLooping) setTimeout(playNext, 1000)
    }
  }
  
  await playNext()
}

// Play gameplay music for a specific duration
export const playGameplayMusic = async (musicList, questionDuration, volume = 0.5) => {
  if (!musicList || musicList.length === 0) {
    console.log('No gameplay music for this duration')
    return null
  }
  
  const track = getRandomMusic(musicList)
  if (!track) return null
  
  stopTrack()
  
  currentAudio = new Audio(track.url)
  currentAudio.volume = volume
  
  try {
    await currentAudio.play()
    return track
  } catch (e) {
    console.error('Error playing gameplay music:', e)
    return null
  }
}

// Stop current track
export const stopTrack = () => {
  isLooping = false
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.currentTime = 0
    currentAudio = null
  }
}

// Set volume
export const setTrackVolume = (volume) => {
  if (currentAudio) {
    currentAudio.volume = Math.max(0, Math.min(1, volume))
  }
}

// Get current audio
export const getCurrentAudio = () => currentAudio

export default {
  QUESTION_DURATIONS,
  MUSIC_CATEGORIES,
  getGameplayCategory,
  getMusicByCategory,
  getAllMusic,
  subscribeToMusic,
  uploadMusic,
  deleteMusic,
  getRandomMusic,
  playTrack,
  playLobbyPlaylist,
  playGameplayMusic,
  stopTrack,
  setTrackVolume,
  getCurrentAudio
}
