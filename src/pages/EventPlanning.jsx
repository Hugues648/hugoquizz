import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { 
  getEventById,
  getEventProgramsByEvent,
  getEventMenusByEvent,
  getPlanningShareLinksByEvent,
  deleteEventProgram,
  deleteEventMenu,
  createPlanningShareLink,
  updatePlanningShareLink,
  deletePlanningShareLink
} from '../services/firestore'
import { 
  FiArrowLeft, FiPlus, FiEdit2, FiTrash2, FiCalendar, FiList,
  FiShare2, FiLink, FiDownload, FiCopy, FiCheck, FiEye,
  FiClock, FiMapPin, FiEdit
} from 'react-icons/fi'
import { QRCodeSVG } from 'qrcode.react'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'

export default function EventPlanning() {
  const { id: eventId } = useParams()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState(null)
  const [programs, setPrograms] = useState([])
  const [menus, setMenus] = useState([])
  const [shareLinks, setShareLinks] = useState([])
  const [error, setError] = useState('')
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareSelection, setShareSelection] = useState({ programs: [], menus: [], guestbook: false })
  const [editingLinkId, setEditingLinkId] = useState(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [generatingLink, setGeneratingLink] = useState(false)
  const [activeTab, setActiveTab] = useState('programs')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [pdfGenerating, setPdfGenerating] = useState(null)
  const programPdfRef = useRef(null)
  const menuPdfRef = useRef(null)

  useEffect(() => {
    loadData()
  }, [eventId])

  const loadData = async () => {
    try {
      const eventData = await getEventById(eventId)
      if (!eventData || eventData.userId !== user?.uid) {
        setError(t('events.edit.unauthorized'))
        return
      }
      setEvent(eventData)

      const [programsData, menusData, linksData] = await Promise.all([
        getEventProgramsByEvent(eventId),
        getEventMenusByEvent(eventId),
        getPlanningShareLinksByEvent(eventId)
      ])
      
      setPrograms(programsData)
      setMenus(menusData)
      setShareLinks(linksData)
    } catch (err) {
      console.error('Error loading planning data:', err)
      setError(t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteProgram = async (programId) => {
    try {
      await deleteEventProgram(programId)
      setPrograms(prev => prev.filter(p => p.id !== programId))
      setDeleteConfirm(null)
    } catch (err) {
      console.error('Error deleting program:', err)
    }
  }

  const handleDeleteMenu = async (menuId) => {
    try {
      await deleteEventMenu(menuId)
      setMenus(prev => prev.filter(m => m.id !== menuId))
      setDeleteConfirm(null)
    } catch (err) {
      console.error('Error deleting menu:', err)
    }
  }

  const handleGenerateShareLink = async () => {
    if (shareSelection.programs.length === 0 && shareSelection.menus.length === 0 && !shareSelection.guestbook) {
      return
    }

    setGeneratingLink(true)
    try {
      if (editingLinkId) {
        // Update the existing link: the shareCode / QR / URL stay identical.
        await updatePlanningShareLink(editingLinkId, {
          selectedPrograms: shareSelection.programs,
          selectedMenus: shareSelection.menus,
          includeGuestbook: shareSelection.guestbook
        })

        setShareLinks(prev => prev.map(l =>
          l.id === editingLinkId
            ? {
                ...l,
                selectedPrograms: shareSelection.programs,
                selectedMenus: shareSelection.menus,
                includeGuestbook: shareSelection.guestbook
              }
            : l
        ))

        toast.success(t('planning.linkUpdated', 'QR code mis à jour !'))
      } else {
        const result = await createPlanningShareLink({
          eventId,
          eventName: event?.name,
          selectedPrograms: shareSelection.programs,
          selectedMenus: shareSelection.menus,
          includeGuestbook: shareSelection.guestbook
        })

        setShareLinks(prev => [{
          id: result.id,
          shareCode: result.shareCode,
          selectedPrograms: shareSelection.programs,
          selectedMenus: shareSelection.menus,
          includeGuestbook: shareSelection.guestbook,
          createdAt: new Date()
        }, ...prev])
      }

      setShareSelection({ programs: [], menus: [], guestbook: false })
      setEditingLinkId(null)
      setShowShareModal(false)
    } catch (err) {
      console.error('Error saving share link:', err)
      toast.error(t('common.error'))
    } finally {
      setGeneratingLink(false)
    }
  }

  const openCreateShareModal = () => {
    setEditingLinkId(null)
    setShareSelection({ programs: [], menus: [], guestbook: false })
    setShowShareModal(true)
  }

  const openEditShareModal = (link) => {
    setEditingLinkId(link.id)
    setShareSelection({
      programs: link.selectedPrograms || [],
      menus: link.selectedMenus || [],
      guestbook: link.includeGuestbook || false
    })
    setShowShareModal(true)
  }

  const closeShareModal = () => {
    setShowShareModal(false)
    setEditingLinkId(null)
    setShareSelection({ programs: [], menus: [], guestbook: false })
  }

  const getShareUrl = (shareCode) => {
    return `${window.location.origin}/${i18n.language}/event/${eventId}/planning/${shareCode}`
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const downloadQRCode = (shareCode) => {
    const svg = document.getElementById(`qr-${shareCode}`)
    if (!svg) return

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const data = new XMLSerializer().serializeToString(svg)
    const DOMURL = window.URL || window.webkitURL || window
    const img = new Image()
    const svgBlob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' })
    const url = DOMURL.createObjectURL(svgBlob)

    img.onload = () => {
      canvas.width = 400
      canvas.height = 400
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, 400, 400)
      ctx.drawImage(img, 0, 0, 400, 400)
      DOMURL.revokeObjectURL(url)
      
      const pngUrl = canvas.toDataURL('image/png')
      const downloadLink = document.createElement('a')
      downloadLink.href = pngUrl
      downloadLink.download = `planning-qr-${shareCode}.png`
      downloadLink.click()
    }
    img.src = url
  }

  const handleDeleteShareLink = async (linkId) => {
    try {
      await deletePlanningShareLink(linkId)
      setShareLinks(prev => prev.filter(l => l.id !== linkId))
    } catch (err) {
      console.error('Error deleting share link:', err)
    }
  }

  const downloadProgramPDF = async (program) => {
    setPdfGenerating(program.id)
    toast.loading(t('common.generating', 'Génération...'))
    
    try {
      // Create a temporary container for the program preview
      const container = document.createElement('div')
      container.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 800px; padding: 40px; background: white;'
      document.body.appendChild(container)

      // Build program HTML with exact visual appearance
      container.innerHTML = `
        <div style="font-family: system-ui, -apple-system, sans-serif; background: white; padding: 40px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #6b7280; font-size: 16px; margin: 0 0 10px 0;">${event?.name || ''}</h2>
            <h1 style="font-size: 32px; font-weight: bold; margin: 0 0 10px 0;">${program.title}</h1>
            ${program.date ? `<p style="color: #6b7280; font-size: 14px; margin: 0;">${program.date}</p>` : ''}
          </div>
          <div style="display: flex; flex-direction: column; gap: 20px;">
            ${(program.items || []).map(item => `
              <div style="background: ${item.bgColor || '#FFF7ED'}; color: ${item.textColor || '#1F2937'}; border-radius: 16px; padding: 20px; overflow: hidden;">
                <div style="display: flex; align-items: flex-start; gap: 16px;">
                  <div style="font-size: 24px; font-weight: bold; min-width: 70px;">${item.startTime || ''}</div>
                  <div style="flex: 1;">
                    <div style="font-size: 18px; font-weight: bold; margin-bottom: 4px;">${item.activityName || ''}</div>
                    ${item.description ? `<div style="font-size: 14px; opacity: 0.9;">${item.description}</div>` : ''}
                    ${item.locationUrl ? `<a href="${item.locationUrl}" style="display: inline-flex; align-items: center; gap: 4px; margin-top: 8px; padding: 4px 12px; background: rgba(0,0,0,0.1); border-radius: 20px; font-size: 12px; text-decoration: none; color: inherit;">📍 ${t('planning.program.viewMap')}</a>` : ''}
                  </div>
                </div>
                ${item.images && item.images.length > 0 ? `
                  <div style="display: flex; gap: 8px; margin-top: 12px;">
                    ${item.images.map(img => `<img src="${img}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 12px;" crossorigin="anonymous" />`).join('')}
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      `

      // Wait for images to load
      const images = container.querySelectorAll('img')
      await Promise.all(Array.from(images).map(img => {
        if (img.complete) return Promise.resolve()
        return new Promise(resolve => {
          img.onload = resolve
          img.onerror = resolve
        })
      }))

      // Capture as canvas
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      })

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = 210
      const pageHeight = 297
      const imgWidth = pageWidth - 20
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      let heightLeft = imgHeight
      let position = 10

      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, position, imgWidth, imgHeight)
      heightLeft -= pageHeight - 20

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10
        pdf.addPage()
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, position, imgWidth, imgHeight)
        heightLeft -= pageHeight - 20
      }

      // Cleanup
      document.body.removeChild(container)
      
      pdf.save(`${program.title || 'programme'}.pdf`)
      toast.dismiss()
      toast.success(t('common.downloaded', 'Téléchargé !'))
    } catch (err) {
      console.error('Error generating PDF:', err)
      toast.dismiss()
      toast.error(t('common.error'))
    } finally {
      setPdfGenerating(null)
    }
  }

  const downloadMenuPDF = async (menu) => {
    setPdfGenerating(menu.id)
    toast.loading(t('common.generating', 'Génération...'))
    
    try {
      // Create a temporary container for the menu preview
      const container = document.createElement('div')
      container.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 800px; padding: 40px; background: white;'
      document.body.appendChild(container)

      const sections = [
        { key: 'starters', title: t('planning.menu.starters'), items: menu.starters || [] },
        { key: 'mains', title: t('planning.menu.mains'), items: menu.mains || [] },
        { key: 'desserts', title: t('planning.menu.desserts'), items: menu.desserts || [] }
      ]

      // Build menu HTML with exact visual appearance
      container.innerHTML = `
        <div style="font-family: 'Georgia', serif; background: linear-gradient(135deg, #FFF7ED 0%, #FEF3C7 100%); padding: 60px 40px; min-height: 800px;">
          <div style="text-align: center; margin-bottom: 40px;">
            <h2 style="color: #92400E; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 10px 0;">${event?.name || ''}</h2>
            <h1 style="font-size: 36px; font-weight: bold; color: #78350F; margin: 0; font-style: italic;">${menu.title}</h1>
            <div style="width: 100px; height: 2px; background: #D97706; margin: 20px auto;"></div>
          </div>
          
          ${sections.filter(s => s.items.length > 0).map(section => `
            <div style="margin-bottom: 40px;">
              <h3 style="text-align: center; font-size: 20px; color: #B45309; margin-bottom: 20px; font-style: italic;">${section.title}</h3>
              ${section.items.map(item => `
                <div style="background: ${item.bgColor || 'rgba(255,255,255,0.7)'}; color: ${item.textColor || '#1F2937'}; border-radius: 12px; padding: 16px 20px; margin-bottom: 12px; display: flex; align-items: center; gap: 16px;">
                  ${item.imageUrl ? `<img src="${item.imageUrl}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;" crossorigin="anonymous" />` : ''}
                  <div style="flex: 1;">
                    <div style="font-size: 16px; font-weight: bold; margin-bottom: 4px;">${item.name || ''}</div>
                    ${item.description ? `<div style="font-size: 13px; opacity: 0.8;">${item.description}</div>` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          `).join('')}
        </div>
      `

      // Wait for images to load
      const images = container.querySelectorAll('img')
      await Promise.all(Array.from(images).map(img => {
        if (img.complete) return Promise.resolve()
        return new Promise(resolve => {
          img.onload = resolve
          img.onerror = resolve
        })
      }))

      // Capture as canvas
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      })

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = 210
      const pageHeight = 297
      const imgWidth = pageWidth - 20
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      let heightLeft = imgHeight
      let position = 10

      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, position, imgWidth, imgHeight)
      heightLeft -= pageHeight - 20

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10
        pdf.addPage()
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, position, imgWidth, imgHeight)
        heightLeft -= pageHeight - 20
      }

      // Cleanup
      document.body.removeChild(container)
      
      pdf.save(`${menu.title || 'menu'}.pdf`)
      toast.dismiss()
      toast.success(t('common.downloaded', 'Téléchargé !'))
    } catch (err) {
      console.error('Error generating PDF:', err)
      toast.dismiss()
      toast.error(t('common.error'))
    } finally {
      setPdfGenerating(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="text-primary-500 hover:underline"
          >
            {t('common.back')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              to={`/${i18n.language}/dashboard`}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <FiArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {t('planning.title')}
              </h1>
              <p className="text-gray-500">{event?.name}</p>
            </div>
          </div>

          <button
            onClick={openCreateShareModal}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            <FiShare2 className="w-4 h-4" />
            {t('planning.generateQR')}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('programs')}
            className={`pb-3 px-4 font-medium transition-colors ${
              activeTab === 'programs'
                ? 'text-primary-500 border-b-2 border-primary-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FiCalendar className="inline w-4 h-4 mr-2" />
            {t('planning.programs')} ({programs.length})
          </button>
          <button
            onClick={() => setActiveTab('menus')}
            className={`pb-3 px-4 font-medium transition-colors ${
              activeTab === 'menus'
                ? 'text-primary-500 border-b-2 border-primary-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FiList className="inline w-4 h-4 mr-2" />
            {t('planning.menus')} ({menus.length})
          </button>
          <button
            onClick={() => setActiveTab('links')}
            className={`pb-3 px-4 font-medium transition-colors ${
              activeTab === 'links'
                ? 'text-primary-500 border-b-2 border-primary-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FiLink className="inline w-4 h-4 mr-2" />
            {t('planning.shareLinks')} ({shareLinks.length})
          </button>
        </div>

        {/* Programs Tab */}
        {activeTab === 'programs' && (
          <div className="space-y-4">
            <Link
              to={`/${i18n.language}/event/${eventId}/program/create`}
              className="block w-full p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors group"
            >
              <div className="flex items-center justify-center gap-2 text-gray-500 group-hover:text-primary-500">
                <FiPlus className="w-5 h-5" />
                <span className="font-medium">{t('planning.createProgram')}</span>
              </div>
            </Link>

            {programs.map(program => (
              <div
                key={program.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {program.title}
                      </h3>
                      {program.date && (
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                          <FiCalendar className="w-4 h-4" />
                          {program.date}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => downloadProgramPDF(program)}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                        title={t('common.download')}
                      >
                        <FiDownload className="w-4 h-4" />
                      </button>
                      <Link
                        to={`/${i18n.language}/event/${eventId}/program/${program.id}/edit`}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                      >
                        <FiEdit2 className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => setDeleteConfirm({ type: 'program', id: program.id })}
                        className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Program items preview */}
                  <div className="space-y-2">
                    {(program.items || []).slice(0, 3).map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                        <FiClock className="w-4 h-4 flex-shrink-0" />
                        <span className="font-mono">{item.startTime}</span>
                        <span dangerouslySetInnerHTML={{ __html: item.activityName }} />
                      </div>
                    ))}
                    {(program.items?.length || 0) > 3 && (
                      <p className="text-sm text-gray-400 pl-7">
                        +{program.items.length - 3} {t('common.more')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {programs.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <FiCalendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{t('planning.noProgramsYet')}</p>
              </div>
            )}
          </div>
        )}

        {/* Menus Tab */}
        {activeTab === 'menus' && (
          <div className="space-y-4">
            <Link
              to={`/${i18n.language}/event/${eventId}/menu/create`}
              className="block w-full p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors group"
            >
              <div className="flex items-center justify-center gap-2 text-gray-500 group-hover:text-primary-500">
                <FiPlus className="w-5 h-5" />
                <span className="font-medium">{t('planning.createMenu')}</span>
              </div>
            </Link>

            {menus.map(menu => (
              <div
                key={menu.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {menu.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => downloadMenuPDF(menu)}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                        title={t('common.download')}
                      >
                        <FiDownload className="w-4 h-4" />
                      </button>
                      <Link
                        to={`/${i18n.language}/event/${eventId}/menu/${menu.id}/edit`}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                      >
                        <FiEdit2 className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => setDeleteConfirm({ type: 'menu', id: menu.id })}
                        className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Menu sections preview */}
                  <div className="flex gap-4 text-sm text-gray-500">
                    <span>{t('planning.menu.starters')}: {menu.starters?.length || 0}</span>
                    <span>{t('planning.menu.mains')}: {menu.mains?.length || 0}</span>
                    <span>{t('planning.menu.desserts')}: {menu.desserts?.length || 0}</span>
                  </div>
                </div>
              </div>
            ))}

            {menus.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <FiList className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{t('planning.noMenusYet')}</p>
              </div>
            )}
          </div>
        )}

        {/* Share Links Tab */}
        {activeTab === 'links' && (
          <div className="space-y-4">
            {shareLinks.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FiLink className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{t('planning.noLinksYet')}</p>
                <button
                  onClick={openCreateShareModal}
                  className="mt-4 text-primary-500 hover:underline"
                >
                  {t('planning.generateQR')}
                </button>
              </div>
            ) : (
              shareLinks.map(link => (
                <div
                  key={link.id}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
                >
                  <div className="flex items-start gap-6">
                    <div className="bg-white p-2 rounded-lg">
                      <QRCodeSVG
                        id={`qr-${link.shareCode}`}
                        value={getShareUrl(link.shareCode)}
                        size={100}
                        level="M"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          {link.shareCode}
                        </span>
                        <button
                          onClick={() => copyToClipboard(getShareUrl(link.shareCode))}
                          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          {copiedLink ? <FiCheck className="w-4 h-4 text-green-500" /> : <FiCopy className="w-4 h-4" />}
                        </button>
                      </div>
                      
                      <p className="text-xs text-gray-500 mb-3 break-all">
                        {getShareUrl(link.shareCode)}
                      </p>

                      <div className="flex flex-wrap gap-2 mb-3">
                        {link.selectedPrograms?.map(pId => {
                          const program = programs.find(p => p.id === pId)
                          return program ? (
                            <span key={pId} className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
                              📅 {program.title}
                            </span>
                          ) : null
                        })}
                        {link.selectedMenus?.map(mId => {
                          const menu = menus.find(m => m.id === mId)
                          return menu ? (
                            <span key={mId} className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-1 rounded-full">
                              🍽️ {menu.title}
                            </span>
                          ) : null
                        })}
                        {link.includeGuestbook && (
                          <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-full">
                            ✍️ {t('guestbook.title', "Livre d'Or")}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditShareModal(link)}
                          className="text-xs flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                          <FiEdit2 className="w-3 h-3" />
                          {t('common.edit', 'Modifier')}
                        </button>
                        <button
                          onClick={() => downloadQRCode(link.shareCode)}
                          className="text-xs flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                          <FiDownload className="w-3 h-3" />
                          {t('planning.downloadQR')}
                        </button>
                        <a
                          href={getShareUrl(link.shareCode)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs flex items-center gap-1 px-3 py-1.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-lg hover:bg-primary-200 dark:hover:bg-primary-900/50"
                        >
                          <FiEye className="w-3 h-3" />
                          {t('common.preview')}
                        </a>
                        <button
                          onClick={() => handleDeleteShareLink(link.id)}
                          className="text-xs flex items-center gap-1 px-3 py-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        >
                          <FiTrash2 className="w-3 h-3" />
                          {t('common.delete')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Share Modal */}
        {showShareModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold">
                  {editingLinkId
                    ? t('planning.editQRTitle', 'Modifier le QR code')
                    : t('planning.generateQRTitle')}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {editingLinkId
                    ? t('planning.editQRDescription', 'Ajoutez ou retirez des éléments. Le QR code et le lien restent identiques.')
                    : t('planning.generateQRDescription')}
                </p>
              </div>

              <div className="p-6 space-y-6">
                {/* Programs selection */}
                {programs.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      <FiCalendar className="w-4 h-4" />
                      {t('planning.programs')}
                    </h3>
                    <div className="space-y-2">
                      {programs.map(program => (
                        <label key={program.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <input
                            type="checkbox"
                            checked={shareSelection.programs.includes(program.id)}
                            onChange={(e) => {
                              setShareSelection(prev => ({
                                ...prev,
                                programs: e.target.checked
                                  ? [...prev.programs, program.id]
                                  : prev.programs.filter(id => id !== program.id)
                              }))
                            }}
                            className="rounded border-gray-300"
                          />
                          <span>{program.title}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Menus selection */}
                {menus.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      <FiList className="w-4 h-4" />
                      {t('planning.menus')}
                    </h3>
                    <div className="space-y-2">
                      {menus.map(menu => (
                        <label key={menu.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <input
                            type="checkbox"
                            checked={shareSelection.menus.includes(menu.id)}
                            onChange={(e) => {
                              setShareSelection(prev => ({
                                ...prev,
                                menus: e.target.checked
                                  ? [...prev.menus, menu.id]
                                  : prev.menus.filter(id => id !== menu.id)
                              }))
                            }}
                            className="rounded border-gray-300"
                          />
                          <span>{menu.title}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Guestbook option */}
                <div>
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <FiEdit className="w-4 h-4" />
                    {t('guestbook.title', "Livre d'Or")}
                  </h3>
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <input
                      type="checkbox"
                      checked={shareSelection.guestbook}
                      onChange={(e) => {
                        setShareSelection(prev => ({
                          ...prev,
                          guestbook: e.target.checked
                        }))
                      }}
                      className="rounded border-gray-300"
                    />
                    <span>{t('planning.includeGuestbook', 'Inclure le livre d\'or')}</span>
                  </label>
                </div>

                {programs.length === 0 && menus.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>{t('planning.noContentToShare')}</p>
                    <p className="text-sm mt-2">{t('planning.createContentFirst')}</p>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <button
                  onClick={closeShareModal}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleGenerateShareLink}
                  disabled={generatingLink || (shareSelection.programs.length === 0 && shareSelection.menus.length === 0 && !shareSelection.guestbook)}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {generatingLink ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      {editingLinkId ? <FiCheck className="w-4 h-4" /> : <FiLink className="w-4 h-4" />}
                      {editingLinkId
                        ? t('planning.saveChanges', 'Enregistrer')
                        : t('planning.generate')}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full">
              <h3 className="text-lg font-bold mb-4">{t('common.confirmDelete')}</h3>
              <p className="text-gray-500 mb-6">
                {deleteConfirm.type === 'program' 
                  ? t('planning.confirmDeleteProgram')
                  : t('planning.confirmDeleteMenu')
                }
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={() => {
                    if (deleteConfirm.type === 'program') {
                      handleDeleteProgram(deleteConfirm.id)
                    } else {
                      handleDeleteMenu(deleteConfirm.id)
                    }
                  }}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  {t('common.delete')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
