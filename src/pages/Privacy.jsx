import { useTranslation } from 'react-i18next'
import { FiArrowLeft, FiShield, FiUser, FiMail, FiLock, FiDatabase, FiCreditCard, FiGlobe, FiClock } from 'react-icons/fi'
import { Link } from 'react-router-dom'

const Privacy = () => {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-4"
          >
            <FiArrowLeft /> {t('common.backToHome')}
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <FiShield className="text-purple-600 text-xl" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">{t('privacy.title')}</h1>
              <p className="text-gray-500">{t('privacy.lastUpdated')}: {t('privacy.lastUpdatedDate')}</p>
            </div>
          </div>
        </div>

        {/* Introduction */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-6 text-white mb-8">
          <h2 className="text-xl font-bold mb-3">{t('privacy.intro.title')}</h2>
          <p className="text-white/90">
            {t('privacy.intro.description')}
          </p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-8">
          
          {/* Section 1 - Responsable du traitement */}
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FiUser className="text-purple-500" />
              {t('privacy.section1.title')}
            </h2>
            <div className="text-gray-600 space-y-3">
              <p>{t('privacy.section1.description')}</p>
              <div className="bg-gray-50 rounded-xl p-4">
                <p><strong>HugoQuiz</strong></p>
                <p>Email : <a href="mailto:contact@hugoquiz.com" className="text-purple-600">contact@hugoquiz.com</a></p>
                <p>{t('privacy.section1.website')} : <a href="https://hugoquiz.com" className="text-purple-600">https://hugoquiz.com</a></p>
              </div>
            </div>
          </section>

          {/* Section 2 - Données collectées */}
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FiDatabase className="text-purple-500" />
              {t('privacy.section2.title')}
            </h2>
            <div className="text-gray-600 space-y-4">
              <p>{t('privacy.section2.description')}</p>
              
              <div className="space-y-4">
                {/* Email */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <h3 className="font-semibold text-blue-800 flex items-center gap-2 mb-2">
                    <FiMail /> {t('privacy.section2.email.title')}
                  </h3>
                  <ul className="text-sm space-y-1 text-blue-700">
                    <li><strong>{t('privacy.section2.purpose')}:</strong> {t('privacy.section2.email.purpose')}</li>
                    <li><strong>{t('privacy.section2.legalBasis')}:</strong> {t('privacy.section2.email.legalBasis')}</li>
                    <li><strong>{t('privacy.section2.retention')}:</strong> {t('privacy.section2.email.retention')}</li>
                  </ul>
                </div>

                {/* Nom d'utilisateur */}
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <h3 className="font-semibold text-green-800 flex items-center gap-2 mb-2">
                    <FiUser /> {t('privacy.section2.username.title')}
                  </h3>
                  <ul className="text-sm space-y-1 text-green-700">
                    <li><strong>{t('privacy.section2.purpose')}:</strong> {t('privacy.section2.username.purpose')}</li>
                    <li><strong>{t('privacy.section2.legalBasis')}:</strong> {t('privacy.section2.username.legalBasis')}</li>
                    <li><strong>{t('privacy.section2.retention')}:</strong> {t('privacy.section2.username.retention')}</li>
                  </ul>
                </div>

                {/* Mot de passe */}
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                  <h3 className="font-semibold text-purple-800 flex items-center gap-2 mb-2">
                    <FiLock /> {t('privacy.section2.password.title')}
                  </h3>
                  <ul className="text-sm space-y-1 text-purple-700">
                    <li><strong>{t('privacy.section2.purpose')}:</strong> {t('privacy.section2.password.purpose')}</li>
                    <li><strong>{t('privacy.section2.legalBasis')}:</strong> {t('privacy.section2.password.legalBasis')}</li>
                    <li><strong>{t('privacy.section2.security')}:</strong> {t('privacy.section2.password.security')}</li>
                    <li><strong>{t('privacy.section2.retention')}:</strong> {t('privacy.section2.password.retention')}</li>
                  </ul>
                </div>

                {/* Données de paiement */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <h3 className="font-semibold text-amber-800 flex items-center gap-2 mb-2">
                    <FiCreditCard /> {t('privacy.section2.payment.title')}
                  </h3>
                  <ul className="text-sm space-y-1 text-amber-700">
                    <li><strong>{t('privacy.section2.purpose')}:</strong> {t('privacy.section2.payment.purpose')}</li>
                    <li><strong>{t('privacy.section2.legalBasis')}:</strong> {t('privacy.section2.payment.legalBasis')}</li>
                    <li><strong>{t('privacy.section2.security')}:</strong> {t('privacy.section2.payment.security')}</li>
                    <li><strong>{t('privacy.section2.payment.stripeData')}:</strong> {t('privacy.section2.payment.stripeDataDesc')}</li>
                  </ul>
                </div>

                {/* Données de connexion */}
                <div className="bg-pink-50 border border-pink-200 rounded-xl p-4">
                  <h3 className="font-semibold text-pink-800 flex items-center gap-2 mb-2">
                    <FiGlobe /> {t('privacy.section2.connection.title')}
                  </h3>
                  <ul className="text-sm space-y-1 text-pink-700">
                    <li><strong>{t('privacy.section2.connection.dataCollected')}:</strong> {t('privacy.section2.connection.dataCollectedDesc')}</li>
                    <li><strong>{t('privacy.section2.purpose')}:</strong> {t('privacy.section2.connection.purpose')}</li>
                    <li><strong>{t('privacy.section2.legalBasis')}:</strong> {t('privacy.section2.connection.legalBasis')}</li>
                    <li><strong>{t('privacy.section2.retention')}:</strong> {t('privacy.section2.connection.retention')}</li>
                  </ul>
                </div>

                {/* Contenu créé */}
                <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
                  <h3 className="font-semibold text-teal-800 flex items-center gap-2 mb-2">
                    <FiDatabase /> {t('privacy.section2.content.title')}
                  </h3>
                  <ul className="text-sm space-y-1 text-teal-700">
                    <li><strong>{t('privacy.section2.purpose')}:</strong> {t('privacy.section2.content.purpose')}</li>
                    <li><strong>{t('privacy.section2.legalBasis')}:</strong> {t('privacy.section2.content.legalBasis')}</li>
                    <li><strong>{t('privacy.section2.retention')}:</strong> {t('privacy.section2.content.retention')}</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3 - Droits */}
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4">{t('privacy.section3.title')}</h2>
            <div className="text-gray-600 space-y-3">
              <p>{t('privacy.section3.description')}</p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-800">✓ {t('privacy.section3.access.title')}</h3>
                  <p className="text-sm">{t('privacy.section3.access.description')}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-800">✓ {t('privacy.section3.rectification.title')}</h3>
                  <p className="text-sm">{t('privacy.section3.rectification.description')}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-800">✓ {t('privacy.section3.erasure.title')}</h3>
                  <p className="text-sm">{t('privacy.section3.erasure.description')}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-800">✓ {t('privacy.section3.restriction.title')}</h3>
                  <p className="text-sm">{t('privacy.section3.restriction.description')}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-800">✓ {t('privacy.section3.portability.title')}</h3>
                  <p className="text-sm">{t('privacy.section3.portability.description')}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-800">✓ {t('privacy.section3.objection.title')}</h3>
                  <p className="text-sm">{t('privacy.section3.objection.description')}</p>
                </div>
              </div>
              <p className="mt-4">
                {t('privacy.section3.contact')}: <a href="mailto:contact@hugoquiz.com" className="text-purple-600 font-semibold">contact@hugoquiz.com</a>
              </p>
            </div>
          </section>

          {/* Section 4 - Sécurité */}
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FiLock className="text-purple-500" />
              {t('privacy.section4.title')}
            </h2>
            <div className="text-gray-600 space-y-3">
              <p>{t('privacy.section4.description')}</p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span><strong>{t('privacy.section4.https')}</strong>: {t('privacy.section4.httpsDesc')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span><strong>{t('privacy.section4.hosting')}</strong>: {t('privacy.section4.hostingDesc')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span><strong>{t('privacy.section4.passwords')}</strong>: {t('privacy.section4.passwordsDesc')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span><strong>{t('privacy.section4.accessControl')}</strong>: {t('privacy.section4.accessControlDesc')}</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Section 5 - Transferts */}
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4">{t('privacy.section5.title')}</h2>
            <div className="text-gray-600 space-y-3">
              <p>{t('privacy.section5.description')}</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-3 text-left rounded-tl-lg">{t('privacy.section5.subcontractor')}</th>
                      <th className="p-3 text-left">{t('privacy.section5.purposeCol')}</th>
                      <th className="p-3 text-left rounded-tr-lg">{t('privacy.section5.location')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-3 font-medium">Firebase (Google)</td>
                      <td className="p-3">{t('privacy.section5.firebase')}</td>
                      <td className="p-3">{t('privacy.section5.firebaseLocation')}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3 font-medium">Stripe</td>
                      <td className="p-3">{t('privacy.section5.stripe')}</td>
                      <td className="p-3">{t('privacy.section5.stripeLocation')}</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium rounded-bl-lg">Brevo</td>
                      <td className="p-3">{t('privacy.section5.brevo')}</td>
                      <td className="p-3 rounded-br-lg">{t('privacy.section5.brevoLocation')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Section 6 - Cookies */}
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4">{t('privacy.section6.title')}</h2>
            <div className="text-gray-600 space-y-3">
              <p>{t('privacy.section6.description')}</p>
              <ul className="space-y-2">
                <li><strong>{t('privacy.section6.authCookie')}</strong>: {t('privacy.section6.authCookieDesc')}</li>
                <li><strong>{t('privacy.section6.preferences')}</strong>: {t('privacy.section6.preferencesDesc')}</li>
              </ul>
              <p>{t('privacy.section6.noTracking')}</p>
            </div>
          </section>

          {/* Section 7 - Conservation */}
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FiClock className="text-purple-500" />
              {t('privacy.section7.title')}
            </h2>
            <div className="text-gray-600 space-y-3">
              <p>{t('privacy.section7.description')}</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-3 text-left rounded-tl-lg">{t('privacy.section7.dataType')}</th>
                      <th className="p-3 text-left rounded-tr-lg">{t('privacy.section7.retentionPeriod')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-3">{t('privacy.section7.accountData')}</td>
                      <td className="p-3">{t('privacy.section7.accountDataRetention')}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3">{t('privacy.section7.createdContent')}</td>
                      <td className="p-3">{t('privacy.section7.createdContentRetention')}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3">{t('privacy.section7.paymentData')}</td>
                      <td className="p-3">{t('privacy.section7.paymentDataRetention')}</td>
                    </tr>
                    <tr>
                      <td className="p-3 rounded-bl-lg">{t('privacy.section7.connectionLogs')}</td>
                      <td className="p-3 rounded-br-lg">{t('privacy.section7.connectionLogsRetention')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Section 8 - Contact */}
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4">{t('privacy.section8.title')}</h2>
            <div className="text-gray-600 space-y-3">
              <p>{t('privacy.section8.description')}</p>
              <div className="bg-purple-50 rounded-xl p-4 text-center">
                <p className="text-lg font-semibold text-purple-700">contact@hugoquiz.com</p>
              </div>
              <p>
                {t('privacy.section8.complaint')} <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-purple-600">www.cnil.fr</a>
              </p>
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}

export default Privacy
