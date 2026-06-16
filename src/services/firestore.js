import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
  setDoc,
  runTransaction,
  increment
} from 'firebase/firestore'
import { db } from '../config/firebase'

// ==================== USERS ====================

export const getUsers = async () => {
  const usersRef = collection(db, 'users')
  const snapshot = await getDocs(usersRef)
  const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  return users.sort((a, b) => {
    const dateA = a.createdAt?.toDate?.() || new Date(0)
    const dateB = b.createdAt?.toDate?.() || new Date(0)
    return dateB - dateA
  })
}

export const getUserById = async (userId) => {
  const userDoc = await getDoc(doc(db, 'users', userId))
  if (userDoc.exists()) {
    return { id: userDoc.id, ...userDoc.data() }
  }
  return null
}

export const updateUser = async (userId, data) => {
  const userRef = doc(db, 'users', userId)
  await updateDoc(userRef, { ...data, updatedAt: serverTimestamp() })
}

export const validateUser = async (userId, validated) => {
  await updateUser(userId, { validated })
}

export const setUserRole = async (userId, role) => {
  await updateUser(userId, { role })
}

// ==================== QUIZZES ====================

export const createQuiz = async (quizData) => {
  const quizzesRef = collection(db, 'quizzes')
  const docRef = await addDoc(quizzesRef, {
    ...quizData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })
  return docRef.id
}

export const getQuizById = async (quizId) => {
  const quizDoc = await getDoc(doc(db, 'quizzes', quizId))
  if (quizDoc.exists()) {
    return { id: quizDoc.id, ...quizDoc.data() }
  }
  return null
}

export const getQuizzesByUser = async (userId) => {
  const quizzesRef = collection(db, 'quizzes')
  // Requête simple sans orderBy pour éviter le besoin d'index composite
  const q = query(quizzesRef, where('userId', '==', userId))
  const snapshot = await getDocs(q)
  // Tri côté client
  const quizzes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  return quizzes.sort((a, b) => {
    const dateA = a.createdAt?.toDate?.() || new Date(0)
    const dateB = b.createdAt?.toDate?.() || new Date(0)
    return dateB - dateA
  })
}

export const getAllQuizzes = async () => {
  const quizzesRef = collection(db, 'quizzes')
  const snapshot = await getDocs(quizzesRef)
  const quizzes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  return quizzes.sort((a, b) => {
    const dateA = a.createdAt?.toDate?.() || new Date(0)
    const dateB = b.createdAt?.toDate?.() || new Date(0)
    return dateB - dateA
  })
}

export const getPublicQuizzes = async () => {
  const quizzesRef = collection(db, 'quizzes')
  const q = query(quizzesRef, where('isPublic', '==', true))
  const snapshot = await getDocs(q)
  const quizzes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  return quizzes.sort((a, b) => {
    const dateA = a.createdAt?.toDate?.() || new Date(0)
    const dateB = b.createdAt?.toDate?.() || new Date(0)
    return dateB - dateA
  })
}

export const updateQuiz = async (quizId, data) => {
  const quizRef = doc(db, 'quizzes', quizId)
  await updateDoc(quizRef, { ...data, updatedAt: serverTimestamp() })
}

export const deleteQuiz = async (quizId) => {
  // Delete associated questions first
  const questionsRef = collection(db, 'questions')
  const q = query(questionsRef, where('quizId', '==', quizId))
  const snapshot = await getDocs(q)
  
  const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref))
  await Promise.all(deletePromises)
  
  // Delete the quiz
  await deleteDoc(doc(db, 'quizzes', quizId))
}

// ==================== QUESTIONS ====================

export const createQuestion = async (questionData) => {
  const questionsRef = collection(db, 'questions')
  const docRef = await addDoc(questionsRef, {
    ...questionData,
    createdAt: serverTimestamp()
  })
  return docRef.id
}

export const getQuestionsByQuiz = async (quizId) => {
  const questionsRef = collection(db, 'questions')
  const q = query(questionsRef, where('quizId', '==', quizId))
  const snapshot = await getDocs(q)
  const questions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  return questions.sort((a, b) => (a.order || 0) - (b.order || 0))
}

export const updateQuestion = async (questionId, data) => {
  const questionRef = doc(db, 'questions', questionId)
  await updateDoc(questionRef, data)
}

export const deleteQuestion = async (questionId) => {
  await deleteDoc(doc(db, 'questions', questionId))
}

// ==================== QUESTIONNAIRES ====================

export const createQuestionnaire = async (questionnaireData) => {
  const questionnairesRef = collection(db, 'questionnaires')
  const docRef = await addDoc(questionnairesRef, {
    ...questionnaireData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })
  return docRef.id
}

export const getQuestionnaireById = async (questionnaireId) => {
  const questionnaireDoc = await getDoc(doc(db, 'questionnaires', questionnaireId))
  if (questionnaireDoc.exists()) {
    return { id: questionnaireDoc.id, ...questionnaireDoc.data() }
  }
  return null
}

export const getQuestionnairesByUser = async (userId) => {
  const questionnairesRef = collection(db, 'questionnaires')
  const q = query(questionnairesRef, where('userId', '==', userId))
  const snapshot = await getDocs(q)
  const questionnaires = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  return questionnaires.sort((a, b) => {
    const dateA = a.createdAt?.toDate?.() || new Date(0)
    const dateB = b.createdAt?.toDate?.() || new Date(0)
    return dateB - dateA
  })
}

export const getAllQuestionnaires = async () => {
  const questionnairesRef = collection(db, 'questionnaires')
  const snapshot = await getDocs(questionnairesRef)
  const questionnaires = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  return questionnaires.sort((a, b) => {
    const dateA = a.createdAt?.toDate?.() || new Date(0)
    const dateB = b.createdAt?.toDate?.() || new Date(0)
    return dateB - dateA
  })
}

export const updateQuestionnaire = async (questionnaireId, data) => {
  const questionnaireRef = doc(db, 'questionnaires', questionnaireId)
  await updateDoc(questionnaireRef, { ...data, updatedAt: serverTimestamp() })
}

export const deleteQuestionnaire = async (questionnaireId) => {
  await deleteDoc(doc(db, 'questionnaires', questionnaireId))
}

// ==================== QUIZ SESSIONS (ANSWERS) ====================

export const createQuizSession = async (sessionData) => {
  const sessionsRef = collection(db, 'quizSessions')
  const docRef = await addDoc(sessionsRef, {
    ...sessionData,
    createdAt: serverTimestamp()
  })
  return docRef.id
}

export const getQuizSession = async (sessionId) => {
  const sessionDoc = await getDoc(doc(db, 'quizSessions', sessionId))
  if (sessionDoc.exists()) {
    return { id: sessionDoc.id, ...sessionDoc.data() }
  }
  return null
}

export const updateQuizSession = async (sessionId, data) => {
  const sessionRef = doc(db, 'quizSessions', sessionId)
  await updateDoc(sessionRef, { ...data, updatedAt: serverTimestamp() })
}

export const getQuizSessionsByQuiz = async (quizId) => {
  const sessionsRef = collection(db, 'quizSessions')
  const q = query(sessionsRef, where('quizId', '==', quizId))
  const snapshot = await getDocs(q)
  const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  return sessions.sort((a, b) => {
    const dateA = a.createdAt?.toDate?.() || new Date(0)
    const dateB = b.createdAt?.toDate?.() || new Date(0)
    return dateB - dateA
  })
}

export const deleteQuizSession = async (sessionId) => {
  await deleteDoc(doc(db, 'quizSessions', sessionId))
}

// ==================== QUESTIONNAIRE SESSIONS (ANSWERS) ====================

export const createQuestionnaireSession = async (sessionData) => {
  const sessionsRef = collection(db, 'questionnaireSessions')
  const docRef = await addDoc(sessionsRef, {
    ...sessionData,
    createdAt: serverTimestamp()
  })
  return docRef.id
}

export const getQuestionnaireSession = async (sessionId) => {
  const sessionDoc = await getDoc(doc(db, 'questionnaireSessions', sessionId))
  if (sessionDoc.exists()) {
    return { id: sessionDoc.id, ...sessionDoc.data() }
  }
  return null
}

export const updateQuestionnaireSession = async (sessionId, data) => {
  const sessionRef = doc(db, 'questionnaireSessions', sessionId)
  await updateDoc(sessionRef, { ...data, updatedAt: serverTimestamp() })
}

export const getQuestionnaireSessionsByQuestionnaire = async (questionnaireId) => {
  const sessionsRef = collection(db, 'questionnaireSessions')
  const q = query(sessionsRef, where('questionnaireId', '==', questionnaireId))
  const snapshot = await getDocs(q)
  const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  return sessions.sort((a, b) => {
    const dateA = a.createdAt?.toDate?.() || new Date(0)
    const dateB = b.createdAt?.toDate?.() || new Date(0)
    return dateB - dateA
  })
}

export const deleteQuestionnaireSession = async (sessionId) => {
  await deleteDoc(doc(db, 'questionnaireSessions', sessionId))
}

// ==================== EVENTS ====================

export const createEvent = async (eventData) => {
  const eventsRef = collection(db, 'events')
  const docRef = await addDoc(eventsRef, {
    ...eventData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })
  return docRef.id
}

export const getEventById = async (eventId) => {
  const eventDoc = await getDoc(doc(db, 'events', eventId))
  if (eventDoc.exists()) {
    return { id: eventDoc.id, ...eventDoc.data() }
  }
  return null
}

export const getEventsByUser = async (userId) => {
  const eventsRef = collection(db, 'events')
  const q = query(eventsRef, where('userId', '==', userId))
  const snapshot = await getDocs(q)
  const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  return events.sort((a, b) => {
    const dateA = a.createdAt?.toDate?.() || new Date(0)
    const dateB = b.createdAt?.toDate?.() || new Date(0)
    return dateB - dateA
  })
}

export const updateEvent = async (eventId, data) => {
  const eventRef = doc(db, 'events', eventId)
  await updateDoc(eventRef, { ...data, updatedAt: serverTimestamp() })
}

export const deleteEvent = async (eventId) => {
  // Delete all gifts associated with this event
  const giftsRef = collection(db, 'gifts')
  const q = query(giftsRef, where('eventId', '==', eventId))
  const snapshot = await getDocs(q)
  
  for (const giftDoc of snapshot.docs) {
    // Delete all selections for this gift
    await deleteGiftSelectionsByGift(giftDoc.id)
    await deleteDoc(doc(db, 'gifts', giftDoc.id))
  }
  
  // Delete the event itself
  await deleteDoc(doc(db, 'events', eventId))
}

// ==================== GIFTS ====================

export const createGift = async (giftData) => {
  const giftsRef = collection(db, 'gifts')
  const docRef = await addDoc(giftsRef, {
    ...giftData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })
  return docRef.id
}

export const getGiftById = async (giftId) => {
  const giftDoc = await getDoc(doc(db, 'gifts', giftId))
  if (giftDoc.exists()) {
    return { id: giftDoc.id, ...giftDoc.data() }
  }
  return null
}

export const getGiftsByEvent = async (eventId) => {
  const giftsRef = collection(db, 'gifts')
  const q = query(giftsRef, where('eventId', '==', eventId))
  const snapshot = await getDocs(q)
  const gifts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  return gifts.sort((a, b) => {
    const orderA = a.order || 0
    const orderB = b.order || 0
    return orderA - orderB
  })
}

export const updateGift = async (giftId, data) => {
  const giftRef = doc(db, 'gifts', giftId)
  await updateDoc(giftRef, { ...data, updatedAt: serverTimestamp() })
}

export const deleteGift = async (giftId) => {
  // Delete all selections for this gift first
  await deleteGiftSelectionsByGift(giftId)
  // Delete the gift
  await deleteDoc(doc(db, 'gifts', giftId))
}

// ==================== GIFT SELECTIONS ====================

export const createGiftSelection = async (selectionData) => {
  const selectionsRef = collection(db, 'giftSelections')
  const docRef = await addDoc(selectionsRef, {
    ...selectionData,
    createdAt: serverTimestamp()
  })
  return docRef.id
}

export const getGiftSelectionsByGift = async (giftId) => {
  const selectionsRef = collection(db, 'giftSelections')
  const q = query(selectionsRef, where('giftId', '==', giftId))
  const snapshot = await getDocs(q)
  const selections = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  return selections.sort((a, b) => {
    const dateA = a.createdAt?.toDate?.() || new Date(0)
    const dateB = b.createdAt?.toDate?.() || new Date(0)
    return dateA - dateB
  })
}

export const getGiftSelectionsByEvent = async (eventId) => {
  const selectionsRef = collection(db, 'giftSelections')
  const q = query(selectionsRef, where('eventId', '==', eventId))
  const snapshot = await getDocs(q)
  const selections = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  return selections.sort((a, b) => {
    const dateA = a.createdAt?.toDate?.() || new Date(0)
    const dateB = b.createdAt?.toDate?.() || new Date(0)
    return dateB - dateA
  })
}

export const updateGiftSelection = async (selectionId, data) => {
  const selRef = doc(db, 'giftSelections', selectionId)
  await updateDoc(selRef, { ...data, updatedAt: serverTimestamp() })
}

export const getGiftSelectionsByGuestFingerprint = async (giftId, fingerprint) => {
  const selectionsRef = collection(db, 'giftSelections')
  const q = query(selectionsRef, where('giftId', '==', giftId), where('fingerprint', '==', fingerprint))
  const snapshot = await getDocs(q)
  if (snapshot.empty) return null
  const docSnap = snapshot.docs[0]
  return { id: docSnap.id, ...docSnap.data() }
}

export const deleteGiftSelection = async (selectionId) => {
  await deleteDoc(doc(db, 'giftSelections', selectionId))
}

export const deleteGiftSelectionsByGift = async (giftId) => {
  const selectionsRef = collection(db, 'giftSelections')
  const q = query(selectionsRef, where('giftId', '==', giftId))
  const snapshot = await getDocs(q)
  
  for (const selectionDoc of snapshot.docs) {
    await deleteDoc(doc(db, 'giftSelections', selectionDoc.id))
  }
}

// ==================== PENDING GUESTS (INVITÉS EN ATTENTE DE VALIDATION) ====================

export const createPendingGuest = async (pendingData) => {
  const pendingRef = collection(db, 'pendingGuests')
  const docRef = await addDoc(pendingRef, {
    ...pendingData,
    status: 'pending', // pending, approved, rejected
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })
  return docRef.id
}

export const getPendingGuestsByEvent = async (eventId) => {
  const pendingRef = collection(db, 'pendingGuests')
  const q = query(pendingRef, where('eventId', '==', eventId), where('status', '==', 'pending'))
  const snapshot = await getDocs(q)
  const pending = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  return pending.sort((a, b) => {
    const dateA = a.createdAt?.toDate?.() || new Date(0)
    const dateB = b.createdAt?.toDate?.() || new Date(0)
    return dateB - dateA
  })
}

export const getPendingGuestByFingerprint = async (eventId, fingerprint) => {
  const pendingRef = collection(db, 'pendingGuests')
  const q = query(
    pendingRef, 
    where('eventId', '==', eventId), 
    where('fingerprint', '==', fingerprint)
  )
  const snapshot = await getDocs(q)
  if (snapshot.docs.length > 0) {
    const doc = snapshot.docs[0]
    return { id: doc.id, ...doc.data() }
  }
  return null
}

export const updatePendingGuest = async (pendingId, data) => {
  const pendingRef = doc(db, 'pendingGuests', pendingId)
  await updateDoc(pendingRef, {
    ...data,
    updatedAt: serverTimestamp()
  })
}

export const approvePendingGuest = async (pendingId) => {
  const pendingRef = doc(db, 'pendingGuests', pendingId)
  const pendingDoc = await getDoc(pendingRef)
  
  if (!pendingDoc.exists()) {
    throw new Error('Pending guest not found')
  }
  
  const pendingData = pendingDoc.data()
  
  // Create actual guest from pending data
  const guestsRef = collection(db, 'guests')
  const qrCode = `GUEST-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
  
  const guestData = {
    eventId: pendingData.eventId,
    firstName: pendingData.firstName,
    lastName: pendingData.lastName,
    gender: pendingData.gender,
    relation: pendingData.relation,
    ticketType: pendingData.ticketType,
    tableId: null,
    tableName: null,
    isPresent: false,
    qrCode,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    source: 'self_registration' // Mark as self-registered
  }
  
  if (pendingData.ticketType === 'couple') {
    guestData.spouseFirstName = pendingData.spouseFirstName
    guestData.spouseLastName = pendingData.spouseLastName
    guestData.spouseGender = pendingData.spouseGender
    guestData.spouseIsPresent = false
  }
  
  const guestDocRef = await addDoc(guestsRef, guestData)
  
  // Update pending status to approved
  await updateDoc(pendingRef, {
    status: 'approved',
    approvedAt: serverTimestamp(),
    guestId: guestDocRef.id
  })
  
  return { guestId: guestDocRef.id, qrCode }
}

export const rejectPendingGuest = async (pendingId) => {
  const pendingRef = doc(db, 'pendingGuests', pendingId)
  await updateDoc(pendingRef, {
    status: 'rejected',
    rejectedAt: serverTimestamp()
  })
}

export const deletePendingGuest = async (pendingId) => {
  await deleteDoc(doc(db, 'pendingGuests', pendingId))
}

export const deletePendingGuestsByEvent = async (eventId) => {
  const pendingRef = collection(db, 'pendingGuests')
  const q = query(pendingRef, where('eventId', '==', eventId))
  const snapshot = await getDocs(q)
  
  for (const pendingDoc of snapshot.docs) {
    await deleteDoc(doc(db, 'pendingGuests', pendingDoc.id))
  }
}

// ==================== EVENT VISITORS ====================

export const createEventVisitor = async (visitorData) => {
  const visitorsRef = collection(db, 'eventVisitors')
  const docRef = await addDoc(visitorsRef, {
    ...visitorData,
    pdfGenerated: false,
    createdAt: serverTimestamp()
  })
  return docRef.id
}

export const getEventVisitorsByEvent = async (eventId) => {
  const visitorsRef = collection(db, 'eventVisitors')
  const q = query(visitorsRef, where('eventId', '==', eventId))
  const snapshot = await getDocs(q)
  const visitors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  return visitors.sort((a, b) => {
    const dateA = a.createdAt?.toDate?.() || new Date(0)
    const dateB = b.createdAt?.toDate?.() || new Date(0)
    return dateB - dateA
  })
}

export const updateEventVisitor = async (visitorId, data) => {
  const visitorRef = doc(db, 'eventVisitors', visitorId)
  await updateDoc(visitorRef, data)
}

export const deleteEventVisitor = async (visitorId) => {
  await deleteDoc(doc(db, 'eventVisitors', visitorId))
}

export const deleteEventVisitorsByEvent = async (eventId) => {
  const visitorsRef = collection(db, 'eventVisitors')
  const q = query(visitorsRef, where('eventId', '==', eventId))
  const snapshot = await getDocs(q)
  
  for (const visitorDoc of snapshot.docs) {
    await deleteDoc(doc(db, 'eventVisitors', visitorDoc.id))
  }
}

// ==================== GUESTS (INVITÉS) ====================

export const createGuest = async (guestData) => {
  const guestsRef = collection(db, 'guests')
  const qrCode = `GUEST-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
  const docRef = await addDoc(guestsRef, {
    ...guestData,
    qrCode,
    isPresent: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })
  return { id: docRef.id, qrCode }
}

export const getGuestById = async (guestId) => {
  const guestDoc = await getDoc(doc(db, 'guests', guestId))
  if (guestDoc.exists()) {
    return { id: guestDoc.id, ...guestDoc.data() }
  }
  return null
}

export const getGuestsByEvent = async (eventId) => {
  const guestsRef = collection(db, 'guests')
  const q = query(guestsRef, where('eventId', '==', eventId))
  const snapshot = await getDocs(q)
  const guests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  return guests.sort((a, b) => {
    const nameA = a.lastName?.toLowerCase() || ''
    const nameB = b.lastName?.toLowerCase() || ''
    return nameA.localeCompare(nameB)
  })
}

export const getGuestByQRCode = async (qrCode) => {
  const guestsRef = collection(db, 'guests')
  const q = query(guestsRef, where('qrCode', '==', qrCode))
  const snapshot = await getDocs(q)
  if (snapshot.docs.length > 0) {
    const guestDoc = snapshot.docs[0]
    return { id: guestDoc.id, ...guestDoc.data() }
  }
  return null
}

export const updateGuest = async (guestId, data) => {
  const guestRef = doc(db, 'guests', guestId)
  await updateDoc(guestRef, { ...data, updatedAt: serverTimestamp() })
}

export const deleteGuest = async (guestId) => {
  await deleteDoc(doc(db, 'guests', guestId))
}

export const deleteGuestsByEvent = async (eventId) => {
  const guestsRef = collection(db, 'guests')
  const q = query(guestsRef, where('eventId', '==', eventId))
  const snapshot = await getDocs(q)
  
  for (const guestDoc of snapshot.docs) {
    await deleteDoc(doc(db, 'guests', guestDoc.id))
  }
}

// ==================== TABLES (TABLES DE CÉRÉMONIE) ====================

export const createTable = async (tableData) => {
  const tablesRef = collection(db, 'eventTables')
  const docRef = await addDoc(tablesRef, {
    ...tableData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })
  return docRef.id
}

export const getTableById = async (tableId) => {
  const tableDoc = await getDoc(doc(db, 'eventTables', tableId))
  if (tableDoc.exists()) {
    return { id: tableDoc.id, ...tableDoc.data() }
  }
  return null
}

export const getTablesByEvent = async (eventId) => {
  const tablesRef = collection(db, 'eventTables')
  const q = query(tablesRef, where('eventId', '==', eventId))
  const snapshot = await getDocs(q)
  const tables = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  return tables.sort((a, b) => {
    const nameA = a.name?.toLowerCase() || ''
    const nameB = b.name?.toLowerCase() || ''
    return nameA.localeCompare(nameB)
  })
}

export const updateTable = async (tableId, data) => {
  const tableRef = doc(db, 'eventTables', tableId)
  await updateDoc(tableRef, { ...data, updatedAt: serverTimestamp() })
}

export const deleteTable = async (tableId) => {
  // Remove all guests from this table first
  const guestsRef = collection(db, 'guests')
  const q = query(guestsRef, where('tableId', '==', tableId))
  const snapshot = await getDocs(q)
  
  for (const guestDoc of snapshot.docs) {
    await updateDoc(doc(db, 'guests', guestDoc.id), { tableId: null, tableName: null })
  }
  
  await deleteDoc(doc(db, 'eventTables', tableId))
}

export const deleteTablesByEvent = async (eventId) => {
  const tablesRef = collection(db, 'eventTables')
  const q = query(tablesRef, where('eventId', '==', eventId))
  const snapshot = await getDocs(q)
  
  for (const tableDoc of snapshot.docs) {
    await deleteDoc(doc(db, 'eventTables', tableDoc.id))
  }
}

// ==================== ROOM LAYOUT (PLAN DE SALLE) ====================

/**
 * Get the room layout for an event
 * Room layout contains: room shape, dimensions, zoom, entrances, stages
 */
export const getRoomLayout = async (eventId) => {
  const layoutDoc = await getDoc(doc(db, 'roomLayouts', eventId))
  if (layoutDoc.exists()) {
    return { id: layoutDoc.id, ...layoutDoc.data() }
  }
  return null
}

/**
 * Save/Update the room layout for an event
 * Uses setDoc with merge to create or update
 */
export const saveRoomLayout = async (eventId, layoutData) => {
  const layoutRef = doc(db, 'roomLayouts', eventId)
  await setDoc(layoutRef, {
    ...layoutData,
    eventId,
    updatedAt: serverTimestamp()
  }, { merge: true })
}

/**
 * Delete room layout when event is deleted
 */
export const deleteRoomLayout = async (eventId) => {
  try {
    await deleteDoc(doc(db, 'roomLayouts', eventId))
  } catch (error) {
    // Layout may not exist, ignore error
    console.log('No room layout to delete for event:', eventId)
  }
}

// ==================== EVENT PROGRAMS (PLANNINGS) ====================

export const createEventProgram = async (programData) => {
  const programsRef = collection(db, 'eventPrograms')
  const docRef = await addDoc(programsRef, {
    ...programData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })
  return docRef.id
}

export const getEventProgramById = async (programId) => {
  const programDoc = await getDoc(doc(db, 'eventPrograms', programId))
  if (programDoc.exists()) {
    return { id: programDoc.id, ...programDoc.data() }
  }
  return null
}

export const getEventProgramsByEvent = async (eventId) => {
  const programsRef = collection(db, 'eventPrograms')
  const q = query(programsRef, where('eventId', '==', eventId))
  const snapshot = await getDocs(q)
  const programs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  return programs.sort((a, b) => {
    const orderA = a.order || 0
    const orderB = b.order || 0
    return orderA - orderB
  })
}

export const updateEventProgram = async (programId, data) => {
  const programRef = doc(db, 'eventPrograms', programId)
  await updateDoc(programRef, { ...data, updatedAt: serverTimestamp() })
}

export const deleteEventProgram = async (programId) => {
  await deleteDoc(doc(db, 'eventPrograms', programId))
}

export const deleteEventProgramsByEvent = async (eventId) => {
  const programsRef = collection(db, 'eventPrograms')
  const q = query(programsRef, where('eventId', '==', eventId))
  const snapshot = await getDocs(q)
  
  for (const programDoc of snapshot.docs) {
    await deleteDoc(doc(db, 'eventPrograms', programDoc.id))
  }
}

// ==================== EVENT MENUS ====================

export const createEventMenu = async (menuData) => {
  const menusRef = collection(db, 'eventMenus')
  const docRef = await addDoc(menusRef, {
    ...menuData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })
  return docRef.id
}

export const getEventMenuById = async (menuId) => {
  const menuDoc = await getDoc(doc(db, 'eventMenus', menuId))
  if (menuDoc.exists()) {
    return { id: menuDoc.id, ...menuDoc.data() }
  }
  return null
}

export const getEventMenusByEvent = async (eventId) => {
  const menusRef = collection(db, 'eventMenus')
  const q = query(menusRef, where('eventId', '==', eventId))
  const snapshot = await getDocs(q)
  const menus = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  return menus.sort((a, b) => {
    const orderA = a.order || 0
    const orderB = b.order || 0
    return orderA - orderB
  })
}

export const updateEventMenu = async (menuId, data) => {
  const menuRef = doc(db, 'eventMenus', menuId)
  await updateDoc(menuRef, { ...data, updatedAt: serverTimestamp() })
}

export const deleteEventMenu = async (menuId) => {
  await deleteDoc(doc(db, 'eventMenus', menuId))
}

export const deleteEventMenusByEvent = async (eventId) => {
  const menusRef = collection(db, 'eventMenus')
  const q = query(menusRef, where('eventId', '==', eventId))
  const snapshot = await getDocs(q)
  
  for (const menuDoc of snapshot.docs) {
    await deleteDoc(doc(db, 'eventMenus', menuDoc.id))
  }
}

// ==================== PLANNING SHARE LINKS ====================

export const createPlanningShareLink = async (shareData) => {
  const shareLinksRef = collection(db, 'planningShareLinks')
  const shareCode = `PLAN-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
  const docRef = await addDoc(shareLinksRef, {
    ...shareData,
    shareCode,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })
  return { id: docRef.id, shareCode }
}

export const getPlanningShareLinkByCode = async (shareCode) => {
  const shareLinksRef = collection(db, 'planningShareLinks')
  const q = query(shareLinksRef, where('shareCode', '==', shareCode))
  const snapshot = await getDocs(q)
  if (snapshot.docs.length > 0) {
    const doc = snapshot.docs[0]
    return { id: doc.id, ...doc.data() }
  }
  return null
}

export const getPlanningShareLinksByEvent = async (eventId) => {
  const shareLinksRef = collection(db, 'planningShareLinks')
  const q = query(shareLinksRef, where('eventId', '==', eventId))
  const snapshot = await getDocs(q)
  const links = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  return links.sort((a, b) => {
    const dateA = a.createdAt?.toDate?.() || new Date(0)
    const dateB = b.createdAt?.toDate?.() || new Date(0)
    return dateB - dateA
  })
}

export const updatePlanningShareLink = async (linkId, data) => {
  const linkRef = doc(db, 'planningShareLinks', linkId)
  await updateDoc(linkRef, { ...data, updatedAt: serverTimestamp() })
}

export const deletePlanningShareLink = async (linkId) => {
  await deleteDoc(doc(db, 'planningShareLinks', linkId))
}

export const deletePlanningShareLinksByEvent = async (eventId) => {
  const shareLinksRef = collection(db, 'planningShareLinks')
  const q = query(shareLinksRef, where('eventId', '==', eventId))
  const snapshot = await getDocs(q)
  
  for (const linkDoc of snapshot.docs) {
    await deleteDoc(doc(db, 'planningShareLinks', linkDoc.id))
  }
}

// ==================== EVENT TASKS ====================

/**
 * Create a task for an event
 */
export const createEventTask = async (taskData) => {
  const tasksRef = collection(db, 'eventTasks')
  const docRef = await addDoc(tasksRef, {
    ...taskData,
    completed: false,
    responses: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })
  return { id: docRef.id, ...taskData }
}

/**
 * Get all tasks for an event
 */
export const getEventTasksByEvent = async (eventId) => {
  const tasksRef = collection(db, 'eventTasks')
  const q = query(tasksRef, where('eventId', '==', eventId), orderBy('createdAt', 'desc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}

/**
 * Get a single task by ID
 */
export const getEventTaskById = async (taskId) => {
  const taskDoc = await getDoc(doc(db, 'eventTasks', taskId))
  if (taskDoc.exists()) {
    return { id: taskDoc.id, ...taskDoc.data() }
  }
  return null
}

/**
 * Update a task
 */
export const updateEventTask = async (taskId, updates) => {
  const taskRef = doc(db, 'eventTasks', taskId)
  await updateDoc(taskRef, {
    ...updates,
    updatedAt: serverTimestamp()
  })
}

/**
 * Delete a task
 */
export const deleteEventTask = async (taskId) => {
  await deleteDoc(doc(db, 'eventTasks', taskId))
}

/**
 * Add a response to a task
 */
export const addTaskResponse = async (taskId, response) => {
  const taskRef = doc(db, 'eventTasks', taskId)
  const taskDoc = await getDoc(taskRef)
  if (taskDoc.exists()) {
    const responses = taskDoc.data().responses || []
    responses.push({
      ...response,
      createdAt: new Date().toISOString()
    })
    await updateDoc(taskRef, { responses, updatedAt: serverTimestamp() })
  }
}

/**
 * Mark a task as completed
 */
export const completeEventTask = async (taskId) => {
  const taskRef = doc(db, 'eventTasks', taskId)
  await updateDoc(taskRef, {
    completed: true,
    completedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })
}

/**
 * Mark a task as not completed
 */
export const uncompleteEventTask = async (taskId) => {
  const taskRef = doc(db, 'eventTasks', taskId)
  await updateDoc(taskRef, {
    completed: false,
    completedAt: null,
    updatedAt: serverTimestamp()
  })
}

// ==================== NOTIFICATIONS ====================

/**
 * Create a notification
 */
export const createNotification = async (notificationData) => {
  const notificationsRef = collection(db, 'notifications')
  const docRef = await addDoc(notificationsRef, {
    ...notificationData,
    createdAt: serverTimestamp()
  })
  return docRef.id
}

/**
 * Get notifications for a user (only sent notifications or legacy ones without sent field)
 */
export const getNotificationsByUser = async (userId) => {
  const notificationsRef = collection(db, 'notifications')
  const q = query(notificationsRef, where('userId', '==', userId), orderBy('createdAt', 'desc'))
  const snapshot = await getDocs(q)
  // Filter to only show notifications that have been sent (or legacy ones without sent field)
  return snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(n => n.sent !== false) // Show if sent is true or undefined (legacy)
}

/**
 * Get unread notification count for a user (only sent notifications)
 */
export const getUnreadNotificationCount = async (userId) => {
  const notificationsRef = collection(db, 'notifications')
  const q = query(notificationsRef, where('userId', '==', userId), where('read', '==', false))
  const snapshot = await getDocs(q)
  // Filter to only count sent notifications
  return snapshot.docs.filter(doc => doc.data().sent !== false).length
}

/**
 * Subscribe to notifications (real-time) - only sent notifications
 */
export const subscribeToNotifications = (userId, callback) => {
  const notificationsRef = collection(db, 'notifications')
  const q = query(notificationsRef, where('userId', '==', userId), orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(n => n.sent !== false) // Show if sent is true or undefined (legacy)
    callback(notifications)
  })
}

/**
 * Mark a notification as read
 */
export const markNotificationAsRead = async (notificationId) => {
  const notifRef = doc(db, 'notifications', notificationId)
  await updateDoc(notifRef, { read: true })
}

/**
 * Mark all notifications as read for a user
 */
export const markAllNotificationsAsRead = async (userId) => {
  const notificationsRef = collection(db, 'notifications')
  const q = query(notificationsRef, where('userId', '==', userId), where('read', '==', false))
  const snapshot = await getDocs(q)
  
  for (const notifDoc of snapshot.docs) {
    await updateDoc(doc(db, 'notifications', notifDoc.id), { read: true })
  }
}

/**
 * Delete a notification
 */
export const deleteNotification = async (notificationId) => {
  await deleteDoc(doc(db, 'notifications', notificationId))
}

/**
 * Delete all notifications for a task
 */
export const deleteNotificationsByTask = async (taskId) => {
  const notificationsRef = collection(db, 'notifications')
  const q = query(notificationsRef, where('taskId', '==', taskId))
  const snapshot = await getDocs(q)
  
  for (const notifDoc of snapshot.docs) {
    await deleteDoc(doc(db, 'notifications', notifDoc.id))
  }
}

// ==================== LIVE QUIZ SESSIONS ====================

/**
 * Create a live quiz game session
 * This is for the host to control the quiz in real-time
 */
export const createLiveQuizSession = async (sessionData) => {
  const sessionsRef = collection(db, 'liveQuizSessions')
  const sessionId = `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  await setDoc(doc(sessionsRef, sessionId), {
    ...sessionData,
    sessionId,
    status: 'waiting', // waiting, playing, question, results, leaderboard, finished, podium
    currentQuestionIndex: -1,
    participants: [],
    maxParticipants: sessionData.maxParticipants || -1, // -1 means unlimited
    questionStartTime: null,
    questionEndTime: null,
    showResults: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })
  
  return sessionId
}

/**
 * Get a live quiz session by ID
 */
export const getLiveQuizSession = async (sessionId) => {
  const sessionDoc = await getDoc(doc(db, 'liveQuizSessions', sessionId))
  if (sessionDoc.exists()) {
    return { id: sessionDoc.id, ...sessionDoc.data() }
  }
  return null
}

/**
 * Subscribe to live quiz session updates (real-time)
 */
export const subscribeLiveQuizSession = (sessionId, callback) => {
  const sessionRef = doc(db, 'liveQuizSessions', sessionId)
  return onSnapshot(sessionRef, (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() })
    } else {
      callback(null)
    }
  })
}

/**
 * Update live quiz session
 */
export const updateLiveQuizSession = async (sessionId, data) => {
  const sessionRef = doc(db, 'liveQuizSessions', sessionId)
  await updateDoc(sessionRef, { ...data, updatedAt: serverTimestamp() })
}

/**
 * Join a live quiz as a participant (using transaction for concurrent safety)
 * Includes retry logic for high-contention scenarios (many players joining at once)
 */
export const joinLiveQuiz = async (sessionId, participant, retryCount = 0) => {
  const sessionRef = doc(db, 'liveQuizSessions', sessionId)
  const MAX_RETRIES = 5
  
  const participantId = `p_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
  
  try {
    await runTransaction(db, async (transaction) => {
    const sessionDoc = await transaction.get(sessionRef)
    
    if (!sessionDoc.exists()) {
      throw new Error('Session introuvable')
    }
    
    const session = sessionDoc.data()
    
    if (session.status !== 'waiting') {
      throw new Error('Le quiz a déjà commencé')
    }
    
    // Check participant limit
    const maxParticipants = session.maxParticipants || -1 // -1 means unlimited
    const currentCount = (session.participants || []).length
    
    if (maxParticipants !== -1 && currentCount >= maxParticipants) {
      throw new Error(`Le nombre maximum de participants (${maxParticipants}) a été atteint. L'hôte doit passer au forfait Pro pour accueillir plus de joueurs.`)
    }
    
    const newParticipant = {
      id: participantId,
      name: participant.name,
      emoji: participant.emoji || '😀',
      score: 0,
      answers: [],
      joinedAt: new Date().toISOString()
    }
    
    const updatedParticipants = [...(session.participants || []), newParticipant]
    
    transaction.update(sessionRef, { 
      participants: updatedParticipants,
      updatedAt: new Date()
    })
  })
  } catch (error) {
    // Retry on transaction contention (common with many players joining simultaneously)
    if (retryCount < MAX_RETRIES && (error.code === 'failed-precondition' || error.code === 'aborted')) {
      console.warn(`Transaction contention on joinLiveQuiz, retry ${retryCount + 1}/${MAX_RETRIES}`)
      await new Promise(resolve => setTimeout(resolve, 300 * (retryCount + 1)))
      return joinLiveQuiz(sessionId, participant, retryCount + 1)
    }
    throw error
  }
  
  return participantId
}

/**
 * Leave a live quiz (using transaction for concurrent safety)
 */
export const leaveLiveQuiz = async (sessionId, participantId) => {
  const sessionRef = doc(db, 'liveQuizSessions', sessionId)
  
  await runTransaction(db, async (transaction) => {
    const sessionDoc = await transaction.get(sessionRef)
    
    if (!sessionDoc.exists()) return
    
    const session = sessionDoc.data()
    const updatedParticipants = (session.participants || []).filter(p => p.id !== participantId)
    
    transaction.update(sessionRef, { 
      participants: updatedParticipants,
      updatedAt: new Date()
    })
  })
}

/**
 * Start the live quiz (host only)
 */
export const startLiveQuiz = async (sessionId) => {
  const sessionRef = doc(db, 'liveQuizSessions', sessionId)
  await updateDoc(sessionRef, {
    status: 'playing',
    currentQuestionIndex: 0,
    questionStartTime: new Date().toISOString(),
    updatedAt: serverTimestamp()
  })
}

/**
 * Go to next question (host only)
 * Adds 3 seconds grace period before timer starts (player sees question but timer starts after 3s)
 */
export const nextLiveQuestion = async (sessionId, questionIndex, timeLimit) => {
  const sessionRef = doc(db, 'liveQuizSessions', sessionId)
  const GRACE_PERIOD = 3 // 3 seconds to read question before timer starts
  const totalTime = timeLimit + GRACE_PERIOD
  const endTime = new Date(Date.now() + totalTime * 1000).toISOString()
  const timerStartTime = new Date(Date.now() + GRACE_PERIOD * 1000).toISOString()
  
  await updateDoc(sessionRef, {
    status: 'question',
    currentQuestionIndex: questionIndex,
    questionStartTime: new Date().toISOString(),
    questionEndTime: endTime,
    timerStartTime: timerStartTime, // Timer display starts after grace period
    displayTimeLimit: timeLimit, // The time shown to users (without grace period)
    showResults: false,
    updatedAt: serverTimestamp()
  })
}

/**
 * Show results for current question (host only)
 */
export const showQuestionResults = async (sessionId) => {
  const sessionRef = doc(db, 'liveQuizSessions', sessionId)
  await updateDoc(sessionRef, {
    status: 'results',
    showResults: true,
    updatedAt: serverTimestamp()
  })
}

/**
 * Show leaderboard (host only)
 */
export const showLeaderboard = async (sessionId) => {
  const sessionRef = doc(db, 'liveQuizSessions', sessionId)
  await updateDoc(sessionRef, {
    status: 'leaderboard',
    updatedAt: serverTimestamp()
  })
}

/**
 * Show final podium (host only)
 */
export const showPodium = async (sessionId) => {
  const sessionRef = doc(db, 'liveQuizSessions', sessionId)
  await updateDoc(sessionRef, {
    status: 'podium',
    updatedAt: serverTimestamp()
  })
}

/**
 * End the live quiz (host only)
 */
export const endLiveQuiz = async (sessionId) => {
  const sessionRef = doc(db, 'liveQuizSessions', sessionId)
  await updateDoc(sessionRef, {
    status: 'finished',
    updatedAt: serverTimestamp()
  })
}

/**
 * Submit answer for a participant (using transaction for concurrent safety)
 * Includes retry logic for high-contention scenarios
 */
export const submitLiveAnswer = async (sessionId, participantId, answer, retryCount = 0) => {
  const sessionRef = doc(db, 'liveQuizSessions', sessionId)
  const MAX_RETRIES = 3
  
  try {
    // Use a transaction to ensure atomic read-modify-write
    await runTransaction(db, async (transaction) => {
      const sessionDoc = await transaction.get(sessionRef)
      
      if (!sessionDoc.exists()) {
        throw new Error('Session introuvable')
      }
      
      const session = sessionDoc.data()
      
      // Find the participant and update their data
      const updatedParticipants = (session.participants || []).map(p => {
        if (p.id === participantId) {
        // Check if already answered this question
        const existingAnswer = p.answers?.find(a => a.questionIndex === answer.questionIndex)
        if (existingAnswer) {
          // Already answered, don't update
          return p
        }
        
        // Add the answer and update score
        return {
          ...p,
          score: (p.score || 0) + (answer.pointsEarned || 0),
          answers: [...(p.answers || []), answer],
          lastAnsweredAt: new Date().toISOString()
        }
      }
      return p
    })
    
    // Update the document within the transaction
    transaction.update(sessionRef, { 
      participants: updatedParticipants,
      updatedAt: new Date()
    })
  })
  } catch (error) {
    // Retry on transaction contention (common with many concurrent players)
    if (retryCount < MAX_RETRIES && (error.code === 'failed-precondition' || error.code === 'aborted')) {
      console.warn(`Transaction contention on submitLiveAnswer, retry ${retryCount + 1}/${MAX_RETRIES}`)
      await new Promise(resolve => setTimeout(resolve, 200 * (retryCount + 1)))
      return submitLiveAnswer(sessionId, participantId, answer, retryCount + 1)
    }
    throw error
  }
}

/**
 * Delete a live quiz session
 */
export const deleteLiveQuizSession = async (sessionId) => {
  await deleteDoc(doc(db, 'liveQuizSessions', sessionId))
}

/**
 * Get live quiz sessions by quiz ID
 */
export const getLiveQuizSessionsByQuiz = async (quizId) => {
  const sessionsRef = collection(db, 'liveQuizSessions')
  const q = query(sessionsRef, where('quizId', '==', quizId))
  const snapshot = await getDocs(q)
  const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  return sessions.sort((a, b) => {
    const dateA = a.createdAt?.toDate?.() || new Date(0)
    const dateB = b.createdAt?.toDate?.() || new Date(0)
    return dateB - dateA
  })
}

// ==================== GUESTBOOK (LIVRE D'OR) ====================

export const createGuestbookMessage = async (messageData) => {
  const messagesRef = collection(db, 'guestbookMessages')
  const docRef = await addDoc(messagesRef, {
    ...messageData,
    createdAt: serverTimestamp()
  })
  return docRef.id
}

export const getGuestbookMessages = async (eventId) => {
  const messagesRef = collection(db, 'guestbookMessages')
  const q = query(messagesRef, where('eventId', '==', eventId))
  const snapshot = await getDocs(q)
  const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  return messages.sort((a, b) => {
    const dateA = a.createdAt?.toDate?.() || new Date(0)
    const dateB = b.createdAt?.toDate?.() || new Date(0)
    return dateB - dateA
  })
}

export const deleteGuestbookMessage = async (messageId) => {
  await deleteDoc(doc(db, 'guestbookMessages', messageId))
}

export const updateGuestbookMessage = async (messageId, data) => {
  const messageRef = doc(db, 'guestbookMessages', messageId)
  await updateDoc(messageRef, { ...data, updatedAt: serverTimestamp() })
}

// ==================== SERVICES MARKETPLACE ====================
//
// Status values:
//  - service.status: 'pending' | 'approved' | 'rejected' | 'restricted'
//  - verification.status / user.serviceProviderStatus: 'none' | 'pending' | 'approved' | 'rejected'

// ----- Identity verification (become a provider) -----

export const createServiceVerification = async (verificationData) => {
  const ref = collection(db, 'serviceVerifications')
  const docRef = await addDoc(ref, {
    ...verificationData,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })
  // Reflect pending state on the user document
  try {
    await updateDoc(doc(db, 'users', verificationData.userId), {
      serviceProviderStatus: 'pending',
      updatedAt: serverTimestamp()
    })
  } catch (e) {
    console.error('Could not update user serviceProviderStatus:', e)
  }
  return docRef.id
}

export const getLatestVerificationByUser = async (userId) => {
  const ref = collection(db, 'serviceVerifications')
  const q = query(ref, where('userId', '==', userId))
  const snapshot = await getDocs(q)
  const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
  items.sort((a, b) => {
    const da = a.createdAt?.toDate?.() || new Date(0)
    const dbb = b.createdAt?.toDate?.() || new Date(0)
    return dbb - da
  })
  return items[0] || null
}

export const getPendingVerifications = async () => {
  const ref = collection(db, 'serviceVerifications')
  const q = query(ref, where('status', '==', 'pending'))
  const snapshot = await getDocs(q)
  const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
  return items.sort((a, b) => {
    const da = a.createdAt?.toDate?.() || new Date(0)
    const dbb = b.createdAt?.toDate?.() || new Date(0)
    return da - dbb
  })
}

// Admin: approve / reject a verification request.
export const updateVerificationStatus = async (verificationId, userId, status, adminMessage = '') => {
  await updateDoc(doc(db, 'serviceVerifications', verificationId), {
    status,
    adminMessage,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })
  await updateDoc(doc(db, 'users', userId), {
    serviceProviderStatus: status,
    updatedAt: serverTimestamp()
  })
}

// ----- Services CRUD -----

export const createService = async (serviceData) => {
  const ref = collection(db, 'services')
  const docRef = await addDoc(ref, {
    ...serviceData,
    status: 'pending',
    isPublic: false,
    views: 0,
    messagesCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })
  return docRef.id
}

export const getServiceById = async (serviceId) => {
  const snap = await getDoc(doc(db, 'services', serviceId))
  if (snap.exists()) return { id: snap.id, ...snap.data() }
  return null
}

export const getServicesByUser = async (userId) => {
  const ref = collection(db, 'services')
  const q = query(ref, where('userId', '==', userId))
  const snapshot = await getDocs(q)
  const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
  return items.sort((a, b) => {
    const da = a.createdAt?.toDate?.() || new Date(0)
    const dbb = b.createdAt?.toDate?.() || new Date(0)
    return dbb - da
  })
}

// Public listing of approved & public services (optionally by category).
export const getPublicServices = async (category = null) => {
  const ref = collection(db, 'services')
  const q = category
    ? query(ref, where('isPublic', '==', true), where('category', '==', category))
    : query(ref, where('isPublic', '==', true))
  const snapshot = await getDocs(q)
  const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
  return items.sort((a, b) => {
    const da = a.createdAt?.toDate?.() || new Date(0)
    const dbb = b.createdAt?.toDate?.() || new Date(0)
    return dbb - da
  })
}

export const updateService = async (serviceId, data) => {
  await updateDoc(doc(db, 'services', serviceId), {
    ...data,
    updatedAt: serverTimestamp()
  })
}

export const deleteService = async (serviceId) => {
  await deleteDoc(doc(db, 'services', serviceId))
}

export const incrementServiceViews = async (serviceId) => {
  try {
    await updateDoc(doc(db, 'services', serviceId), { views: increment(1) })
  } catch (e) {
    // Non-blocking
    console.warn('Could not increment service views:', e?.message)
  }
}

// Admin: list services by status, or all.
export const getAllServices = async (status = null) => {
  const ref = collection(db, 'services')
  const q = status ? query(ref, where('status', '==', status)) : ref
  const snapshot = await getDocs(q)
  const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
  return items.sort((a, b) => {
    const da = a.createdAt?.toDate?.() || new Date(0)
    const dbb = b.createdAt?.toDate?.() || new Date(0)
    return dbb - da
  })
}

// Admin: approve / reject / restrict a service.
export const updateServiceStatus = async (serviceId, status, adminMessage = '') => {
  await updateDoc(doc(db, 'services', serviceId), {
    status,
    isPublic: status === 'approved',
    adminMessage,
    moderatedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })
}

// ----- Service contact messages -----

export const createServiceMessage = async (messageData) => {
  const ref = collection(db, 'serviceMessages')
  const docRef = await addDoc(ref, {
    ...messageData,
    read: false,
    createdAt: serverTimestamp()
  })
  return docRef.id
}

export const getServiceMessagesByOwner = async (ownerId) => {
  const ref = collection(db, 'serviceMessages')
  const q = query(ref, where('ownerId', '==', ownerId))
  const snapshot = await getDocs(q)
  const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
  return items.sort((a, b) => {
    const da = a.createdAt?.toDate?.() || new Date(0)
    const dbb = b.createdAt?.toDate?.() || new Date(0)
    return dbb - da
  })
}

export const markServiceMessageRead = async (messageId) => {
  await updateDoc(doc(db, 'serviceMessages', messageId), { read: true })
}

export const deleteServiceMessage = async (messageId) => {
  await deleteDoc(doc(db, 'serviceMessages', messageId))
}

// ----- Service reviews / ratings (Amazon-style) -----
//
// A review always carries a 1-5 star rating (counted in the average) and an
// optional comment. Comments must be approved by an admin before being shown:
//  - review.status: 'approved' (no comment, shown immediately) | 'pending' (comment awaiting moderation) | 'rejected'
// The service document aggregate (ratingAvg / ratingCount / ratingSum) is
// recomputed by a Cloud Function over all non-rejected reviews.

export const createServiceReview = async (reviewData) => {
  const ref = collection(db, 'serviceReviews')
  const hasComment = !!(reviewData.comment && reviewData.comment.trim())
  const docRef = await addDoc(ref, {
    ...reviewData,
    comment: hasComment ? reviewData.comment.trim() : null,
    status: hasComment ? 'pending' : 'approved',
    createdAt: serverTimestamp()
  })
  return docRef.id
}

// Returns an existing review left by this browser (fingerprint) for a service, if any.
export const getServiceReviewByFingerprint = async (serviceId, fingerprint) => {
  if (!fingerprint) return null
  const ref = collection(db, 'serviceReviews')
  const q = query(ref, where('serviceId', '==', serviceId), where('fingerprint', '==', fingerprint))
  const snapshot = await getDocs(q)
  if (snapshot.empty) return null
  const d = snapshot.docs[0]
  return { id: d.id, ...d.data() }
}

// Public: approved reviews of a service (shown to everyone).
export const getApprovedReviewsByService = async (serviceId) => {
  const ref = collection(db, 'serviceReviews')
  const q = query(ref, where('serviceId', '==', serviceId), where('status', '==', 'approved'))
  const snapshot = await getDocs(q)
  const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
  return items.sort((a, b) => {
    const da = a.createdAt?.toDate?.() || new Date(0)
    const dbb = b.createdAt?.toDate?.() || new Date(0)
    return dbb - da
  })
}

// Admin: reviews awaiting comment moderation.
export const getPendingReviews = async () => {
  const ref = collection(db, 'serviceReviews')
  const q = query(ref, where('status', '==', 'pending'))
  const snapshot = await getDocs(q)
  const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
  return items.sort((a, b) => {
    const da = a.createdAt?.toDate?.() || new Date(0)
    const dbb = b.createdAt?.toDate?.() || new Date(0)
    return da - dbb
  })
}

// Admin: approve / reject a review comment.
export const updateServiceReviewStatus = async (reviewId, status) => {
  await updateDoc(doc(db, 'serviceReviews', reviewId), {
    status,
    moderatedAt: serverTimestamp()
  })
}


