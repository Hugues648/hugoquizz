import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiSearch, FiArrowLeft, FiPlusCircle } from 'react-icons/fi'
import { useAuth } from '../contexts/AuthContext'
import { useSiteConfig } from '../contexts/SiteConfigContext'
import { getPublicServices } from '../services/firestore'
import { SERVICE_CATEGORIES, categoryLabel } from '../config/serviceCategories'
import LocalizedLink from '../components/LocalizedLink'
import LanguageSelector from '../components/LanguageSelector'
import ServiceCard from '../components/services/ServiceCard'
import LoadingSpinner from '../components/LoadingSpinner'

export default function ServicesMarketplace() {
  const { t } = useTranslation()
  const { lang } = useParams()
  const { user } = useAuth()
  const { getLogo, siteName } = useSiteConfig()
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const data = await getPublicServices()
        if (mounted) setServices(data)
      } catch (e) {
        console.error('Error loading services:', e)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const filtered = useMemo(() => {
    return services.filter((s) => {
      if (activeCategory !== 'all' && s.category !== activeCategory) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        return (
          s.businessName?.toLowerCase().includes(q) ||
          s.title?.toLowerCase().includes(q) ||
          s.tagline?.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [services, activeCategory, search])

  const countByCategory = useMemo(() => {
    const map = {}
    services.forEach((s) => {
      map[s.category] = (map[s.category] || 0) + 1
    })
    return map
  }, [services])

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
          <LocalizedLink to="/" className="flex items-center gap-2">
            {getLogo('hero') ? (
              <img src={getLogo('hero')} alt={siteName} className="h-10 w-10 object-contain" />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-xl">🎯</span>
              </div>
            )}
            <span className="font-bold text-gray-900 hidden sm:block">{siteName}</span>
          </LocalizedLink>

          <div className="flex items-center gap-3">
            <LanguageSelector />
            {user ? (
              <LocalizedLink
                to="/service/create"
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-semibold rounded-xl shadow hover:shadow-lg transition-all"
              >
                <FiPlusCircle /> {t('services.proposeService', 'Proposer un service')}
              </LocalizedLink>
            ) : (
              <LocalizedLink
                to="/login"
                className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-semibold rounded-xl shadow hover:shadow-lg transition-all"
              >
                {t('services.proposeService', 'Proposer un service')}
              </LocalizedLink>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-b from-violet-50 to-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-4">
            {t('services.marketplaceTitle', 'Trouvez le bon prestataire')}
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            {t('services.marketplaceSubtitle', 'Des professionnels de confiance pour tous vos besoins et projets.')}
          </p>

          {/* Search */}
          <div className="max-w-xl mx-auto relative">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('services.searchPlaceholder', 'Rechercher un service, une entreprise...')}
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-violet-400 focus:border-transparent outline-none"
            />
          </div>
        </div>
      </section>

      {/* Category chips */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveCategory('all')}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              activeCategory === 'all'
                ? 'bg-violet-600 text-white shadow'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t('common.all', 'Tout')} ({services.length})
          </button>
          {SERVICE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                activeCategory === cat.id
                  ? 'bg-violet-600 text-white shadow'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat.emoji} {categoryLabel(t, cat.id)}
              {countByCategory[cat.id] ? ` (${countByCategory[cat.id]})` : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {loading ? (
          <div className="py-20 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-xl font-semibold text-gray-700 mb-2">
              {t('services.noServices', 'Aucun service pour le moment')}
            </p>
            <p className="text-gray-500 mb-6">
              {t('services.noServicesDesc', 'Soyez le premier à proposer votre service dans cette catégorie.')}
            </p>
            <LocalizedLink
              to={user ? '/service/create' : '/login'}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold rounded-xl shadow hover:shadow-lg transition-all"
            >
              <FiPlusCircle /> {t('services.proposeService', 'Proposer un service')}
            </LocalizedLink>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        )}
      </div>

      {/* Back link */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <LocalizedLink to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-violet-600">
          <FiArrowLeft /> {t('common.back', 'Retour')}
        </LocalizedLink>
      </div>
    </div>
  )
}
