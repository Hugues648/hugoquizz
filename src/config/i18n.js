import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// Import translations
import fr from './translations/fr'
import en from './translations/en'
import de from './translations/de'
import nl from './translations/nl'

// European country to language mapping
const EUROPEAN_COUNTRY_LANGUAGES = {
  // French speaking
  'FR': 'fr', // France
  'BE': 'fr', // Belgium (default French, but could be NL)
  'CH': 'fr', // Switzerland (default French)
  'LU': 'fr', // Luxembourg
  'MC': 'fr', // Monaco
  
  // German speaking
  'DE': 'de', // Germany
  'AT': 'de', // Austria
  'LI': 'de', // Liechtenstein
  
  // Dutch speaking
  'NL': 'nl', // Netherlands
  
  // English speaking
  'GB': 'en', // United Kingdom
  'IE': 'en', // Ireland
  'MT': 'en', // Malta
  
  // Other European countries - default to English
  'ES': 'en', // Spain
  'IT': 'en', // Italy
  'PT': 'en', // Portugal
  'PL': 'en', // Poland
  'RO': 'en', // Romania
  'CZ': 'en', // Czech Republic
  'SE': 'en', // Sweden
  'DK': 'en', // Denmark
  'FI': 'en', // Finland
  'GR': 'en', // Greece
  'HU': 'en', // Hungary
  'NO': 'en', // Norway
  'SK': 'en', // Slovakia
  'HR': 'en', // Croatia
  'BG': 'en', // Bulgaria
  'SI': 'en', // Slovenia
  'EE': 'en', // Estonia
  'LV': 'en', // Latvia
  'LT': 'en', // Lithuania
  'CY': 'en', // Cyprus
  'IS': 'en', // Iceland
  'AL': 'en', // Albania
  'RS': 'en', // Serbia
  'BA': 'en', // Bosnia
  'ME': 'en', // Montenegro
  'MK': 'en', // North Macedonia
  'UA': 'en', // Ukraine
  'BY': 'en', // Belarus
  'MD': 'en', // Moldova
}

// Resources object
const resources = {
  fr: { translation: fr },
  en: { translation: en },
  de: { translation: de },
  nl: { translation: nl }
}

// Available languages with flags
export const languages = [
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' }
]

// Detect language based on geolocation
const detectLanguageFromGeo = async () => {
  try {
    // Check if language is already saved in localStorage
    const savedLang = localStorage.getItem('i18nextLng')
    if (savedLang && languages.some(l => l.code === savedLang.split('-')[0])) {
      return savedLang.split('-')[0]
    }
    
    // Try to get country from IP-based geolocation
    const response = await fetch('https://ipapi.co/json/', { 
      timeout: 3000 
    })
    
    if (!response.ok) throw new Error('Geo API failed')
    
    const data = await response.json()
    const countryCode = data.country_code
    const continent = data.continent_code
    
    console.log('Detected location:', countryCode, continent)
    
    // If in Europe, use country-specific language
    if (continent === 'EU' && EUROPEAN_COUNTRY_LANGUAGES[countryCode]) {
      return EUROPEAN_COUNTRY_LANGUAGES[countryCode]
    }
    
    // For all other continents (America, Africa, Asia, Oceania), default to English
    return 'en'
    
  } catch (error) {
    console.log('Geolocation detection failed, using browser language')
    // Fallback to browser language
    const browserLang = navigator.language?.split('-')[0]
    if (languages.some(l => l.code === browserLang)) {
      return browserLang
    }
    return 'en' // Default to English if detection fails
  }
}

// Get language from URL parameter
const getLanguageFromUrl = () => {
  const urlParams = new URLSearchParams(window.location.search)
  const langParam = urlParams.get('lang')
  if (langParam && languages.some(l => l.code === langParam)) {
    return langParam
  }
  return null
}

// Custom language detector with URL priority
const geoLanguageDetector = {
  type: 'languageDetector',
  async: true,
  init: () => {},
  detect: async (callback) => {
    // Priority 1: URL parameter (shared links)
    const urlLang = getLanguageFromUrl()
    if (urlLang) {
      // Save to localStorage so it persists during navigation
      localStorage.setItem('i18nextLng', urlLang)
      callback(urlLang)
      return
    }
    
    // Priority 2 & 3: localStorage or geolocation
    const lang = await detectLanguageFromGeo()
    callback(lang)
  },
  cacheUserLanguage: (lng) => {
    localStorage.setItem('i18nextLng', lng)
  }
}

// Export function to get language from URL
export { getLanguageFromUrl }

// Initialize i18n
i18n
  .use(geoLanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['fr', 'en', 'de', 'nl'],
    interpolation: {
      escapeValue: false
    },
    react: {
      useSuspense: false // Important for async language detection
    }
  })

// Export function to manually set language
export const setLanguage = (langCode) => {
  i18n.changeLanguage(langCode)
  localStorage.setItem('i18nextLng', langCode)
}

// Export function to get current language
export const getCurrentLanguage = () => {
  return i18n.language?.split('-')[0] || 'en'
}

export default i18n
