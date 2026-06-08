import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { 
  getEventById,
  getEventProgramById,
  createEventProgram,
  updateEventProgram
} from '../services/firestore'
import { 
  FiArrowLeft, FiSave, FiPlus, FiCalendar, FiClock
} from 'react-icons/fi'
import { ProgramItemEditor } from '../components/planning'
import LoadingSpinner from '../components/LoadingSpinner'

export default function EditEventProgram() {
  const { id: eventId, programId } = useParams()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { user } = useAuth()

  const isNew = !programId || programId === 'create'

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [event, setEvent] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState({
    title: '',
    date: '',
    items: []
  })

  useEffect(() => {
    loadData()
  }, [eventId, programId])

  const loadData = async () => {
    try {
      const eventData = await getEventById(eventId)
      if (!eventData || eventData.userId !== user?.uid) {
        setError(t('events.edit.unauthorized'))
        return
      }
      setEvent(eventData)

      // Pre-fill date from event if creating new
      if (isNew && eventData.date) {
        setFormData(prev => ({ ...prev, date: eventData.date }))
      }

      if (!isNew) {
        const programData = await getEventProgramById(programId)
        if (programData) {
          setFormData({
            title: programData.title || '',
            date: programData.date || '',
            items: programData.items || []
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
      setError(t('planning.program.titleRequired'))
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
        await createEventProgram(dataToSave)
      } else {
        await updateEventProgram(programId, dataToSave)
      }

      setSuccess(t('common.saved'))
      setTimeout(() => {
        navigate(`/${i18n.language}/event/${eventId}/planning`)
      }, 1000)
    } catch (err) {
      console.error('Error saving program:', err)
      setError(t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: `item-${Date.now()}`,
          startTime: '12:00',
          activityName: '',
          description: '',
          locationUrl: '',
          bgColor: '#FFF7ED',
          textColor: '#1F2937',
          images: []
        }
      ]
    }))
  }

  const updateItem = (index, data) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, ...data } : item)
    }))
  }

  const deleteItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const moveItem = (index, direction) => {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= formData.items.length) return

    setFormData(prev => {
      const newItems = [...prev.items]
      const [removed] = newItems.splice(index, 1)
      newItems.splice(newIndex, 0, removed)
      return { ...prev, items: newItems }
    })
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
                {isNew ? t('planning.createProgram') : t('planning.editProgram')}
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
          {/* Program info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-bold mb-4">{t('planning.program.info')}</h2>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('planning.program.title')} *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder={t('planning.program.titlePlaceholder')}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <FiCalendar className="inline w-4 h-4 mr-1" />
                  {t('planning.program.date')} ({t('common.optional')})
                </label>
                <input
                  type="text"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  placeholder={t('planning.program.datePlaceholder')}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-primary-500/20"
                />
                <p className="text-xs text-gray-500 mt-1">{t('planning.program.dateHint')}</p>
              </div>
            </div>
          </div>

          {/* Program items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <FiClock className="w-5 h-5" />
                {t('planning.program.items')}
              </h2>
              <button
                onClick={addItem}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                <FiPlus className="w-4 h-4" />
                {t('planning.program.addItem')}
              </button>
            </div>

            <div className="space-y-4">
              {formData.items.map((item, index) => (
                <ProgramItemEditor
                  key={item.id || index}
                  item={item}
                  onChange={(data) => updateItem(index, data)}
                  onDelete={() => deleteItem(index)}
                  onMoveUp={() => moveItem(index, -1)}
                  onMoveDown={() => moveItem(index, 1)}
                  isFirst={index === 0}
                  isLast={index === formData.items.length - 1}
                  eventId={eventId}
                />
              ))}

              {formData.items.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl">
                  <FiClock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500 mb-4">{t('planning.program.noItems')}</p>
                  <button
                    onClick={addItem}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                  >
                    <FiPlus className="w-4 h-4" />
                    {t('planning.program.addFirstItem')}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Preview */}
          {formData.items.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-bold mb-6">{t('common.preview')}</h2>
              
              {/* Preview header */}
              <div className="text-center mb-8">
                <p className="text-gray-500 text-sm">{event?.name}</p>
                <h3 className="text-3xl font-bold mt-2">{formData.title || t('planning.program.titlePlaceholder')}</h3>
                {formData.date && (
                  <p className="text-gray-500 mt-2">{formData.date}</p>
                )}
              </div>

              {/* Timeline */}
              <div className="space-y-6">
                {formData.items.map((item, index) => (
                  <div key={item.id || index} className="flex gap-4">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white w-20 flex-shrink-0">
                      {item.startTime}
                    </div>
                    <div 
                      className="flex-1 p-4 rounded-2xl"
                      style={{ backgroundColor: item.bgColor, color: item.textColor }}
                    >
                      <div 
                        className="font-bold text-lg"
                        dangerouslySetInnerHTML={{ __html: item.activityName || t('planning.program.activityNamePlaceholder') }}
                      />
                      {item.description && (
                        <div 
                          className="text-sm opacity-90 mt-1"
                          dangerouslySetInnerHTML={{ __html: item.description }}
                        />
                      )}
                      {item.locationUrl && (
                        <a 
                          href={item.locationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full text-xs font-medium"
                          style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}
                        >
                          {t('planning.program.viewMap')}
                        </a>
                      )}
                      {item.images?.length > 0 && (
                        <div className="flex gap-2 mt-3">
                          {item.images.map((img, idx) => (
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
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
