import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { 
  getEventById,
  getEventMenuById,
  createEventMenu,
  updateEventMenu
} from '../services/firestore'
import { 
  FiArrowLeft, FiSave, FiPlus, FiChevronDown, FiChevronUp
} from 'react-icons/fi'
import { MenuItemEditor } from '../components/planning'
import LoadingSpinner from '../components/LoadingSpinner'

const MENU_SECTIONS = ['starters', 'mains', 'desserts']

export default function EditEventMenu() {
  const { id: eventId, menuId } = useParams()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { user } = useAuth()

  const isNew = !menuId || menuId === 'create'

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [event, setEvent] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [expandedSection, setExpandedSection] = useState('starters')

  const [formData, setFormData] = useState({
    title: '',
    starters: [],
    mains: [],
    desserts: []
  })

  useEffect(() => {
    loadData()
  }, [eventId, menuId])

  const loadData = async () => {
    try {
      const eventData = await getEventById(eventId)
      if (!eventData || eventData.userId !== user?.uid) {
        setError(t('events.edit.unauthorized'))
        return
      }
      setEvent(eventData)

      if (!isNew) {
        const menuData = await getEventMenuById(menuId)
        if (menuData) {
          setFormData({
            title: menuData.title || '',
            starters: menuData.starters || [],
            mains: menuData.mains || [],
            desserts: menuData.desserts || []
          })
        }
      }
    } catch (err) {
      console.error('Error loading data:', err)
      setError(t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!formData.title.trim()) {
      setError(t('planning.menu.titleRequired'))
      return
    }

    setSaving(true)
    setError('')

    try {
      const dataToSave = {
        ...formData,
        eventId,
        userId: user.uid
      }

      if (isNew) {
        await createEventMenu(dataToSave)
      } else {
        await updateEventMenu(menuId, dataToSave)
      }

      setSuccess(t('common.saved'))
      setTimeout(() => {
        navigate(`/${i18n.language}/event/${eventId}/planning`)
      }, 1000)
    } catch (err) {
      console.error('Error saving menu:', err)
      setError(t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  const addItem = (section) => {
    setFormData(prev => ({
      ...prev,
      [section]: [
        ...prev[section],
        {
          id: `item-${Date.now()}`,
          name: '',
          description: '',
          imageUrl: '',
          bgColor: '#FFF7ED',
          textColor: '#1F2937'
        }
      ]
    }))
  }

  const updateItem = (section, index, data) => {
    setFormData(prev => ({
      ...prev,
      [section]: prev[section].map((item, i) => i === index ? { ...item, ...data } : item)
    }))
  }

  const deleteItem = (section, index) => {
    setFormData(prev => ({
      ...prev,
      [section]: prev[section].filter((_, i) => i !== index)
    }))
  }

  const moveItem = (section, index, direction) => {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= formData[section].length) return

    setFormData(prev => {
      const newItems = [...prev[section]]
      const [removed] = newItems.splice(index, 1)
      newItems.splice(newIndex, 0, removed)
      return { ...prev, [section]: newItems }
    })
  }

  const getSectionTitle = (section) => {
    switch (section) {
      case 'starters': return t('planning.menu.starters')
      case 'mains': return t('planning.menu.mains')
      case 'desserts': return t('planning.menu.desserts')
      default: return section
    }
  }

  const getSectionEmoji = (section) => {
    switch (section) {
      case 'starters': return '🥗'
      case 'mains': return '🍽️'
      case 'desserts': return '🍰'
      default: return '🍴'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error && !event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="text-primary-500 hover:underline"
          >
            {t('common.back')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              to={`/${i18n.language}/event/${eventId}/planning`}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <FiArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {isNew ? t('planning.createMenu') : t('planning.editMenu')}
              </h1>
              <p className="text-gray-500">{event?.name}</p>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors"
          >
            {saving ? <LoadingSpinner size="sm" /> : <FiSave className="w-4 h-4" />}
            {t('common.save')}
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg">
            {success}
          </div>
        )}

        {/* Form */}
        <div className="space-y-6">
          {/* Menu info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-bold mb-4">{t('planning.menu.info')}</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('planning.menu.title')} *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder={t('planning.menu.titlePlaceholder')}
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
          </div>

          {/* Menu sections */}
          {MENU_SECTIONS.map(section => (
            <div 
              key={section}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              {/* Section header */}
              <button
                onClick={() => setExpandedSection(expandedSection === section ? null : section)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <span className="text-2xl">{getSectionEmoji(section)}</span>
                  {getSectionTitle(section)}
                  <span className="text-sm font-normal text-gray-500">
                    ({formData[section].length})
                  </span>
                </h2>
                {expandedSection === section ? (
                  <FiChevronUp className="w-5 h-5" />
                ) : (
                  <FiChevronDown className="w-5 h-5" />
                )}
              </button>

              {/* Section content */}
              {expandedSection === section && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
                  {formData[section].map((item, index) => (
                    <MenuItemEditor
                      key={item.id || index}
                      item={item}
                      onChange={(data) => updateItem(section, index, data)}
                      onDelete={() => deleteItem(section, index)}
                      onMoveUp={() => moveItem(section, index, -1)}
                      onMoveDown={() => moveItem(section, index, 1)}
                      isFirst={index === 0}
                      isLast={index === formData[section].length - 1}
                      eventId={eventId}
                    />
                  ))}

                  <button
                    onClick={() => addItem(section)}
                    className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors group"
                  >
                    <div className="flex items-center justify-center gap-2 text-gray-500 group-hover:text-primary-500">
                      <FiPlus className="w-4 h-4" />
                      <span>{t('planning.menu.addDish')}</span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Preview */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-bold mb-6">{t('common.preview')}</h2>
            
            {/* Preview header */}
            <div className="text-center mb-8">
              <p className="text-gray-500 text-sm">{event?.name}</p>
              <h3 className="text-3xl font-bold mt-2">{formData.title || t('planning.menu.titlePlaceholder')}</h3>
            </div>

            {/* Menu sections preview */}
            <div className="space-y-8">
              {MENU_SECTIONS.map(section => {
                if (formData[section].length === 0) return null

                return (
                  <div key={section}>
                    <h4 className="text-xl font-bold text-center mb-4 text-orange-600 dark:text-orange-400">
                      {getSectionTitle(section)}
                    </h4>
                    <div className="space-y-3">
                      {formData[section].map((item, index) => (
                        <div 
                          key={item.id || index}
                          className="p-4 rounded-2xl"
                          style={{ backgroundColor: item.bgColor, color: item.textColor }}
                        >
                          <div className="flex items-start gap-3">
                            {item.imageUrl && (
                              <img 
                                src={item.imageUrl} 
                                alt="" 
                                className="w-16 h-16 object-cover rounded-xl flex-shrink-0"
                              />
                            )}
                            <div>
                              <div 
                                className="font-bold"
                                dangerouslySetInnerHTML={{ __html: item.name || t('planning.menu.dishNamePlaceholder') }}
                              />
                              {item.description && (
                                <div 
                                  className="text-sm opacity-90 mt-1"
                                  dangerouslySetInnerHTML={{ __html: item.description }}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
