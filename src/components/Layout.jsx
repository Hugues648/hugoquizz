import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSiteConfig } from '../contexts/SiteConfigContext'
import { useTranslation } from 'react-i18next'
import { 
  FiHome, 
  FiPlusCircle, 
  FiLogOut, 
  FiMenu, 
  FiX,
  FiUsers,
  FiList,
  FiGift,
  FiHeart,
  FiSettings,
  FiMail,
  FiFileText,
  FiShield,
  FiUser,
  FiHelpCircle
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import LanguageSelector from './LanguageSelector'
import NotificationIcon from './NotificationIcon'
import LocalizedLink from './LocalizedLink'
import { useLocalizedPath } from './LocalizedLink'

const Layout = () => {
  const { userData, logout, isAdmin } = useAuth()
  const { getLogo, siteName, siteTagline } = useSiteConfig()
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await logout()
      toast.success(t('common.logoutSuccess'))
      navigate('/')
    } catch (error) {
      toast.error(t('common.error'))
    }
  }

  const menuItems = [
    { path: '/dashboard', icon: FiHome, label: t('nav.dashboard'), color: 'from-blue-500 to-cyan-500', tutorial: 'dashboard' },
    { path: '/quiz/create', icon: FiPlusCircle, label: t('nav.createQuiz'), color: 'from-orange-500 to-red-500', tutorial: 'create-quiz' },
    { path: '/questionnaire/create', icon: FiList, label: t('nav.createQuestionnaire'), color: 'from-emerald-500 to-teal-500' },
    { path: '/event/create', icon: FiGift, label: t('nav.createEvent'), color: 'from-pink-500 to-rose-500', tutorial: 'create-event' },
  ]

  if (isAdmin()) {
    menuItems.push({ path: '/admin', icon: FiUsers, label: t('nav.admin'), color: 'from-purple-500 to-indigo-500' })
  }

  const getLocalizedPath = useLocalizedPath()
  
  // Check if path is active, accounting for language prefix
  const isActive = (path) => {
    const localizedPath = getLocalizedPath(path)
    return location.pathname === localizedPath || location.pathname.endsWith(path) || location.pathname.includes(path + '/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl shadow-lg px-4 py-3 flex items-center justify-between">
        <LocalizedLink to="/dashboard" className="flex items-center gap-3">
          {getLogo('header') ? (
            <img src={getLogo('header')} alt="Logo" className="h-10 w-10 object-contain" />
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-xl">🎯</span>
            </div>
          )}
          <span className="font-bold text-gray-800 text-lg">{siteName}</span>
        </LocalizedLink>
        <div className="flex items-center gap-2">
          <LocalizedLink 
            to="/help" 
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-600 hover:text-purple-600"
            title={t('footer.help')}
          >
            <FiHelpCircle size={20} />
            <span className="text-sm font-medium hidden sm:inline">{t('footer.help', 'Aide')}</span>
          </LocalizedLink>
          <NotificationIcon />
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            {sidebarOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-40 h-full w-72 
        bg-white shadow-2xl
        transform transition-transform duration-300 ease-out
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6">
            <LocalizedLink to="/dashboard" className="flex items-center gap-3">
              {getLogo('header') ? (
                <img src={getLogo('header')} alt="Logo" className="h-12 w-12 object-contain" />
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl flex items-center justify-center shadow-lg shadow-pink-500/30">
                  <span className="text-2xl">🎯</span>
                </div>
              )}
              <div>
                <h1 className="font-bold text-xl text-gray-800">{siteName}</h1>
                <p className="text-xs text-gray-500">{siteTagline}</p>
              </div>
            </LocalizedLink>
          </div>

          {/* User Info */}
          <div className="px-6 py-4 mx-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl">
            <LocalizedLink to="/profile" className="block hover:opacity-80 transition-opacity cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-purple-500/30 overflow-hidden">
                  {userData?.photoURL ? (
                    <img src={userData.photoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    userData?.displayName?.charAt(0).toUpperCase() || 'U'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 truncate">
                    {userData?.displayName || 'Utilisateur'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{userData?.email}</p>
                </div>
              </div>
            </LocalizedLink>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold
                  ${isAdmin() 
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white' 
                    : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'}
                `}>
                  {isAdmin() ? `👑 ${t('common.admin')}` : `👤 ${t('common.user')}`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <LocalizedLink 
                  to="/help" 
                  className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500 hover:text-purple-600"
                  title={t('footer.help')}
                >
                  <FiHelpCircle size={20} />
                </LocalizedLink>
                <NotificationIcon />
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto mt-4">
            <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{t('nav.menu')}</p>
            {menuItems.map((item) => (
              <LocalizedLink
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                data-tutorial={item.tutorial}
                className={`
                  flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300
                  ${isActive(item.path)
                    ? `bg-gradient-to-r ${item.color} text-white shadow-lg`
                    : 'text-gray-600 hover:bg-gray-100'
                  }
                `}
              >
                <div className={`
                  w-10 h-10 rounded-xl flex items-center justify-center
                  ${isActive(item.path) 
                    ? 'bg-white/20' 
                    : `bg-gradient-to-br ${item.color} bg-opacity-10`}
                `}>
                  <item.icon className={`text-xl ${isActive(item.path) ? 'text-white' : 'text-white'}`} />
                </div>
                <span className="font-medium">{item.label}</span>
              </LocalizedLink>
            ))}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-gray-100 space-y-2 flex-shrink-0">
            {/* Actions row - compact */}
            <div className="flex items-center justify-between gap-2">
              {/* Language Selector - compact, opens upward in dashboard */}
              <LanguageSelector dropdownDirection="up" />
              
              {/* Quick actions */}
              <div className="flex items-center gap-1">
                <LocalizedLink
                  to="/profile"
                  onClick={() => setSidebarOpen(false)}
                  className={`p-2 rounded-xl transition-colors ${
                    isActive('/profile')
                      ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title={t('nav.profile', 'Mon Profil')}
                >
                  <FiUser className="text-lg" />
                </LocalizedLink>
                
                <LocalizedLink
                  to="/settings"
                  onClick={() => setSidebarOpen(false)}
                  data-tutorial="settings"
                  className={`p-2 rounded-xl transition-colors ${
                    isActive('/settings')
                      ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title={t('nav.settings')}
                >
                  <FiSettings className="text-lg" />
                </LocalizedLink>
                
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-xl text-red-500 hover:bg-red-50 transition-colors"
                  title={t('nav.logout')}
                >
                  <FiLogOut className="text-lg" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="lg:ml-72 min-h-screen pt-16 lg:pt-0">
        <div className="p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default Layout
