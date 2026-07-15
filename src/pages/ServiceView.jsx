import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  FiArrowLeft, FiMail, FiPhone, FiSend, FiTag, FiCheckCircle, FiAlertTriangle, FiEye, FiStar
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { useSiteConfig } from '../contexts/SiteConfigContext'
import {
  getServiceById,
  incrementServiceViews,
  createServiceMessage,
  createServiceReview,
  getApprovedReviewsByService,
  getServiceReviewByFingerprint
} from '../services/firestore'
import { categoryLabel, typeLabel, getCategoryById } from '../config/serviceCategories'
import { getCountryName } from '../config/countriesCities'
import LocalizedLink from '../components/LocalizedLink'
import LanguageSelector from '../components/LanguageSelector'
import ServiceAvatar from '../components/services/ServiceAvatar'
import LoadingSpinner from '../components/LoadingSpinner'

// Common country dial codes for the contact form
const COUNTRY_CODES = [
  { code: '+33', flag: '🇫🇷', name: 'France' },
  { code: '+32', flag: '🇧🇪', name: 'Belgique' },
  { code: '+41', flag: '🇨🇭', name: 'Suisse' },
  { code: '+49', flag: '🇩🇪', name: 'Deutschland' },
  { code: '+31', flag: '🇳🇱', name: 'Nederland' },
  { code: '+352', flag: '🇱🇺', name: 'Luxembourg' },
  { code: '+44', flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+34', flag: '🇪🇸', name: 'España' },
  { code: '+39', flag: '🇮🇹', name: 'Italia' },
  { code: '+351', flag: '🇵🇹', name: 'Portugal' },
  { code: '+1', flag: '🇺🇸', name: 'USA / Canada' },
  { code: '+212', flag: '🇲🇦', name: 'Maroc' },
  { code: '+237', flag: '🇨🇲', name: 'Cameroun' },
  { code: '+225', flag: "🇨🇮", name: "Côte d'Ivoire" },
  { code: '+221', flag: '🇸🇳', name: 'Sénégal' },
]

// Stable per-browser id so a visitor can only leave one review per service.
const getBrowserUid = () => {
  try {
    let uid = localStorage.getItem('hugoquiz_browser_uid')
    if (!uid) {
      uid = 'b_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
      localStorage.setItem('hugoquiz_browser_uid', uid)
    }
    return uid
  } catch {
    return null
  }
}

// Map an i18n language code to one of the supported service languages.
const pickServiceLang = (i18nLang) => {
  const l = (i18nLang || 'fr').slice(0, 2).toLowerCase()
  return ['fr', 'en', 'de', 'nl'].includes(l) ? l : 'fr'
}

// Overlay auto-translated text onto a service for the visitor's language.
// Falls back to the original text whenever a translation is missing/empty.
const localizeService = (service, lang) => {
  if (!service) return service
  const tr = service.translations && service.translations[lang]
  const srcSame = !service.sourceLang || service.sourceLang === lang
  if (!tr || srcSame) return service
  const twins = tr.windows || []
  return {
    ...service,
    title: tr.title || service.title,
    tagline: tr.tagline || service.tagline,
    priceLabel: tr.priceLabel || service.priceLabel,
    priceComment: tr.priceComment || service.priceComment,
    windows: (service.windows || []).map((w, wi) => ({
      ...w,
      title: twins[wi]?.title || w.title,
      blocks: (w.blocks || []).map((b, bi) => ({
        ...b,
        content: twins[wi]?.blocks?.[bi]?.content || b.content,
        caption: twins[wi]?.blocks?.[bi]?.caption || b.caption,
      })),
    })),
  }
}

// Read-only star row.
function Stars({ value = 0, size = 'w-4 h-4' }) {
  return (
    <span className="inline-flex items-center">
      {[1, 2, 3, 4, 5].map((i) => (
        <FiStar
          key={i}
          className={`${size} ${i <= Math.round(value) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
        />
      ))}
    </span>
  )
}

export default function ServiceView() {
  const { t, i18n } = useTranslation()
  const { serviceId } = useParams()
  const { user, userData, isAdmin } = useAuth()
  const { getLogo, siteName } = useSiteConfig()

  const [service, setService] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeWindow, setActiveWindow] = useState(0)
  const viewedRef = useRef(false)

  // Contact form state
  const [form, setForm] = useState({
    fullName: '',
    dialCode: '+33',
    phone: '',
    email: '',
    clientType: 'particulier',
    subject: '',
    message: '',
    consent: false,
  })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  // Reviews / ratings state
  const [reviews, setReviews] = useState([])
  const [myReview, setMyReview] = useState(null)
  const [reviewForm, setReviewForm] = useState({ rating: 0, comment: '', authorName: '' })
  const [hoverRating, setHoverRating] = useState(0)
  const [submittingReview, setSubmittingReview] = useState(false)

  // Load approved reviews + this visitor's existing review
  useEffect(() => {
    if (!serviceId) return
    let mounted = true
    ;(async () => {
      try {
        const [list, mine] = await Promise.all([
          getApprovedReviewsByService(serviceId),
          getServiceReviewByFingerprint(serviceId, getBrowserUid())
        ])
        if (mounted) {
          setReviews(list)
          setMyReview(mine)
        }
      } catch (e) {
        console.error('Error loading reviews:', e)
      }
    })()
    return () => { mounted = false }
  }, [serviceId])

  const handleSubmitReview = async () => {
    if (!reviewForm.rating || reviewForm.rating < 1) {
      toast.error(t('services.reviews.pickRating', 'Veuillez attribuer une note.'))
      return
    }
    if (!reviewForm.authorName.trim()) {
      toast.error(t('services.reviews.enterName', 'Veuillez indiquer votre nom.'))
      return
    }
    setSubmittingReview(true)
    try {
      const hasComment = !!reviewForm.comment.trim()
      await createServiceReview({
        serviceId: service.id,
        ownerId: service.userId,
        businessName: service.businessName,
        rating: reviewForm.rating,
        comment: reviewForm.comment.trim() || null,
        authorName: reviewForm.authorName.trim(),
        fingerprint: getBrowserUid()
      })
      setMyReview({ rating: reviewForm.rating, comment: reviewForm.comment.trim() || null, status: hasComment ? 'pending' : 'approved' })
      toast.success(
        hasComment
          ? t('services.reviews.submittedPending', 'Merci ! Votre commentaire sera publié après validation.')
          : t('services.reviews.submitted', 'Merci pour votre note !')
      )
      // Refresh approved list (rating-only reviews appear immediately)
      const list = await getApprovedReviewsByService(service.id)
      setReviews(list)
    } catch (e) {
      console.error('Error submitting review:', e)
      toast.error(t('common.error', 'Erreur'))
    } finally {
      setSubmittingReview(false)
    }
  }


  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const data = await getServiceById(serviceId)
        if (mounted) setService(data)
      } catch (e) {
        console.error('Error loading service:', e)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [serviceId])

  // Increment views once (skip if viewer is the owner)
  useEffect(() => {
    if (service && !viewedRef.current) {
      viewedRef.current = true
      if (!user || user.uid !== service.userId) {
        incrementServiceViews(service.id)
      }
    }
  }, [service, user])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.fullName.trim() || !form.phone.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error(t('services.contact.fillRequired', 'Veuillez remplir les champs obligatoires.'))
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast.error(t('services.contact.invalidEmail', 'Veuillez saisir un e-mail valide.'))
      return
    }
    if (!form.consent) {
      toast.error(t('services.contact.consentRequired', 'Vous devez accepter le traitement de vos données.'))
      return
    }
    setSending(true)
    try {
      await createServiceMessage({
        serviceId: service.id,
        serviceTitle: service.title,
        ownerId: service.userId,
        fullName: form.fullName.trim(),
        phone: `${form.dialCode} ${form.phone.trim()}`,
        email: form.email.trim(),
        clientType: form.clientType,
        subject: form.subject.trim(),
        message: form.message.trim(),
        consent: true,
      })
      setSent(true)
      toast.success(t('services.contact.sent', 'Votre demande a bien été envoyée !'))
    } catch (err) {
      console.error('Error sending message:', err)
      toast.error(t('common.error', 'Erreur'))
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  const isOwner = user && service && user.uid === service.userId
  const canPreview = isOwner || (isAdmin && isAdmin())

  // Not available to the public (and viewer is not owner/admin)
  if (!service || (!service.isPublic && !canPreview)) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {t('services.notAvailable', 'Service non disponible')}
        </h1>
        <p className="text-gray-500 mb-6">
          {t('services.notAvailableDesc', "Ce service n'existe pas ou n'est pas encore publié.")}
        </p>
        <LocalizedLink to="/services" className="px-6 py-3 bg-violet-600 text-white rounded-xl font-semibold">
          {t('services.backToMarketplace', 'Voir tous les services')}
        </LocalizedLink>
      </div>
    )
  }

  const category = getCategoryById(service.category)
  const view = localizeService(service, pickServiceLang(i18n.language))
  const windows = view.windows || []
  const contact = service.contact || {}

  return (
    <div className="min-h-screen bg-white">
      {/* Top nav */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <LocalizedLink to="/services" className="flex items-center gap-2 text-gray-600 hover:text-violet-600">
            <FiArrowLeft /> <span className="hidden sm:inline">{t('services.backToMarketplace', 'Tous les services')}</span>
          </LocalizedLink>
          <LocalizedLink to="/" className="flex items-center gap-2">
            {getLogo('hero') ? (
              <img src={getLogo('hero')} alt={siteName} className="h-9 w-9 object-contain" />
            ) : (
              <span className="text-xl">🎯</span>
            )}
            <span className="font-bold text-gray-900 hidden sm:block">{siteName}</span>
          </LocalizedLink>
          <LanguageSelector />
        </div>
      </nav>

      {/* Preview / moderation banner */}
      {canPreview && !service.isPublic && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-800 text-sm py-2 px-4 text-center flex items-center justify-center gap-2">
          <FiAlertTriangle />
          {service.status === 'pending' && t('services.previewPending', 'Aperçu — ce service est en attente de validation par un administrateur.')}
          {service.status === 'rejected' && t('services.previewRejected', 'Ce service a été rejeté.')}
          {service.status === 'restricted' && t('services.previewRestricted', "L'affichage de ce service a été restreint par un administrateur.")}
        </div>
      )}

      {/* Hero header */}
      <header className="bg-gradient-to-b from-violet-50 to-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <ServiceAvatar name={service.businessName} photoURL={service.ownerPhotoURL} size={80} />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-white text-gray-700 text-xs font-semibold rounded-full shadow-sm">
                  {category?.emoji} {categoryLabel(t, service.category)}
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-violet-100 text-violet-700 text-xs font-semibold rounded-full">
                  <FiTag className="w-3 h-3" /> {typeLabel(t, service.serviceType)}
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">{service.businessName}</h1>
              {service.location?.city && (
                <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
                  <span className="text-base leading-none">{service.location.flag}</span>
                  <span className="font-medium">{service.location.city}</span>
                  {(service.location.countryCode || service.location.country) && (
                    <span className="text-gray-400">· {getCountryName(service.location.countryCode, i18n.language) || service.location.country}</span>
                  )}
                </p>
              )}
              {view.tagline && <p className="text-gray-600 mt-1">{view.tagline}</p>}
              {(service.ratingCount > 0) && (
                <button
                  onClick={() => setActiveWindow('reviews')}
                  className="mt-2 inline-flex items-center gap-2 text-sm hover:underline"
                >
                  <Stars value={service.ratingAvg || 0} />
                  <span className="font-bold text-gray-900">{(service.ratingAvg || 0).toFixed(1)}</span>
                  <span className="text-gray-500">
                    ({service.ratingCount} {service.ratingCount > 1 ? t('services.reviews.ratings', 'notes') : t('services.reviews.rating', 'note')})
                  </span>
                </button>
              )}
            </div>
            {view.priceLabel && (
              <div className="text-right bg-white rounded-2xl px-5 py-3 shadow-sm border border-gray-100">
                <p className="text-xl font-bold text-violet-600">{view.priceLabel}</p>
                {view.priceComment && <p className="text-xs text-gray-500 max-w-[180px]">{view.priceComment}</p>}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Window tabs (barre de tâches) */}
      <div className="sticky top-[57px] z-30 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {windows.map((w, i) => (
              <button
                key={i}
                onClick={() => setActiveWindow(i)}
                className={`whitespace-nowrap px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
                  activeWindow === i
                    ? 'border-violet-600 text-violet-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                {w.title || `${t('services.window', 'Onglet')} ${i + 1}`}
              </button>
            ))}
            <button
              onClick={() => setActiveWindow('contact')}
              className={`whitespace-nowrap px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
                activeWindow === 'contact'
                  ? 'border-violet-600 text-violet-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              📩 {t('services.contact.title', 'Contact')}
            </button>
            <button
              onClick={() => setActiveWindow('reviews')}
              className={`whitespace-nowrap px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
                activeWindow === 'reviews'
                  ? 'border-violet-600 text-violet-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              ⭐ {t('services.reviews.title', 'Avis')}
              {service.ratingCount > 0 && (
                <span className="ml-1 text-xs text-gray-400">({service.ratingCount})</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Window content */}
      <main className="max-w-5xl mx-auto px-4 py-10">
        {activeWindow !== 'contact' && windows[activeWindow] && (
          <article className="space-y-8">
            {(windows[activeWindow].blocks || []).map((block, idx) =>
              block.type === 'image' ? (
                <figure key={idx} className="rounded-2xl overflow-hidden shadow-sm">
                  <img src={block.url} alt={block.caption || ''} className="w-full object-cover" loading="lazy" />
                  {block.caption && (
                    <figcaption className="text-center text-sm text-gray-500 mt-2 italic">{block.caption}</figcaption>
                  )}
                </figure>
              ) : (
                <p key={idx} className="text-gray-700 leading-relaxed text-lg whitespace-pre-line">
                  {block.content}
                </p>
              )
            )}
            {(!windows[activeWindow].blocks || windows[activeWindow].blocks.length === 0) && (
              <p className="text-gray-400 text-center py-10">{t('services.emptyWindow', 'Aucun contenu dans cet onglet.')}</p>
            )}
          </article>
        )}

        {/* Contact window */}
        {activeWindow === 'contact' && (
          <div className="grid md:grid-cols-5 gap-8">
            <div className="md:col-span-2 space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">{t('services.contact.title', 'Contact')}</h2>
              <p className="text-gray-600 leading-relaxed">
                {t('services.contact.intro', 'Décrivez avec précision votre besoin ou projet et nous vous répondrons dans les plus brefs délais.')}
              </p>
              {(contact.showEmail && contact.email) || (contact.showPhone && contact.phone) ? (
                <div className="space-y-3 pt-2">
                  {contact.showEmail && contact.email && (
                    <a href={`mailto:${contact.email}`} className="flex items-center gap-3 text-gray-700 hover:text-violet-600">
                      <span className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
                        <FiMail />
                      </span>
                      {contact.email}
                    </a>
                  )}
                  {contact.showPhone && contact.phone && (
                    <a href={`tel:${contact.phone}`} className="flex items-center gap-3 text-gray-700 hover:text-violet-600">
                      <span className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
                        <FiPhone />
                      </span>
                      {contact.phone}
                    </a>
                  )}
                </div>
              ) : null}
            </div>

            <div className="md:col-span-3">
              {sent ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
                  <FiCheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{t('services.contact.sentTitle', 'Demande envoyée !')}</h3>
                  <p className="text-gray-600">{t('services.contact.sentDesc', 'Le prestataire a reçu votre message et vous répondra rapidement.')}</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      {t('services.contact.fullName', 'Nom complet')} *
                    </label>
                    <input
                      type="text"
                      value={form.fullName}
                      onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-violet-400 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      {t('services.contact.phone', 'Numéro de téléphone')} *
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={form.dialCode}
                        onChange={(e) => setForm({ ...form, dialCode: e.target.value })}
                        className="px-2 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-violet-400 outline-none bg-white"
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={c.code + c.name} value={c.code}>
                            {c.flag} {c.code}
                          </option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-violet-400 outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      {t('services.contact.email', 'Adresse e-mail')} *
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder={t('services.contact.emailPlaceholder', 'vous@exemple.com')}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-violet-400 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      {t('services.contact.clientType', 'Type de client')}
                    </label>
                    <div className="flex gap-3">
                      {['particulier', 'entreprise'].map((type) => (
                        <label
                          key={type}
                          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer transition-all ${
                            form.clientType === type
                              ? 'border-violet-500 bg-violet-50 text-violet-700 font-semibold'
                              : 'border-gray-200 text-gray-600'
                          }`}
                        >
                          <input
                            type="radio"
                            name="clientType"
                            value={type}
                            checked={form.clientType === type}
                            onChange={(e) => setForm({ ...form, clientType: e.target.value })}
                            className="accent-violet-600"
                          />
                          {type === 'particulier'
                            ? t('services.contact.individual', 'Particulier')
                            : t('services.contact.company', 'Entreprise')}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      {t('services.contact.subject', 'Objet de la demande')}
                    </label>
                    <input
                      type="text"
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-violet-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      {t('services.contact.request', 'Décrivez votre requête / le service souhaité')} *
                    </label>
                    <textarea
                      rows={5}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-violet-400 outline-none resize-none"
                      required
                    />
                  </div>

                  <label className="flex items-start gap-3 text-sm text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.consent}
                      onChange={(e) => setForm({ ...form, consent: e.target.checked })}
                      className="mt-1 accent-violet-600"
                      required
                    />
                    <span>
                      {t(
                        'services.contact.consent',
                        "J'accepte que les informations saisies soient utilisées et transmises au prestataire afin de répondre à ma demande, conformément à la politique de confidentialité."
                      )}
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold rounded-xl shadow hover:shadow-lg transition-all disabled:opacity-60"
                  >
                    <FiSend /> {sending ? t('common.loading', 'Envoi...') : t('services.contact.send', 'Envoyer ma demande')}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Reviews window (Amazon-style) */}
        {activeWindow === 'reviews' && (
          <div className="space-y-8">
            {/* Summary */}
            <div className="flex flex-col sm:flex-row items-center gap-6 bg-gradient-to-br from-amber-50 to-white border border-amber-100 rounded-2xl p-6">
              <div className="text-center shrink-0">
                <div className="text-5xl font-extrabold text-gray-900">{(service.ratingAvg || 0).toFixed(1)}</div>
                <Stars value={service.ratingAvg || 0} size="w-5 h-5" />
                <p className="text-sm text-gray-500 mt-1">
                  {service.ratingCount || 0}{' '}
                  {(service.ratingCount || 0) > 1
                    ? t('services.reviews.ratings', 'notes')
                    : t('services.reviews.rating', 'note')}
                </p>
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-xl font-bold text-gray-900 mb-1">{t('services.reviews.customerReviews', 'Avis des clients')}</h2>
                <p className="text-gray-600 text-sm">{t('services.reviews.summaryDesc', 'Partagez votre expérience avec ce prestataire pour aider les autres clients.')}</p>
              </div>
            </div>

            {/* Submit / your review */}
            {myReview ? (
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
                <h3 className="font-bold text-gray-900 mb-2">{t('services.reviews.yourReview', 'Votre avis')}</h3>
                <Stars value={myReview.rating || 0} />
                {myReview.comment && (
                  <p className="text-gray-700 mt-2 whitespace-pre-line">{myReview.comment}</p>
                )}
                {myReview.status === 'pending' && (
                  <p className="text-xs text-amber-600 mt-3 flex items-center gap-1">
                    <FiAlertTriangle /> {t('services.reviews.pendingNote', 'Votre commentaire est en attente de validation par un administrateur.')}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-2">{t('services.reviews.alreadyReviewed', 'Vous avez déjà évalué ce service.')}</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-4">
                <h3 className="font-bold text-gray-900">{t('services.reviews.writeReview', 'Donner mon avis')}</h3>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t('services.reviews.yourRating', 'Votre note')} *</label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setReviewForm({ ...reviewForm, rating: i })}
                        onMouseEnter={() => setHoverRating(i)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1"
                        aria-label={`${i} / 5`}
                      >
                        <FiStar
                          className={`w-8 h-8 transition-colors ${
                            i <= (hoverRating || reviewForm.rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t('services.reviews.yourName', 'Votre nom')} *</label>
                  <input
                    type="text"
                    value={reviewForm.authorName}
                    onChange={(e) => setReviewForm({ ...reviewForm, authorName: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-violet-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t('services.reviews.yourComment', 'Votre commentaire')} <span className="font-normal text-gray-400">({t('services.reviews.optional', 'facultatif')})</span></label>
                  <textarea
                    rows={4}
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                    placeholder={t('services.reviews.commentPlaceholder', 'Décrivez votre expérience…')}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-violet-400 outline-none resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">{t('services.reviews.commentModerated', 'Les commentaires sont validés par un administrateur avant publication.')}</p>
                </div>
                <button
                  type="button"
                  onClick={handleSubmitReview}
                  disabled={submittingReview}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl shadow hover:shadow-lg transition-all disabled:opacity-60"
                >
                  <FiStar /> {submittingReview ? t('common.loading', 'Envoi...') : t('services.reviews.submit', 'Publier mon avis')}
                </button>
              </div>
            )}

            {/* Reviews list */}
            <div className="space-y-4">
              {reviews.length === 0 ? (
                <p className="text-center text-gray-400 py-8">{t('services.reviews.noReviews', 'Aucun avis pour le moment. Soyez le premier à donner votre avis !')}</p>
              ) : (
                reviews.map((r) => (
                  <div key={r.id} className="border border-gray-100 rounded-2xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center font-bold">
                        {(r.authorName || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{r.authorName || t('services.reviews.anonymous', 'Anonyme')}</p>
                        <Stars value={r.rating || 0} />
                      </div>
                    </div>
                    {r.comment && <p className="text-gray-700 whitespace-pre-line">{r.comment}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer view count for owner or admin only */}
      {canPreview && (
        <div className="max-w-5xl mx-auto px-4 pb-10 text-center text-sm text-gray-400 flex items-center justify-center gap-1">
          <FiEye /> {service.views || 0} {t('services.views', 'vues')}
        </div>
      )}
    </div>
  )
}
