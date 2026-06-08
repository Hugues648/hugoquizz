import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiMail, FiFileText, FiShield, FiHelpCircle } from 'react-icons/fi'

const Footer = () => {
  const { t } = useTranslation()
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-gray-900 text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Logo & Description */}
          <div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-3">
              HugoQuiz
            </h3>
            <p className="text-gray-400 text-sm">
              {t('footer.description', 'La plateforme interactive pour créer des quiz, questionnaires et gérer vos événements.')}
            </p>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
              <FiMail className="text-purple-400" />
              {t('footer.support', 'Support')}
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a 
                  href="mailto:contact@hugoquiz.com" 
                  className="text-gray-400 hover:text-purple-400 transition-colors flex items-center gap-2"
                >
                  <FiMail className="text-xs" />
                  contact@hugoquiz.com
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
              <FiFileText className="text-purple-400" />
              {t('footer.legal', 'Mentions légales')}
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link 
                  to="/cgu" 
                  className="text-gray-400 hover:text-purple-400 transition-colors flex items-center gap-2"
                >
                  <FiFileText className="text-xs" />
                  {t('footer.terms', 'Conditions Générales d\'Utilisation')}
                </Link>
              </li>
              <li>
                <Link 
                  to="/privacy" 
                  className="text-gray-400 hover:text-purple-400 transition-colors flex items-center gap-2"
                >
                  <FiShield className="text-xs" />
                  {t('footer.privacy', 'Protection des données')}
                </Link>
              </li>
              <li>
                <Link 
                  to="/help" 
                  className="text-gray-400 hover:text-purple-400 transition-colors flex items-center gap-2"
                >
                  <FiHelpCircle className="text-xs" />
                  {t('footer.help', 'Aide')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-800 mt-8 pt-6 text-center text-sm text-gray-500">
          <p>© {currentYear} HugoQuiz. {t('footer.rights', 'Tous droits réservés.')}</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
