import { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  FiHome, 
  FiPlusCircle, 
  FiSettings, 
  FiLogOut, 
  FiMenu, 
  FiX,
  FiUsers,
  FiHelpCircle,
  FiList
} from 'react-icons/fi'
import toast from 'react-hot-toast'

const Layout = () => {
  const { userData, logout, isAdmin } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await logout()
      toast.success('Déconnexion réussie')
      navigate('/')
    } catch (error) {
      toast.error('Erreur lors de la déconnexion')
    }
  }

  const menuItems = [
    { path: '/dashboard', icon: FiHome, label: 'Dashboard' },
    { path: '/quiz/create', icon: FiPlusCircle, label: 'Créer un Quiz' },
    { path: '/questionnaire/create', icon: FiList, label: 'Créer un Questionnaire' },
  ]

  if (isAdmin()) {
    menuItems.push({ path: '/admin', icon: FiUsers, label: 'Administration' })
  }

  const isActive = (path) => location.pathname === path

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg shadow-lg px-4 py-3 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
            <FiHelpCircle className="text-white text-lg" />
          </div>
          <span className="font-bold text-gray-800">HugoQuiz</span>
        </Link>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          {sidebarOpen ? <FiX size={24} /> : <FiMenu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-40 h-full w-64 bg-white/95 backdrop-blur-lg shadow-2xl
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-200">
            <Link to="/dashboard" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <FiHelpCircle className="text-white text-xl" />
              </div>
              <div>
                <h1 className="font-bold text-xl text-gray-800">HugoQuiz</h1>
                <p className="text-xs text-gray-500">Quiz & Questionnaires</p>
              </div>
            </Link>
          </div>

          {/* User Info */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold">
                {userData?.displayName?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate">
                  {userData?.displayName || 'Utilisateur'}
                </p>
                <p className="text-xs text-gray-500 truncate">{userData?.email}</p>
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1
                  ${isAdmin() ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}
                `}>
                  {isAdmin() ? 'Admin' : 'Utilisateur'}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                  ${isActive(item.path)
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-100'
                  }
                `}
              >
                <item.icon className={`text-xl ${isActive(item.path) ? 'text-white' : 'text-gray-400'}`} />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
            >
              <FiLogOut className="text-xl" />
              <span className="font-medium">Déconnexion</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
        <div className="p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default Layout
