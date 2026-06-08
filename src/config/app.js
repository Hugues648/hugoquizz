// Configuration de l'application
import { getCurrentLanguage } from './i18n'

// URL de base pour les liens de partage
// En production, remplacez par votre URL Firebase Hosting
// Exemple: 'https://hugoquiz-xxxxx.web.app'
export const getBaseUrl = () => {
  // Si une variable d'environnement est définie, l'utiliser
  if (import.meta.env.VITE_APP_URL) {
    return import.meta.env.VITE_APP_URL
  }
  
  // En production (Firebase Hosting)
  if (import.meta.env.PROD) {
    return window.location.origin
  }
  
  // En développement, utiliser l'origine actuelle
  // Si accédé via IP locale, ça marchera pour les téléphones
  return window.location.origin
}

// Génère le lien de partage pour un quiz, questionnaire ou événement
// Inclut automatiquement la langue actuelle dans le lien
export const getShareableLink = (type, id, options = {}) => {
  const baseUrl = getBaseUrl()
  const lang = options.lang || getCurrentLanguage()
  
  let path
  if (type === 'event') {
    path = `/event/${id}`
  } else if (type === 'guestbook') {
    path = `/guestbook/${id}`
  } else if (type === 'quiz-live') {
    path = `/join/quiz/${id}`
  } else {
    path = `/play/${type}/${id}`
  }
  
  return `${baseUrl}${path}?lang=${lang}`
}

// Génère un lien de partage sans langue (pour cas spécifiques)
export const getShareableLinkWithoutLang = (type, id) => {
  const baseUrl = getBaseUrl()
  if (type === 'event') {
    return `${baseUrl}/event/${id}`
  }
  return `${baseUrl}/play/${type}/${id}`
}
