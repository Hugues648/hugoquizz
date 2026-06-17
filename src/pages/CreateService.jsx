import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  FiSave, FiPlus, FiTrash2, FiImage, FiType, FiX, FiChevronLeft, FiChevronRight,
  FiShield, FiArrowRight, FiEye, FiLayers, FiTag, FiDollarSign, FiMail, FiPhone, FiGlobe
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import {
  createService, updateService, getServiceById, getLatestVerificationByUser
} from '../services/firestore'
import { SERVICE_CATEGORIES, getCategoryById, categoryLabel, typeLabel } from '../config/serviceCategories'
import { useLocalizedPath } from '../components/LocalizedLink'
import ImageUpload from '../components/ImageUpload'
import ServiceAvatar from '../components/services/ServiceAvatar'
import LoadingSpinner from '../components/LoadingSpinner'

const emptyWindow = (title = '') => ({ title, blocks: [] })

export default function CreateService() {
  const { t } = useTranslation()
  const { serviceId } = useParams()
  const navigate = useNavigate()
  const getLocalizedPath = useLocalizedPath()
  const { user, userData } = useAuth()
  const isEdit = Boolean(serviceId)

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)

  const [meta, setMeta] = useState({
    businessName: '',
    category: 'evenement',
    serviceType: 'photographe',
    title: '',
    tagline: '',
    coverImage: '',
    ownerPhotoURL: userData?.photoURL || '',
    priceLabel: '',
    priceComment: '',
  })
  const [contact, setContact] = useState({
    email: userData?.email || '',
    showEmail: true,
    phone: '',
    showPhone: false,
  })
  const [windows, setWindows] = useState([emptyWindow('Accueil')])
  const [activeWindow, setActiveWindow] = useState(0)

  // Access gate: approved if the user doc says so OR the latest verification is approved
  const [accessApproved, setAccessApproved] = useState(userData?.serviceProviderStatus === 'approved')
  const [checkingAccess, setCheckingAccess] = useState(true)

  useEffect(() => {
    if (!user) return
    let active = true
    ;(async () => {
      try {
        if (userData?.serviceProviderStatus === 'approved') {
          if (active) setAccessApproved(true)
          return
        }
        const latest = await getLatestVerificationByUser(user.uid)
        if (active) setAccessApproved(latest?.status === 'approved')
      } catch (e) {
        console.error(e)
      } finally {
        if (active) setCheckingAccess(false)
      }
    })()
    return () => { active = false }
  }, [user, userData])

  useEffect(() => {
    if (!isEdit) return
    ;(async () => {
      try {
        const svc = await getServiceById(serviceId)
        if (!svc) {
          toast.error(t('services.notFound', 'Service introuvable'))
          navigate(getLocalizedPath('/dashboard'))
          return
        }
        if (svc.userId !== user.uid) {
          toast.error(t('services.notYours', "Ce service ne vous appartient pas"))
          navigate(getLocalizedPath('/dashboard'))
          return
        }
        setMeta({
          businessName: svc.businessName || '',
          category: svc.category || 'evenement',
          serviceType: svc.serviceType || '',
          title: svc.title || '',
          tagline: svc.tagline || '',
          coverImage: svc.coverImage || '',
          ownerPhotoURL: svc.ownerPhotoURL || '',
          priceLabel: svc.priceLabel || '',
          priceComment: svc.priceComment || '',
        })
        setContact({
          email: svc.contact?.email || '',
          showEmail: svc.contact?.showEmail ?? true,
          phone: svc.contact?.phone || '',
          showPhone: svc.contact?.showPhone ?? false,
        })
        setWindows(svc.windows?.length ? svc.windows : [emptyWindow('Accueil')])
      } catch (e) {
        console.error(e)
        toast.error(t('common.error', 'Erreur'))
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId])

  const category = getCategoryById(meta.category)

  // ----- Window operations -----
  const addWindow = () => {
    setWindows((prev) => [...prev, emptyWindow('')])
    setActiveWindow(windows.length)
  }
  const removeWindow = (index) => {
    if (windows.length <= 1) return
    setWindows((prev) => prev.filter((_, i) => i !== index))
    setActiveWindow((a) => Math.max(0, a >= index ? a - 1 : a))
  }
  const updateWindowTitle = (index, title) => {
    setWindows((prev) => prev.map((w, i) => (i === index ? { ...w, title } : w)))
  }
  const moveWindow = (index, dir) => {
    const target = index + dir
    if (target < 0 || target >= windows.length) return
    setWindows((prev) => {
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
    setActiveWindow(target)
  }

  // ----- Block operations -----
  const addBlock = (type) => {
    setWindows((prev) =>
      prev.map((w, i) =>
        i === activeWindow
          ? { ...w, blocks: [...w.blocks, type === 'text' ? { type: 'text', content: '' } : { type: 'image', url: '', caption: '' }] }
          : w
      )
    )
  }
  const updateBlock = (blockIndex, patch) => {
    setWindows((prev) =>
      prev.map((w, i) =>
        i === activeWindow
          ? { ...w, blocks: w.blocks.map((b, bi) => (bi === blockIndex ? { ...b, ...patch } : b)) }
          : w
      )
    )
  }
  const removeBlock = (blockIndex) => {
    setWindows((prev) =>
      prev.map((w, i) =>
        i === activeWindow ? { ...w, blocks: w.blocks.filter((_, bi) => bi !== blockIndex) } : w
      )
    )
  }
  const moveBlock = (blockIndex, dir) => {
    const target = blockIndex + dir
    setWindows((prev) =>
      prev.map((w, i) => {
        if (i !== activeWindow) return w
        if (target < 0 || target >= w.blocks.length) return w
        const blocks = [...w.blocks]
        ;[blocks[blockIndex], blocks[target]] = [blocks[target], blocks[blockIndex]]
        return { ...w, blocks }
      })
    )
  }

  const validate = () => {
    if (!meta.businessName.trim()) return t('services.errors.businessName', "Indiquez le nom de l'entreprise.")
    if (!meta.title.trim()) return t('services.errors.title', 'Indiquez un titre pour votre service.')
    if (!meta.serviceType) return t('services.errors.type', 'Choisissez un type de service.')
    if (contact.showEmail && !contact.email.trim()) return t('services.errors.email', 'Renseignez un e-mail de contact.')
    return null
  }

  const handleSave = async () => {
    const err = validate()
    if (err) {
      toast.error(err)
      return
    }
    setSaving(true)
    try {
      // Auto-fill cover from first image block if not set
      const firstImage = windows.flatMap((w) => w.blocks).find((b) => b.type === 'image' && b.url)?.url
      const payload = {
        userId: user.uid,
        businessName: meta.businessName.trim(),
        ownerPhotoURL: meta.ownerPhotoURL || '',
        category: meta.category,
        serviceType: meta.serviceType,
        title: meta.title.trim(),
        tagline: meta.tagline.trim(),
        coverImage: meta.coverImage || firstImage || '',
        priceLabel: meta.priceLabel.trim(),
        priceComment: meta.priceComment.trim(),
        contact: {
          email: contact.email.trim(),
          showEmail: contact.showEmail,
          phone: contact.phone.trim(),
          showPhone: contact.showPhone,
        },
        windows: windows.map((w, i) => ({
          title: w.title?.trim() || `${t('services.window', 'Onglet')} ${i + 1}`,
          blocks: w.blocks,
        })),
      }

      if (isEdit) {
        await updateService(serviceId, payload)
        toast.success(t('services.updated', 'Service mis à jour !'))
      } else {
        await createService(payload)
        toast.success(t('services.submitted', 'Service envoyé ! Il sera publié après validation.'))
      }
      navigate(getLocalizedPath('/dashboard'))
    } catch (e) {
      console.error('Save service error:', e)
      toast.error(e.message || t('common.error', 'Erreur'))
    } finally {
      setSaving(false)
    }
  }

  // ----- Access gate -----
  if (checkingAccess) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner />
      </div>
    )
  }

  if (!accessApproved) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white mx-auto mb-5">
            <FiShield className="text-3xl" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {t('services.verifyFirst', "Vérifiez votre identité d'abord")}
          </h1>
          <p className="text-gray-600 mb-6">
            {t('services.verifyFirstDesc', "Pour publier un service, vous devez d'abord faire vérifier votre identité. C'est une étape unique et sécurisée.")}
          </p>
          <button
            onClick={() => navigate(getLocalizedPath('/service/verify'))}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl shadow hover:shadow-lg"
          >
            {t('services.startVerification', 'Commencer la vérification')} <FiArrowRight />
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner />
      </div>
    )
  }

  const win = windows[activeWindow]

  return (
    <div className="max-w-5xl mx-auto animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            {isEdit ? t('services.editTitle', 'Modifier le service') : t('services.createService', 'Créer un service')}
          </h1>
          <p className="text-white/70 text-sm">
            {t('services.createSubtitle', 'Présentez votre activité de façon claire et attrayante.')}
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-violet-600 font-semibold rounded-xl shadow hover:shadow-lg disabled:opacity-60"
        >
          <FiSave /> {saving ? t('common.loading', 'Enregistrement...') : t('common.save', 'Enregistrer')}
        </button>
      </div>

      {/* Meta card */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 space-y-5">
        <div className="flex items-start gap-2 rounded-xl bg-violet-50 border border-violet-100 px-4 py-3 text-sm text-violet-800">
          <FiGlobe className="mt-0.5 shrink-0 text-violet-500" />
          <span>{t('services.autoTranslateHint', 'Vos textes seront automatiquement traduits dans les autres langues (anglais, allemand, néerlandais) lors de la publication.')}</span>
        </div>
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          <FiTag className="text-violet-500" /> {t('services.generalInfo', 'Informations générales')}
        </h2>

        {/* Profile photo */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            {t('services.profilePhoto', 'Photo de profil')}
          </label>
          <p className="text-xs text-gray-500 mb-2">
            {t('services.profilePhotoHint', "Si vous n'ajoutez pas de photo, les initiales de votre nom seront affichées.")}
          </p>
          <div className="flex items-center gap-4">
            <ServiceAvatar name={meta.businessName} photoURL={meta.ownerPhotoURL} size={64} />
            <div className="flex-1">
              <ImageUpload
                value={meta.ownerPhotoURL}
                onChange={(url) => setMeta({ ...meta, ownerPhotoURL: url })}
                folder="services"
                storagePath="services"
                maxSizeMB={1}
              />
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {t('services.businessName', "Nom de l'entreprise")} *
            </label>
            <input
              type="text"
              value={meta.businessName}
              onChange={(e) => setMeta({ ...meta, businessName: e.target.value })}
              placeholder="Ex: Hugographie"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-violet-400 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {t('services.serviceTitle', 'Titre du service')} *
            </label>
            <input
              type="text"
              value={meta.title}
              onChange={(e) => setMeta({ ...meta, title: e.target.value })}
              placeholder={t('services.titlePlaceholder', 'Ex: Photographe & Vidéaste professionnel')}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-violet-400 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            {t('services.tagline', 'Phrase d’accroche')}
          </label>
          <input
            type="text"
            value={meta.tagline}
            onChange={(e) => setMeta({ ...meta, tagline: e.target.value })}
            placeholder={t('services.taglinePlaceholder', 'Une courte phrase qui résume votre offre')}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-violet-400 outline-none"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {t('services.category', 'Catégorie')} *
            </label>
            <select
              value={meta.category}
              onChange={(e) => {
                const cat = getCategoryById(e.target.value)
                setMeta({ ...meta, category: e.target.value, serviceType: cat?.types[0] || '' })
              }}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-violet-400 outline-none bg-white"
            >
              {SERVICE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {categoryLabel(t, c.id)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {t('services.serviceType', 'Type de service')} *
            </label>
            <select
              value={meta.serviceType}
              onChange={(e) => setMeta({ ...meta, serviceType: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-violet-400 outline-none bg-white"
            >
              {(category?.types || []).map((ty) => (
                <option key={ty} value={ty}>
                  {typeLabel(t, ty)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Cover image */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            {t('services.coverImage', 'Image de couverture')}
          </label>
          <ImageUpload
            value={meta.coverImage}
            onChange={(url) => setMeta({ ...meta, coverImage: url })}
            folder="services"
            storagePath="services"
            maxSizeMB={1}
          />
        </div>

        {/* Price */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1">
              <FiDollarSign className="text-emerald-500" /> {t('services.price', 'Prix (optionnel)')}
            </label>
            <input
              type="text"
              value={meta.priceLabel}
              onChange={(e) => setMeta({ ...meta, priceLabel: e.target.value })}
              placeholder={t('services.pricePlaceholder', 'Ex: À partir de 350 € / Sur devis')}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-violet-400 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {t('services.priceComment', 'Commentaire sur le prix')}
            </label>
            <input
              type="text"
              value={meta.priceComment}
              onChange={(e) => setMeta({ ...meta, priceComment: e.target.value })}
              placeholder={t('services.priceCommentPlaceholder', 'Ex: pour une prestation de 2h')}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-violet-400 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Contact card */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 space-y-4">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          <FiMail className="text-violet-500" /> {t('services.contactInfo', 'Coordonnées de contact')}
        </h2>
        <p className="text-sm text-gray-500">
          {t('services.contactInfoDesc', 'Choisissez les coordonnées visibles par les visiteurs. Un formulaire de contact est toujours affiché.')}
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1">
              <FiMail /> {t('services.email', 'E-mail')}
            </label>
            <input
              type="email"
              value={contact.email}
              onChange={(e) => setContact({ ...contact, email: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-violet-400 outline-none"
            />
            <label className="flex items-center gap-2 text-sm text-gray-600 mt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={contact.showEmail}
                onChange={(e) => setContact({ ...contact, showEmail: e.target.checked })}
                className="accent-violet-600"
              />
              {t('services.showEmail', 'Afficher mon e-mail publiquement')}
            </label>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1">
              <FiPhone /> {t('services.phone', 'Téléphone')}
            </label>
            <input
              type="tel"
              value={contact.phone}
              onChange={(e) => setContact({ ...contact, phone: e.target.value })}
              placeholder="+33 6 12 34 56 78"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-violet-400 outline-none"
            />
            <label className="flex items-center gap-2 text-sm text-gray-600 mt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={contact.showPhone}
                onChange={(e) => setContact({ ...contact, showPhone: e.target.checked })}
                className="accent-violet-600"
              />
              {t('services.showPhone', 'Afficher mon numéro publiquement')}
            </label>
          </div>
        </div>
      </div>

      {/* Windows editor */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <FiLayers className="text-violet-500" /> {t('services.windows', 'Fenêtres / Onglets')}
          </h2>
          <button
            onClick={addWindow}
            className="inline-flex items-center gap-1 px-3 py-2 bg-violet-100 text-violet-700 rounded-lg text-sm font-semibold hover:bg-violet-200"
          >
            <FiPlus /> {t('services.addWindow', 'Ajouter un onglet')}
          </button>
        </div>

        {/* Window tabs */}
        <div className="flex gap-2 overflow-x-auto border-b border-gray-200 mb-5 pb-px">
          {windows.map((w, i) => (
            <button
              key={i}
              onClick={() => setActiveWindow(i)}
              className={`whitespace-nowrap px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition-all ${
                activeWindow === i
                  ? 'border-violet-600 text-violet-600 bg-violet-50'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {w.title?.trim() || `${t('services.window', 'Onglet')} ${i + 1}`}
            </button>
          ))}
        </div>

        {/* Active window editor */}
        {win && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={win.title}
                onChange={(e) => updateWindowTitle(activeWindow, e.target.value)}
                placeholder={t('services.windowTitle', "Titre de l'onglet (ex: Mariage)")}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-violet-400 outline-none font-semibold"
              />
              <button onClick={() => moveWindow(activeWindow, -1)} disabled={activeWindow === 0}
                className="p-2.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40" title={t('common.previous', 'Précédent')}>
                <FiChevronLeft />
              </button>
              <button onClick={() => moveWindow(activeWindow, 1)} disabled={activeWindow === windows.length - 1}
                className="p-2.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40" title={t('common.next', 'Suivant')}>
                <FiChevronRight />
              </button>
              <button onClick={() => removeWindow(activeWindow)} disabled={windows.length <= 1}
                className="p-2.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 disabled:opacity-40" title={t('common.delete', 'Supprimer')}>
                <FiTrash2 />
              </button>
            </div>

            {/* Blocks */}
            <div className="space-y-4">
              {win.blocks.map((block, bi) => (
                <div key={bi} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 flex items-center gap-1">
                      {block.type === 'image' ? <FiImage /> : <FiType />}
                      {block.type === 'image' ? t('services.imageBlock', 'Image') : t('services.textBlock', 'Texte')}
                    </span>
                    <div className="flex gap-1">
                      <button onClick={() => moveBlock(bi, -1)} disabled={bi === 0}
                        className="p-1.5 rounded text-gray-400 hover:bg-gray-200 disabled:opacity-30">
                        <FiChevronLeft />
                      </button>
                      <button onClick={() => moveBlock(bi, 1)} disabled={bi === win.blocks.length - 1}
                        className="p-1.5 rounded text-gray-400 hover:bg-gray-200 disabled:opacity-30">
                        <FiChevronRight />
                      </button>
                      <button onClick={() => removeBlock(bi)} className="p-1.5 rounded text-red-500 hover:bg-red-100">
                        <FiX />
                      </button>
                    </div>
                  </div>

                  {block.type === 'text' ? (
                    <textarea
                      rows={4}
                      value={block.content}
                      onChange={(e) => updateBlock(bi, { content: e.target.value })}
                      placeholder={t('services.textPlaceholder', 'Écrivez votre paragraphe...')}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-violet-400 outline-none resize-y bg-white"
                    />
                  ) : (
                    <div className="space-y-2">
                      <ImageUpload
                        value={block.url}
                        onChange={(url) => updateBlock(bi, { url })}
                        folder="services"
                        storagePath="services"
                        maxSizeMB={1}
                      />
                      <input
                        type="text"
                        value={block.caption || ''}
                        onChange={(e) => updateBlock(bi, { caption: e.target.value })}
                        placeholder={t('services.captionPlaceholder', "Légende de l'image (optionnel)")}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-violet-400 outline-none text-sm bg-white"
                      />
                    </div>
                  )}
                </div>
              ))}

              {win.blocks.length === 0 && (
                <p className="text-center text-gray-400 py-6">
                  {t('services.noBlocks', 'Ajoutez du texte ou des images à cet onglet.')}
                </p>
              )}
            </div>

            {/* Add block buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => addBlock('text')}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-violet-400 hover:bg-violet-50 transition-all"
              >
                <FiType /> {t('services.addText', 'Ajouter un texte')}
              </button>
              <button
                onClick={() => addBlock('image')}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-violet-400 hover:bg-violet-50 transition-all"
              >
                <FiImage /> {t('services.addImage', 'Ajouter une image')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom save */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-violet-600 font-semibold rounded-xl shadow hover:shadow-lg disabled:opacity-60"
        >
          <FiSave /> {saving ? t('common.loading', 'Enregistrement...') : t('common.save', 'Enregistrer')}
        </button>
      </div>
    </div>
  )
}
