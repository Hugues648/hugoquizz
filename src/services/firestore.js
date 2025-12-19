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
  serverTimestamp
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
