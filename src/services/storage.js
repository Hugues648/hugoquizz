import { ref, deleteObject, uploadBytes, getDownloadURL, listAll, getMetadata } from 'firebase/storage'
import { storage, auth, db } from '../config/firebase'
import { doc, getDoc, updateDoc, serverTimestamp, collection, getDocs, query, where } from 'firebase/firestore'

// Storage limit per user (2GB in bytes)
export const STORAGE_LIMIT_BYTES = 2 * 1024 * 1024 * 1024 // 2 GB
export const STORAGE_WARNING_THRESHOLD = 0.9 // 90% of limit
export const STORAGE_CRITICAL_THRESHOLD = 0.95 // 95% of limit

/**
 * Get user's current storage usage
 * @param {string} userId - User ID
 * @returns {Promise<{used: number, limit: number, percentage: number}>}
 */
export const getUserStorageUsage = async (userId) => {
  try {
    // Get user data from Firestore for cached storage info
    const userDoc = await getDoc(doc(db, 'users', userId))
    if (userDoc.exists()) {
      const userData = userDoc.data()
      const customLimit = userData.storageLimit || STORAGE_LIMIT_BYTES
      const used = userData.storageUsed || 0
      
      return {
        used,
        limit: customLimit,
        percentage: (used / customLimit) * 100
      }
    }
    
    return {
      used: 0,
      limit: STORAGE_LIMIT_BYTES,
      percentage: 0
    }
  } catch (error) {
    console.error('Error getting storage usage:', error)
    return {
      used: 0,
      limit: STORAGE_LIMIT_BYTES,
      percentage: 0
    }
  }
}

/**
 * Check if user can upload a file of given size
 * @param {string} userId - User ID
 * @param {number} fileSize - Size in bytes
 * @returns {Promise<{canUpload: boolean, remaining: number, message?: string}>}
 */
export const canUploadFile = async (userId, fileSize) => {
  const usage = await getUserStorageUsage(userId)
  const remaining = usage.limit - usage.used
  
  if (fileSize > remaining) {
    return {
      canUpload: false,
      remaining,
      message: `Espace de stockage insuffisant. Il vous reste ${formatBytes(remaining)} sur ${formatBytes(usage.limit)}.`
    }
  }
  
  return {
    canUpload: true,
    remaining: remaining - fileSize
  }
}

/**
 * Format bytes to human readable format
 */
export const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

/**
 * Upload une image vers Firebase Storage avec vérification de quota
 * @param {File} file - Fichier image à uploader
 * @param {string} path - Chemin de base dans le storage (ex: 'guestbook/eventId')
 * @returns {Promise<string>} - URL de téléchargement de l'image
 */
export const uploadImage = async (file, path) => {
  try {
    const userId = auth.currentUser?.uid
    if (!userId) {
      throw new Error('Utilisateur non connecté')
    }

    // Check storage quota
    const quotaCheck = await canUploadFile(userId, file.size)
    if (!quotaCheck.canUpload) {
      throw new Error(quotaCheck.message)
    }

    // Générer un nom unique pour le fichier
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 15)
    const extension = file.name.split('.').pop() || 'jpg'
    const fileName = `${timestamp}-${randomId}.${extension}`
    
    const fullPath = `${path}/${fileName}`
    const storageRef = ref(storage, fullPath)
    
    // Upload le fichier
    const snapshot = await uploadBytes(storageRef, file)
    
    // Update user's storage usage in Firestore
    await updateUserStorageUsage(userId, file.size, 'add')
    
    // Récupérer l'URL de téléchargement
    const downloadURL = await getDownloadURL(snapshot.ref)
    
    return downloadURL
  } catch (error) {
    console.error('Error uploading image:', error)
    throw error
  }
}

/**
 * Upload a file with quota check
 * @param {File} file - File to upload
 * @param {string} path - Storage path
 * @returns {Promise<string>} - Download URL
 */
export const uploadFile = async (file, path) => {
  return uploadImage(file, path)
}

/**
 * Update user's storage usage in Firestore
 * @param {string} userId - User ID
 * @param {number} bytes - Bytes to add or subtract
 * @param {'add' | 'subtract'} operation - Operation type
 */
export const updateUserStorageUsage = async (userId, bytes, operation = 'add') => {
  try {
    const userRef = doc(db, 'users', userId)
    const userDoc = await getDoc(userRef)
    
    if (userDoc.exists()) {
      const userData = userDoc.data()
      const currentUsage = userData.storageUsed || 0
      const newUsage = operation === 'add' 
        ? currentUsage + bytes 
        : Math.max(0, currentUsage - bytes)
      
      await updateDoc(userRef, {
        storageUsed: newUsage,
        storageUpdatedAt: serverTimestamp()
      })
      
      // Check if user is near limit and notify admin
      const limit = userData.storageLimit || STORAGE_LIMIT_BYTES
      if (operation === 'add' && newUsage >= limit * STORAGE_WARNING_THRESHOLD) {
        // This will be handled by Cloud Functions
        console.log('User approaching storage limit:', userId, formatBytes(newUsage))
      }
    }
  } catch (error) {
    console.error('Error updating storage usage:', error)
  }
}

/**
 * Supprimer une image de Firebase Storage à partir de son URL
 * @param {string} url - URL complète Firebase Storage
 * @returns {Promise<boolean>} - true si supprimé, false sinon
 */
export const deleteImage = async (url) => {
  return deleteFileFromStorage(url)
}

/**
 * Alias for deleteFileFromStorage - delete a file from Storage
 * @param {string} url - URL complète Firebase Storage
 * @returns {Promise<boolean>} - true si supprimé, false sinon
 */
export const deleteFile = async (url) => {
  return deleteFileFromStorage(url)
}

/**
 * Extraire le chemin du fichier depuis une URL Firebase Storage
 * @param {string} url - URL complète Firebase Storage
 * @returns {string|null} - Chemin du fichier ou null si invalide
 */
export const getStoragePathFromUrl = (url) => {
  if (!url) return null
  
  try {
    const urlObj = new URL(url)
    // Firebase Storage URLs: https://firebasestorage.googleapis.com/v0/b/bucket/o/path%2Fto%2Ffile.jpg?alt=media&token=...
    const pathMatch = urlObj.pathname.match(/\/v0\/b\/[^\/]+\/o\/(.+)$/)
    
    if (pathMatch) {
      // Décoder le chemin (les / sont encodés en %2F)
      return decodeURIComponent(pathMatch[1])
    }
    
    return null
  } catch (e) {
    console.error('Error parsing storage URL:', e)
    return null
  }
}

/**
 * Supprimer un fichier de Firebase Storage à partir de son URL
 * @param {string} url - URL complète Firebase Storage
 * @param {string} userId - Optional user ID to update storage usage
 * @returns {Promise<boolean>} - true si supprimé, false sinon
 */
export const deleteFileFromStorage = async (url, userId = null) => {
  const path = getStoragePathFromUrl(url)
  
  if (!path) {
    console.log('Not a Firebase Storage URL or invalid URL:', url)
    return false
  }
  
  try {
    const fileRef = ref(storage, path)
    
    // Get file size before deleting to update storage usage
    let fileSize = 0
    try {
      const metadata = await getMetadata(fileRef)
      fileSize = metadata.size || 0
    } catch (e) {
      console.log('Could not get file metadata:', e.message)
    }
    
    await deleteObject(fileRef)
    console.log('File deleted from storage:', path)
    
    // Update storage usage if we have userId and fileSize
    const userIdToUpdate = userId || auth.currentUser?.uid
    if (userIdToUpdate && fileSize > 0) {
      await updateUserStorageUsage(userIdToUpdate, fileSize, 'subtract')
    }
    
    return true
  } catch (error) {
    // Si le fichier n'existe pas, on considère que c'est OK
    if (error.code === 'storage/object-not-found') {
      console.log('File not found in storage (already deleted?):', path)
      return true
    }
    console.error('Error deleting file from storage:', error)
    return false
  }
}

/**
 * Supprimer plusieurs fichiers de Firebase Storage
 * @param {string[]} urls - Liste d'URLs Firebase Storage
 * @returns {Promise<{success: number, failed: number}>}
 */
export const deleteMultipleFilesFromStorage = async (urls) => {
  let success = 0
  let failed = 0
  
  for (const url of urls) {
    if (url) {
      const result = await deleteFileFromStorage(url)
      if (result) {
        success++
      } else {
        failed++
      }
    }
  }
  
  return { success, failed }
}

/**
 * Get storage status for a user
 * @param {string} userId - User ID
 * @returns {Promise<{status: 'ok' | 'warning' | 'critical' | 'exceeded', used: number, limit: number, percentage: number}>}
 */
export const getStorageStatus = async (userId) => {
  const usage = await getUserStorageUsage(userId)
  const percentage = usage.percentage / 100
  
  let status = 'ok'
  if (percentage >= 1) {
    status = 'exceeded'
  } else if (percentage >= STORAGE_CRITICAL_THRESHOLD) {
    status = 'critical'
  } else if (percentage >= STORAGE_WARNING_THRESHOLD) {
    status = 'warning'
  }
  
  return {
    status,
    used: usage.used,
    limit: usage.limit,
    percentage: usage.percentage
  }
}

/**
 * Get all users with their storage usage (admin only)
 * @returns {Promise<Array<{id: string, email: string, displayName: string, storageUsed: number, storageLimit: number, percentage: number}>>}
 */
export const getAllUsersStorageUsage = async () => {
  try {
    const usersRef = collection(db, 'users')
    const snapshot = await getDocs(usersRef)
    
    const users = snapshot.docs.map(doc => {
      const data = doc.data()
      const used = data.storageUsed || 0
      const limit = data.storageLimit || STORAGE_LIMIT_BYTES
      
      return {
        id: doc.id,
        email: data.email || '',
        displayName: data.displayName || data.name || '',
        storageUsed: used,
        storageLimit: limit,
        percentage: (used / limit) * 100,
        lastNotified: data.storageNotifiedAt || null,
        notificationType: data.storageNotificationType || null
      }
    })
    
    // Sort by usage percentage (highest first)
    return users.sort((a, b) => b.percentage - a.percentage)
  } catch (error) {
    console.error('Error getting all users storage:', error)
    return []
  }
}

/**
 * Update user's storage limit (admin only)
 * @param {string} userId - User ID
 * @param {number} newLimitBytes - New limit in bytes
 */
export const updateUserStorageLimit = async (userId, newLimitBytes) => {
  try {
    const userRef = doc(db, 'users', userId)
    await updateDoc(userRef, {
      storageLimit: newLimitBytes,
      storageLimitUpdatedAt: serverTimestamp()
    })
    return true
  } catch (error) {
    console.error('Error updating storage limit:', error)
    throw error
  }
}

/**
 * Get file size from a Firebase Storage URL
 * @param {string} url - Firebase Storage URL
 * @returns {Promise<number>} - Size in bytes, 0 if not found
 */
const getFileSizeFromUrl = async (url) => {
  const path = getStoragePathFromUrl(url)
  if (!path) return 0
  
  try {
    const fileRef = ref(storage, path)
    const metadata = await getMetadata(fileRef)
    return metadata.size || 0
  } catch (e) {
    console.log('Could not get file size for:', url)
    return 0
  }
}

/**
 * Extract all image/file URLs from an object
 * @param {any} obj - Object to scan for URLs
 * @returns {string[]} - Array of Firebase Storage URLs
 */
const extractStorageUrls = (obj) => {
  const urls = []
  
  const scan = (value) => {
    if (!value) return
    
    if (typeof value === 'string') {
      // Check if it's a Firebase Storage URL
      if (value.includes('firebasestorage.googleapis.com')) {
        urls.push(value)
      }
    } else if (Array.isArray(value)) {
      value.forEach(scan)
    } else if (typeof value === 'object') {
      Object.values(value).forEach(scan)
    }
  }
  
  scan(obj)
  return urls
}

/**
 * Recalculate user's storage by scanning their Firestore documents
 * @param {string} userId - User ID
 * @returns {Promise<number>} - Total bytes used
 */
export const recalculateUserStorage = async (userId) => {
  try {
    let totalBytes = 0
    const processedUrls = new Set()
    
    // Helper function to get file size and add to total
    const processUrl = async (url) => {
      if (!url || processedUrls.has(url)) return
      processedUrls.add(url)
      const size = await getFileSizeFromUrl(url)
      totalBytes += size
    }
    
    // 1. Scan direct user collections (events, quizzes, questionnaires)
    const directCollections = [
      { name: 'events', userField: 'userId' },
      { name: 'quizzes', userField: 'userId' },
      { name: 'questionnaires', userField: 'userId' }
    ]
    
    // Collect event IDs for later scanning related collections
    const userEventIds = []
    
    for (const { name, userField } of directCollections) {
      try {
        const q = query(collection(db, name), where(userField, '==', userId))
        const snapshot = await getDocs(q)
        
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data()
          const urls = extractStorageUrls(data)
          
          for (const url of urls) {
            await processUrl(url)
          }
          
          // Collect event IDs
          if (name === 'events') {
            userEventIds.push(docSnap.id)
          }
        }
      } catch (e) {
        console.log(`Error scanning ${name}:`, e.message)
      }
    }
    
    // 2. Scan collections linked by eventId (guests, guestbookMessages)
    const eventLinkedCollections = ['guests', 'guestbookMessages']
    
    for (const eventId of userEventIds) {
      for (const collectionName of eventLinkedCollections) {
        try {
          const q = query(collection(db, collectionName), where('eventId', '==', eventId))
          const snapshot = await getDocs(q)
          
          for (const docSnap of snapshot.docs) {
            const data = docSnap.data()
            const urls = extractStorageUrls(data)
            
            for (const url of urls) {
              await processUrl(url)
            }
          }
        } catch (e) {
          console.log(`Error scanning ${collectionName} for event ${eventId}:`, e.message)
        }
      }
    }
    
    // 3. Also scan Storage directly for user-specific paths
    const userPaths = [`users/${userId}`]
    
    for (const basePath of userPaths) {
      try {
        const folderRef = ref(storage, basePath)
        const result = await listAll(folderRef)
        
        // Recursive function to scan all files in a folder
        const scanFolder = async (folderResult) => {
          for (const item of folderResult.items) {
            try {
              const metadata = await getMetadata(item)
              const url = await getDownloadURL(item)
              
              if (!processedUrls.has(url)) {
                processedUrls.add(url)
                totalBytes += metadata.size || 0
              }
            } catch (e) {
              console.log('Error getting metadata for:', item.fullPath)
            }
          }
          
          for (const folder of folderResult.prefixes) {
            try {
              const subResult = await listAll(folder)
              await scanFolder(subResult)
            } catch (e) {
              console.log('Error scanning subfolder:', folder.fullPath)
            }
          }
        }
        
        await scanFolder(result)
      } catch (e) {
        console.log('Folder not accessible:', basePath)
      }
    }
    
    console.log(`Recalculated storage for ${userId}: ${formatBytes(totalBytes)} (${processedUrls.size} files)`)
    
    // Update user's storage usage in Firestore
    const userRef = doc(db, 'users', userId)
    await updateDoc(userRef, {
      storageUsed: totalBytes,
      storageRecalculatedAt: serverTimestamp()
    })
    
    return totalBytes
  } catch (error) {
    console.error('Error recalculating storage:', error)
    throw error
  }
}
