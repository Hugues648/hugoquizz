import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
  setDoc,
  limit
} from 'firebase/firestore'
import { db } from '../config/firebase'

// ==================== CHAT CONVERSATIONS ====================

/**
 * Create a new chat conversation
 * @param {Object} conversationData - { userId, userName, userEmail }
 * @returns {string} - conversation ID
 */
export const createChatConversation = async (conversationData) => {
  const conversationsRef = collection(db, 'chatConversations')
  const docRef = await addDoc(conversationsRef, {
    ...conversationData,
    chatMode: 'bot', // 'bot' or 'human'
    status: 'open', // 'open', 'waiting_admin', 'closed'
    unreadByAdmin: 0,
    unreadByUser: 0,
    botResponseCount: 0,
    lastMessageAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })
  return docRef.id
}

/**
 * Get or create a conversation for a user
 * @param {string} userId 
 * @param {string} userName 
 * @param {string} userEmail 
 * @returns {Object} - conversation data with id
 */
export const getOrCreateConversation = async (userId, userName, userEmail) => {
  // Check for existing open conversation
  const conversationsRef = collection(db, 'chatConversations')
  const q = query(
    conversationsRef, 
    where('userId', '==', userId),
    where('status', 'in', ['open', 'waiting_admin']),
    orderBy('createdAt', 'desc'),
    limit(1)
  )
  const snapshot = await getDocs(q)
  
  if (!snapshot.empty) {
    const doc = snapshot.docs[0]
    return { id: doc.id, ...doc.data() }
  }
  
  // Create new conversation
  const conversationId = await createChatConversation({
    userId,
    userName: userName || 'Anonymous',
    userEmail: userEmail || ''
  })
  
  const newDoc = await getDoc(doc(db, 'chatConversations', conversationId))
  return { id: newDoc.id, ...newDoc.data() }
}

/**
 * Get conversation by ID
 */
export const getChatConversation = async (conversationId) => {
  const conversationDoc = await getDoc(doc(db, 'chatConversations', conversationId))
  if (conversationDoc.exists()) {
    return { id: conversationDoc.id, ...conversationDoc.data() }
  }
  return null
}

/**
 * Update conversation
 */
export const updateChatConversation = async (conversationId, data) => {
  const conversationRef = doc(db, 'chatConversations', conversationId)
  await updateDoc(conversationRef, { ...data, updatedAt: serverTimestamp() })
}

/**
 * Escalate to human support
 */
export const escalateToHuman = async (conversationId) => {
  await updateChatConversation(conversationId, {
    chatMode: 'human',
    status: 'waiting_admin',
    escalatedAt: serverTimestamp()
  })
  
  // Create notification for admins
  await createAdminChatNotification(conversationId)
}

/**
 * Return conversation to bot mode
 */
export const returnToBot = async (conversationId) => {
  await updateChatConversation(conversationId, {
    chatMode: 'bot',
    status: 'open',
    botResponseCount: 0
  })
}

/**
 * Close conversation
 */
export const closeConversation = async (conversationId, closedBy = 'admin') => {
  await updateChatConversation(conversationId, {
    status: 'closed',
    closedAt: serverTimestamp(),
    closedBy
  })
}

/**
 * Get all conversations waiting for admin
 */
export const getWaitingConversations = async () => {
  const conversationsRef = collection(db, 'chatConversations')
  const q = query(
    conversationsRef, 
    where('status', '==', 'waiting_admin'),
    orderBy('escalatedAt', 'desc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}

/**
 * Get all active conversations (for admin dashboard)
 */
export const getAllActiveConversations = async () => {
  const conversationsRef = collection(db, 'chatConversations')
  const q = query(
    conversationsRef, 
    where('status', 'in', ['open', 'waiting_admin']),
    orderBy('lastMessageAt', 'desc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}

/**
 * Subscribe to waiting conversations (real-time)
 */
export const subscribeToWaitingConversations = (callback) => {
  const conversationsRef = collection(db, 'chatConversations')
  const q = query(
    conversationsRef, 
    where('status', '==', 'waiting_admin'),
    orderBy('escalatedAt', 'desc')
  )
  return onSnapshot(q, (snapshot) => {
    const conversations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    callback(conversations)
  })
}

/**
 * Subscribe to a single conversation (real-time)
 */
export const subscribeToConversation = (conversationId, callback) => {
  const conversationRef = doc(db, 'chatConversations', conversationId)
  return onSnapshot(conversationRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...snapshot.data() })
    }
  })
}

// ==================== CHAT MESSAGES ====================

/**
 * Add a message to a conversation
 * @param {string} conversationId 
 * @param {Object} messageData - { text, sender: 'user'|'bot'|'admin', senderName? }
 */
export const addChatMessage = async (conversationId, messageData) => {
  const messagesRef = collection(db, 'chatConversations', conversationId, 'messages')
  const docRef = await addDoc(messagesRef, {
    ...messageData,
    timestamp: serverTimestamp()
  })
  
  // Update conversation's last message time and unread counts
  const updateData = { 
    lastMessageAt: serverTimestamp(),
    lastMessageText: messageData.text.substring(0, 100)
  }
  
  if (messageData.sender === 'user') {
    // Increment unread for admin
    const conv = await getChatConversation(conversationId)
    updateData.unreadByAdmin = (conv?.unreadByAdmin || 0) + 1
  } else if (messageData.sender === 'admin') {
    // Increment unread for user
    const conv = await getChatConversation(conversationId)
    updateData.unreadByUser = (conv?.unreadByUser || 0) + 1
  }
  
  await updateChatConversation(conversationId, updateData)
  
  return docRef.id
}

/**
 * Get all messages for a conversation
 */
export const getChatMessages = async (conversationId) => {
  const messagesRef = collection(db, 'chatConversations', conversationId, 'messages')
  const q = query(messagesRef, orderBy('timestamp', 'asc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}

/**
 * Subscribe to messages (real-time)
 */
export const subscribeToChatMessages = (conversationId, callback) => {
  const messagesRef = collection(db, 'chatConversations', conversationId, 'messages')
  const q = query(messagesRef, orderBy('timestamp', 'asc'))
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    callback(messages)
  })
}

/**
 * Mark messages as read
 */
export const markMessagesAsRead = async (conversationId, readBy) => {
  if (readBy === 'admin') {
    await updateChatConversation(conversationId, { unreadByAdmin: 0 })
  } else if (readBy === 'user') {
    await updateChatConversation(conversationId, { unreadByUser: 0 })
  }
}

// ==================== ADMIN NOTIFICATIONS ====================

/**
 * Create notification for all admins about new chat
 */
export const createAdminChatNotification = async (conversationId) => {
  const conv = await getChatConversation(conversationId)
  if (!conv) return
  
  // Get all admin users
  const usersRef = collection(db, 'users')
  const q = query(usersRef, where('role', '==', 'admin'))
  const snapshot = await getDocs(q)
  
  // Create notification for each admin
  for (const adminDoc of snapshot.docs) {
    const notificationsRef = collection(db, 'notifications')
    await addDoc(notificationsRef, {
      userId: adminDoc.id,
      type: 'chat_escalation',
      title: 'Nouveau chat en attente',
      message: `${conv.userName || 'Un utilisateur'} demande de l'aide`,
      conversationId: conversationId,
      read: false,
      sent: true,
      createdAt: serverTimestamp()
    })
  }
}

/**
 * Get count of waiting conversations
 */
export const getWaitingConversationsCount = async () => {
  const conversationsRef = collection(db, 'chatConversations')
  const q = query(conversationsRef, where('status', '==', 'waiting_admin'))
  const snapshot = await getDocs(q)
  return snapshot.size
}

/**
 * Subscribe to waiting conversations count
 */
export const subscribeToWaitingCount = (callback) => {
  const conversationsRef = collection(db, 'chatConversations')
  const q = query(conversationsRef, where('status', '==', 'waiting_admin'))
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.size)
  })
}

// ==================== ESCALATION TRIGGERS ====================

/**
 * Check if message contains escalation keywords
 * @param {string} message 
 * @param {string} lang 
 * @returns {boolean}
 */
export const shouldEscalateMessage = (message, lang = 'fr') => {
  const lowerMessage = message.toLowerCase()
  
  const escalationKeywords = {
    fr: [
      'parler à un humain', 'parler a un humain',
      'parler à quelqu\'un', 'parler a quelqu\'un',
      'support', 'aide', 'help',
      'pas clair', 'je ne comprends pas', 'je comprends pas',
      'insatisfait', 'pas satisfait', 'mécontent',
      'problème non résolu', 'probleme non resolu',
      'contacter', 'contact humain',
      'équipe', 'equipe', 'agent',
      'ça ne fonctionne pas', 'ca ne fonctionne pas',
      'ça ne marche pas', 'ca ne marche pas',
      'bug', 'erreur persiste'
    ],
    en: [
      'talk to human', 'speak to human',
      'talk to someone', 'speak to someone',
      'support', 'help me', 'need help',
      'not clear', 'don\'t understand', 'do not understand',
      'unsatisfied', 'not satisfied', 'unhappy',
      'problem not solved', 'issue not resolved',
      'contact', 'human contact',
      'team', 'agent', 'representative',
      'doesn\'t work', 'does not work',
      'not working', 'still broken',
      'bug', 'error persists'
    ],
    de: [
      'mit mensch sprechen', 'mit einem menschen',
      'support', 'hilfe', 'brauche hilfe',
      'nicht klar', 'verstehe nicht',
      'unzufrieden', 'nicht zufrieden',
      'problem nicht gelöst',
      'kontakt', 'team', 'agent',
      'funktioniert nicht', 'geht nicht',
      'fehler', 'bug'
    ],
    nl: [
      'praten met mens', 'menselijke hulp',
      'support', 'help', 'hulp nodig',
      'niet duidelijk', 'begrijp niet',
      'ontevreden', 'niet tevreden',
      'probleem niet opgelost',
      'contact', 'team', 'agent',
      'werkt niet', 'bug', 'fout'
    ]
  }
  
  const keywords = escalationKeywords[lang] || escalationKeywords.en
  
  return keywords.some(keyword => lowerMessage.includes(keyword))
}

/**
 * Increment bot response count and check if should escalate
 */
export const incrementBotResponseCount = async (conversationId) => {
  const conv = await getChatConversation(conversationId)
  if (!conv) return { shouldEscalate: false, count: 0 }
  
  const newCount = (conv.botResponseCount || 0) + 1
  await updateChatConversation(conversationId, { botResponseCount: newCount })
  
  // Escalate after 5 bot responses without resolution
  return { 
    shouldEscalate: newCount >= 5,
    count: newCount 
  }
}
