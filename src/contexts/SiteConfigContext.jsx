import { createContext, useContext, useState, useEffect } from 'react'
import { getSiteConfig, updateFavicon } from '../services/siteConfig'

const SiteConfigContext = createContext()

export function useSiteConfig() {
  const context = useContext(SiteConfigContext)
  if (!context) {
    throw new Error('useSiteConfig must be used within a SiteConfigProvider')
  }
  return context
}

export function SiteConfigProvider({ children }) {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)

  // Load site configuration on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const siteConfig = await getSiteConfig()
        setConfig(siteConfig)
        
        // Update favicon
        if (siteConfig.logos?.favicon) {
          updateFavicon(siteConfig.logos.favicon)
        }
      } catch (error) {
        console.error('Error loading site config:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadConfig()
  }, [])

  // Helper to get a logo URL with fallback
  const getLogo = (type, fallback = null) => {
    return config?.logos?.[type] || fallback
  }

  // Helper to refresh config
  const refreshConfig = async () => {
    setLoading(true)
    try {
      const siteConfig = await getSiteConfig()
      setConfig(siteConfig)
      
      if (siteConfig.logos?.favicon) {
        updateFavicon(siteConfig.logos.favicon)
      }
    } catch (error) {
      console.error('Error refreshing site config:', error)
    } finally {
      setLoading(false)
    }
  }

  const value = {
    config,
    loading,
    getLogo,
    refreshConfig,
    siteName: config?.siteName || 'HugoQuiz',
    siteTagline: config?.siteTagline || 'Quiz & Événements'
  }

  return (
    <SiteConfigContext.Provider value={value}>
      {children}
    </SiteConfigContext.Provider>
  )
}
