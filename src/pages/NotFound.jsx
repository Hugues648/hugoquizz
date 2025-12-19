import { Link } from 'react-router-dom'
import { FiHome, FiArrowLeft } from 'react-icons/fi'

const NotFound = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <div className="text-center text-white">
        <div className="text-9xl font-bold mb-4 animate-bounce-slow">404</div>
        <h1 className="text-3xl font-bold mb-4">Page Introuvable</h1>
        <p className="text-white/70 mb-8 text-lg">
          Oups ! La page que vous recherchez n'existe pas.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/"
            className="btn bg-white text-purple-600 hover:bg-gray-100 flex items-center justify-center gap-2"
          >
            <FiHome />
            Accueil
          </Link>
          <button
            onClick={() => window.history.back()}
            className="btn bg-white/20 text-white hover:bg-white/30 flex items-center justify-center gap-2"
          >
            <FiArrowLeft />
            Retour
          </button>
        </div>
      </div>
    </div>
  )
}

export default NotFound
