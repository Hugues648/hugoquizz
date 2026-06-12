import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { FiMail, FiSend, FiSearch, FiUsers, FiCheck } from 'react-icons/fi'
import { getFunctions, httpsCallable } from 'firebase/functions'
import toast from 'react-hot-toast'

/**
 * AdminMessaging - lets an admin send an email + in-app notification to
 * one user, several selected users, or all users at once.
 */
export default function AdminMessaging({ users = [] }) {
  const { t } = useTranslation()

  const [mode, setMode] = useState('all') // 'all' | 'selected'
  const [selectedIds, setSelectedIds] = useState([])
  const [search, setSearch] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return users
    return users.filter((u) => {
      const name = (u.displayName || `${u.firstName || ''} ${u.lastName || ''}`).toLowerCase()
      return name.includes(term) || (u.email || '').toLowerCase().includes(term)
    })
  }, [users, search])

  const toggleUser = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const toggleAllFiltered = () => {
    const ids = filteredUsers.map((u) => u.id)
    const allSelected = ids.every((id) => selectedIds.includes(id))
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)))
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...ids])))
    }
  }

  const handleSend = async () => {
    if (!subject.trim()) {
      toast.error(t('admin.messaging.needSubject', "Veuillez saisir un objet."))
      return
    }
    if (!message.trim()) {
      toast.error(t('admin.messaging.needMessage', "Veuillez saisir un message."))
      return
    }
    if (mode === 'selected' && selectedIds.length === 0) {
      toast.error(t('admin.messaging.needRecipients', "Sélectionnez au moins un destinataire."))
      return
    }

    const count = mode === 'all' ? users.length : selectedIds.length
    const confirmMsg = t('admin.messaging.confirm', { count, defaultValue: `Envoyer ce message à ${count} utilisateur(s) ?` })
    if (!window.confirm(confirmMsg)) return

    setSending(true)
    try {
      const functions = getFunctions()
      const sendAdminMessage = httpsCallable(functions, 'sendAdminMessage')
      const payload = {
        subject: subject.trim(),
        message: message.trim(),
        allUsers: mode === 'all',
        userIds: mode === 'selected' ? selectedIds : [],
      }
      const res = await sendAdminMessage(payload)
      const data = res?.data || {}
      toast.success(
        t('admin.messaging.sent', { sent: data.sent ?? 0, total: data.total ?? count, defaultValue: `Message envoyé à ${data.sent ?? 0}/${data.total ?? count} utilisateur(s).` })
      )
      setSubject('')
      setMessage('')
      setSelectedIds([])
    } catch (e) {
      console.error('sendAdminMessage error:', e)
      toast.error(e.message || t('common.error', 'Erreur'))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white">
            <FiMail className="text-xl" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {t('admin.messaging.title', 'Envoyer un message')}
            </h2>
            <p className="text-sm text-gray-500">
              {t('admin.messaging.subtitle', "Écrivez à un, plusieurs ou tous les utilisateurs. Le message arrive par e-mail et notification.")}
            </p>
          </div>
        </div>

        {/* Recipient mode */}
        <div className="flex flex-wrap gap-3 mb-5">
          <button
            type="button"
            onClick={() => setMode('all')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
              mode === 'all'
                ? 'bg-violet-600 text-white border-violet-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-violet-300'
            }`}
          >
            <FiUsers className="inline mr-1.5" />
            {t('admin.messaging.allUsers', 'Tous les utilisateurs')} ({users.length})
          </button>
          <button
            type="button"
            onClick={() => setMode('selected')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
              mode === 'selected'
                ? 'bg-violet-600 text-white border-violet-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-violet-300'
            }`}
          >
            <FiCheck className="inline mr-1.5" />
            {t('admin.messaging.selectUsers', 'Sélectionner des utilisateurs')}
            {mode === 'selected' && selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
          </button>
        </div>

        {/* User selection list */}
        {mode === 'selected' && (
          <div className="mb-5 border border-gray-200 rounded-xl overflow-hidden">
            <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
              <div className="relative flex-1">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('admin.messaging.searchUser', 'Rechercher un utilisateur...')}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-violet-400 outline-none text-sm"
                />
              </div>
              <button
                type="button"
                onClick={toggleAllFiltered}
                className="px-3 py-2 rounded-lg text-sm font-medium text-violet-600 hover:bg-violet-50 whitespace-nowrap"
              >
                {t('admin.messaging.toggleAll', 'Tout (dé)sélectionner')}
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
              {filteredUsers.length === 0 ? (
                <p className="p-4 text-center text-sm text-gray-400">
                  {t('admin.messaging.noUsers', 'Aucun utilisateur')}
                </p>
              ) : (
                filteredUsers.map((u) => {
                  const checked = selectedIds.includes(u.id)
                  const name = u.displayName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email
                  return (
                    <label
                      key={u.id}
                      className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleUser(u.id)}
                        className="w-4 h-4 accent-violet-600"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{name}</p>
                        <p className="text-xs text-gray-400 truncate">{u.email}</p>
                      </div>
                    </label>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* Subject */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            {t('admin.messaging.subject', 'Objet')} *
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t('admin.messaging.subjectPlaceholder', 'Objet de votre message')}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-violet-400 outline-none"
          />
        </div>

        {/* Message */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            {t('admin.messaging.message', 'Message')} *
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={7}
            placeholder={t('admin.messaging.messagePlaceholder', 'Écrivez votre message ici...')}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-violet-400 outline-none resize-y"
          />
          <p className="text-xs text-gray-400 mt-1">
            {t('admin.messaging.emailHint', "L'e-mail sera mis en forme avec le design HugoQuiz et un bouton vers le site.")}
          </p>
        </div>

        <button
          type="button"
          onClick={handleSend}
          disabled={sending}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold rounded-xl shadow hover:shadow-lg disabled:opacity-60"
        >
          <FiSend />
          {sending ? t('admin.messaging.sending', 'Envoi en cours...') : t('admin.messaging.send', 'Envoyer le message')}
        </button>
      </div>
    </div>
  )
}
