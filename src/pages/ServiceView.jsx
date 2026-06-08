import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  FiArrowLeft, FiMail, FiPhone, FiSend, FiTag, FiCheckCircle, FiAlertTriangle, FiEye
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { useSiteConfig } from '../contexts/SiteConfigContext'
import {
  getServiceById,
  incrementServiceViews,
  createServiceMessage
} from '../services/firestore'
import { categoryLabel, typeLabel, getCategoryById } from '../config/serviceCategories'
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

export default function ServiceView() {
  const { t } = useTranslation()
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
    clientType: 'particulier',
    subject: '',
    message: '',
    consent: false,
  })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

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
    if (!form.fullName.trim() || !form.phone.trim() || !form.message.trim()) {
      toast.error(t('services.contact.fillRequired', 'Veuillez remplir les champs obligatoires.'))
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
  const windows = service.windows || []
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
              {service.tagline && <p className="text-gray-600 mt-1">{service.tagline}</p>}
            </div>
            {service.priceLabel && (
              <div className="text-right bg-white rounded-2xl px-5 py-3 shadow-sm border border-gray-100">
                <p className="text-xl font-bold text-violet-600">{service.priceLabel}</p>
                {service.priceComment && <p className="text-xs text-gray-500 max-w-[180px]">{service.priceComment}</p>}
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
      </main>

      {/* Footer view count for owner */}
      {isOwner && (
        <div className="max-w-5xl mx-auto px-4 pb-10 text-center text-sm text-gray-400 flex items-center justify-center gap-1">
          <FiEye /> {service.views || 0} {t('services.views', 'vues')}
        </div>
      )}
    </div>
  )
}
