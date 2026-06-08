import { useTranslation } from 'react-i18next'
import { FiEye, FiTag } from 'react-icons/fi'
import LocalizedLink from '../LocalizedLink'
import ServiceAvatar from './ServiceAvatar'
import { categoryLabel, typeLabel, getCategoryById } from '../../config/serviceCategories'

/**
 * ServiceCard - card used in the public marketplace and category listings.
 */
export default function ServiceCard({ service }) {
  const { t } = useTranslation()
  const category = getCategoryById(service.category)
  const cover = service.coverImage || service.windows?.[0]?.blocks?.find((b) => b.type === 'image')?.url

  return (
    <LocalizedLink
      to={`/service/${service.id}`}
      className="group block bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
    >
      {/* Cover */}
      <div className="relative h-44 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        {cover ? (
          <img
            src={cover}
            alt={service.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">
            {category?.emoji || '✨'}
          </div>
        )}
        <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-3 py-1 bg-white/90 backdrop-blur text-gray-700 text-xs font-semibold rounded-full shadow-sm">
          {category?.emoji} {categoryLabel(t, service.category)}
        </span>
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <ServiceAvatar name={service.businessName} photoURL={service.ownerPhotoURL} size={44} />
          <div className="min-w-0">
            <p className="font-bold text-gray-900 truncate">{service.businessName}</p>
            <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
              <FiTag className="w-3 h-3" /> {typeLabel(t, service.serviceType)}
            </p>
          </div>
        </div>

        <h3 className="font-semibold text-gray-800 line-clamp-1 mb-1">{service.title}</h3>
        {service.tagline && (
          <p className="text-sm text-gray-500 line-clamp-2">{service.tagline}</p>
        )}

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
          {service.priceLabel ? (
            <span className="text-sm font-bold text-violet-600">{service.priceLabel}</span>
          ) : (
            <span className="text-sm text-gray-400">{t('services.onQuote', 'Sur devis')}</span>
          )}
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <FiEye className="w-3.5 h-3.5" /> {service.views || 0}
          </span>
        </div>
      </div>
    </LocalizedLink>
  )
}
