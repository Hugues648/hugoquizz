import { useSiteConfig } from '../contexts/SiteConfigContext'

/**
 * SiteLogo component - displays the site logo from admin configuration
 * 
 * @param {string} type - Type of logo: 'header', 'footer', 'loginPage', 'registerPage', 'favicon', 'ogImage'
 * @param {string} fallbackEmoji - Fallback emoji if no logo is configured (default: 🎯)
 * @param {string} className - CSS classes for the image
 * @param {string} containerClassName - CSS classes for the container div
 * @param {boolean} showDefault - If true, shows default styled container when no logo
 */
export default function SiteLogo({ 
  type = 'header', 
  fallbackEmoji = '🎯',
  className = 'w-full h-full object-contain',
  containerClassName = 'w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl flex items-center justify-center shadow-lg shadow-pink-500/30',
  showDefault = true
}) {
  const { getLogo, loading } = useSiteConfig()
  
  const logoUrl = getLogo(type)
  
  // If loading, show placeholder
  if (loading) {
    return (
      <div className={`${containerClassName} animate-pulse bg-gray-200`} />
    )
  }
  
  // If logo URL exists, show the image
  if (logoUrl) {
    return (
      <div className={containerClassName}>
        <img 
          src={logoUrl} 
          alt="Logo" 
          className={className}
          onError={(e) => {
            // If image fails to load, show fallback emoji
            e.target.style.display = 'none'
            e.target.parentElement.innerHTML = `<span class="text-2xl">${fallbackEmoji}</span>`
          }}
        />
      </div>
    )
  }
  
  // Show default with emoji
  if (showDefault) {
    return (
      <div className={containerClassName}>
        <span className="text-2xl">{fallbackEmoji}</span>
      </div>
    )
  }
  
  return null
}

/**
 * Simple logo image without container
 */
export function SiteLogoImage({ 
  type = 'header', 
  fallbackSrc = '/vite.svg',
  className = 'w-10 h-10 object-contain',
  alt = 'Logo'
}) {
  const { getLogo, loading } = useSiteConfig()
  
  const logoUrl = getLogo(type) || fallbackSrc
  
  if (loading) {
    return <div className={`${className} animate-pulse bg-gray-200 rounded`} />
  }
  
  return (
    <img 
      src={logoUrl} 
      alt={alt} 
      className={className}
      onError={(e) => {
        if (fallbackSrc && e.target.src !== fallbackSrc) {
          e.target.src = fallbackSrc
        }
      }}
    />
  )
}
