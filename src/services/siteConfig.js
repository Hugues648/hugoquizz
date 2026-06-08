import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../config/firebase'

const SITE_CONFIG_DOC = 'siteConfig'
const SITE_CONFIG_COLLECTION = 'settings'

/**
 * Default site configuration
 */
const DEFAULT_CONFIG = {
  logos: {
    favicon: '/vite.svg',
    header: null, // Logo in the header/sidebar
    footer: null, // Logo in the footer
    ogImage: '/og-image.svg', // Open Graph image for social sharing
    loginPage: null, // Logo on login page
    registerPage: null, // Logo on register page
    hero: null, // Main logo on homepage hero section
  },
  siteName: 'HugoQuiz',
  siteTagline: 'Quiz & Événements'
}

/**
 * Get site configuration
 * @returns {Promise<Object>} Site configuration
 */
export const getSiteConfig = async () => {
  try {
    const docRef = doc(db, SITE_CONFIG_COLLECTION, SITE_CONFIG_DOC)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      const data = docSnap.data()
      // Merge with defaults to ensure all fields exist
      return {
        ...DEFAULT_CONFIG,
        ...data,
        logos: {
          ...DEFAULT_CONFIG.logos,
          ...data.logos
        }
      }
    }
    
    return DEFAULT_CONFIG
  } catch (error) {
    console.error('Error getting site config:', error)
    return DEFAULT_CONFIG
  }
}

/**
 * Update site configuration (admin only)
 * @param {Object} config - Configuration to update
 * @returns {Promise<void>}
 */
export const updateSiteConfig = async (config) => {
  try {
    const docRef = doc(db, SITE_CONFIG_COLLECTION, SITE_CONFIG_DOC)
    
    // Get current config
    const currentConfig = await getSiteConfig()
    
    // Merge configs
    const newConfig = {
      ...currentConfig,
      ...config,
      logos: {
        ...currentConfig.logos,
        ...(config.logos || {})
      },
      updatedAt: serverTimestamp()
    }
    
    await setDoc(docRef, newConfig, { merge: true })
    
    return newConfig
  } catch (error) {
    console.error('Error updating site config:', error)
    throw error
  }
}

/**
 * Update a specific logo
 * @param {string} logoType - Type of logo (favicon, header, footer, ogImage, loginPage, registerPage)
 * @param {string} url - URL of the new logo
 * @returns {Promise<void>}
 */
export const updateLogo = async (logoType, url) => {
  try {
    const docRef = doc(db, SITE_CONFIG_COLLECTION, SITE_CONFIG_DOC)
    
    await setDoc(docRef, {
      logos: {
        [logoType]: url
      },
      updatedAt: serverTimestamp()
    }, { merge: true })
  } catch (error) {
    console.error('Error updating logo:', error)
    throw error
  }
}

/**
 * Update favicon in the browser
 * @param {string} faviconUrl - URL of the favicon
 */
export const updateFavicon = (faviconUrl) => {
  if (!faviconUrl) return
  
  // Find existing favicon link elements
  const existingLinks = document.querySelectorAll("link[rel*='icon']")
  existingLinks.forEach(link => link.remove())
  
  // Create new favicon link
  const link = document.createElement('link')
  link.rel = 'icon'
  link.type = faviconUrl.endsWith('.svg') ? 'image/svg+xml' : 'image/x-icon'
  link.href = faviconUrl
  document.head.appendChild(link)
  
  // Also add apple-touch-icon for iOS
  const appleLink = document.createElement('link')
  appleLink.rel = 'apple-touch-icon'
  appleLink.href = faviconUrl
  document.head.appendChild(appleLink)
}

export default {
  getSiteConfig,
  updateSiteConfig,
  updateLogo,
  updateFavicon,
  DEFAULT_CONFIG
}
