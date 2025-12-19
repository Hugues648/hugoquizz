// Configuration de l'application

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

// Génère le lien de partage pour un quiz ou questionnaire
export const getShareableLink = (type, id) => {
  const baseUrl = getBaseUrl()
  return `${baseUrl}/play/${type}/${id}`
}
