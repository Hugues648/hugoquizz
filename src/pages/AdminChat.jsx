import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { 
  FiMessageCircle, 
  FiUser, 
  FiClock, 
  FiCheck, 
  FiX, 
  FiSend,
  FiRefreshCw,
  FiArrowLeft,
  FiUsers,
  FiAlertCircle,
  FiCheckCircle,
  FiMessageSquare,
  FiChevronRight
} from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { 
  getAllActiveConversations,
  subscribeToWaitingConversations,
  getChatMessages,
  subscribeToChatMessages,
  subscribeToConversation,
  addChatMessage,
  markMessagesAsRead,
  updateChatConversation,
  closeConversation,
  returnToBot
} from '../services/chatService'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'

export default function AdminChat() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  
  const [conversations, setConversations] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [filter, setFilter] = useState('all') // 'all', 'waiting', 'active'
  
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const unsubscribeMessagesRef = useRef(null)
  const unsubscribeConvRef = useRef(null)
  const unsubscribeWaitingRef = useRef(null)
  
  // Load all conversations
  useEffect(() => {
    loadConversations()
    
    // Subscribe to waiting conversations for real-time badge updates
    unsubscribeWaitingRef.current = subscribeToWaitingConversations((waiting) => {
      setConversations(prev => {
        // Update existing conversations with new waiting status
        const updatedConvs = [...prev]
        waiting.forEach(w => {
          const idx = updatedConvs.findIndex(c => c.id === w.id)
          if (idx >= 0) {
            updatedConvs[idx] = w
          } else {
            updatedConvs.unshift(w)
          }
        })
        return updatedConvs
      })
    })
    
    return () => {
      if (unsubscribeWaitingRef.current) unsubscribeWaitingRef.current()
      if (unsubscribeMessagesRef.current) unsubscribeMessagesRef.current()
      if (unsubscribeConvRef.current) unsubscribeConvRef.current()
    }
  }, [])
  
  const loadConversations = async () => {
    setLoading(true)
    try {
      const convs = await getAllActiveConversations()
      setConversations(convs)
    } catch (error) {
      console.error('Error loading conversations:', error)
      toast.error(t('common.error'))
    } finally {
      setLoading(false)
    }
  }
  
  // Select a conversation
  const handleSelectConversation = async (conv) => {
    // Cleanup previous subscriptions
    if (unsubscribeMessagesRef.current) unsubscribeMessagesRef.current()
    if (unsubscribeConvRef.current) unsubscribeConvRef.current()
    
    setSelectedConversation(conv)
    setMessages([])
    
    // Mark as read
    await markMessagesAsRead(conv.id, 'admin')
    
    // If conversation is waiting, mark as active (admin taking over)
    if (conv.status === 'waiting_admin') {
      await updateChatConversation(conv.id, {
        status: 'open',
        chatMode: 'human',
        adminJoinedAt: new Date()
      })
      
      // Add system message
      await addChatMessage(conv.id, {
        text: '👤 Un membre de l\'équipe HugoQuiz vous répond maintenant.',
        sender: 'bot'
      })
    }
    
    // Subscribe to messages
    unsubscribeMessagesRef.current = subscribeToChatMessages(conv.id, (msgs) => {
      setMessages(msgs)
      // Mark as read when new messages arrive
      markMessagesAsRead(conv.id, 'admin')
    })
    
    // Subscribe to conversation changes
    unsubscribeConvRef.current = subscribeToConversation(conv.id, (updatedConv) => {
      setSelectedConversation(updatedConv)
      // Update in list too
      setConversations(prev => prev.map(c => c.id === updatedConv.id ? updatedConv : c))
    })
    
    // Focus input
    setTimeout(() => inputRef.current?.focus(), 100)
  }
  
  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  // Send admin message
  const handleSend = async () => {
    if (!inputValue.trim() || !selectedConversation) return
    
    const messageText = inputValue.trim()
    setInputValue('')
    setSendingMessage(true)
    
    try {
      await addChatMessage(selectedConversation.id, {
        text: messageText,
        sender: 'admin',
        senderName: 'Équipe HugoQuiz'
      })
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error(t('common.error'))
      setInputValue(messageText) // Restore message
    } finally {
      setSendingMessage(false)
    }
  }
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }
  
  // Close conversation
  const handleCloseConversation = async () => {
    if (!selectedConversation) return
    
    if (!confirm(t('admin.chat.confirmClose', 'Voulez-vous vraiment clôturer cette conversation ?'))) {
      return
    }
    
    try {
      // Add closing message
      await addChatMessage(selectedConversation.id, {
        text: '✅ Cette conversation a été clôturée. N\'hésitez pas à en démarrer une nouvelle si besoin !',
        sender: 'bot'
      })
      
      await closeConversation(selectedConversation.id, 'admin')
      
      toast.success(t('admin.chat.conversationClosed', 'Conversation clôturée'))
      
      // Remove from list and deselect
      setConversations(prev => prev.filter(c => c.id !== selectedConversation.id))
      setSelectedConversation(null)
      setMessages([])
    } catch (error) {
      console.error('Error closing conversation:', error)
      toast.error(t('common.error'))
    }
  }
  
  // Return to bot
  const handleReturnToBot = async () => {
    if (!selectedConversation) return
    
    if (!confirm(t('admin.chat.confirmReturnToBot', 'Voulez-vous rendre la main au bot ?'))) {
      return
    }
    
    try {
      // Add system message
      await addChatMessage(selectedConversation.id, {
        text: '🤖 Vous êtes maintenant en conversation avec l\'assistant automatique.',
        sender: 'bot'
      })
      
      await returnToBot(selectedConversation.id)
      
      toast.success(t('admin.chat.returnedToBot', 'Conversation rendue au bot'))
    } catch (error) {
      console.error('Error returning to bot:', error)
      toast.error(t('common.error'))
    }
  }
  
  // Filter conversations
  const filteredConversations = conversations.filter(conv => {
    if (filter === 'waiting') return conv.status === 'waiting_admin'
    if (filter === 'active') return conv.status === 'open' && conv.chatMode === 'human'
    return true
  })
  
  // Count badges
  const waitingCount = conversations.filter(c => c.status === 'waiting_admin').length
  const activeCount = conversations.filter(c => c.status === 'open' && c.chatMode === 'human').length
  
  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return t('common.justNow', 'À l\'instant')
    if (diffMins < 60) return `${diffMins} min`
    if (diffHours < 24) return `${diffHours}h`
    return `${diffDays}j`
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner text={t('common.loading')} />
      </div>
    )
  }
  
  return (
    <div className="animate-fade-in h-[calc(100vh-200px)] min-h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <FiArrowLeft className="text-white text-xl" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <FiMessageCircle />
              {t('admin.chat.title', 'Gestion du Chat')}
            </h1>
            <p className="text-white/70 text-sm">
              {t('admin.chat.subtitle', 'Répondez aux utilisateurs en attente')}
            </p>
          </div>
        </div>
        
        <button
          onClick={loadConversations}
          className="btn bg-white/20 text-white hover:bg-white/30 flex items-center gap-2"
        >
          <FiRefreshCw />
          {t('common.refresh')}
        </button>
      </div>
      
      {/* Main content */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden h-full flex">
        {/* Conversations list */}
        <div className="w-80 border-r border-gray-200 flex flex-col">
          {/* Filter tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                filter === 'all' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('common.all', 'Tous')} ({conversations.length})
            </button>
            <button
              onClick={() => setFilter('waiting')}
              className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
                filter === 'waiting' ? 'text-yellow-600 border-b-2 border-yellow-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('admin.chat.waiting', 'En attente')}
              {waitingCount > 0 && (
                <span className="absolute -top-1 right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                  {waitingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                filter === 'active' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('admin.chat.active', 'Actifs')} ({activeCount})
            </button>
          </div>
          
          {/* Conversations list */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <FiMessageSquare size={40} className="mx-auto mb-3 opacity-30" />
                <p>{t('admin.chat.noConversations', 'Aucune conversation')}</p>
              </div>
            ) : (
              filteredConversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv)}
                  className={`w-full p-4 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    selectedConversation?.id === conv.id ? 'bg-purple-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      conv.status === 'waiting_admin' 
                        ? 'bg-yellow-100 text-yellow-600' 
                        : conv.chatMode === 'human'
                        ? 'bg-green-100 text-green-600'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      <FiUser />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900 truncate">
                          {conv.userName || 'Utilisateur'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatTime(conv.lastMessageAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 truncate mt-0.5">
                        {conv.lastMessageText || conv.userEmail || '...'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {conv.status === 'waiting_admin' && (
                          <span className="inline-flex items-center gap-1 text-xs text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">
                            <FiClock size={10} />
                            {t('admin.chat.waitingTag', 'En attente')}
                          </span>
                        )}
                        {conv.chatMode === 'human' && conv.status !== 'waiting_admin' && (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                            <FiUsers size={10} />
                            {t('admin.chat.humanMode', 'Humain')}
                          </span>
                        )}
                        {conv.unreadByAdmin > 0 && (
                          <span className="bg-purple-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                            {conv.unreadByAdmin}
                          </span>
                        )}
                      </div>
                    </div>
                    <FiChevronRight className="text-gray-400 flex-shrink-0" />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
        
        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat header */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    selectedConversation.chatMode === 'human' 
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-purple-100 text-purple-600'
                  }`}>
                    <FiUser />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {selectedConversation.userName || 'Utilisateur'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {selectedConversation.userEmail}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {selectedConversation.chatMode === 'human' && (
                    <button
                      onClick={handleReturnToBot}
                      className="btn bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center gap-2 text-sm"
                    >
                      <FiRefreshCw size={14} />
                      {t('admin.chat.returnToBot', 'Rendre au bot')}
                    </button>
                  )}
                  <button
                    onClick={handleCloseConversation}
                    className="btn bg-red-100 text-red-700 hover:bg-red-200 flex items-center gap-2 text-sm"
                  >
                    <FiX size={14} />
                    {t('admin.chat.close', 'Clôturer')}
                  </button>
                </div>
              </div>
              
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
                {messages.map((msg, idx) => (
                  <div
                    key={msg.id || idx}
                    className={`flex ${msg.sender === 'user' ? 'justify-start' : 'justify-end'}`}
                  >
                    {msg.sender === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 mr-2 flex-shrink-0">
                        <FiUser size={14} />
                      </div>
                    )}
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                        msg.sender === 'user'
                          ? 'bg-gray-100 text-gray-800 rounded-bl-none'
                          : msg.sender === 'admin'
                          ? 'bg-green-600 text-white rounded-br-none'
                          : 'bg-purple-100 text-purple-800 rounded-br-none'
                      }`}
                    >
                      {msg.sender === 'bot' && (
                        <p className="text-xs opacity-70 mb-1">🤖 Bot</p>
                      )}
                      {msg.sender === 'admin' && (
                        <p className="text-xs opacity-70 mb-1">👤 {msg.senderName || 'Admin'}</p>
                      )}
                      <p className="whitespace-pre-wrap text-sm">{msg.text}</p>
                      <p className="text-xs opacity-50 mt-1 text-right">
                        {msg.timestamp?.toDate?.()?.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {(msg.sender === 'admin' || msg.sender === 'bot') && (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ml-2 flex-shrink-0 ${
                        msg.sender === 'admin' ? 'bg-green-600 text-white' : 'bg-purple-200 text-purple-600'
                      }`}>
                        {msg.sender === 'admin' ? <FiUser size={14} /> : <FiMessageCircle size={14} />}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              
              {/* Input area */}
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                {selectedConversation.chatMode === 'human' ? (
                  <div className="flex gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={t('admin.chat.placeholder', 'Tapez votre réponse...')}
                      className="flex-1 px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      disabled={sendingMessage}
                    />
                    <button
                      onClick={handleSend}
                      disabled={!inputValue.trim() || sendingMessage}
                      className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:hover:bg-green-600 flex items-center gap-2"
                    >
                      <FiSend />
                      {t('common.send', 'Envoyer')}
                    </button>
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
                    <FiAlertCircle className="mx-auto mb-2 text-yellow-600" size={24} />
                    <p className="text-yellow-800">
                      {t('admin.chat.botModeWarning', 'Cette conversation est actuellement gérée par le bot. Répondez à un message pour prendre la main.')}
                    </p>
                    <button
                      onClick={() => handleSelectConversation(selectedConversation)}
                      className="mt-2 btn bg-yellow-500 text-white hover:bg-yellow-600"
                    >
                      {t('admin.chat.takeOver', 'Prendre la main')}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <FiMessageCircle size={60} className="mx-auto mb-4 opacity-30" />
                <p className="text-lg">
                  {t('admin.chat.selectConversation', 'Sélectionnez une conversation')}
                </p>
                <p className="text-sm mt-1">
                  {t('admin.chat.selectHint', 'Cliquez sur une conversation à gauche pour commencer')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
