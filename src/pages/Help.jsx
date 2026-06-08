import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { 
  FiHelpCircle, 
  FiChevronDown,
  FiCalendar,
  FiUsers,
  FiGift,
  FiGrid,
  FiBook,
  FiBarChart2,
  FiClipboard,
  FiList,
  FiSettings,
  FiPlay,
  FiAward,
  FiClock,
  FiMusic,
  FiFileText,
  FiImage,
  FiBell,
  FiCreditCard,
  FiShield,
  FiMessageCircle,
  FiStar,
  FiRefreshCw,
  FiZap,
  FiHeart,
  FiTarget,
  FiMail
} from 'react-icons/fi'
import { HiQrcode } from 'react-icons/hi'

const Help = () => {
  const { t } = useTranslation()
  const [openFaqIndex, setOpenFaqIndex] = useState(null)
  const [activeSection, setActiveSection] = useState('faq')

  const toggleFaq = (index) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index)
  }

  // FAQ Data
  const faqItems = [
    { question: t('help.faq.q1.question'), answer: t('help.faq.q1.answer') },
    { question: t('help.faq.q2.question'), answer: t('help.faq.q2.answer') },
    { question: t('help.faq.q3.question'), answer: t('help.faq.q3.answer') },
    { question: t('help.faq.q4.question'), answer: t('help.faq.q4.answer') },
    { question: t('help.faq.q5.question'), answer: t('help.faq.q5.answer') },
    { question: t('help.faq.q6.question'), answer: t('help.faq.q6.answer') },
    { question: t('help.faq.q7.question'), answer: t('help.faq.q7.answer') },
    { question: t('help.faq.q8.question'), answer: t('help.faq.q8.answer') },
    { question: t('help.faq.q9.question'), answer: t('help.faq.q9.answer') },
    { question: t('help.faq.q10.question'), answer: t('help.faq.q10.answer') },
    { question: t('help.faq.q11.question'), answer: t('help.faq.q11.answer') },
    { question: t('help.faq.q12.question'), answer: t('help.faq.q12.answer') },
    { question: t('help.faq.q13.question'), answer: t('help.faq.q13.answer') },
    { question: t('help.faq.q14.question'), answer: t('help.faq.q14.answer') },
    { question: t('help.faq.q15.question'), answer: t('help.faq.q15.answer') }
  ]

  // Documentation sections
  const docSections = [
    {
      id: 'events',
      icon: FiCalendar,
      title: t('help.docs.events.title'),
      description: t('help.docs.events.description'),
      color: 'from-purple-500 to-indigo-600',
      features: [
        { icon: FiUsers, title: t('help.docs.events.guests.title'), content: t('help.docs.events.guests.content') },
        { icon: FiGift, title: t('help.docs.events.gifts.title'), content: t('help.docs.events.gifts.content') },
        { icon: FiGrid, title: t('help.docs.events.tables.title'), content: t('help.docs.events.tables.content') },
        { icon: HiQrcode, title: t('help.docs.events.qrcode.title'), content: t('help.docs.events.qrcode.content') },
        { icon: FiTarget, title: t('help.docs.events.seating.title'), content: t('help.docs.events.seating.content') },
        { icon: FiBook, title: t('help.docs.events.guestbook.title'), content: t('help.docs.events.guestbook.content') },
        { icon: FiBarChart2, title: t('help.docs.events.stats.title'), content: t('help.docs.events.stats.content') },
        { icon: FiClipboard, title: t('help.docs.events.planning.title'), content: t('help.docs.events.planning.content') },
        { icon: FiList, title: t('help.docs.events.program.title'), content: t('help.docs.events.program.content') },
        { icon: FiFileText, title: t('help.docs.events.menu.title'), content: t('help.docs.events.menu.content') },
        { icon: FiClipboard, title: t('help.docs.events.tasks.title'), content: t('help.docs.events.tasks.content') }
      ]
    },
    {
      id: 'quiz',
      icon: FiZap,
      title: t('help.docs.quiz.title'),
      description: t('help.docs.quiz.description'),
      color: 'from-amber-500 to-orange-600',
      features: [
        { icon: FiPlay, title: t('help.docs.quiz.create.title'), content: t('help.docs.quiz.create.content') },
        { icon: FiTarget, title: t('help.docs.quiz.live.title'), content: t('help.docs.quiz.live.content') },
        { icon: FiClock, title: t('help.docs.quiz.async.title'), content: t('help.docs.quiz.async.content') },
        { icon: FiAward, title: t('help.docs.quiz.leaderboard.title'), content: t('help.docs.quiz.leaderboard.content') },
        { icon: FiBarChart2, title: t('help.docs.quiz.stats.title'), content: t('help.docs.quiz.stats.content') },
        { icon: FiMusic, title: t('help.docs.quiz.music.title'), content: t('help.docs.quiz.music.content') },
        { icon: FiImage, title: t('help.docs.quiz.media.title'), content: t('help.docs.quiz.media.content') },
        { icon: FiSettings, title: t('help.docs.quiz.settings.title'), content: t('help.docs.quiz.settings.content') }
      ]
    },
    {
      id: 'questionnaire',
      icon: FiClipboard,
      title: t('help.docs.questionnaire.title'),
      description: t('help.docs.questionnaire.description'),
      color: 'from-emerald-500 to-teal-600',
      features: [
        { icon: FiFileText, title: t('help.docs.questionnaire.create.title'), content: t('help.docs.questionnaire.create.content') },
        { icon: FiRefreshCw, title: t('help.docs.questionnaire.conditional.title'), content: t('help.docs.questionnaire.conditional.content') },
        { icon: FiList, title: t('help.docs.questionnaire.types.title'), content: t('help.docs.questionnaire.types.content') },
        { icon: FiBarChart2, title: t('help.docs.questionnaire.results.title'), content: t('help.docs.questionnaire.results.content') },
        { icon: FiStar, title: t('help.docs.questionnaire.customization.title'), content: t('help.docs.questionnaire.customization.content') }
      ]
    },
    {
      id: 'account',
      icon: FiSettings,
      title: t('help.docs.account.title'),
      description: t('help.docs.account.description'),
      color: 'from-blue-500 to-cyan-600',
      features: [
        { icon: FiCreditCard, title: t('help.docs.account.subscription.title'), content: t('help.docs.account.subscription.content') },
        { icon: FiShield, title: t('help.docs.account.security.title'), content: t('help.docs.account.security.content') },
        { icon: FiBell, title: t('help.docs.account.notifications.title'), content: t('help.docs.account.notifications.content') },
        { icon: FiMessageCircle, title: t('help.docs.account.support.title'), content: t('help.docs.account.support.content') }
      ]
    }
  ]

  const tips = [
    { icon: FiZap, text: t('help.tips.tip1') },
    { icon: FiBook, text: t('help.tips.tip2') },
    { icon: FiHeart, text: t('help.tips.tip3') },
    { icon: FiStar, text: t('help.tips.tip4') }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900/20">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-300/20 rounded-full blur-3xl animate-pulse"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 py-16 sm:py-24">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-6 backdrop-blur-sm">
              <FiHelpCircle className="w-12 h-12" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              {t('help.hero.title')}
            </h1>
            <p className="text-xl text-white/80 max-w-2xl mx-auto mb-8">
              {t('help.hero.subtitle')}
            </p>
            
            {/* Navigation Tabs */}
            <div className="inline-flex bg-white/10 backdrop-blur-sm rounded-xl p-1.5">
              <button
                onClick={() => setActiveSection('faq')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                  activeSection === 'faq'
                    ? 'bg-white text-purple-600 shadow-lg'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                {t('help.tabs.faq')}
              </button>
              <button
                onClick={() => setActiveSection('docs')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                  activeSection === 'docs'
                    ? 'bg-white text-purple-600 shadow-lg'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                {t('help.tabs.docs')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* FAQ Section */}
        {activeSection === 'faq' && (
          <div className="space-y-8">
            {/* Tips Banner */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl p-6 border border-amber-200 dark:border-amber-800">
              <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-200 mb-4 flex items-center gap-2">
                <FiZap className="w-6 h-6" />
                {t('help.tips.title')}
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {tips.map((tip, index) => (
                  <div key={index} className="flex items-start gap-3 text-amber-700 dark:text-amber-300">
                    <tip.icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{tip.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* FAQ List */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                {t('help.faq.title')}
              </h2>
              {faqItems.map((item, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 hover:shadow-md"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <span className="font-medium text-gray-900 dark:text-white pr-4">
                      {item.question}
                    </span>
                    <FiChevronDown
                      className={`w-5 h-5 text-gray-500 transition-transform duration-300 flex-shrink-0 ${
                        openFaqIndex === index ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      openFaqIndex === index ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="px-6 pb-5 text-gray-600 dark:text-gray-300 border-t border-gray-100 dark:border-gray-700 pt-4 whitespace-pre-line">
                      {item.answer}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Documentation Section */}
        {activeSection === 'docs' && (
          <div className="space-y-12">
            {docSections.map((section) => (
              <div
                key={section.id}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 hover:shadow-xl"
              >
                {/* Section Header */}
                <div className={`bg-gradient-to-r ${section.color} p-6 sm:p-8`}>
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                      <section.icon className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">
                        {section.title}
                      </h2>
                      <p className="text-white/80 mt-1">
                        {section.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Features Grid */}
                <div className="p-6 sm:p-8">
                  <div className="grid md:grid-cols-2 gap-6">
                    {section.features.map((feature, featureIndex) => (
                      <div
                        key={featureIndex}
                        className="group p-5 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300 hover:shadow-md"
                      >
                        <div className="flex items-start gap-4">
                          <div className={`p-2.5 bg-gradient-to-br ${section.color} rounded-lg text-white flex-shrink-0`}>
                            <feature.icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                              {feature.title}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                              {feature.content}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {/* Contact Section */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-8 text-center text-white">
              <FiMessageCircle className="w-12 h-12 mx-auto mb-4 opacity-80" />
              <h3 className="text-2xl font-bold mb-2">
                {t('help.contact.title')}
              </h3>
              <p className="text-white/80 mb-6 max-w-xl mx-auto">
                {t('help.contact.description')}
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <a
                  href="mailto:contact@hugoquiz.com"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-purple-600 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                >
                  <FiMail className="w-5 h-5" />
                  {t('help.contact.email')}
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Help
