import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FiTrash2, FiImage, FiChevronUp, FiChevronDown } from 'react-icons/fi'
import RichTextEditor from './RichTextEditor'
import ImageUpload from '../ImageUpload'
import ColorPicker from './ColorPicker'

// Default colors
const DEFAULT_BG_COLOR = '#FFF7ED' // Light orange
const DEFAULT_TEXT_COLOR = '#1F2937' // Dark gray

export default function MenuItemEditor({
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
    name: item.name || '',
    description: item.description || '',
    imageUrl: item.imageUrl || '',
    bgColor: item.bgColor || DEFAULT_BG_COLOR,
    textColor: item.textColor || DEFAULT_TEXT_COLOR
  })

  useEffect(() => {
    onChange?.(formData)
  }, [formData])

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
        <span className="font-medium text-gray-600 dark:text-gray-400">
          {t('planning.menu.dish')}
        </span>
        
        <div className="flex-1" />
        
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <FiChevronUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <FiChevronDown className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
          >
            <FiTrash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Dish name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('planning.menu.dishName')} *
          </label>
          <RichTextEditor
            value={formData.name}
            onChange={(v) => handleChange('name', v)}
            placeholder={t('planning.menu.dishNamePlaceholder')}
            previewStyle={{ color: formData.textColor, backgroundColor: formData.bgColor, borderRadius: '0 0 0.5rem 0.5rem' }}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('planning.menu.dishDescription')} ({t('common.optional')})
          </label>
          <RichTextEditor
            value={formData.description}
            onChange={(v) => handleChange('description', v)}
            placeholder={t('planning.menu.dishDescriptionPlaceholder')}
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

        {/* Image */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <FiImage className="inline w-4 h-4 mr-1" />
            {t('planning.menu.dishImage')} ({t('common.optional')})
          </label>
          
          <div className="flex items-start gap-3">
            {formData.imageUrl ? (
              <div className="relative w-20 h-20 group">
                <img
                  src={formData.imageUrl}
                  alt=""
                  className="w-full h-full object-cover rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => handleChange('imageUrl', '')}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <FiTrash2 className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="w-20 h-20">
                <ImageUpload
                  onImageUploaded={(url) => handleChange('imageUrl', url)}
                  storagePath={`events/${eventId}/menus`}
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
            <div className="flex items-start gap-3">
              {formData.imageUrl && (
                <img 
                  src={formData.imageUrl} 
                  alt="" 
                  className="w-16 h-16 object-cover rounded-xl flex-shrink-0"
                />
              )}
              <div>
                <div 
                  className="font-bold text-lg"
                  dangerouslySetInnerHTML={{ __html: formData.name || t('planning.menu.dishNamePlaceholder') }}
                />
                {formData.description && (
                  <div 
                    className="text-sm opacity-90 mt-1"
                    dangerouslySetInnerHTML={{ __html: formData.description }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
