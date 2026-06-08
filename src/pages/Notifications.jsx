import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { 
  FiBell, FiArrowLeft, FiCheck, FiTrash2, FiFilter,
  FiCheckCircle, FiClock, FiAlertCircle, FiCalendar
} from 'react-icons/fi'
import { useAuth } from '../contexts/AuthContext'
import { 
  getNotificationsByUser,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification
} from '../services/firestore'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Notifications() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, unread, read
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (user) {
      loadNotifications()
    }
  }, [user])

  const loadNotifications = async () => {
    if (!user) return
    try {
      setLoading(true)
      const notifs = await getNotificationsByUser(user.uid)
      setNotifications(notifs)
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsRead = async (notificationId) => {
    try {
      await markNotificationAsRead(notificationId)
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      )
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      setActionLoading(true)
      await markAllNotificationsAsRead(user.uid)
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    } catch (error) {
      console.error('Error marking all as read:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async (notificationId) => {
    try {
      await deleteNotification(notificationId)
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  const handleNotificationClick = async (notification) => {
    // Mark as read first
    if (!notification.read) {
      await handleMarkAsRead(notification.id)
    }

    // Navigate to relevant page
    if (notification.type === 'task_reminder' && notification.eventId) {
      navigate(`/event/${notification.eventId}/tasks`)
    }
  }

  const getFilteredNotifications = () => {
    switch (filter) {
      case 'unread':
        return notifications.filter(n => !n.read)
      case 'read':
        return notifications.filter(n => n.read)
      default:
        return notifications
    }
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'task_reminder':
        return { icon: '📋', bg: 'bg-purple-100 dark:bg-purple-900/30', color: 'text-purple-600' }
      case 'task_overdue':
        return { icon: '⚠️', bg: 'bg-red-100 dark:bg-red-900/30', color: 'text-red-600' }
      case 'event_update':
        return { icon: '📅', bg: 'bg-blue-100 dark:bg-blue-900/30', color: 'text-blue-600' }
      default:
        return { icon: '🔔', bg: 'bg-gray-100 dark:bg-gray-700', color: 'text-gray-600' }
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    const isYesterday = new Date(now - 86400000).toDateString() === date.toDateString()

    if (isToday) {
      return `${t('notifications.today')} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    }
    if (isYesterday) {
      return `${t('notifications.yesterday')} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    }
    return date.toLocaleString([], { 
      day: 'numeric', 
      month: 'short', 
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const stats = {
    total: notifications.length,
    unread: notifications.filter(n => !n.read).length,
    read: notifications.filter(n => n.read).length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="animate-fade-in max-w-4xl ml-4 lg:ml-8">
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
                <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FiBell className="w-5 h-5" />
                  {t('notifications.title')}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {stats.unread > 0 
                    ? t('notifications.unreadCount', { count: stats.unread })
                    : t('notifications.allRead')
                  }
                </p>
              </div>
            </div>
            
            {stats.unread > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50"
              >
                <FiCheckCircle className="w-4 h-4" />
                <span className="hidden sm:inline">{t('notifications.markAllRead')}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white/50 dark:bg-gray-800/50 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                filter === 'all' 
                  ? 'bg-purple-500 text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              <FiBell className="w-4 h-4" />
              <span>{t('notifications.all')}</span>
              <span className="px-2 py-0.5 bg-white/20 rounded-full">{stats.total}</span>
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                filter === 'unread' 
                  ? 'bg-amber-500 text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              <FiClock className="w-4 h-4" />
              <span>{t('notifications.unread')}</span>
              <span className="px-2 py-0.5 bg-white/20 rounded-full">{stats.unread}</span>
            </button>
            <button
              onClick={() => setFilter('read')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                filter === 'read' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              <FiCheck className="w-4 h-4" />
              <span>{t('notifications.read')}</span>
              <span className="px-2 py-0.5 bg-white/20 rounded-full">{stats.read}</span>
            </button>
          </div>
        </div>

      {/* Notifications list */}
      <div>
        {getFilteredNotifications().length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
            <div className="text-6xl mb-4">🔔</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {filter === 'unread' 
                ? t('notifications.noUnread')
                : filter === 'read' 
                  ? t('notifications.noRead')
                  : t('notifications.empty')
              }
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {t('notifications.emptyDescription')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {getFilteredNotifications().map((notification) => {
              const iconStyle = getNotificationIcon(notification.type)
              return (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden cursor-pointer transition-all hover:shadow-md ${
                    !notification.read ? 'ring-2 ring-purple-500 ring-opacity-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-4 p-4">
                    {/* Icon */}
                    <div className={`flex-shrink-0 w-12 h-12 ${iconStyle.bg} rounded-xl flex items-center justify-center text-2xl`}>
                      {iconStyle.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className={`font-semibold text-gray-900 dark:text-white ${!notification.read ? '' : 'font-normal'}`}>
                            {notification.title}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <FiClock className="w-3 h-3" />
                              {formatDate(notification.createdAt)}
                            </span>
                            {!notification.read && (
                              <span className="text-xs text-purple-500 font-medium px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                                {t('notifications.new')}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!notification.read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleMarkAsRead(notification.id)
                              }}
                              className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                              title={t('notifications.markRead')}
                            >
                              <FiCheck className="w-5 h-5" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(notification.id)
                            }}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title={t('common.delete')}
                          >
                            <FiTrash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
