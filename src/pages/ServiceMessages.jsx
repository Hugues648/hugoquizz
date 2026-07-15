import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FiMail, FiPhone, FiUser, FiBriefcase, FiTrash2, FiInbox, FiClock } from 'react-icons/fi'
import { useAuth } from '../contexts/AuthContext'
import {
  getServiceMessagesByOwner, markServiceMessageRead, deleteServiceMessage
} from '../services/firestore'
import LoadingSpinner from '../components/LoadingSpinner'

export default function ServiceMessages() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    if (!user) return
    ;(async () => {
      try {
        const data = await getServiceMessagesByOwner(user.uid)
        setMessages(data)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    })()
  }, [user])

  const handleOpen = async (msg) => {
    setExpanded(expanded === msg.id ? null : msg.id)
    if (!msg.read) {
      try {
        await markServiceMessageRead(msg.id)
        setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, read: true } : m)))
      } catch (e) {
        console.error(e)
      }
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteServiceMessage(id)
      setMessages((prev) => prev.filter((m) => m.id !== id))
    } catch (e) {
      console.error(e)
    }
  }

  const formatDate = (ts) => {
    const d = ts?.toDate?.() || (ts ? new Date(ts) : null)
    return d ? d.toLocaleString() : ''
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
          <FiInbox /> {t('services.messages.title', 'Messages reçus')}
        </h1>
        <p className="text-white/70 text-sm">
          {t('services.messages.subtitle', 'Les demandes envoyées via vos services apparaissent ici.')}
        </p>
      </div>

      {messages.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
          <div className="text-5xl mb-4">📭</div>
          <p className="text-gray-700 font-semibold">{t('services.messages.empty', 'Aucun message pour le moment')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`bg-white rounded-2xl shadow-sm border transition-all ${
                msg.read ? 'border-gray-100' : 'border-violet-300 ring-1 ring-violet-200'
              }`}
            >
              <button onClick={() => handleOpen(msg)} className="w-full text-left p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${msg.read ? 'bg-gray-100 text-gray-500' : 'bg-violet-100 text-violet-600'}`}>
                  <FiUser />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-gray-900 truncate">{msg.fullName}</p>
                    {!msg.read && <span className="w-2 h-2 bg-violet-500 rounded-full" />}
                  </div>
                  <p className="text-sm text-gray-500 truncate">
                    {msg.subject || msg.serviceTitle}
                  </p>
                </div>
                <span className="text-xs text-gray-400 flex items-center gap-1 shrink-0">
                  <FiClock /> {formatDate(msg.createdAt)}
                </span>
              </button>

              {expanded === msg.id && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-4 space-y-3">
                  <div className="grid sm:grid-cols-2 gap-2 text-sm">
                    <span className="flex items-center gap-2 text-gray-600">
                      <FiBriefcase className="text-gray-400" />
                      {msg.clientType === 'entreprise'
                        ? t('services.contact.company', 'Entreprise')
                        : t('services.contact.individual', 'Particulier')}
                    </span>
                    <a href={`tel:${msg.phone}`} className="flex items-center gap-2 text-gray-600 hover:text-violet-600">
                      <FiPhone className="text-gray-400" /> {msg.phone}
                    </a>
                    {msg.email && (
                      <a href={`mailto:${msg.email}`} className="flex items-center gap-2 text-gray-600 hover:text-violet-600 break-all">
                        <FiMail className="text-gray-400" /> {msg.email}
                      </a>
                    )}
                    {msg.serviceTitle && (
                      <span className="flex items-center gap-2 text-gray-600 sm:col-span-2">
                        🛎️ {msg.serviceTitle}
                      </span>
                    )}
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 text-gray-700 whitespace-pre-line">
                    {msg.message}
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleDelete(msg.id)}
                      className="inline-flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium"
                    >
                      <FiTrash2 /> {t('common.delete', 'Supprimer')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
