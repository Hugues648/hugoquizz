import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FiClock, FiPlus, FiTrash2, FiMapPin, FiImage, FiChevronUp, FiChevronDown } from 'react-icons/fi'
import RichTextEditor from './RichTextEditor'
import ImageUpload from '../ImageUpload'
import ColorPicker from './ColorPicker'

// Default colors
const DEFAULT_BG_COLOR = '#FFF7ED' // Light orange
const DEFAULT_TEXT_COLOR = '#1F2937' // Dark gray

export default function ProgramItemEditor({
  item = {},
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst = false,
  isLast = false,
  eventId
}) {
  const { t } = useTranslation()
  
  const [formData, setFormData] = useState({
    startTime: item.startTime || '12:00',
    activityName: item.activityName || '',
    description: item.description || '',
    locationUrl: item.locationUrl || '',
    bgColor: item.bgColor || DEFAULT_BG_COLOR,
    textColor: item.textColor || DEFAULT_TEXT_COLOR,
    images: item.images || []
  })

  useEffect(() => {
    onChange?.(formData)
  }, [formData])

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const addImage = (url) => {
    if (url && formData.images.length < 2) {
      handleChange('images', [...formData.images, url])
    }
  }

  const removeImage = (index) => {
    handleChange('images', formData.images.filter((_, i) => i !== index))
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 overflow-hidden">
      {/* Header with time */}
      <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
        <FiClock className="w-5 h-5 text-gray-400" />
        <input
          type="time"
          value={formData.startTime}
          onChange={(e) => handleChange('startTime', e.target.value)}
          className="text-2xl font-bold bg-transparent border-none focus:outline-none focus:ring-0 text-gray-900 dark:text-white"
        />
        
        <div className="flex-1" />
        
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
            title={t('common.moveUp')}
          >
            <FiChevronUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
            title={t('common.moveDown')}
          >
            <FiChevronDown className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
            title={t('common.delete')}
          >
            <FiTrash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Activity name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('planning.program.activityName')} *
          </label>
          <RichTextEditor
            value={formData.activityName}
            onChange={(v) => handleChange('activityName', v)}
            placeholder={t('planning.program.activityNamePlaceholder')}
            previewStyle={{ color: formData.textColor, backgroundColor: formData.bgColor, borderRadius: '0 0 0.5rem 0.5rem' }}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('planning.program.description')} ({t('common.optional')})
          </label>
          <RichTextEditor
            value={formData.description}
            onChange={(v) => handleChange('description', v)}
            placeholder={t('planning.program.descriptionPlaceholder')}
            showLocationLink
            locationUrl={formData.locationUrl}
            onLocationUrlChange={(v) => handleChange('locationUrl', v)}
          />
        </div>

        {/* Colors */}
        <div className="flex flex-wrap gap-4">
          <ColorPicker
            label={t('planning.program.bgColor')}
            color={formData.bgColor}
            onChange={(c) => handleChange('bgColor', c)}
          />
          <ColorPicker
            label={t('planning.program.textColor')}
            color={formData.textColor}
            onChange={(c) => handleChange('textColor', c)}
          />
        </div>

        {/* Images (max 2) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <FiImage className="inline w-4 h-4 mr-1" />
            {t('planning.program.images')} ({formData.images.length}/2)
          </label>
          
          <div className="flex flex-wrap gap-3">
            {formData.images.map((img, idx) => (
              <div key={idx} className="relative w-20 h-20 group">
                <img
                  src={img}
                  alt=""
                  className="w-full h-full object-cover rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <FiTrash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            
            {formData.images.length < 2 && (
              <div className="w-20 h-20">
                <ImageUpload
                  onImageUploaded={addImage}
                  storagePath={`events/${eventId}/programs`}
                  maxSizeMB={2}
                  className="w-full h-full"
                  compact
                />
              </div>
            )}
          </div>
        </div>

        {/* Preview */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('common.preview')}
          </label>
          <div 
            className="p-4 rounded-2xl"
            style={{ backgroundColor: formData.bgColor, color: formData.textColor }}
          >
            <div 
              className="font-bold text-lg mb-1"
              dangerouslySetInnerHTML={{ __html: formData.activityName || t('planning.program.activityNamePlaceholder') }}
            />
            {formData.description && (
              <div 
                className="text-sm opacity-90"
                dangerouslySetInnerHTML={{ __html: formData.description }}
              />
            )}
            {formData.locationUrl && (
              <a 
                href={formData.locationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full text-xs font-medium"
                style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}
              >
                <FiMapPin className="w-3 h-3" />
                {t('planning.program.viewMap')}
              </a>
            )}
            {formData.images.length > 0 && (
              <div className="flex gap-2 mt-3">
                {formData.images.map((img, idx) => (
                  <img 
                    key={idx}
                    src={img} 
                    alt="" 
                    className="w-16 h-16 object-cover rounded-xl"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
