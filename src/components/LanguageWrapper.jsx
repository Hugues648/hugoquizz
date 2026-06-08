import { useEffect } from 'react'
import { useParams, useNavigate, useLocation, Outlet, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { languages } from '../config/i18n'

// Liste des codes de langue supportés
const SUPPORTED_LANGS = languages.map(l => l.code)

/**
 * LanguageWrapper - Synchronise la langue de l'URL avec i18n
 * Toute l'application est wrappée dans ce composant
 */
export default function LanguageWrapper() {
  const { lang } = useParams()
  const { i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // Si la langue dans l'URL est valide et différente de i18n, synchroniser
    if (lang && SUPPORTED_LANGS.includes(lang) && i18n.language !== lang) {
      i18n.changeLanguage(lang)
    }
  }, [lang, i18n])

  // Si la langue n'est pas valide, rediriger vers la langue par défaut
  useEffect(() => {
    if (lang && !SUPPORTED_LANGS.includes(lang)) {
      const defaultLang = i18n.language?.split('-')[0] || 'fr'
      const validLang = SUPPORTED_LANGS.includes(defaultLang) ? defaultLang : 'fr'
      // Reconstruire le path complet avec la langue
      navigate(`/${validLang}${location.pathname}${location.search}`, { replace: true })
    }
  }, [lang, navigate, location, i18n.language])

  return <Outlet />
}

/**
 * LegacyRedirect - Redirige les anciennes URLs sans langue vers /:lang/...
 * Utilisé pour toutes les routes qui n'ont pas de préfixe de langue
 */
export function LegacyRedirect() {
  const location = useLocation()
  const { i18n } = useTranslation()
  
  // Déterminer la langue à utiliser
  const savedLang = localStorage.getItem('i18nextLng')?.split('-')[0]
  const browserLang = navigator.language?.split('-')[0]
  const targetLang = SUPPORTED_LANGS.includes(savedLang) ? savedLang 
                   : SUPPORTED_LANGS.includes(browserLang) ? browserLang 
                   : 'fr'
  
  // Clean the pathname: remove any zero-width characters or trailing invisible chars
  // that messaging apps (WhatsApp, Telegram, etc.) sometimes append to URLs
  const cleanPath = location.pathname
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '') // Remove zero-width chars
    .replace(/\s+$/, '') // Remove trailing whitespace
  
  // Rediriger vers la même URL mais avec le préfixe de langue
  return <Navigate to={`/${targetLang}${cleanPath}${location.search}`} replace />
}

/**
 * LanguageRedirect - Redirige / vers /:lang basé sur la détection
 */
export function LanguageRedirect({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { i18n } = useTranslation()

  useEffect(() => {
    // Ne rediriger que si on est exactement sur "/"
    if (location.pathname === '/') {
      // Détecter si c'est Googlebot - ne pas rediriger
      const isBot = /bot|crawl|spider|google|bing|yandex/i.test(navigator.userAgent)
      if (isBot) {
        return // Googlebot voit la page par défaut
      }

      // Détecter la langue préférée
      const detectLanguage = () => {
        // 1. Vérifier localStorage (préférence précédente)
        const savedLang = localStorage.getItem('i18nextLng')?.split('-')[0]
        if (savedLang && SUPPORTED_LANGS.includes(savedLang)) {
          return savedLang
        }

        // 2. Vérifier la langue du navigateur
        const browserLang = navigator.language?.split('-')[0]
        if (browserLang && SUPPORTED_LANGS.includes(browserLang)) {
          return browserLang
        }

        // 3. Défaut: français
        return 'fr'
      }

      const targetLang = detectLanguage()
      navigate(`/${targetLang}`, { replace: true })
    }
  }, [location.pathname, navigate, i18n])

  return children
}

/**
 * Hook utilitaire pour naviguer en conservant la langue
 */
export function useLanguageNavigate() {
  const navigate = useNavigate()
  const { lang } = useParams()
  const { i18n } = useTranslation()

  const currentLang = lang || i18n.language?.split('-')[0] || 'fr'

  return (path, options) => {
    // Si le path commence déjà par une langue, ne pas ajouter
    const startsWithLang = SUPPORTED_LANGS.some(l => path.startsWith(`/${l}/`) || path === `/${l}`)
    if (startsWithLang) {
      navigate(path, options)
    } else {
      // Ajouter la langue au début du path
      const cleanPath = path.startsWith('/') ? path : `/${path}`
      navigate(`/${currentLang}${cleanPath}`, options)
    }
  }
}

/**
 * Fonction utilitaire pour changer de langue (change l'URL)
 */
export function getLanguageSwitchPath(currentPath, newLang) {
  // Extraire le path sans la langue actuelle
  const pathParts = currentPath.split('/')
  
  // Si le premier segment est une langue, le remplacer
  if (SUPPORTED_LANGS.includes(pathParts[1])) {
    pathParts[1] = newLang
    return pathParts.join('/')
  }
  
  // Sinon, ajouter la langue au début
  return `/${newLang}${currentPath}`
}
