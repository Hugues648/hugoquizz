import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { uploadImage, deleteFileFromStorage, canUploadFile } from '../services/storage'
import { useAuth } from '../contexts/AuthContext'
import { FiUpload, FiLink, FiX, FiCheck, FiTrash2 } from 'react-icons/fi'

export default function ImageUpload({ 
  value, 
  onChange, 
  folder = 'images', 
  className = '', 
  onDelete,
  // New props for planning feature
  onImageUploaded,
  storagePath,
  maxSizeMB = 5, // Default 5MB limit
  compact = false
}) {
  const { t } = useTranslation()
  const { currentUser } = useAuth()
  const [mode, setMode] = useState('upload') // 'url' ou 'upload'
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [urlInput, setUrlInput] = useState(value || '')
  const [showUrlInput, setShowUrlInput] = useState(false)
  const fileInputRef = useRef(null)
  const inputId = useRef(`image-upload-${Math.random().toString(36).substr(2, 9)}`)

  // Use storagePath if provided, otherwise use folder
  const uploadFolder = storagePath || folder

  // Sync urlInput with value prop
  useEffect(() => {
    if (value !== urlInput) {
      setUrlInput(value || '')
    }
  }, [value])

  const handleUrlChange = (e) => {
    const url = e.target.value
    setUrlInput(url)
  }

  const handleUrlSubmit = () => {
    if (urlInput) {
      if (onChange) onChange(urlInput)
      if (onImageUploaded) onImageUploaded(urlInput)
      setShowUrlInput(false)
      setError('')
    }
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      setError(t('imageUpload.selectImage', 'Veuillez sélectionner une image'))
      return
    }

    // Vérifier la taille (5MB max par défaut)
    const maxSize = maxSizeMB * 1024 * 1024
    if (file.size > maxSize) {
      setError(t('imageUpload.maxSizeErrorWithSize', { size: maxSizeMB }))
      return
    }

    setError('')
    setUploading(true)
    setProgress(0)

    try {
      // Vérifier le quota de stockage
      if (currentUser) {
        const quotaCheck = await canUploadFile(currentUser.uid, file.size)
        if (!quotaCheck.canUpload) {
          setError(quotaCheck.message)
          setUploading(false)
          return
        }
      }

      setProgress(50)
      
      // Utiliser uploadImage du service storage (avec tracking du quota)
      const downloadURL = await uploadImage(file, uploadFolder)
      
      setProgress(100)
      
      if (onChange) onChange(downloadURL)
      if (onImageUploaded) onImageUploaded(downloadURL)
      setUrlInput(downloadURL)
      setUploading(false)
      setProgress(0)
    } catch (err) {
      console.error('Erreur upload:', err)
      setError(err.message || `Erreur: ${err.code || 'UNKNOWN'}`)
      setUploading(false)
    }
  }

  const clearImage = async (deleteFromStorage = false) => {
    const currentValue = value || urlInput
    if (deleteFromStorage && currentValue) {
      setDeleting(true)
      try {
        await deleteFileFromStorage(currentValue)
      } catch (err) {
        console.error('Error deleting from storage:', err)
      }
      setDeleting(false)
    }
    
    if (onChange) onChange('')
    setUrlInput('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    
    if (onDelete) {
      onDelete()
    }
  }

  // COMPACT MODE - Simple small button for planning editors
  if (compact) {
    return (
      <div className={`relative ${className}`}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*"
          className="hidden"
          id={inputId.current}
        />

        {uploading ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-xl">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : showUrlInput ? (
          <div className="absolute inset-0 z-10 bg-white dark:bg-gray-800 rounded-xl p-1 flex flex-col gap-1">
            <input
              type="url"
              value={urlInput}
              onChange={handleUrlChange}
              placeholder="URL..."
              className="flex-1 w-full text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-primary-500"
              autoFocus
            />
            <div className="flex gap-1">
              <button
                type="button"
                onClick={handleUrlSubmit}
                className="flex-1 p-1 bg-green-500 text-white rounded text-xs"
              >
                <FiCheck className="w-3 h-3 mx-auto" />
              </button>
              <button
                type="button"
                onClick={() => setShowUrlInput(false)}
                className="flex-1 p-1 bg-gray-200 dark:bg-gray-600 rounded text-xs"
              >
                <FiX className="w-3 h-3 mx-auto" />
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-primary-400 transition-colors cursor-pointer bg-gray-50 dark:bg-gray-700/50">
            <label
              htmlFor={inputId.current}
              className="flex-1 w-full flex items-center justify-center cursor-pointer"
            >
              <FiUpload className="w-5 h-5 text-gray-400" />
            </label>
            <button
              type="button"
              onClick={() => setShowUrlInput(true)}
              className="w-full py-1 text-xs text-gray-500 hover:text-primary-500 border-t border-gray-200 dark:border-gray-600"
            >
              <FiLink className="w-3 h-3 mx-auto" />
            </button>
          </div>
        )}

        {error && (
          <div className="absolute -bottom-6 left-0 right-0 text-xs text-red-500 truncate">
            {error}
          </div>
        )}
      </div>
    )
  }

  // NORMAL MODE - Full image upload with tabs
  return (
    <div className={className}>
      {/* Tabs pour choisir le mode */}
      <div className="flex gap-2 mb-2">
        <button
          type="button"
          onClick={() => setMode('url')}
          className={`flex-1 py-2 px-3 text-sm rounded-lg flex items-center justify-center gap-2 transition-colors ${
            mode === 'url'
              ? 'bg-pink-100 text-pink-700 border-2 border-pink-500'
              : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
          }`}
        >
          <FiLink className="w-4 h-4" />
          URL
        </button>
        <button
          type="button"
          onClick={() => setMode('upload')}
          className={`flex-1 py-2 px-3 text-sm rounded-lg flex items-center justify-center gap-2 transition-colors ${
            mode === 'upload'
              ? 'bg-pink-100 text-pink-700 border-2 border-pink-500'
              : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
          }`}
        >
          <FiUpload className="w-4 h-4" />
          {t('imageUpload.import', 'Importer')}
        </button>
      </div>

      {/* Mode URL */}
      {mode === 'url' && (
        <div className="space-y-2">
          <div className="relative">
            <input
              type="url"
              value={urlInput}
              onChange={handleUrlChange}
              placeholder={t('imageUpload.urlPlaceholder', 'https://exemple.com/image.jpg')}
              className="w-full px-4 py-2 pr-20 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-sm"
            />
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
              {urlInput && (
                <>
                  <button
                    type="button"
                    onClick={handleUrlSubmit}
                    className="p-1.5 text-green-500 hover:bg-green-50 rounded"
                    title="Appliquer"
                  >
                    <FiCheck className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => clearImage()}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mode Upload */}
      {mode === 'upload' && (
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            className="hidden"
            id={inputId.current}
          />
          
          {uploading ? (
            <div className="border-2 border-dashed border-pink-300 rounded-lg p-4 bg-pink-50">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="h-2 bg-pink-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-pink-500 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-pink-600 mt-1 truncate">{t('imageUpload.uploadInProgress', 'Upload en cours...')} {progress}%</p>
                </div>
              </div>
            </div>
          ) : (value || urlInput) ? (
            <div className="relative border-2 border-green-300 rounded-lg p-2 bg-green-50">
              <div className="flex items-center gap-2">
                <FiCheck className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-sm text-green-700 flex-1 truncate">{t('imageUpload.imageUploaded', 'Image uploadée')}</span>
                <button
                  type="button"
                  onClick={() => clearImage(true)}
                  disabled={deleting}
                  className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-50 flex-shrink-0"
                  title={t('imageUpload.deleteImage', "Supprimer l'image")}
                >
                  {deleting ? (
                    <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <FiTrash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ) : (
            <label
              htmlFor={inputId.current}
              className="block border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-pink-400 hover:bg-pink-50 transition-colors"
            >
              <FiUpload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">
                {t('imageUpload.clickToSelect', 'Cliquez pour sélectionner une image')}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                PNG, JPG, GIF (max {maxSizeMB} Mo)
              </p>
            </label>
          )}
        </div>
      )}

      {/* Erreur */}
      {error && (
        <p className="mt-2 text-sm text-red-600 break-words">{error}</p>
      )}

      {/* Aperçu de l'image */}
      {(value || urlInput) && (
        <div className="mt-3 relative rounded-lg overflow-hidden h-32 bg-gray-100">
          <img
            src={value || urlInput}
            alt={t('imageUpload.preview', 'Aperçu')}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none'
            }}
          />
          <button
            type="button"
            onClick={() => clearImage()}
            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
