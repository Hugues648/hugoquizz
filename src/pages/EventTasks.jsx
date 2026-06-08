import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { 
  FiPlus, FiArrowLeft, FiFilter, FiSearch, FiCalendar, 
  FiCheckCircle, FiClock, FiAlertCircle, FiX, FiMapPin,
  FiUser, FiPhone, FiDollarSign, FiBell, FiTrash2
} from 'react-icons/fi'
import { 
  getEventById, 
  getEventTasksByEvent, 
  createEventTask, 
  updateEventTask, 
  deleteEventTask,
  addTaskResponse,
  completeEventTask,
  uncompleteEventTask,
  createNotification,
  deleteNotificationsByTask
} from '../services/firestore'
import TaskCard from '../components/planning/TaskCard'
import LoadingSpinner from '../components/LoadingSpinner'

// 12 predefined wedding tasks
const PREDEFINED_TASKS = [
  {
    id: 'clothing',
    category: 'clothing',
    name: 'Vêtements des mariés',
    description: 'Robes de mariée, costume/smoking, accessoires, chaussures, voile, etc.',
    icon: '👔'
  },
  {
    id: 'lodging',
    category: 'lodging', 
    name: 'Logement',
    description: 'Hébergement pour la lune de miel, logement des invités venus de loin',
    icon: '🏨'
  },
  {
    id: 'photo',
    category: 'photo',
    name: 'Photographe / Vidéaste',
    description: 'Photographe professionnel, vidéaste, drone, photobooth',
    icon: '📸'
  },
  {
    id: 'beauty',
    category: 'beauty',
    name: 'Esthétique',
    description: 'Coiffure, maquillage, manucure, soins spa pour les mariés',
    icon: '💄'
  },
  {
    id: 'decoration',
    category: 'decoration',
    name: 'Décoration',
    description: 'Décoration de la salle, des tables, de la voiture, fleurs et bouquets',
    icon: '🎨'
  },
  {
    id: 'dj',
    category: 'dj',
    name: 'DJ et Impressario',
    description: 'DJ, sonorisation, éclairage, animation, maître de cérémonie',
    icon: '🎵'
  },
  {
    id: 'catering',
    category: 'catering',
    name: 'Restauration et mise en place',
    description: 'Traiteur, location de chaises/tables/tentes, service, vaisselle',
    icon: '🍽️'
  },
  {
    id: 'honor',
    category: 'honor',
    name: 'Filles et garçons d\'honneur',
    description: 'Coordination des demoiselles et garçons d\'honneur, tenues, rôles',
    icon: '👗'
  },
  {
    id: 'security',
    category: 'security',
    name: 'Sécurité et protocole',
    description: 'Agents de sécurité, parking, protocole d\'entrée, gestion des accès',
    icon: '🛡️'
  },
  {
    id: 'cake',
    category: 'cake',
    name: 'Gâteau de mariage',
    description: 'Wedding cake, pièce montée, desserts, table des douceurs',
    icon: '🎂'
  },
  {
    id: 'invitations',
    category: 'invitations',
    name: 'Invitations et lien cadeaux',
    description: 'Faire-part, invitations digitales via HugoQuiz, liste de cadeaux',
    icon: '💌'
  },
  {
    id: 'gifts',
    category: 'gifts',
    name: 'Cadeaux des invités',
    description: 'Dragées, petits cadeaux souvenirs, sachets personnalisés',
    icon: '🎁'
  }
]

const REMINDER_OPTIONS = [
  { value: 'none', label: 'Aucun rappel' },
  { value: '1week', label: '1 semaine avant' },
  { value: '3days', label: '3 jours avant' },
  { value: '1day', label: '24 heures avant' },
  { value: '1hour', label: '1 heure avant' }
]

export default function EventTasks() {
  const { id: eventId } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user } = useAuth()
  
  const [event, setEvent] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showTaskPicker, setShowTaskPicker] = useState(false)
  const [showTaskEditor, setShowTaskEditor] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [filter, setFilter] = useState('all') // all, pending, completed, overdue
  const [searchQuery, setSearchQuery] = useState('')
  const [saving, setSaving] = useState(false)
  
  // Task editor form state
  const [taskForm, setTaskForm] = useState({
    name: '',
    description: '',
    category: 'default',
    deadline: '',
    cost: '',
    responsibles: [],
    locationUrl: '',
    locationName: '',
    venue: '',
    quantity: '',
    reminderType: 'none',
    notes: ''
  })

  useEffect(() => {
    if (eventId) {
      loadData()
    }
  }, [eventId])

  const loadData = async () => {
    if (!eventId) {
      console.error('No eventId provided')
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      console.log('Loading tasks for eventId:', eventId)
      const [eventData, tasksData] = await Promise.all([
        getEventById(eventId),
        getEventTasksByEvent(eventId)
      ])
      console.log('Loaded event:', eventData)
      console.log('Loaded tasks:', tasksData)
      setEvent(eventData)
      setTasks(tasksData || [])
    } catch (error) {
      console.error('Error loading tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const getUsedCategories = () => {
    return tasks.map(t => t.category)
  }

  const getAvailablePredefinedTasks = () => {
    const usedCategories = getUsedCategories()
    return PREDEFINED_TASKS.filter(t => !usedCategories.includes(t.category))
  }

  const handleSelectPredefinedTask = (predefinedTask) => {
    setTaskForm({
      name: predefinedTask.name,
      description: predefinedTask.description,
      category: predefinedTask.category,
      deadline: '',
      cost: '',
      responsibles: [],
      locationUrl: '',
      locationName: '',
      venue: '',
      quantity: '',
      reminderType: 'none',
      notes: ''
    })
    setEditingTask(null)
    setShowTaskPicker(false)
    setShowTaskEditor(true)
  }

  const handleCreateCustomTask = () => {
    setTaskForm({
      name: '',
      description: '',
      category: 'default',
      deadline: '',
      cost: '',
      responsibles: [],
      locationUrl: '',
      locationName: '',
      venue: '',
      quantity: '',
      reminderType: 'none',
      notes: ''
    })
    setEditingTask(null)
    setShowTaskPicker(false)
    setShowTaskEditor(true)
  }

  const handleEditTask = (task) => {
    setTaskForm({
      name: task.name || '',
      description: task.description || '',
      category: task.category || 'default',
      deadline: task.deadline || '',
      cost: task.cost || '',
      responsibles: task.responsibles || [],
      locationUrl: task.locationUrl || '',
      locationName: task.locationName || '',
      venue: task.venue || '',
      quantity: task.quantity || '',
      reminderType: task.reminderType || 'none',
      notes: task.notes || ''
    })
    setEditingTask(task)
    setShowTaskEditor(true)
  }

  const handleSaveTask = async () => {
    if (!taskForm.name || !taskForm.name.trim()) {
      alert(t('tasks.nameRequired') || 'Le nom de la tâche est requis')
      return
    }

    if (!user) {
      alert('Vous devez être connecté pour créer une tâche')
      return
    }

    if (!eventId) {
      alert('ID de l\'événement manquant')
      return
    }

    try {
      setSaving(true)
      
      const taskData = {
        ...taskForm,
        eventId,
        userId: user.uid,
        reminderEnabled: taskForm.reminderType !== 'none'
      }

      if (editingTask) {
        await updateEventTask(editingTask.id, taskData)
        
        // Update notifications if reminder changed
        if (taskForm.reminderType !== 'none' && taskForm.deadline) {
          await scheduleReminder(editingTask.id, taskData)
        } else {
          await deleteNotificationsByTask(editingTask.id)
        }
      } else {
        const newTask = await createEventTask(taskData)
        
        // Schedule reminder if set
        if (taskForm.reminderType !== 'none' && taskForm.deadline) {
          await scheduleReminder(newTask.id, taskData)
        }
      }

      setShowTaskEditor(false)
      setEditingTask(null)
      await loadData()
    } catch (error) {
      console.error('Error saving task:', error)
      alert(t('tasks.saveError') || 'Erreur lors de la sauvegarde: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const scheduleReminder = async (taskId, taskData) => {
    const deadlineDate = new Date(taskData.deadline)
    let reminderDate = new Date(deadlineDate)

    switch (taskData.reminderType) {
      case '1week':
        reminderDate.setDate(reminderDate.getDate() - 7)
        break
      case '3days':
        reminderDate.setDate(reminderDate.getDate() - 3)
        break
      case '1day':
        reminderDate.setDate(reminderDate.getDate() - 1)
        break
      case '1hour':
        reminderDate.setHours(reminderDate.getHours() - 1)
        break
    }

    await createNotification({
      userId: user.uid,
      type: 'task_reminder',
      taskId,
      eventId,
      title: `Rappel: ${taskData.name}`,
      message: `La tâche "${taskData.name}" est prévue pour le ${deadlineDate.toLocaleDateString()}`,
      scheduledFor: reminderDate.toISOString(),
      sent: false,
      read: false
    })
  }

  const handleDeleteTask = async (taskId) => {
    if (!confirm(t('tasks.confirmDelete'))) return

    try {
      await deleteEventTask(taskId)
      await deleteNotificationsByTask(taskId)
      await loadData()
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  const handleCompleteTask = async (taskId, completed) => {
    try {
      if (completed) {
        await completeEventTask(taskId)
        await deleteNotificationsByTask(taskId)
      } else {
        await uncompleteEventTask(taskId)
      }
      await loadData()
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  const handleAddResponse = async (taskId, text) => {
    try {
      await addTaskResponse(taskId, {
        text,
        createdAt: new Date().toISOString(),
        userId: user.uid
      })
      await loadData()
    } catch (error) {
      console.error('Error adding response:', error)
    }
  }

  const handleAddToCalendar = (task) => {
    if (!task.deadline) return

    const startDate = new Date(task.deadline)
    const endDate = new Date(startDate)
    endDate.setHours(endDate.getHours() + 1)

    const formatDate = (date) => {
      return date.toISOString().replace(/-|:|\.\d+/g, '')
    }

    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(task.name)}&dates=${formatDate(startDate)}/${formatDate(endDate)}&details=${encodeURIComponent(task.description || '')}&location=${encodeURIComponent(task.locationName || '')}`

    window.open(calendarUrl, '_blank')
  }

  const addResponsible = () => {
    setTaskForm(prev => ({
      ...prev,
      responsibles: [...prev.responsibles, { name: '', contact: '' }]
    }))
  }

  const updateResponsible = (index, field, value) => {
    setTaskForm(prev => ({
      ...prev,
      responsibles: prev.responsibles.map((r, i) => 
        i === index ? { ...r, [field]: value } : r
      )
    }))
  }

  const removeResponsible = (index) => {
    setTaskForm(prev => ({
      ...prev,
      responsibles: prev.responsibles.filter((_, i) => i !== index)
    }))
  }

  const getFilteredTasks = () => {
    let filtered = tasks

    // Apply filter
    switch (filter) {
      case 'pending':
        filtered = filtered.filter(t => !t.completed)
        break
      case 'completed':
        filtered = filtered.filter(t => t.completed)
        break
      case 'overdue':
        filtered = filtered.filter(t => 
          !t.completed && t.deadline && new Date(t.deadline) < new Date()
        )
        break
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query)
      )
    }

    return filtered
  }

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.completed).length,
    pending: tasks.filter(t => !t.completed).length,
    overdue: tasks.filter(t => !t.completed && t.deadline && new Date(t.deadline) < new Date()).length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="animate-fade-in min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 -m-4 lg:-m-8 p-4 lg:p-8">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-2xl mb-6">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <FiArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  {t('tasks.title')}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {event?.title}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setShowTaskPicker(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg"
            >
              <FiPlus className="w-5 h-5" />
              <span className="hidden sm:inline">{t('tasks.add')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="bg-white/50 dark:bg-gray-800/50 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between gap-4 overflow-x-auto flex-wrap">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setFilter('all')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                filter === 'all' 
                  ? 'bg-purple-500 text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              <span>{t('tasks.all')}</span>
              <span className="px-2 py-0.5 bg-white/20 rounded-full">{stats.total}</span>
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                filter === 'pending' 
                  ? 'bg-amber-500 text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              <FiClock className="w-4 h-4" />
              <span>{t('tasks.pending')}</span>
              <span className="px-2 py-0.5 bg-white/20 rounded-full">{stats.pending}</span>
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                filter === 'completed' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              <FiCheckCircle className="w-4 h-4" />
              <span>{t('tasks.completed')}</span>
              <span className="px-2 py-0.5 bg-white/20 rounded-full">{stats.completed}</span>
            </button>
            {stats.overdue > 0 && (
              <button
                onClick={() => setFilter('overdue')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  filter === 'overdue' 
                    ? 'bg-red-500 text-white' 
                    : 'bg-red-100 text-red-600 hover:bg-red-200'
                }`}
              >
                <FiAlertCircle className="w-4 h-4" />
                <span>{t('tasks.overdue')}</span>
                <span className="px-2 py-0.5 bg-white/20 rounded-full">{stats.overdue}</span>
              </button>
            )}
          </div>
          
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('tasks.search')}
              className="pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Task list */}
      <div>
        {getFilteredTasks().length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {t('tasks.empty')}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {t('tasks.emptyDescription')}
            </p>
            <button
              onClick={() => setShowTaskPicker(true)}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all"
            >
              {t('tasks.addFirst')}
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {getFilteredTasks().map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
                onComplete={handleCompleteTask}
                onAddResponse={handleAddResponse}
                onSetReminder={() => handleAddToCalendar(task)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Task Picker Modal */}
      {showTaskPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {t('tasks.selectTask')}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('tasks.selectTaskDescription')}
                </p>
              </div>
              <button
                onClick={() => setShowTaskPicker(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {/* Custom task button */}
              <button
                onClick={handleCreateCustomTask}
                className="w-full mb-6 p-4 border-2 border-dashed border-purple-300 dark:border-purple-600 rounded-xl hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all flex items-center justify-center gap-3"
              >
                <FiPlus className="w-6 h-6 text-purple-500" />
                <span className="text-purple-600 dark:text-purple-400 font-medium">
                  {t('tasks.createCustom')}
                </span>
              </button>

              {/* Predefined tasks */}
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                {t('tasks.predefined')}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {PREDEFINED_TASKS.map((task) => {
                  const isUsed = getUsedCategories().includes(task.category)
                  return (
                    <button
                      key={task.id}
                      onClick={() => !isUsed && handleSelectPredefinedTask(task)}
                      disabled={isUsed}
                      className={`relative p-4 rounded-xl text-left transition-all ${
                        isUsed 
                          ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-700' 
                          : 'hover:scale-105 hover:shadow-lg bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30'
                      }`}
                    >
                      <div className="text-3xl mb-2">{task.icon}</div>
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                        {task.name}
                      </h4>
                      {isUsed && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                          <FiCheckCircle className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Editor Modal */}
      {showTaskEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingTask ? t('tasks.editTask') : t('tasks.newTask')}
              </h2>
              <button
                onClick={() => {
                  setShowTaskEditor(false)
                  setEditingTask(null)
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('tasks.taskName')} *
                </label>
                <input
                  type="text"
                  value={taskForm.name}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500"
                  placeholder={t('tasks.taskNamePlaceholder')}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('tasks.description')}
                </label>
                <textarea
                  value={taskForm.description}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500"
                  placeholder={t('tasks.descriptionPlaceholder')}
                />
              </div>

              {/* Deadline and Cost */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <FiCalendar className="inline w-4 h-4 mr-1" />
                    {t('tasks.deadline')}
                  </label>
                  <input
                    type="datetime-local"
                    value={taskForm.deadline}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, deadline: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <FiDollarSign className="inline w-4 h-4 mr-1" />
                    {t('tasks.cost')}
                  </label>
                  <input
                    type="text"
                    value={taskForm.cost}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, cost: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500"
                    placeholder="ex: 500€"
                  />
                </div>
              </div>

              {/* Responsibles */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <FiUser className="inline w-4 h-4 mr-1" />
                  {t('tasks.responsibles')}
                </label>
                <div className="space-y-3">
                  {taskForm.responsibles.map((responsible, index) => (
                    <div key={index} className="flex gap-3">
                      <input
                        type="text"
                        value={responsible.name}
                        onChange={(e) => updateResponsible(index, 'name', e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500"
                        placeholder={t('tasks.responsibleName')}
                      />
                      <input
                        type="text"
                        value={responsible.contact}
                        onChange={(e) => updateResponsible(index, 'contact', e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500"
                        placeholder={t('tasks.responsibleContact')}
                      />
                      <button
                        onClick={() => removeResponsible(index)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                      >
                        <FiTrash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addResponsible}
                    className="flex items-center gap-2 text-purple-500 hover:text-purple-600 text-sm font-medium"
                  >
                    <FiPlus className="w-4 h-4" />
                    {t('tasks.addResponsible')}
                  </button>
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <FiMapPin className="inline w-4 h-4 mr-1" />
                  {t('tasks.location')}
                </label>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={taskForm.locationName}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, locationName: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500"
                    placeholder={t('tasks.locationNamePlaceholder')}
                  />
                  <input
                    type="url"
                    value={taskForm.locationUrl}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, locationUrl: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500"
                    placeholder={t('tasks.locationUrlPlaceholder')}
                  />
                </div>
              </div>

              {/* Reminder */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <FiBell className="inline w-4 h-4 mr-1" />
                  {t('tasks.reminder')}
                </label>
                <select
                  value={taskForm.reminderType}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, reminderType: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500"
                >
                  {REMINDER_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('tasks.notes')}
                </label>
                <textarea
                  value={taskForm.notes}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500"
                  placeholder={t('tasks.notesPlaceholder')}
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-4">
              <button
                onClick={() => {
                  setShowTaskEditor(false)
                  setEditingTask(null)
                }}
                className="flex-1 px-6 py-3 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSaveTask}
                disabled={!taskForm.name || !taskForm.name.trim() || saving}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
