import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { languages } from '../config/i18n'

const SUPPORTED_LANGS = languages.map(l => l.code)

/**
 * LocalizedLink - Un composant Link qui préfixe automatiquement les liens avec la langue actuelle
 * Utilisation: <LocalizedLink to="/dashboard">Dashboard</LocalizedLink>
 * Résultat: /fr/dashboard (si la langue actuelle est fr)
 */
export default function LocalizedLink({ to, children, ...props }) {
  const { lang } = useParams()
  const { i18n } = useTranslation()
  
  // Déterminer la langue actuelle depuis l'URL ou i18n
  const currentLang = lang || i18n.language?.split('-')[0] || 'fr'
  const validLang = SUPPORTED_LANGS.includes(currentLang) ? currentLang : 'fr'
  
  // Si le lien commence déjà par une langue, ne pas modifier
  const startsWithLang = SUPPORTED_LANGS.some(l => to.startsWith(`/${l}/`) || to === `/${l}`)
  
  // Construire le lien avec préfixe de langue
  const localizedTo = startsWithLang ? to : `/${validLang}${to.startsWith('/') ? to : '/' + to}`
  
  return (
    <Link to={localizedTo} {...props}>
      {children}
    </Link>
  )
}

/**
 * Hook pour obtenir un path localisé
 */
export function useLocalizedPath() {
  const { lang } = useParams()
  const { i18n } = useTranslation()
  
  const currentLang = lang || i18n.language?.split('-')[0] || 'fr'
  const validLang = SUPPORTED_LANGS.includes(currentLang) ? currentLang : 'fr'
  
  return (path) => {
    const startsWithLang = SUPPORTED_LANGS.some(l => path.startsWith(`/${l}/`) || path === `/${l}`)
    if (startsWithLang) return path
    return `/${validLang}${path.startsWith('/') ? path : '/' + path}`
  }
}
