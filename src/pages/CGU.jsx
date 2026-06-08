import { useTranslation } from 'react-i18next'
import { FiArrowLeft, FiFileText } from 'react-icons/fi'
import { Link } from 'react-router-dom'

const CGU = () => {
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
              <FiFileText className="text-purple-600 text-xl" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">{t('cgu.title')}</h1>
              <p className="text-gray-500">{t('cgu.lastUpdated')}: {t('cgu.lastUpdatedDate')}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-8">
          
          {/* Article 1 */}
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4">{t('cgu.article1.title')}</h2>
            <div className="text-gray-600 space-y-3 text-justify">
              <p>{t('cgu.article1.p1')}</p>
              <p>{t('cgu.article1.p2')}</p>
              <p>{t('cgu.article1.p3')}</p>
            </div>
          </section>

          {/* Article 2 */}
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4">{t('cgu.article2.title')}</h2>
            <div className="text-gray-600 space-y-3 text-justify">
              <p><strong>"{t('cgu.article2.subscription')}"</strong> : {t('cgu.article2.subscriptionDef')}</p>
              <p><strong>"{t('cgu.article2.userAccount')}"</strong> : {t('cgu.article2.userAccountDef')}</p>
              <p><strong>"{t('cgu.article2.services')}"</strong> : {t('cgu.article2.servicesDef')}</p>
              <p><strong>"{t('cgu.article2.subscriptionPeriod')}"</strong> : {t('cgu.article2.subscriptionPeriodDef')}</p>
            </div>
          </section>

          {/* Article 3 */}
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4">{t('cgu.article3.title')}</h2>
            <div className="text-gray-600 space-y-3 text-justify">
              <p>{t('cgu.article3.p1')}</p>
              <p>{t('cgu.article3.p2')}</p>
              <p>{t('cgu.article3.p3')}</p>
            </div>
          </section>

          {/* Article 4 */}
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4">{t('cgu.article4.title')}</h2>
            <div className="text-gray-600 space-y-3 text-justify">
              <p>{t('cgu.article4.p1')}</p>
              <p>{t('cgu.article4.p2')}</p>
              <p>{t('cgu.article4.p3')}</p>
            </div>
          </section>

          {/* Article 4 bis - ESSAI GRATUIT */}
          <section className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">{t('cgu.article4bis.title')}</h2>
            <div className="text-gray-600 space-y-3 text-justify">
              <p className="font-semibold text-green-800">{t('cgu.article4bis.section1Title')}</p>
              <p>{t('cgu.article4bis.section1Desc')}</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>{t('cgu.article4bis.section1Item1')}</li>
                <li>{t('cgu.article4bis.section1Item2')}</li>
                <li>{t('cgu.article4bis.section1Item3')}</li>
                <li>{t('cgu.article4bis.section1Item4')}</li>
              </ul>
              
              <p className="font-semibold text-green-800 mt-4">{t('cgu.article4bis.section2Title')}</p>
              <p>{t('cgu.article4bis.section2Desc')}</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>{t('cgu.article4bis.section2Item1')}</li>
                <li>{t('cgu.article4bis.section2Item2')}</li>
                <li>{t('cgu.article4bis.section2Item3')}</li>
              </ul>
              
              <p className="font-semibold text-green-800 mt-4">{t('cgu.article4bis.section3Title')}</p>
              <p>{t('cgu.article4bis.section3Desc')}</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>{t('cgu.article4bis.section3Item1')}</li>
                <li>{t('cgu.article4bis.section3Item2')}</li>
                <li>{t('cgu.article4bis.section3Item3')}</li>
              </ul>
              
              <p className="font-semibold text-green-800 mt-4">{t('cgu.article4bis.section4Title')}</p>
              <p>{t('cgu.article4bis.section4Desc')}</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>{t('cgu.article4bis.section4Item1')}</li>
                <li>{t('cgu.article4bis.section4Item2')}</li>
                <li>{t('cgu.article4bis.section4Item3')}</li>
              </ul>
              
              <p className="font-semibold text-green-800 mt-4">{t('cgu.article4bis.section5Title')}</p>
              <p>{t('cgu.article4bis.section5Desc')}</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>{t('cgu.article4bis.section5Item1')}</li>
                <li>{t('cgu.article4bis.section5Item2')}</li>
                <li>{t('cgu.article4bis.section5Item3')}</li>
              </ul>
            </div>
          </section>

          {/* Article 5 - DROIT DE RÉTRACTATION ET REMBOURSEMENT */}
          <section className="bg-amber-50 border-2 border-amber-200 rounded-xl p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">{t('cgu.article5.title')}</h2>
            <div className="text-gray-600 space-y-3 text-justify">
              <p className="font-semibold text-amber-800">{t('cgu.article5.section1Title')}</p>
              <p>{t('cgu.article5.section1Desc')}</p>
              <p className="bg-white p-4 rounded-lg border-l-4 border-amber-500">
                <strong>{t('cgu.article5.section1Important')}</strong>
              </p>
              <p className="mt-4 font-semibold text-amber-800">{t('cgu.article5.section2Title')}</p>
              <p>{t('cgu.article5.section2Desc')}</p>
              <p className="bg-white p-4 rounded-lg border-l-4 border-red-500">
                <strong>{t('cgu.article5.section2Important')}</strong>
              </p>
              <p className="mt-4 font-semibold text-amber-800">{t('cgu.article5.section3Title')}</p>
              <p>{t('cgu.article5.section3Desc')}</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>{t('cgu.article5.section3Item1')}</li>
                <li>{t('cgu.article5.section3Item2')}</li>
                <li>{t('cgu.article5.section3Item3')}</li>
              </ul>
              <p className="mt-3"><strong>{t('cgu.article5.section3NoRefund')}</strong></p>
              <p className="mt-4 font-semibold text-amber-800">{t('cgu.article5.section4Title')}</p>
              <p>{t('cgu.article5.section4Desc')}</p>
            </div>
          </section>

          {/* Article 6 */}
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4">{t('cgu.article6.title')}</h2>
            <div className="text-gray-600 space-y-3 text-justify">
              <p>{t('cgu.article6.p1')}</p>
              <p>{t('cgu.article6.p2')}</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>{t('cgu.article6.item1')}</li>
                <li>{t('cgu.article6.item2')}</li>
                <li>{t('cgu.article6.item3')}</li>
                <li>{t('cgu.article6.item4')}</li>
              </ul>
              <p>{t('cgu.article6.p3')}</p>
            </div>
          </section>

          {/* Article 6 bis - STOCKAGE */}
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4">{t('cgu.article6bis.title')}</h2>
            <div className="text-gray-600 space-y-3 text-justify">
              <p>{t('cgu.article6bis.p1')}</p>
              <p>{t('cgu.article6bis.p2')}</p>
              <p>{t('cgu.article6bis.p3')}</p>
              <p>{t('cgu.article6bis.p4')} <a href="mailto:contact@hugoquiz.com" className="text-purple-600 hover:underline">contact@hugoquiz.com</a>. {t('cgu.article6bis.p4b')}</p>
              <p>{t('cgu.article6bis.p5')}</p>
            </div>
          </section>

          {/* Article 7 */}
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4">{t('cgu.article7.title')}</h2>
            <div className="text-gray-600 space-y-3 text-justify">
              <p>{t('cgu.article7.p1')}</p>
              <p>{t('cgu.article7.p2')}</p>
            </div>
          </section>

          {/* Article 8 */}
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4">{t('cgu.article8.title')}</h2>
            <div className="text-gray-600 space-y-3 text-justify">
              <p>{t('cgu.article8.p1')}</p>
              <p>{t('cgu.article8.p2')}</p>
            </div>
          </section>

          {/* Article 9 */}
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4">{t('cgu.article9.title')}</h2>
            <div className="text-gray-600 space-y-3 text-justify">
              <p>{t('cgu.article9.p1')}</p>
              <p>{t('cgu.article9.p2')}</p>
            </div>
          </section>

          {/* Article 10 */}
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4">{t('cgu.article10.title')}</h2>
            <div className="text-gray-600 space-y-3 text-justify">
              <p>{t('cgu.article10.p1')}</p>
              <p>{t('cgu.article10.p2')}</p>
            </div>
          </section>

          {/* Article 10 bis - SUPPRESSION DE COMPTE */}
          <section className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">{t('cgu.article10bis.title')}</h2>
            <div className="text-gray-600 space-y-3 text-justify">
              <p className="font-semibold text-red-800">{t('cgu.article10bis.section1Title')}</p>
              <p>{t('cgu.article10bis.section1Desc')}</p>
              
              <p className="font-semibold text-red-800 mt-4">{t('cgu.article10bis.section2Title')}</p>
              <p><strong>{t('cgu.article10bis.section2Warning')}</strong></p>
              <ul className="list-disc pl-6 space-y-2">
                <li>{t('cgu.article10bis.section2Item1')}</li>
                <li>{t('cgu.article10bis.section2Item2')}</li>
                <li>{t('cgu.article10bis.section2Item3')}</li>
                <li>{t('cgu.article10bis.section2Item4')}</li>
                <li>{t('cgu.article10bis.section2Item5')}</li>
              </ul>
              
              <p className="font-semibold text-red-800 mt-4">{t('cgu.article10bis.section3Title')}</p>
              <p>{t('cgu.article10bis.section3Desc')}</p>
              
              <p className="font-semibold text-red-800 mt-4">{t('cgu.article10bis.section4Title')}</p>
              <p className="bg-white p-4 rounded-lg border-l-4 border-red-500">
                <strong>{t('cgu.article10bis.section4Warning')}</strong>
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>{t('cgu.article10bis.section4Item1')}</li>
                <li>{t('cgu.article10bis.section4Item2')}</li>
                <li>{t('cgu.article10bis.section4Item3')}</li>
                <li>{t('cgu.article10bis.section4Item4')}</li>
              </ul>
              
              <p className="font-semibold text-red-800 mt-4">{t('cgu.article10bis.section5Title')}</p>
              <p>{t('cgu.article10bis.section5Desc')}</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>{t('cgu.article10bis.section5Item1')}</li>
                <li>{t('cgu.article10bis.section5Item2')}</li>
                <li>{t('cgu.article10bis.section5Item3')}</li>
              </ul>
              
              <p className="font-semibold text-red-800 mt-4">{t('cgu.article10bis.section6Title')}</p>
              <p>{t('cgu.article10bis.section6Desc')}</p>
            </div>
          </section>

          {/* Article 10 ter - PLACE DE MARCHÉ SERVICES */}
          <section className="bg-violet-50 border-2 border-violet-200 rounded-xl p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {t('cgu.servicesSection.title', 'Article 10 ter - Place de marché « Services »')}
            </h2>
            <div className="text-gray-600 space-y-3 text-justify">
              <p className="font-semibold text-violet-800">{t('cgu.servicesSection.purposeTitle', 'Objet')}</p>
              <p>{t('cgu.servicesSection.purpose', "HugoQuiz met à disposition une place de marché permettant à des utilisateurs (les « Prestataires ») de proposer leurs services à d'autres utilisateurs ou visiteurs. HugoQuiz agit uniquement en qualité d'hébergeur technique de mise en relation et n'est pas partie aux contrats conclus entre Prestataires et clients. La consultation des services est libre ; la création d'un service nécessite un compte et la vérification préalable de l'identité du Prestataire.")}</p>

              <p className="font-semibold text-violet-800 mt-4">{t('cgu.servicesSection.verificationTitle', "Vérification d'identité")}</p>
              <p>{t('cgu.servicesSection.verification', "Pour publier un service, le Prestataire doit fournir une pièce d'identité officielle en cours de validité (carte d'identité, passeport de l'Union européenne, carte de séjour, visa ou permis de conduire) ainsi qu'une courte vidéo selfie. Ces éléments servent exclusivement à confirmer que l'identité déclarée correspond bien à la personne. Tout service est soumis à validation par notre équipe avant publication.")}</p>

              <p className="font-semibold text-red-800 mt-4">{t('cgu.servicesSection.prohibitedTitle', 'Services interdits')}</p>
              <p>{t('cgu.servicesSection.prohibitedIntro', "Sont strictement interdits et feront l'objet d'un refus, d'une restriction ou d'une suppression immédiate, sans préjudice de poursuites :")}</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>{t('cgu.servicesSection.prohibited1', "tout service à caractère sexuel, pornographique ou d'escorte ;")}</li>
                <li>{t('cgu.servicesSection.prohibited2', "la vente, la production ou la distribution de drogues, de stupéfiants ou de substances illicites ;")}</li>
                <li>{t('cgu.servicesSection.prohibited3', "la vente d'armes, d'explosifs ou de produits dangereux réglementés ;")}</li>
                <li>{t('cgu.servicesSection.prohibited4', "tout service contraire à la loi ou illégal dans l'Union européenne ou dans le pays d'exécution ;")}</li>
                <li>{t('cgu.servicesSection.prohibited5', "les contenus ou activités incitant à la haine, à la violence, à la discrimination ou portant atteinte aux droits d'autrui ;")}</li>
                <li>{t('cgu.servicesSection.prohibited6', "toute escroquerie, contrefaçon, blanchiment ou activité frauduleuse.")}</li>
              </ul>

              <p className="font-semibold text-violet-800 mt-4">{t('cgu.servicesSection.responsibilityTitle', 'Responsabilité des Prestataires')}</p>
              <p>{t('cgu.servicesSection.responsibility', "Le Prestataire est seul responsable de la légalité, de l'exactitude et de l'exécution des services qu'il propose, ainsi que du respect de ses obligations légales, fiscales et réglementaires. HugoQuiz se réserve le droit de modérer, restreindre ou supprimer tout service, et de suspendre tout compte, en cas de manquement aux présentes conditions, avec notification automatique de l'utilisateur concerné.")}</p>

              <p className="font-semibold text-violet-800 mt-4">{t('cgu.servicesSection.dataTitle', 'Données et formulaire de contact')}</p>
              <p>{t('cgu.servicesSection.data', "Les coordonnées affichées publiquement (e-mail, téléphone) le sont au choix du Prestataire. Lorsqu'un visiteur envoie une demande via le formulaire de contact d'un service, les informations qu'il fournit (nom, téléphone, type de client, objet et description de la demande) sont transmises au Prestataire concerné par notification et par e-mail afin de permettre la mise en relation. En soumettant le formulaire, l'utilisateur consent expressément à ce traitement et à cette transmission. Les pièces d'identité et vidéos de vérification sont conservées de manière confidentielle et ne sont accessibles qu'à l'équipe de modération de HugoQuiz, conformément à la politique de confidentialité.")}</p>
            </div>
          </section>

          {/* Article 11 */}
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4">{t('cgu.article11.title')}</h2>
            <div className="text-gray-600 space-y-3 text-justify">
              <p>{t('cgu.article11.p1')}</p>
              <p>{t('cgu.article11.p2')}</p>
              <p>{t('cgu.article11.p3')}</p>
            </div>
          </section>

          {/* Article 12 */}
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4">{t('cgu.article12.title')}</h2>
            <div className="text-gray-600 space-y-3 text-justify">
              <p>{t('cgu.article12.desc')} <a href="mailto:contact@hugoquiz.com" className="text-purple-600 hover:underline">contact@hugoquiz.com</a></p>
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}

export default CGU
