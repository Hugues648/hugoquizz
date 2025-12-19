import { Link } from 'react-router-dom'
import { FiPlay, FiEdit, FiUsers, FiCheckCircle, FiArrowRight } from 'react-icons/fi'
import { useAuth } from '../contexts/AuthContext'

const Home = () => {
  const { user } = useAuth()

  const features = [
    {
      icon: FiPlay,
      title: 'Quiz Interactifs',
      description: 'Créez des quiz type Kahoot avec timer, score et classements',
      color: 'from-red-500 to-orange-500'
    },
    {
      icon: FiEdit,
      title: 'Questionnaires Conditionnels',
      description: 'Créez des formulaires intelligents avec logique conditionnelle',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: FiUsers,
      title: 'Multi-joueurs',
      description: 'Partagez vos quiz et jouez avec vos amis en temps réel',
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: FiCheckCircle,
      title: 'Résultats Détaillés',
      description: 'Analysez les réponses et performances de vos participants',
      color: 'from-purple-500 to-pink-500'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-2xl">🎯</span>
            </div>
            <h1 className="text-2xl font-bold text-white">HugoQuiz</h1>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <Link 
                to="/dashboard" 
                className="btn bg-white text-purple-600 hover:bg-gray-100"
              >
                Mon Dashboard
              </Link>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="text-white font-medium hover:text-white/80 transition-colors"
                >
                  Connexion
                </Link>
                <Link 
                  to="/register" 
                  className="btn bg-white text-purple-600 hover:bg-gray-100"
                >
                  S'inscrire
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block px-4 py-2 bg-white/20 backdrop-blur rounded-full text-white text-sm font-medium mb-6">
            🚀 La nouvelle façon de créer des quiz
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Créez des Quiz
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 to-orange-300">
              Extraordinaires
            </span>
          </h1>
          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            Créez des quiz interactifs type Kahoot et des questionnaires conditionnels 
            intelligents. Partagez-les et analysez les résultats en temps réel.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              to="/register" 
              className="btn bg-white text-purple-600 hover:bg-gray-100 flex items-center gap-2 text-lg px-8 py-4"
            >
              Commencer Gratuitement
              <FiArrowRight />
            </Link>
            <Link 
              to="/login" 
              className="btn bg-white/20 text-white hover:bg-white/30 backdrop-blur flex items-center gap-2 text-lg px-8 py-4"
            >
              Se Connecter
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12">
            Tout ce dont vous avez besoin
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300 group"
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                  <feature.icon className="text-white text-2xl" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-white/70">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12">
            Comment ça marche ?
          </h2>
          <div className="space-y-6">
            {[
              { step: 1, title: 'Créez un compte', description: 'Inscrivez-vous et attendez la validation de votre compte par un administrateur' },
              { step: 2, title: 'Créez votre quiz', description: 'Ajoutez des questions, définissez le timer et personnalisez votre quiz' },
              { step: 3, title: 'Partagez le lien', description: 'Invitez vos participants à rejoindre votre quiz avec un simple lien' },
              { step: 4, title: 'Analysez les résultats', description: 'Consultez les scores et les réponses de tous les participants' }
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-4 bg-white/10 backdrop-blur-lg rounded-xl p-5 border border-white/20">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-bold text-purple-600 flex-shrink-0">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{item.title}</h3>
                  <p className="text-white/70">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-10 border border-white/20">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Prêt à créer votre premier quiz ?
            </h2>
            <p className="text-white/70 mb-8 text-lg">
              Rejoignez HugoQuiz et commencez à créer des expériences interactives inoubliables.
            </p>
            <Link 
              to="/register" 
              className="btn bg-white text-purple-600 hover:bg-gray-100 inline-flex items-center gap-2 text-lg px-8 py-4"
            >
              Créer un compte gratuit
              <FiArrowRight />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-white/20">
        <div className="max-w-6xl mx-auto text-center text-white/60">
          <p>© 2025 HugoQuiz. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  )
}

export default Home
