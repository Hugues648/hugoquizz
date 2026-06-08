/**
 * Admin Quiz Music Management Page
 * Allows admin to upload and manage music for quiz lobby and gameplay
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import {
  MUSIC_CATEGORIES,
  QUESTION_DURATIONS,
  subscribeToMusic,
  uploadMusic,
  deleteMusic,
  playTrack,
  stopTrack
} from '../services/quizMusicService'
import { 
  FiMusic, 
  FiUpload, 
  FiTrash2, 
  FiPlay, 
  FiSquare,
  FiArrowLeft,
  FiVolume2,
  FiClock,
  FiAlertCircle,
  FiCheck
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'

// Category labels
const CATEGORY_LABELS = {
  [MUSIC_CATEGORIES.LOBBY]: {
    title: '🎵 Musiques du Lobby',
    description: 'Jouées en boucle aléatoire dans la salle d\'attente',
    icon: '🏠'
  },
  [MUSIC_CATEGORIES.COUNTDOWN]: {
    title: '⏱️ Compte à rebours (3-2-1)',
    description: 'Son joué avant le début du jeu',
    icon: '⏱️'
  },
  [MUSIC_CATEGORIES.TRANSITION]: {
    title: '🔄 Transition entre questions',
    description: 'Son court entre deux questions',
    icon: '🔄'
  },
  [MUSIC_CATEGORIES.RESULTS]: {
    title: '📊 Résultats / Statistiques',
    description: 'Musique pendant l\'affichage des résultats',
    icon: '📊'
  },
  [MUSIC_CATEGORIES.PODIUM]: {
    title: '🏆 Podium Final',
    description: 'Musique festive pour le podium',
    icon: '🏆'
  }
}

// Duration labels
const getDurationLabel = (duration) => ({
  title: `🎮 Questions de ${duration}s`,
  description: `Musiques pour les questions de ${duration} secondes. La musique doit durer ~${duration + 4}s pour inclure le signal de fin.`,
  icon: '🎮'
})

const AdminQuizMusic = () => {
  const { userData } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()
  
  const [loading, setLoading] = useState(true)
  const [musicData, setMusicData] = useState({})
  const [uploading, setUploading] = useState({})
  const [playing, setPlaying] = useState(null)
  const [activeTab, setActiveTab] = useState('lobby')
  
  const fileInputRefs = useRef({})

  // Check admin access
  useEffect(() => {
    if (userData && userData.role !== 'admin') {
      toast.error(t('messages.error.adminOnly'))
      navigate('/dashboard')
    }
  }, [userData, navigate, t])

  // Subscribe to music data
  useEffect(() => {
    const unsubscribe = subscribeToMusic((data) => {
      setMusicData(data)
      setLoading(false)
    })
    
    return () => {
      unsubscribe()
      stopTrack()
    }
  }, [])

  // Handle file upload
  const handleUpload = async (category, files) => {
    if (!files || files.length === 0) return
    
    setUploading(prev => ({ ...prev, [category]: true }))
    
    let successCount = 0
    let errorCount = 0
    let lastError = ''
    
    for (const file of files) {
      try {
        console.log('Uploading file:', file.name, 'type:', file.type, 'size:', file.size)
        await uploadMusic(file, category, file.name)
        successCount++
      } catch (error) {
        console.error('Upload error:', error)
        lastError = error.message || t('adminQuizMusic.unknownError', 'Erreur inconnue')
        errorCount++
      }
    }
    
    if (successCount > 0) {
      toast.success(`${successCount} fichier(s) uploadé(s)`)
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} fichier(s) en erreur: ${lastError}`)
    }
    
    setUploading(prev => ({ ...prev, [category]: false }))
    
    // Reset file input
    if (fileInputRefs.current[category]) {
      fileInputRefs.current[category].value = ''
    }
  }

  // Handle delete
  const handleDelete = async (music) => {
    if (!confirm(`Supprimer "${music.name}" ?`)) return
    
    try {
      await deleteMusic(music.id, music.storagePath)
      toast.success(t('messages.success.musicDeleted'))
    } catch (error) {
      toast.error(t('messages.error.deleting'))
    }
  }

  // Handle play/stop
  const handlePlayStop = async (music) => {
    if (playing === music.id) {
      stopTrack()
      setPlaying(null)
    } else {
      stopTrack()
      setPlaying(music.id)
      try {
        await playTrack(music.url, {
          volume: 0.5,
          onEnded: () => setPlaying(null)
        })
      } catch (e) {
        setPlaying(null)
        toast.error(t('messages.error.playbackError'))
      }
    }
  }

  // Render music list for a category
  const renderMusicList = (category, info) => {
    const musicList = musicData[category] || []
    const isUploading = uploading[category]
    
    return (
      <div key={category} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <span className="text-xl">{info.icon}</span>
            {info.title}
          </h3>
          <p className="text-sm text-gray-600 mt-1">{info.description}</p>
        </div>
        
        <div className="p-4">
          {/* Upload area */}
          <div className="mb-4">
            <input
              type="file"
              accept="audio/*,.mp3,.ogg,.ogx,.oga,.wav,.flac,.aac,.m4a,.wma,.opus,.webm"
              multiple
              ref={el => fileInputRefs.current[category] = el}
              onChange={(e) => handleUpload(category, Array.from(e.target.files))}
              className="hidden"
              id={`upload-${category}`}
            />
            <label
              htmlFor={`upload-${category}`}
              className={`flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                isUploading 
                  ? 'border-gray-300 bg-gray-50 cursor-wait'
                  : 'border-purple-300 hover:border-purple-500 hover:bg-purple-50'
              }`}
            >
              {isUploading ? (
                <>
                  <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-gray-600">{t('adminQuizMusic.uploading', 'Upload en cours...')}</span>
                </>
              ) : (
                <>
                  <FiUpload className="w-5 h-5 text-purple-500" />
                  <span className="text-purple-700">{t('adminQuizMusic.addAudio', 'Cliquez pour ajouter des fichiers audio')}</span>
                </>
              )}
            </label>
          </div>
          
          {/* Music list */}
          {musicList.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <FiMusic className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>{t('adminQuizMusic.noMusic', 'Aucune musique')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {musicList.map((music) => (
                <div 
                  key={music.id}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    playing === music.id ? 'bg-purple-100' : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <button
                    onClick={() => handlePlayStop(music)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      playing === music.id 
                        ? 'bg-purple-500 text-white'
                        : 'bg-white border border-gray-300 text-gray-600 hover:border-purple-500 hover:text-purple-500'
                    }`}
                  >
                    {playing === music.id ? <FiSquare className="w-4 h-4" /> : <FiPlay className="w-4 h-4 ml-0.5" />}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{music.name}</p>
                    <p className="text-xs text-gray-500">
                      {(music.fileSize / 1024 / 1024).toFixed(2)} Mo
                      {music.duration && ` • ${Math.round(music.duration)}s`}
                    </p>
                  </div>
                  
                  <button
                    onClick={() => handleDelete(music)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    title={t('common.delete', 'Supprimer')}
                  >
                    <FiTrash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (loading) {
    return <LoadingSpinner fullScreen text={t('adminQuizMusic.loading', 'Chargement des musiques...')} />
  }

  // Build tabs
  const tabs = [
    { id: 'lobby', label: 'Lobby', icon: '🏠' },
    { id: 'effects', label: 'Effets', icon: '🔊' },
    { id: 'gameplay', label: 'Gameplay', icon: '🎮' }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        <div className="container mx-auto px-4 py-6">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
          >
            <FiArrowLeft />
            {t('adminQuizMusic.backToAdmin', 'Retour au panneau admin')}
          </button>
          
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <FiMusic className="w-8 h-8" />
            {t('adminQuizMusic.title', 'Gestion des Musiques du Quiz')}
          </h1>
          <p className="text-white/80 mt-1">
            {t('adminQuizMusic.subtitle', 'Gérez les musiques du lobby, les effets sonores et les musiques de gameplay')}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4">
          <div className="flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Lobby Tab */}
        {activeTab === 'lobby' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-3">
                <FiVolume2 className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">{t('adminQuizMusic.lobbyMusic', 'Musiques du Lobby')}</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    {t('adminQuizMusic.lobbyMusicDesc', "Ces musiques sont jouées en boucle dans la salle d'attente. La première musique est choisie au hasard, puis les autres suivent de façon continue.")}
                  </p>
                </div>
              </div>
            </div>
            
            {renderMusicList(MUSIC_CATEGORIES.LOBBY, CATEGORY_LABELS[MUSIC_CATEGORIES.LOBBY])}
          </div>
        )}

        {/* Effects Tab */}
        {activeTab === 'effects' && (
          <div className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex gap-3">
                <FiAlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-900">{t('adminQuizMusic.soundEffects', 'Effets Sonores')}</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    {t('adminQuizMusic.soundEffectsDesc', 'Ces sons sont joués à des moments spécifiques du jeu : début, transitions, résultats et podium.')}
                  </p>
                </div>
              </div>
            </div>
            
            {renderMusicList(MUSIC_CATEGORIES.COUNTDOWN, CATEGORY_LABELS[MUSIC_CATEGORIES.COUNTDOWN])}
            {renderMusicList(MUSIC_CATEGORIES.TRANSITION, CATEGORY_LABELS[MUSIC_CATEGORIES.TRANSITION])}
            {renderMusicList(MUSIC_CATEGORIES.RESULTS, CATEGORY_LABELS[MUSIC_CATEGORIES.RESULTS])}
            {renderMusicList(MUSIC_CATEGORIES.PODIUM, CATEGORY_LABELS[MUSIC_CATEGORIES.PODIUM])}
          </div>
        )}

        {/* Gameplay Tab */}
        {activeTab === 'gameplay' && (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex gap-3">
                <FiClock className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-900">{t('adminQuizMusic.gameplayMusic', 'Musiques de Gameplay')}</h4>
                  <p className="text-sm text-green-700 mt-1">
                    {t('adminQuizMusic.gameplayMusicDesc', 'Chaque durée de question a sa propre banque de musiques. La musique choisie au hasard doit durer quelques secondes de plus que le temps de la question (pour inclure le signal de fin).')}
                  </p>
                  <ul className="text-sm text-green-700 mt-2 space-y-1">
                    <li>\u2022 {t('adminQuizMusic.questionDuration', 'Question de {{duration}}s \u2192 Musique de ~{{musicDuration}}s', { duration: 5, musicDuration: 8 })}</li>
                    <li>\u2022 {t('adminQuizMusic.questionDuration', 'Question de {{duration}}s \u2192 Musique de ~{{musicDuration}}s', { duration: 10, musicDuration: 14 })}</li>
                    <li>\u2022 {t('adminQuizMusic.questionDuration', 'Question de {{duration}}s \u2192 Musique de ~{{musicDuration}}s', { duration: 30, musicDuration: 34 })}</li>
                    <li>• etc.</li>
                  </ul>
                </div>
              </div>
            </div>
            
            {QUESTION_DURATIONS.map(duration => {
              const category = `gameplay_${duration}`
              return renderMusicList(category, getDurationLabel(duration))
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminQuizMusic
