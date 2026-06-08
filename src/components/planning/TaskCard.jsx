import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { 
  FiCheck, FiClock, FiMapPin, FiUser, FiPhone, FiDollarSign, 
  FiEdit2, FiTrash2, FiMessageSquare, FiCalendar, FiBell, 
  FiChevronDown, FiChevronUp, FiNavigation, FiSend
} from 'react-icons/fi'

// Gradient colors for task categories
const TASK_GRADIENTS = {
  default: 'from-purple-500 to-pink-500',
  clothing: 'from-pink-500 to-rose-500',
  lodging: 'from-blue-500 to-cyan-500',
  photo: 'from-amber-500 to-orange-500',
  beauty: 'from-fuchsia-500 to-purple-500',
  decoration: 'from-emerald-500 to-teal-500',
  dj: 'from-violet-500 to-purple-500',
  catering: 'from-orange-500 to-red-500',
  honor: 'from-pink-400 to-rose-400',
  security: 'from-slate-600 to-gray-700',
  cake: 'from-yellow-400 to-amber-500',
  invitations: 'from-indigo-500 to-blue-500',
  gifts: 'from-rose-400 to-pink-500'
}

const TASK_ICONS = {
  default: '📋',
  clothing: '👔',
  lodging: '🏨',
  photo: '📸',
  beauty: '💄',
  decoration: '🎨',
  dj: '🎵',
  catering: '🍽️',
  honor: '👗',
  security: '🛡️',
  cake: '🎂',
  invitations: '💌',
  gifts: '🎁'
}

export default function TaskCard({ 
  task, 
  onEdit, 
  onDelete, 
  onComplete, 
  onAddResponse,
  onSetReminder,
  compact = false 
}) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const [showResponses, setShowResponses] = useState(false)
  const [newResponse, setNewResponse] = useState('')

  const gradient = TASK_GRADIENTS[task.category] || TASK_GRADIENTS.default
  const icon = TASK_ICONS[task.category] || TASK_ICONS.default

  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && !task.completed
  const daysLeft = task.deadline ? Math.ceil((new Date(task.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : null

  const handleSubmitResponse = () => {
    if (newResponse.trim() && onAddResponse) {
      onAddResponse(task.id, newResponse.trim())
      setNewResponse('')
    }
  }

  const handleOpenMap = () => {
    if (task.locationUrl) {
      window.open(task.locationUrl, '_blank')
    }
  }

  if (compact) {
    // Compact view for task selection
    return (
      <div 
        className={`relative overflow-hidden rounded-2xl cursor-pointer transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${
          task.selected ? 'ring-2 ring-green-500 ring-offset-2' : ''
        }`}
        onClick={() => onEdit?.(task)}
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-90`} />
        <div className="relative p-5 text-white">
          <div className="flex items-start justify-between mb-3">
            <span className="text-3xl">{icon}</span>
            {task.selected && (
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <FiCheck className="w-4 h-4" />
              </div>
            )}
          </div>
          <h3 className="font-bold text-lg mb-1 line-clamp-2">{task.name}</h3>
          <p className="text-white/70 text-sm line-clamp-2">{task.description}</p>
        </div>
      </div>
    )
  }

  // Full task card view
  return (
    <div className={`relative overflow-hidden rounded-2xl shadow-lg transition-all duration-300 ${
      task.completed ? 'opacity-75' : ''
    }`}>
      {/* Gradient header */}
      <div className={`bg-gradient-to-r ${gradient} p-4 text-white`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{icon}</span>
            <div>
              <h3 className={`font-bold text-lg ${task.completed ? 'line-through' : ''}`}>
                {task.name}
              </h3>
              {task.deadline && (
                <div className={`flex items-center gap-1 text-sm mt-1 ${
                  isOverdue ? 'text-red-200' : 'text-white/80'
                }`}>
                  <FiClock className="w-3 h-3" />
                  <span>
                    {new Date(task.deadline).toLocaleDateString()} 
                    {daysLeft !== null && !task.completed && (
                      <span className="ml-1">
                        ({isOverdue 
                          ? t('tasks.overdue') 
                          : daysLeft === 0 
                            ? t('tasks.today')
                            : daysLeft === 1 
                              ? t('tasks.tomorrow')
                              : t('tasks.daysLeft', { days: daysLeft })
                        })
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Complete button */}
            <button
              onClick={() => onComplete?.(task.id, !task.completed)}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                task.completed 
                  ? 'bg-green-500 text-white' 
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
              title={task.completed ? t('tasks.markIncomplete') : t('tasks.markComplete')}
            >
              <FiCheck className="w-4 h-4" />
            </button>
            
            {/* Edit button */}
            <button
              onClick={() => onEdit?.(task)}
              className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-all"
              title={t('common.edit')}
            >
              <FiEdit2 className="w-4 h-4" />
            </button>
            
            {/* Delete button */}
            <button
              onClick={() => onDelete?.(task.id)}
              className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-red-500 transition-all"
              title={t('common.delete')}
            >
              <FiTrash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 p-4">
        {/* Description */}
        {task.description && (
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
            {task.description}
          </p>
        )}

        {/* Quick info row */}
        <div className="flex flex-wrap gap-3 mb-4">
          {/* Cost */}
          {task.cost && (
            <div className="flex items-center gap-1 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm">
              <FiDollarSign className="w-4 h-4" />
              <span>{task.cost}</span>
            </div>
          )}
          
          {/* Location */}
          {task.locationUrl && (
            <button
              onClick={handleOpenMap}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
            >
              <FiNavigation className="w-4 h-4" />
              <span>{t('tasks.directions')}</span>
            </button>
          )}
          
          {/* Reminder */}
          {task.reminderEnabled && (
            <div className="flex items-center gap-1 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full text-sm">
              <FiBell className="w-4 h-4" />
              <span>{t('tasks.reminderOn')}</span>
            </div>
          )}
        </div>

        {/* Responsibles */}
        {task.responsibles && task.responsibles.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              {t('tasks.responsibles')}
            </h4>
            <div className="flex flex-wrap gap-2">
              {task.responsibles.map((person, idx) => (
                <div 
                  key={idx}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                    {person.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-900 dark:text-white">{person.name}</p>
                    {person.contact && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <FiPhone className="w-3 h-3" />
                        {person.contact}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expand/Collapse for more options */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          {expanded ? <FiChevronUp /> : <FiChevronDown />}
          <span>{expanded ? t('common.showLess') : t('common.showMore')}</span>
        </button>

        {expanded && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
            {/* Extra fields */}
            {task.venue && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">{t('tasks.venue')}</h4>
                <p className="text-gray-700 dark:text-gray-300">{task.venue}</p>
              </div>
            )}
            
            {task.quantity && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">{t('tasks.quantity')}</h4>
                <p className="text-gray-700 dark:text-gray-300">{task.quantity}</p>
              </div>
            )}

            {/* Reminder settings */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-2">
                <FiBell className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium">{t('tasks.setReminder')}</span>
              </div>
              <button
                onClick={() => onSetReminder?.(task)}
                className="px-3 py-1 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                {t('tasks.configure')}
              </button>
            </div>

            {/* Responses / Progress section */}
            <div>
              <button
                onClick={() => setShowResponses(!showResponses)}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                <FiMessageSquare className="w-4 h-4" />
                {t('tasks.responses')} ({task.responses?.length || 0})
                {showResponses ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
              </button>
              
              {showResponses && (
                <div className="space-y-3">
                  {/* Response list */}
                  {task.responses?.map((response, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <p className="text-sm text-gray-700 dark:text-gray-300">{response.text}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(response.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                  
                  {/* Add response */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newResponse}
                      onChange={(e) => setNewResponse(e.target.value)}
                      placeholder={t('tasks.addResponse')}
                      className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500"
                      onKeyPress={(e) => e.key === 'Enter' && handleSubmitResponse()}
                    />
                    <button
                      onClick={handleSubmitResponse}
                      disabled={!newResponse.trim()}
                      className="p-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FiSend className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Completed overlay */}
      {task.completed && (
        <div className="absolute top-12 right-4 transform rotate-12">
          <div className="px-4 py-1 bg-green-500 text-white font-bold text-sm rounded-full shadow-lg">
            ✓ {t('tasks.completed')}
          </div>
        </div>
      )}
    </div>
  )
}
