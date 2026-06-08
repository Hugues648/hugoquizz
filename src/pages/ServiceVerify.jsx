import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  FiShield, FiUpload, FiFileText, FiCheckCircle, FiClock, FiAlertTriangle, FiArrowRight, FiX
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { uploadFile } from '../services/storage'
import { createServiceVerification, getLatestVerificationByUser } from '../services/firestore'
import { ID_DOCUMENT_TYPES, ID_DOCUMENT_FALLBACK } from '../config/serviceCategories'
import { useLocalizedPath } from '../components/LocalizedLink'
import SelfieRecorder from '../components/services/SelfieRecorder'
import LoadingSpinner from '../components/LoadingSpinner'

export default function ServiceVerify() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const getLocalizedPath = useLocalizedPath()
  const { user, userData } = useAuth()

  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('none') // none | pending | approved | rejected
  const [adminMessage, setAdminMessage] = useState('')

  const [idType, setIdType] = useState('carte-identite')
  const [idFile, setIdFile] = useState(null)
  const [selfieFile, setSelfieFile] = useState(null)
  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!user) return
    ;(async () => {
      try {
        const latest = await getLatestVerificationByUser(user.uid)
        const s = userData?.serviceProviderStatus || latest?.status || 'none'
        setStatus(s)
        if (latest?.status === 'rejected') setAdminMessage(latest.adminMessage || '')
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    })()
  }, [user, userData])

  const handleIdFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const isImage = file.type.startsWith('image/')
    const isPdf = file.type === 'application/pdf'
    if (!isImage && !isPdf) {
      toast.error(t('services.verify.invalidIdFile', 'Veuillez fournir une image ou un PDF.'))
      return
    }
    if (file.size > 30 * 1024 * 1024) {
      toast.error(t('services.verify.fileTooLarge', 'Fichier trop volumineux (max 30 Mo).'))
      return
    }
    setIdFile(file)
  }

  const handleSubmit = async () => {
    if (!idFile) {
      toast.error(t('services.verify.needId', "Veuillez fournir votre pièce d'identité."))
      return
    }
    if (!selfieFile) {
      toast.error(t('services.verify.needSelfie', 'Veuillez enregistrer votre vidéo selfie.'))
      return
    }
    if (!consent) {
      toast.error(t('services.verify.needConsent', 'Vous devez accepter les conditions.'))
      return
    }
    setSubmitting(true)
    try {
      const basePath = `verifications/${user.uid}`
      const [idDocUrl, selfieVideoUrl] = await Promise.all([
        uploadFile(idFile, basePath),
        uploadFile(selfieFile, basePath),
      ])
      await createServiceVerification({
        userId: user.uid,
        userEmail: user.email,
        userName: userData?.displayName || user.email,
        idType,
        idDocUrl,
        idDocIsPdf: idFile.type === 'application/pdf',
        selfieVideoUrl,
      })
      setStatus('pending')
      toast.success(t('services.verify.submitted', 'Votre demande a été envoyée à notre équipe.'))
    } catch (e) {
      console.error('Verification submit error:', e)
      toast.error(e.message || t('common.error', 'Erreur'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white">
            <FiShield className="text-2xl" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t('services.verify.title', "Vérification d'identité")}
            </h1>
            <p className="text-gray-500 text-sm">
              {t('services.verify.subtitle', 'Une étape unique pour devenir prestataire de confiance.')}
            </p>
          </div>
        </div>

        {status === 'approved' && (
          <div className="text-center py-8">
            <FiCheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {t('services.verify.approvedTitle', 'Identité vérifiée ✅')}
            </h2>
            <p className="text-gray-600 mb-6">
              {t('services.verify.approvedDesc', 'Vous pouvez maintenant créer et publier vos services.')}
            </p>
            <button
              onClick={() => navigate(getLocalizedPath('/service/create'))}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold rounded-xl shadow hover:shadow-lg"
            >
              {t('services.createService', 'Créer un service')} <FiArrowRight />
            </button>
          </div>
        )}

        {status === 'pending' && (
          <div className="text-center py-8">
            <FiClock className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {t('services.verify.pendingTitle', 'Vérification en cours')}
            </h2>
            <p className="text-gray-600">
              {t('services.verify.pendingDesc', 'Notre équipe examine votre demande. Vous serez notifié par e-mail et dans vos notifications dès qu’elle sera traitée.')}
            </p>
          </div>
        )}

        {(status === 'none' || status === 'rejected') && (
          <div className="space-y-6">
            {status === 'rejected' && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
                <FiAlertTriangle className="text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-red-700">
                    {t('services.verify.rejectedTitle', 'Demande précédente rejetée')}
                  </p>
                  {adminMessage && <p className="text-sm text-red-600 mt-1">{adminMessage}</p>}
                  <p className="text-sm text-red-600 mt-1">
                    {t('services.verify.resubmit', 'Vous pouvez soumettre de nouveaux documents ci-dessous.')}
                  </p>
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
              {t('services.verify.explain', "Pour garantir la sécurité de la plateforme, nous vérifions l'identité de chaque prestataire. Fournissez une pièce d'identité valide et enregistrez une courte vidéo de vous afin que notre équipe puisse confirmer que l'identité vous correspond. Ces documents sont confidentiels et utilisés uniquement à des fins de vérification.")}
            </div>

            {/* ID type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('services.verify.idType', "Type de pièce d'identité")}
              </label>
              <select
                value={idType}
                onChange={(e) => setIdType(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-violet-400 outline-none bg-white"
              >
                {ID_DOCUMENT_TYPES.map((d) => (
                  <option key={d} value={d}>
                    {t(`services.idDocuments.${d}`, ID_DOCUMENT_FALLBACK[d])}
                  </option>
                ))}
              </select>
            </div>

            {/* ID document upload / scan */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('services.verify.idDocument', "Pièce d'identité (image ou PDF)")}
              </label>
              {idFile ? (
                <div className="flex items-center justify-between gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span className="flex items-center gap-2 text-emerald-700 text-sm truncate">
                    <FiFileText /> {idFile.name}
                  </span>
                  <button onClick={() => setIdFile(null)} className="text-gray-400 hover:text-red-500">
                    <FiX />
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col items-center gap-2 px-4 py-6 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-violet-400 hover:bg-violet-50 transition-all">
                    <FiUpload className="text-gray-400 text-xl" />
                    <span className="text-sm text-gray-600 text-center">
                      {t('services.verify.uploadFile', 'Télécharger (image / PDF)')}
                    </span>
                    <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleIdFile} />
                  </label>
                  <label className="flex flex-col items-center gap-2 px-4 py-6 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-violet-400 hover:bg-violet-50 transition-all">
                    <FiFileText className="text-gray-400 text-xl" />
                    <span className="text-sm text-gray-600 text-center">
                      {t('services.verify.scanFile', 'Scanner avec la caméra')}
                    </span>
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleIdFile} />
                  </label>
                </div>
              )}
            </div>

            {/* Selfie video */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('services.verify.selfieVideo', 'Vidéo selfie en direct')}
              </label>
              <p className="text-xs text-gray-500 mb-3">
                {t('services.verify.selfieHint', 'Filmez-vous de face quelques secondes. Cette vidéo permet de comparer votre visage avec votre pièce d’identité.')}
              </p>
              <SelfieRecorder onRecorded={setSelfieFile} />
            </div>

            {/* Consent */}
            <label className="flex items-start gap-3 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1 accent-violet-600"
              />
              <span>
                {t('services.verify.consent', "J'accepte que ma pièce d'identité et ma vidéo soient traitées par HugoQuiz à des fins de vérification d'identité, conformément aux conditions d'utilisation et à la politique de confidentialité.")}
              </span>
            </label>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl shadow hover:shadow-lg transition-all disabled:opacity-60"
            >
              <FiShield /> {submitting ? t('common.loading', 'Envoi...') : t('services.verify.submit', 'Soumettre ma demande de vérification')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
