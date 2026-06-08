import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { FiBell, FiCheck, FiTrash2, FiExternalLink, FiCheckCircle } from 'react-icons/fi'
import { useAuth } from '../contexts/AuthContext'
import { 
  subscribeToNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadNotificationCount
} from '../services/firestore'

export default function NotificationIcon() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (!user) return

    // Subscribe to real-time notifications
    const unsubscribe = subscribeToNotifications(user.uid, (notifs) => {
      setNotifications(notifs.slice(0, 10)) // Show last 10 in dropdown
      setUnreadCount(notifs.filter(n => !n.read).length)
    })

    return () => unsubscribe()
  }, [user])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleNotificationClick = async (notification) => {
    try {
      // Mark as read
      await markNotificationAsRead(notification.id)

      // Navigate to relevant page based on notification type
      if (notification.type === 'task_reminder' && notification.eventId) {
        navigate(`/event/${notification.eventId}/tasks`)
      } else if (notification.type === 'chat_escalation') {
        // Navigate to admin chat
        navigate('/admin/chat')
      }

      setShowDropdown(false)
    } catch (error) {
      console.error('Error handling notification:', error)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      setLoading(true)
      await markAllNotificationsAsRead(user.uid)
    } catch (error) {
      console.error('Error marking all as read:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteNotification = async (e, notificationId) => {
    e.stopPropagation()
    try {
      await deleteNotification(notificationId)
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'task_reminder':
        return '📋'
      case 'task_overdue':
        return '⚠️'
      case 'event_update':
        return '📅'
      case 'chat_escalation':
        return '💬'
      default:
        return '🔔'
    }
  }

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return t('notifications.justNow')
    if (diffMins < 60) return t('notifications.minutesAgo', { count: diffMins })
    if (diffHours < 24) return t('notifications.hoursAgo', { count: diffHours })
    if (diffDays < 7) return t('notifications.daysAgo', { count: diffDays })
    return date.toLocaleDateString()
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell icon with badge */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-3 text-white hover:text-white bg-white/20 hover:bg-white/30 rounded-xl transition-all shadow-lg"
        aria-label={t('notifications.title')}
      >
        <FiBell className="w-6 h-6" />
        
        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-[20px] px-1 text-xs font-bold text-white bg-red-500 rounded-full animate-pulse shadow-md">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
            <h3 className="font-bold">{t('notifications.title')}</h3>
            {notifications.length > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={loading || unreadCount === 0}
                className="text-xs flex items-center gap-1 px-2 py-1 bg-white/20 rounded-lg hover:bg-white/30 transition-colors disabled:opacity-50"
              >
                <FiCheckCircle className="w-3 h-3" />
                {t('notifications.markAllRead')}
              </button>
            )}
          </div>

          {/* Notifications list */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <div className="text-4xl mb-3">🔔</div>
                <p className="text-gray-500 dark:text-gray-400">
                  {t('notifications.empty')}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`flex gap-3 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                      !notification.read ? 'bg-purple-50 dark:bg-purple-900/20' : ''
                    }`}
                  >
                    {/* Icon */}
                    <div className="flex-shrink-0 text-2xl">
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notification.read ? 'font-semibold' : ''} text-gray-900 dark:text-white`}>
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex-shrink-0 flex items-start gap-1">
                      {!notification.read && (
                        <div className="w-2 h-2 bg-purple-500 rounded-full mt-2" />
                      )}
                      <button
                        onClick={(e) => handleDeleteNotification(e, notification.id)}
                        className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                        title={t('common.delete')}
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-gray-100 dark:border-gray-700 p-3">
              <button
                onClick={() => {
                  navigate('/notifications')
                  setShowDropdown(false)
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
              >
                <FiExternalLink className="w-4 h-4" />
                {t('notifications.viewAll')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
