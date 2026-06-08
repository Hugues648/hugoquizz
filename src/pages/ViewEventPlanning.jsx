import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { 
  getEventById,
  getPlanningShareLinkByCode,
  getEventProgramById,
  getEventMenuById
} from '../services/firestore'
import { 
  FiCalendar, FiList, FiMapPin, FiClock, FiChevronRight, FiEdit
} from 'react-icons/fi'
import LoadingSpinner from '../components/LoadingSpinner'
import FloatingLanguageSelector from '../components/FloatingLanguageSelector'
import LocalizedLink from '../components/LocalizedLink'

export default function ViewEventPlanning() {
  const { id: eventId, shareCode } = useParams()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [event, setEvent] = useState(null)
  const [shareLink, setShareLink] = useState(null)
  const [programs, setPrograms] = useState([])
  const [menus, setMenus] = useState([])
  const [selectedItem, setSelectedItem] = useState(null)
  const [viewMode, setViewMode] = useState('list') // 'list', 'program', 'menu'

  useEffect(() => {
    loadData()
  }, [eventId, shareCode])

  const loadData = async () => {
    try {
      // Get share link data
      const linkData = await getPlanningShareLinkByCode(shareCode)
      if (!linkData || linkData.eventId !== eventId) {
        setError(t('planning.invalidLink'))
        setLoading(false)
        return
      }
      setShareLink(linkData)

      // Get event
      const eventData = await getEventById(eventId)
      if (!eventData) {
        setError(t('planning.eventNotFound'))
        setLoading(false)
        return
      }
      setEvent(eventData)

      // Load selected programs
      const programPromises = (linkData.selectedPrograms || []).map(id => getEventProgramById(id))
      const programsData = await Promise.all(programPromises)
      setPrograms(programsData.filter(Boolean))

      // Load selected menus
      const menuPromises = (linkData.selectedMenus || []).map(id => getEventMenuById(id))
      const menusData = await Promise.all(menuPromises)
      setMenus(menusData.filter(Boolean))

      // Auto-select if only one item
      if (programsData.filter(Boolean).length + menusData.filter(Boolean).length === 1) {
        if (programsData.filter(Boolean).length === 1) {
          setSelectedItem({ type: 'program', data: programsData[0] })
          setViewMode('program')
        } else if (menusData.filter(Boolean).length === 1) {
          setSelectedItem({ type: 'menu', data: menusData[0] })
          setViewMode('menu')
        }
      }
    } catch (err) {
      console.error('Error loading planning:', err)
      setError(t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  const getSectionTitle = (section) => {
    switch (section) {
      case 'starters': return t('planning.menu.starters')
      case 'mains': return t('planning.menu.mains')
      case 'desserts': return t('planning.menu.desserts')
      default: return section
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-100 dark:from-gray-900 dark:to-gray-800">
        <LoadingSpinner size="lg" />
        <FloatingLanguageSelector />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center px-4">
          <div className="text-6xl mb-4">📋</div>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => navigate(`/${i18n.language}`)}
            className="px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors"
          >
            {t('common.backToHome')}
          </button>
        </div>
        <FloatingLanguageSelector />
      </div>
    )
  }

  // Program view
  if (viewMode === 'program' && selectedItem?.type === 'program') {
    const program = selectedItem.data
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-lg mx-auto px-4 py-8">
          {/* Back button */}
          {programs.length + menus.length > 1 && (
            <button
              onClick={() => {
                setViewMode('list')
                setSelectedItem(null)
              }}
              className="mb-6 text-gray-500 hover:text-gray-700 flex items-center gap-2"
            >
              ← {t('common.back')}
            </button>
          )}

          {/* Header */}
          <div className="text-center mb-8">
            <p className="text-gray-500 text-sm">{event?.name}</p>
            <h1 className="text-3xl font-bold mt-2 text-gray-900 dark:text-white">
              {program.title}
            </h1>
            {program.date && (
              <p className="text-primary-500 mt-2 font-medium">{program.date}</p>
            )}
          </div>

          {/* Timeline */}
          <div className="space-y-6">
            {(program.items || []).map((item, index) => (
              <div key={item.id || index} className="flex gap-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-white w-16 flex-shrink-0">
                  {item.startTime}
                </div>
                <div 
                  className="flex-1 p-4 rounded-2xl shadow-sm"
                  style={{ backgroundColor: item.bgColor || '#FFF7ED', color: item.textColor || '#1F2937' }}
                >
                  <div 
                    className="font-bold text-lg"
                    dangerouslySetInnerHTML={{ __html: item.activityName }}
                  />
                  {item.description && (
                    <div 
                      className="text-sm opacity-90 mt-1"
                      dangerouslySetInnerHTML={{ __html: item.description }}
                    />
                  )}
                  {item.locationUrl && (
                    <a 
                      href={item.locationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-3 px-3 py-1.5 rounded-full text-xs font-medium bg-black/10 hover:bg-black/20 transition-colors"
                    >
                      <FiMapPin className="w-3 h-3" />
                      {t('planning.program.viewMap')}
                    </a>
                  )}
                  {item.images?.length > 0 && (
                    <div className="flex gap-2 mt-3">
                      {item.images.map((img, idx) => (
                        <img 
                          key={idx}
                          src={img} 
                          alt="" 
                          className="w-16 h-16 object-cover rounded-xl shadow-sm"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <FloatingLanguageSelector />
      </div>
    )
  }

  // Menu view
  if (viewMode === 'menu' && selectedItem?.type === 'menu') {
    const menu = selectedItem.data
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-lg mx-auto px-4 py-8">
          {/* Back button */}
          {programs.length + menus.length > 1 && (
            <button
              onClick={() => {
                setViewMode('list')
                setSelectedItem(null)
              }}
              className="mb-6 text-gray-500 hover:text-gray-700 flex items-center gap-2"
            >
              ← {t('common.back')}
            </button>
          )}

          {/* Header */}
          <div className="text-center mb-8">
            <p className="text-gray-500 text-sm">{event?.name}</p>
            <h1 className="text-3xl font-bold mt-2 text-gray-900 dark:text-white">
              {menu.title}
            </h1>
          </div>

          {/* Menu sections */}
          <div className="space-y-8">
            {['starters', 'mains', 'desserts'].map(section => {
              if (!menu[section] || menu[section].length === 0) return null

              return (
                <div key={section}>
                  <h2 className="text-xl font-bold text-center mb-4 text-orange-600 dark:text-orange-400">
                    {getSectionTitle(section)}
                  </h2>
                  <div className="space-y-3">
                    {menu[section].map((item, index) => (
                      <div 
                        key={item.id || index}
                        className="p-4 rounded-2xl shadow-sm"
                        style={{ backgroundColor: item.bgColor || '#FFF7ED', color: item.textColor || '#1F2937' }}
                      >
                        <div className="flex items-start gap-3">
                          {item.imageUrl && (
                            <img 
                              src={item.imageUrl} 
                              alt="" 
                              className="w-16 h-16 object-cover rounded-xl flex-shrink-0"
                            />
                          )}
                          <div>
                            <div 
                              className="font-bold"
                              dangerouslySetInnerHTML={{ __html: item.name }}
                            />
                            {item.description && (
                              <div 
                                className="text-sm opacity-90 mt-1"
                                dangerouslySetInnerHTML={{ __html: item.description }}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <FloatingLanguageSelector />
      </div>
    )
  }

  // List view (selection)
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-gray-500 text-sm">{event?.name}</p>
          <h1 className="text-3xl font-bold mt-2 text-gray-900 dark:text-white">
            {t('planning.selectToView')}
          </h1>
        </div>

        {/* Programs */}
        {programs.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <FiCalendar className="w-5 h-5" />
              {t('planning.programs')}
            </h2>
            <div className="space-y-3">
              {programs.map(program => (
                <button
                  key={program.id}
                  onClick={() => {
                    setSelectedItem({ type: 'program', data: program })
                    setViewMode('program')
                  }}
                  className="w-full p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-primary-500 hover:shadow-md transition-all text-left flex items-center justify-between group"
                >
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white">
                      {program.title}
                    </div>
                    {program.date && (
                      <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <FiClock className="w-3 h-3" />
                        {program.date}
                      </div>
                    )}
                    <div className="text-xs text-gray-400 mt-1">
                      {program.items?.length || 0} {t('planning.program.activities')}
                    </div>
                  </div>
                  <FiChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-500 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Menus */}
        {menus.length > 0 && (
          <div>
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <FiList className="w-5 h-5" />
              {t('planning.menus')}
            </h2>
            <div className="space-y-3">
              {menus.map(menu => (
                <button
                  key={menu.id}
                  onClick={() => {
                    setSelectedItem({ type: 'menu', data: menu })
                    setViewMode('menu')
                  }}
                  className="w-full p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-primary-500 hover:shadow-md transition-all text-left flex items-center justify-between group"
                >
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white">
                      {menu.title}
                    </div>
                    <div className="text-xs text-gray-400 mt-1 flex gap-3">
                      <span>{t('planning.menu.starters')}: {menu.starters?.length || 0}</span>
                      <span>{t('planning.menu.mains')}: {menu.mains?.length || 0}</span>
                      <span>{t('planning.menu.desserts')}: {menu.desserts?.length || 0}</span>
                    </div>
                  </div>
                  <FiChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-500 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Guestbook */}
        {shareLink?.includeGuestbook && (
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <FiEdit className="w-5 h-5" />
              {t('guestbook.title', "Livre d'Or")}
            </h2>
            <LocalizedLink
              to={`/event/${eventId}/guestbook`}
              className="w-full p-4 bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl shadow-sm hover:shadow-md transition-all text-left flex items-center justify-between group block"
            >
              <div>
                <div className="font-bold text-white">
                  {t('guestbook.signTheBook', 'Signez le livre')}
                </div>
                <div className="text-sm text-white/80 mt-1">
                  {t('guestbook.leaveMessage', 'Laisser un message')}
                </div>
              </div>
              <FiChevronRight className="w-5 h-5 text-white/80 group-hover:text-white transition-colors" />
            </LocalizedLink>
          </div>
        )}

        {programs.length === 0 && menus.length === 0 && !shareLink?.includeGuestbook && (
          <div className="text-center py-12 text-gray-500">
            <div className="text-6xl mb-4">📋</div>
            <p>{t('planning.noContentAvailable')}</p>
          </div>
        )}
      </div>
      <FloatingLanguageSelector />
    </div>
  )
}
