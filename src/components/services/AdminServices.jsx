import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  FiCheck, FiX, FiSlash, FiTrash2, FiEye, FiFileText, FiVideo, FiUser, FiShield,
  FiBriefcase, FiRefreshCw, FiExternalLink, FiPlusCircle, FiStar
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import {
  getPendingVerifications, updateVerificationStatus,
  getAllServices, updateServiceStatus, deleteService, createService,
  getPendingReviews, updateServiceReviewStatus
} from '../../services/firestore'
import { categoryLabel, typeLabel, ID_DOCUMENT_FALLBACK } from '../../config/serviceCategories'
import { DEMO_SERVICES } from '../../config/demoServices'
import LocalizedLink from '../LocalizedLink'
import ServiceAvatar from './ServiceAvatar'
import LoadingSpinner from '../LoadingSpinner'

// Modal to capture an admin message when rejecting / restricting.
function MessageModal({ open, title, onClose, onConfirm, confirmLabel, confirmColor }) {
  const { t } = useTranslation()
  const [message, setMessage] = useState('')
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-3">{title}</h3>
        <textarea
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t('admin.services.messagePlaceholder', "Message expliquant la raison (envoyé à l'utilisateur)")}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-violet-400 outline-none resize-none"
        />
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100">
            {t('common.cancel', 'Annuler')}
          </button>
          <button
            onClick={() => onConfirm(message)}
            className={`px-4 py-2 rounded-lg text-white font-semibold ${confirmColor || 'bg-violet-600 hover:bg-violet-700'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminServices() {
  const { t } = useTranslation()
  const { user, userData } = useAuth()
  const [tab, setTab] = useState('verifications')
  const [verifications, setVerifications] = useState([])
  const [services, setServices] = useState([])
  const [pendingReviews, setPendingReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [seeding, setSeeding] = useState(false)
  const [modal, setModal] = useState(null) // { kind, item, action }

  const load = async () => {
    setLoading(true)
    try {
      const [v, s, r] = await Promise.all([getPendingVerifications(), getAllServices(), getPendingReviews()])
      setVerifications(v)
      setServices(s)
      setPendingReviews(r)
    } catch (e) {
      console.error(e)
      toast.error(t('common.error', 'Erreur'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ----- Verification actions -----
  const approveVerification = async (v) => {
    try {
      await updateVerificationStatus(v.id, v.userId, 'approved', '')
      setVerifications((prev) => prev.filter((x) => x.id !== v.id))
      toast.success(t('admin.services.verifApproved', 'Identité validée'))
    } catch (e) {
      console.error(e)
      toast.error(t('common.error', 'Erreur'))
    }
  }
  const rejectVerification = async (v, message) => {
    try {
      await updateVerificationStatus(v.id, v.userId, 'rejected', message)
      setVerifications((prev) => prev.filter((x) => x.id !== v.id))
      setModal(null)
      toast.success(t('admin.services.verifRejected', 'Demande rejetée'))
    } catch (e) {
      console.error(e)
      toast.error(t('common.error', 'Erreur'))
    }
  }

  // ----- Service moderation actions -----
  const setService = (id, patch) =>
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))

  const approveService = async (s) => {
    try {
      await updateServiceStatus(s.id, 'approved', '')
      setService(s.id, { status: 'approved', isPublic: true })
      toast.success(t('admin.services.serviceApproved', 'Service publié'))
    } catch (e) {
      console.error(e)
      toast.error(t('common.error', 'Erreur'))
    }
  }
  const moderateService = async (s, status, message) => {
    try {
      await updateServiceStatus(s.id, status, message)
      setService(s.id, { status, isPublic: status === 'approved' })
      setModal(null)
      toast.success(t('admin.services.serviceUpdated', 'Service mis à jour'))
    } catch (e) {
      console.error(e)
      toast.error(t('common.error', 'Erreur'))
    }
  }
  const removeService = async (s, message) => {
    try {
      // Notify the owner of deletion via a "restricted+delete" status first so the
      // Cloud Function emails them, then delete the document.
      await updateServiceStatus(s.id, 'deleted', message)
      await deleteService(s.id)
      setServices((prev) => prev.filter((x) => x.id !== s.id))
      setModal(null)
      toast.success(t('admin.services.serviceDeleted', 'Service supprimé'))
    } catch (e) {
      console.error(e)
      toast.error(t('common.error', 'Erreur'))
    }
  }

  // ----- Review moderation actions -----
  const moderateReview = async (r, status) => {
    try {
      await updateServiceReviewStatus(r.id, status)
      setPendingReviews((prev) => prev.filter((x) => x.id !== r.id))
      toast.success(
        status === 'approved'
          ? t('admin.services.reviewApproved', 'Avis publié')
          : t('admin.services.reviewRejected', 'Avis rejeté')
      )
    } catch (e) {
      console.error(e)
      toast.error(t('common.error', 'Erreur'))
    }
  }

  // Create the two demo services (Hugographie & Hugo) attached to the admin account.
  const seedDemoServices = async () => {
    if (!user) return
    if (!window.confirm(t('admin.services.seedConfirm', 'Créer les services de démonstration Hugographie et Hugo sur votre compte admin ?'))) return
    setSeeding(true)
    try {
      for (const d of DEMO_SERVICES) {
        const id = await createService({
          userId: user.uid,
          businessName: d.businessName,
          ownerPhotoURL: userData?.photoURL || '',
          category: d.category,
          serviceType: d.serviceType,
          title: d.title,
          tagline: d.tagline,
          coverImage: d.coverImage,
          priceLabel: d.priceLabel,
          priceComment: d.priceComment,
          contact: {
            email: d.contact.email,
            showEmail: d.contact.showEmail,
            phone: d.contact.phone || '',
            showPhone: d.contact.showPhone,
          },
          windows: d.windows,
        })
        // Publish immediately
        await updateServiceStatus(id, 'approved', '')
      }
      toast.success(t('admin.services.seedDone', 'Services de démonstration créés et publiés !'))
      load()
    } catch (e) {
      console.error('Seed error:', e)
      toast.error(e.message || t('common.error', 'Erreur'))
    } finally {
      setSeeding(false)
    }
  }

  const statusBadge = (status) => {
    const map = {
      pending: 'bg-amber-100 text-amber-700',
      approved: 'bg-emerald-100 text-emerald-700',
      rejected: 'bg-red-100 text-red-700',
      restricted: 'bg-gray-200 text-gray-700',
    }
    const label = {
      pending: t('admin.services.statusPending', 'En attente'),
      approved: t('admin.services.statusApproved', 'Publié'),
      rejected: t('admin.services.statusRejected', 'Rejeté'),
      restricted: t('admin.services.statusRestricted', 'Restreint'),
    }
    return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[status] || 'bg-gray-100 text-gray-600'}`}>{label[status] || status}</span>
  }

  const filteredServices = services.filter((s) => statusFilter === 'all' || s.status === statusFilter)
  const pendingServicesCount = services.filter((s) => s.status === 'pending').length

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Sub tabs */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2">
          <button
            onClick={() => setTab('verifications')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 ${tab === 'verifications' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            <FiShield /> {t('admin.services.verifications', 'Vérifications')}
            {verifications.length > 0 && (
              <span className="bg-white/30 px-1.5 rounded-full text-xs">{verifications.length}</span>
            )}
          </button>
          <button
            onClick={() => setTab('services')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 ${tab === 'services' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            <FiBriefcase /> {t('admin.services.servicesList', 'Services')}
            {pendingServicesCount > 0 && (
              <span className="bg-amber-400 text-amber-900 px-1.5 rounded-full text-xs">{pendingServicesCount}</span>
            )}
          </button>
          <button
            onClick={() => setTab('reviews')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 ${tab === 'reviews' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            <FiStar /> {t('admin.services.reviews', 'Avis')}
            {pendingReviews.length > 0 && (
              <span className="bg-amber-400 text-amber-900 px-1.5 rounded-full text-xs">{pendingReviews.length}</span>
            )}
          </button>
        </div>
        <button onClick={load} className="px-3 py-2 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center gap-2 text-sm">
          <FiRefreshCw /> {t('common.refresh', 'Actualiser')}
        </button>
      </div>

      {/* Seed demo services */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-sm text-amber-800">
          {t('admin.services.seedHint', 'Créez deux services de démonstration (Hugographie — photographe/vidéaste, et Hugo — event-planner) rattachés à votre compte admin.')}
        </div>
        <button
          onClick={seedDemoServices}
          disabled={seeding}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 disabled:opacity-60"
        >
          <FiPlusCircle /> {seeding ? t('common.loading', 'Création...') : t('admin.services.seedButton', 'Créer les services de démo')}
        </button>
      </div>

      {/* Verifications */}
      {tab === 'verifications' && (
        <div className="space-y-4">
          {verifications.length === 0 ? (
            <p className="text-center text-gray-400 py-10">{t('admin.services.noVerifications', 'Aucune demande de vérification en attente.')}</p>
          ) : (
            verifications.map((v) => (
              <div key={v.id} className="border border-gray-200 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
                    <FiUser />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{v.userName}</p>
                    <p className="text-sm text-gray-500">{v.userEmail}</p>
                  </div>
                  <span className="ml-auto text-xs text-gray-500">
                    {t(`services.idDocuments.${v.idType}`, ID_DOCUMENT_FALLBACK[v.idType] || v.idType)}
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                      <FiFileText /> {t('admin.services.idDocument', "Pièce d'identité")}
                    </p>
                    {v.idDocIsPdf ? (
                      <a href={v.idDocUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-3 bg-gray-100 rounded-xl text-gray-700 hover:bg-gray-200 text-sm">
                        <FiFileText /> {t('admin.services.openPdf', 'Ouvrir le PDF')} <FiExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <a href={v.idDocUrl} target="_blank" rel="noopener noreferrer">
                        <img src={v.idDocUrl} alt="ID" className="rounded-xl border border-gray-200 max-h-48 object-contain" />
                      </a>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                      <FiVideo /> {t('admin.services.selfieVideo', 'Vidéo selfie')}
                    </p>
                    <video src={v.selfieVideoUrl} controls className="rounded-xl border border-gray-200 max-h-48 w-full bg-black" />
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setModal({ kind: 'rejectVerif', item: v })}
                    className="px-4 py-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 font-semibold flex items-center gap-2"
                  >
                    <FiX /> {t('admin.services.reject', 'Rejeter')}
                  </button>
                  <button
                    onClick={() => approveVerification(v)}
                    className="px-4 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 font-semibold flex items-center gap-2"
                  >
                    <FiCheck /> {t('admin.services.approve', 'Valider')}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Services */}
      {tab === 'services' && (
        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto">
            {['all', 'pending', 'approved', 'restricted', 'rejected'].map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium ${statusFilter === f ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600'}`}
              >
                {t(`admin.services.filter.${f}`, f)}
              </button>
            ))}
          </div>

          {filteredServices.length === 0 ? (
            <p className="text-center text-gray-400 py-10">{t('admin.services.noServices', 'Aucun service.')}</p>
          ) : (
            filteredServices.map((s) => (
              <div key={s.id} className="border border-gray-200 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <ServiceAvatar name={s.businessName} photoURL={s.ownerPhotoURL} size={44} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-gray-900 truncate">{s.businessName}</p>
                      {statusBadge(s.status)}
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {categoryLabel(t, s.category)} · {typeLabel(t, s.serviceType)} · 👁 {s.views || 0}
                    </p>
                  </div>
                  <LocalizedLink
                    to={`/service/${s.id}`}
                    className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm flex items-center gap-1 shrink-0"
                  >
                    <FiEye /> {t('admin.services.preview', 'Voir')}
                  </LocalizedLink>
                </div>

                <div className="flex flex-wrap gap-2 justify-end mt-3 pt-3 border-t border-gray-100">
                  {s.status !== 'approved' && (
                    <button onClick={() => approveService(s)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 text-sm font-semibold flex items-center gap-1">
                      <FiCheck /> {t('admin.services.publish', 'Publier')}
                    </button>
                  )}
                  {s.status === 'approved' && (
                    <button onClick={() => setModal({ kind: 'restrict', item: s })}
                      className="px-3 py-1.5 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 text-sm font-semibold flex items-center gap-1">
                      <FiSlash /> {t('admin.services.restrict', 'Restreindre')}
                    </button>
                  )}
                  {s.status === 'pending' && (
                    <button onClick={() => setModal({ kind: 'rejectService', item: s })}
                      className="px-3 py-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 text-sm font-semibold flex items-center gap-1">
                      <FiX /> {t('admin.services.reject', 'Rejeter')}
                    </button>
                  )}
                  <button onClick={() => setModal({ kind: 'deleteService', item: s })}
                    className="px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm font-semibold flex items-center gap-1">
                    <FiTrash2 /> {t('common.delete', 'Supprimer')}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Reviews moderation */}
      {tab === 'reviews' && (
        <div className="space-y-4">
          {pendingReviews.length === 0 ? (
            <p className="text-center text-gray-400 py-10">{t('admin.services.noReviews', 'Aucun avis en attente de validation.')}</p>
          ) : (
            pendingReviews.map((r) => (
              <div key={r.id} className="border border-gray-200 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center font-bold">
                    {(r.authorName || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate">{r.authorName || t('services.reviews.anonymous', 'Anonyme')}</p>
                    <p className="text-sm text-gray-500 truncate">{r.businessName || ''}</p>
                  </div>
                  <span className="ml-auto inline-flex items-center gap-1 font-semibold">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <FiStar key={i} className={`w-4 h-4 ${i <= (r.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
                    ))}
                    <span className="text-gray-700 ml-1">{r.rating}/5</span>
                  </span>
                </div>
                {r.comment && (
                  <p className="text-gray-700 whitespace-pre-line bg-gray-50 rounded-xl p-3 mb-3">{r.comment}</p>
                )}
                <div className="flex gap-2 justify-end">
                  <LocalizedLink
                    to={`/service/${r.serviceId}`}
                    className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm flex items-center gap-1"
                  >
                    <FiEye /> {t('admin.services.preview', 'Voir')}
                  </LocalizedLink>
                  <button onClick={() => moderateReview(r, 'rejected')}
                    className="px-3 py-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 text-sm font-semibold flex items-center gap-1">
                    <FiX /> {t('admin.services.reject', 'Rejeter')}
                  </button>
                  <button onClick={() => moderateReview(r, 'approved')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 text-sm font-semibold flex items-center gap-1">
                    <FiCheck /> {t('admin.services.approve', 'Valider')}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modals */}
      <MessageModal
        open={modal?.kind === 'rejectVerif'}
        title={t('admin.services.rejectVerifTitle', "Rejeter la demande de vérification")}
        confirmLabel={t('admin.services.reject', 'Rejeter')}
        confirmColor="bg-red-600 hover:bg-red-700"
        onClose={() => setModal(null)}
        onConfirm={(msg) => rejectVerification(modal.item, msg)}
      />
      <MessageModal
        open={modal?.kind === 'rejectService'}
        title={t('admin.services.rejectServiceTitle', 'Rejeter ce service')}
        confirmLabel={t('admin.services.reject', 'Rejeter')}
        confirmColor="bg-red-600 hover:bg-red-700"
        onClose={() => setModal(null)}
        onConfirm={(msg) => moderateService(modal.item, 'rejected', msg)}
      />
      <MessageModal
        open={modal?.kind === 'restrict'}
        title={t('admin.services.restrictTitle', "Restreindre l'affichage de ce service")}
        confirmLabel={t('admin.services.restrict', 'Restreindre')}
        confirmColor="bg-gray-700 hover:bg-gray-800"
        onClose={() => setModal(null)}
        onConfirm={(msg) => moderateService(modal.item, 'restricted', msg)}
      />
      <MessageModal
        open={modal?.kind === 'deleteService'}
        title={t('admin.services.deleteTitle', 'Supprimer définitivement ce service')}
        confirmLabel={t('common.delete', 'Supprimer')}
        confirmColor="bg-red-600 hover:bg-red-700"
        onClose={() => setModal(null)}
        onConfirm={(msg) => removeService(modal.item, msg)}
      />
    </div>
  )
}
