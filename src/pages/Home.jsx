import { useTranslation } from 'react-i18next'
import { FiPlay, FiEdit, FiUsers, FiCheckCircle, FiArrowRight, FiGift, FiHeart, FiStar, FiMusic, FiZap, FiCamera, FiShare2, FiTrendingUp, FiAward, FiMail, FiFileText, FiShield, FiHelpCircle, FiBriefcase } from 'react-icons/fi'
import { useAuth } from '../contexts/AuthContext'
import { useSiteConfig } from '../contexts/SiteConfigContext'
import LanguageSelector from '../components/LanguageSelector'
import LocalizedLink from '../components/LocalizedLink'
import { SERVICE_CATEGORIES, categoryLabel } from '../config/serviceCategories'

const Home = () => {
  const { user } = useAuth()
  const { getLogo, siteName, siteTagline } = useSiteConfig()
  const { t } = useTranslation()

  const mainFeatures = [
    {
      icon: FiPlay,
      title: t('home.features.quiz'),
      description: t('home.features.quizDesc'),
      color: 'bg-gradient-to-br from-violet-500 to-purple-600',
      emoji: '🎯',
      highlights: [t('home.highlights.timer'), t('home.highlights.realTimeScores'), t('home.highlights.kahootMusic')]
    },
    {
      icon: FiZap,
      title: t('home.features.quizLive'),
      description: t('home.features.quizLiveDesc'),
      color: 'bg-gradient-to-br from-amber-500 to-orange-500',
      emoji: '⚡',
      highlights: [t('home.highlights.presenterMode'), t('home.highlights.liveRanking'), t('home.highlights.upTo100Players')]
    },
    {
      icon: FiEdit,
      title: t('home.features.questionnaire'),
      description: t('home.features.questionnaireDesc'),
      color: 'bg-gradient-to-br from-blue-500 to-cyan-500',
      emoji: '📋',
      highlights: [t('home.highlights.conditionalLogic'), t('home.highlights.questionTypes'), t('home.highlights.responseAnalysis')]
    },
    {
      icon: FiGift,
      title: t('home.features.events'),
      description: t('home.features.eventsDesc'),
      color: 'bg-gradient-to-br from-pink-500 to-rose-500',
      emoji: '🎁',
      highlights: [t('home.highlights.multiReservations'), t('home.highlights.photoGallery'), t('home.highlights.pdfInvitations')]
    }
  ]

  const eventTypes = [
    { emoji: '💒', label: t('home.eventTypes.wedding') },
    { emoji: '🎂', label: t('home.eventTypes.birthday') },
    { emoji: '👶', label: t('home.eventTypes.birth') },
    { emoji: '⛪', label: t('home.eventTypes.baptism') },
    { emoji: '🏠', label: t('home.eventTypes.housewarming') },
    { emoji: '🎄', label: t('home.eventTypes.christmas') }
  ]

  const stats = [
    { value: '100%', label: t('home.stats.free'), icon: '💎' },
    { value: '∞', label: t('home.stats.unlimited'), icon: '🚀' },
    { value: '12', label: t('home.stats.questionTypes'), icon: '📝' },
    { value: '60Mo', label: t('home.stats.hdImages'), icon: '📸' }
  ]

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Top right purple blob */}
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-violet-200 via-purple-100 to-transparent rounded-full blur-3xl opacity-60" />
        {/* Bottom left purple blob */}
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-gradient-to-tr from-purple-200 via-pink-100 to-transparent rounded-full blur-3xl opacity-50" />
        {/* Center subtle blob */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-violet-50 via-purple-50 to-pink-50 rounded-full blur-3xl opacity-40" />
        
        {/* Floating emojis */}
        <div className="absolute top-32 right-[15%] text-5xl opacity-20 animate-float">🎯</div>
        <div className="absolute top-[40%] left-[10%] text-4xl opacity-15 animate-float stagger-2">🎁</div>
        <div className="absolute bottom-[30%] right-[10%] text-4xl opacity-15 animate-float stagger-3">✨</div>
        <div className="absolute bottom-[20%] left-[20%] text-3xl opacity-10 animate-float stagger-4">💝</div>
        <div className="absolute top-[20%] left-[30%] text-3xl opacity-10 animate-float stagger-5">🎉</div>
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getLogo('hero') ? (
              <img 
                src={getLogo('hero')} 
                alt={siteName} 
                className="h-12 w-12 object-contain transform hover:scale-105 transition-transform"
              />
            ) : (
              <div className="w-12 h-12 bg-gradient-to-br from-violet-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/30 transform hover:scale-105 transition-transform">
                <span className="text-2xl">🎯</span>
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">{siteName}</h1>
              <p className="text-xs text-gray-500">Quiz • {t('events.title')} • {t('events.gifts.title')} • {t('services.marketplace.navLink', 'Services')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 md:gap-4">
            {/* Language Selector */}
            <LanguageSelector />

            <LocalizedLink
              to="/services"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 font-semibold text-sm hover:bg-amber-100 transition-colors"
            >
              <FiBriefcase className="text-base" />
              <span>{t('services.marketplace.navLink', 'Services')}</span>
            </LocalizedLink>

            {user ? (
              <LocalizedLink 
                to="/dashboard" 
                className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40 transition-all hover:-translate-y-0.5"
              >
                {t('home.goToDashboard')}
              </LocalizedLink>
            ) : (
              <>
                <LocalizedLink 
                  to="/login" 
                  className="text-gray-700 font-medium hover:text-violet-600 transition-colors hidden sm:block"
                >
                  {t('home.login')}
                </LocalizedLink>
                <LocalizedLink 
                  to="/register" 
                  className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40 transition-all hover:-translate-y-0.5"
                >
                  {t('home.startFree')}
                </LocalizedLink>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-100 to-purple-100 rounded-full text-violet-700 text-sm font-semibold mb-8 border border-violet-200 shadow-sm">
              <FiStar className="w-4 h-4 text-amber-500" />
              {t('home.stats.free')} 100% • {t('common.free')}
              <span className="text-lg">✨</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold mb-8 leading-tight">
              <span className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent">
                {t('home.heroTitle')}
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
              {t('home.subtitle')}
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <LocalizedLink 
                to="/register" 
                className="group flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-lg font-bold rounded-2xl shadow-2xl shadow-violet-500/30 hover:shadow-violet-500/50 transition-all hover:-translate-y-1"
              >
                {t('home.startFree')}
                <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
              </LocalizedLink>
              <LocalizedLink 
                to="/login" 
                className="flex items-center gap-2 px-10 py-5 bg-gray-100 text-gray-700 text-lg font-semibold rounded-2xl hover:bg-gray-200 transition-all border border-gray-200"
              >
                {t('home.login')}
              </LocalizedLink>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-8 md:gap-16">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl mb-1">{stat.icon}</div>
                  <div className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">{stat.value}</div>
                  <div className="text-sm text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Main Features Section */}
      <section className="py-24 px-4 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-4xl mb-4 block">🚀</span>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {t('home.sections.allYouNeed')}
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {t('home.sections.allYouNeedDesc')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {mainFeatures.map((feature, index) => (
              <div 
                key={index}
                className="group bg-white rounded-3xl p-8 border border-gray-100 shadow-xl shadow-gray-200/50 hover:shadow-2xl hover:shadow-violet-200/50 transition-all duration-500 hover:-translate-y-2 relative overflow-hidden"
              >
                {/* Decorative gradient corner */}
                <div className={`absolute top-0 right-0 w-32 h-32 ${feature.color} opacity-10 blur-2xl rounded-full -translate-y-1/2 translate-x-1/2 group-hover:opacity-20 transition-opacity`} />
                
                <div className="flex items-start gap-6 relative">
                  <div className={`w-20 h-20 ${feature.color} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}>
                    <span className="text-4xl">{feature.emoji}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-violet-600 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 mb-4 text-lg">{feature.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {feature.highlights.map((highlight, i) => (
                        <span key={i} className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600 font-medium">
                          {highlight}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quiz Features Detail */}
      <section className="py-24 px-4 relative z-10 bg-gradient-to-b from-white via-violet-50/30 to-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-5xl mb-4 block">🎯</span>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                {t('home.sections.interactiveQuiz')}
                <span className="block text-violet-600">{t('home.sections.kahootStyle')}</span>
              </h2>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                {t('home.sections.quizDetailDesc')}
              </p>
              
              <div className="space-y-4">
                {[
                  { icon: '⏱️', text: t('home.quizFeatures.customTimer') },
                  { icon: '🎵', text: t('home.quizFeatures.kahootMusic') },
                  { icon: '🏆', text: t('home.quizFeatures.leaderboardBonus') },
                  { icon: '📊', text: t('home.quizFeatures.sevenQuestionTypes') },
                  { icon: '📱', text: t('home.quizFeatures.mobileCompatible') }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <span className="text-2xl">{item.icon}</span>
                    <span className="text-gray-700 font-medium">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-3xl p-8 shadow-2xl shadow-violet-500/30 transform rotate-2 hover:rotate-0 transition-transform duration-500">
                <div className="bg-white rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-bold text-gray-800">{t('home.quizPreview.questionNumber')}</span>
                    <span className="px-4 py-2 bg-red-100 text-red-600 rounded-full font-bold animate-pulse">⏱️ 15s</span>
                  </div>
                  <p className="text-xl text-gray-700 mb-6">{t('home.quizPreview.sampleQuestion')}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[t('home.quizPreview.option1'), t('home.quizPreview.option2'), t('home.quizPreview.option3'), t('home.quizPreview.option4')].map((opt, i) => (
                      <div key={i} className={`p-4 rounded-xl font-semibold text-center ${i === 0 ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white' : 'bg-gray-100 text-gray-700'}`}>
                        {opt}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-center gap-4 mt-6 text-white">
                  <span className="flex items-center gap-2"><FiMusic className="w-5 h-5" /> {t('home.quizFeatures.musicOn')}</span>
                  <span className="flex items-center gap-2"><FiUsers className="w-5 h-5" /> 24 {t('home.quizFeatures.players')}</span>
                </div>
              </div>
              {/* Floating elements */}
              <div className="absolute -top-6 -right-6 w-16 h-16 bg-amber-400 rounded-2xl flex items-center justify-center text-3xl shadow-lg animate-bounce-in">🏆</div>
              <div className="absolute -bottom-4 -left-4 w-14 h-14 bg-pink-400 rounded-full flex items-center justify-center text-2xl shadow-lg animate-bounce-in stagger-2">⭐</div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Marketplace Section */}
      <section className="py-24 px-4 relative z-10 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-5xl mb-4 block">🤝</span>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {t('services.marketplace.homeTitle', 'Trouvez le prestataire idéal')}
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {t('services.marketplace.homeSubtitle', 'Photographes, DJ, traiteurs, event-planners et bien plus — des professionnels vérifiés pour tous vos projets.')}
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {SERVICE_CATEGORIES.slice(0, 8).map((cat) => (
              <LocalizedLink
                key={cat.id}
                to="/services"
                className="group bg-white border border-gray-100 rounded-2xl p-6 text-center shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all"
              >
                <div className={`w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-r ${cat.color} flex items-center justify-center text-2xl`}>
                  {cat.emoji}
                </div>
                <span className="font-semibold text-gray-800 group-hover:text-violet-600 transition-colors">
                  {categoryLabel(t, cat.id)}
                </span>
              </LocalizedLink>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <LocalizedLink
              to="/services"
              className="px-8 py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/30 hover:shadow-xl transition-all hover:-translate-y-0.5 inline-flex items-center gap-2"
            >
              {t('services.marketplace.browseAll', 'Parcourir les services')} <FiArrowRight />
            </LocalizedLink>
            <LocalizedLink
              to={user ? '/service/create' : '/register'}
              className="px-8 py-4 bg-white border-2 border-violet-200 text-violet-700 font-semibold rounded-xl hover:bg-violet-50 transition-all inline-flex items-center gap-2"
            >
              {t('services.marketplace.becomeProvider', 'Proposer mes services')}
            </LocalizedLink>
          </div>
        </div>
      </section>

      {/* Events / Gift Lists Section */}
      <section className="py-24 px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gradient-to-br from-pink-50 via-purple-50 to-violet-50 rounded-[3rem] p-10 md:p-16 border border-pink-100 shadow-xl relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-10 right-10 text-6xl opacity-20 animate-float">🎁</div>
            <div className="absolute bottom-10 left-10 text-4xl opacity-20 animate-float stagger-3">💝</div>
            
            <div className="grid md:grid-cols-2 gap-12 items-center relative">
              <div>
                <span className="text-5xl mb-4 block">🎁</span>
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                  {t('home.sections.giftLists')}
                  <span className="block bg-gradient-to-r from-pink-600 to-rose-500 bg-clip-text text-transparent">
                    {t('home.sections.forAllEvents')}
                  </span>
                </h2>
                <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                  {t('home.sections.giftListDesc')}
                </p>
                
                {/* Event types */}
                <div className="flex flex-wrap gap-3 mb-8">
                  {eventTypes.map((type, i) => (
                    <span key={i} className="px-4 py-2 bg-white rounded-full text-gray-700 font-medium shadow-sm border border-gray-100 flex items-center gap-2">
                      <span className="text-xl">{type.emoji}</span>
                      {type.label}
                    </span>
                  ))}
                </div>

                <div className="space-y-3">
                  {[
                    { icon: '📸', text: t('home.giftFeatures.photoGallery') },
                    { icon: '💌', text: t('home.giftFeatures.pdfInvites') },
                    { icon: '🔢', text: t('home.giftFeatures.multiReservations') },
                    { icon: '👤', text: t('home.giftFeatures.anonymousOption') }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xl">{item.icon}</span>
                      <span className="text-gray-700">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="relative">
                <div className="bg-white rounded-3xl p-6 shadow-2xl border border-pink-100">
                  {/* Mini gift list preview */}
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                    <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl flex items-center justify-center text-xl">💒</div>
                    <div>
                      <h4 className="font-bold text-gray-900">{t('home.giftPreview.weddingTitle')}</h4>
                      <p className="text-sm text-gray-500">{t('home.giftPreview.weddingDate')}</p>
                    </div>
                  </div>
                  
                  {[
                    { name: t('home.giftPreview.item1'), price: '299€', reserved: true, by: t('home.giftPreview.reservedBy1') },
                    { name: t('home.giftPreview.item2'), price: '189€', reserved: false },
                    { name: t('home.giftPreview.item3'), price: '500€', reserved: true, by: `3 ${t('home.giftFeatures.persons')}` }
                  ].map((gift, i) => (
                    <div key={i} className={`flex items-center justify-between p-4 rounded-xl mb-3 ${gift.reserved ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🎁</span>
                        <div>
                          <p className="font-medium text-gray-800">{gift.name}</p>
                          {gift.reserved && <p className="text-xs text-green-600">✓ {t('home.giftFeatures.reservedBy')} {gift.by}</p>}
                        </div>
                      </div>
                      <span className="font-bold text-gray-700">{gift.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Guest List Section */}
      <section className="py-24 px-4 relative z-10 bg-gradient-to-b from-white via-emerald-50/30 to-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="relative order-2 md:order-1">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-8 shadow-2xl shadow-emerald-500/30 transform -rotate-2 hover:rotate-0 transition-transform duration-500">
                <div className="bg-white rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xl font-bold text-gray-800">📋 {t('home.guestList.title', 'Liste des invités')}</span>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-semibold">47/50</span>
                  </div>
                  <div className="space-y-3">
                    {[
                      { name: t('home.guestListPreview.guest1'), status: 'confirmed', count: 2 },
                      { name: t('home.guestListPreview.guest2'), status: 'confirmed', count: 4 },
                      { name: t('home.guestListPreview.guest3'), status: 'pending', count: 1 }
                    ].map((guest, i) => (
                      <div key={i} className={`flex items-center justify-between p-3 rounded-xl ${guest.status === 'confirmed' ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{guest.status === 'confirmed' ? '✅' : '⏳'}</span>
                          <span className="font-medium text-gray-800">{guest.name}</span>
                        </div>
                        <span className="text-sm text-gray-600">{guest.count} {t('home.guestList.persons', 'pers.')}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-center gap-4 mt-6 text-white">
                  <span className="flex items-center gap-2"><FiUsers className="w-5 h-5" /> 47 {t('home.guestList.confirmed', 'confirmés')}</span>
                  <span className="flex items-center gap-2"><FiCheckCircle className="w-5 h-5" /> 94%</span>
                </div>
              </div>
              <div className="absolute -top-6 -right-6 w-16 h-16 bg-amber-400 rounded-2xl flex items-center justify-center text-3xl shadow-lg animate-bounce-in">📬</div>
            </div>
            
            <div className="order-1 md:order-2">
              <span className="text-5xl mb-4 block">📋</span>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                {t('home.guestList.heading', 'Gérez vos invités')}
                <span className="block text-emerald-600">{t('home.guestList.subheading', 'en toute simplicité')}</span>
              </h2>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                {t('home.guestList.description', 'Suivez les confirmations, envoyez des rappels et exportez votre liste. Tout est centralisé pour une organisation parfaite.')}
              </p>
              <div className="space-y-4">
                {[
                  { icon: '✉️', text: t('home.guestList.feature1', 'Invitations personnalisées par email') },
                  { icon: '📊', text: t('home.guestList.feature2', 'Suivi des confirmations en temps réel') },
                  { icon: '📥', text: t('home.guestList.feature3', 'Export PDF et Excel') }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <span className="text-2xl">{item.icon}</span>
                    <span className="text-gray-700 font-medium">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Guestbook Section */}
      <section className="py-24 px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-5xl mb-4 block">📖</span>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                {t('home.guestbook.heading', 'Livre d\'or digital')}
                <span className="block text-pink-600">{t('home.guestbook.subheading', 'Des souvenirs pour toujours')}</span>
              </h2>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                {t('home.guestbook.description', 'Vos invités laissent leurs messages et photos. Créez un album de souvenirs unique que vous garderez précieusement.')}
              </p>
              <div className="space-y-4">
                {[
                  { icon: '💬', text: t('home.guestbook.feature1', 'Messages texte et audio') },
                  { icon: '📸', text: t('home.guestbook.feature2', 'Photos et vidéos des invités') },
                  { icon: '🎨', text: t('home.guestbook.feature3', 'Design personnalisable') }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <span className="text-2xl">{item.icon}</span>
                    <span className="text-gray-700 font-medium">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-3xl p-8 shadow-2xl shadow-pink-500/30 transform rotate-2 hover:rotate-0 transition-transform duration-500">
                <div className="bg-white rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b">
                    <span className="text-2xl">📖</span>
                    <span className="text-xl font-bold text-gray-800">{t('home.guestbook.bookTitle', 'Livre d\'or')}</span>
                  </div>
                  <div className="space-y-4">
                    {[
                      { name: t('home.guestbookPreview.author1'), message: t('home.guestbookPreview.message1'), hasPhoto: true },
                      { name: t('home.guestbookPreview.author2'), message: t('home.guestbookPreview.message2'), hasPhoto: false },
                      { name: t('home.guestbookPreview.author3'), message: t('home.guestbookPreview.message3'), hasPhoto: true }
                    ].map((entry, i) => (
                      <div key={i} className="p-3 bg-pink-50 rounded-xl">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-800">{entry.name}</span>
                          {entry.hasPhoto && <span className="text-xs bg-pink-200 text-pink-700 px-2 py-0.5 rounded-full">📷</span>}
                        </div>
                        <p className="text-gray-600 text-sm">{entry.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-6 -left-6 w-16 h-16 bg-violet-400 rounded-full flex items-center justify-center text-3xl shadow-lg animate-bounce-in stagger-2">💝</div>
            </div>
          </div>
        </div>
      </section>

      {/* Seating Plan Section */}
      <section className="py-24 px-4 relative z-10 bg-gradient-to-b from-white via-blue-50/30 to-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="relative order-2 md:order-1">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl p-8 shadow-2xl shadow-blue-500/30 transform -rotate-1 hover:rotate-0 transition-transform duration-500">
                <div className="bg-white rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-bold text-gray-800">🪑 {t('home.seating.preview', 'Plan de salle')}</span>
                    <span className="text-sm text-gray-500">8 {t('home.seating.tables', 'tables')}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                      <div key={num} className="aspect-square bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center border-2 border-blue-300 hover:scale-110 transition-transform cursor-pointer">
                        <div className="text-center">
                          <span className="text-lg font-bold text-blue-700">{num}</span>
                          <p className="text-xs text-blue-600">{Math.floor(Math.random() * 4) + 4}p</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-center gap-4 mt-6 text-white">
                  <span>🪑 50 {t('home.seating.seats', 'places')}</span>
                  <span>📍 {t('home.seating.dragDrop', 'Glisser-déposer')}</span>
                </div>
              </div>
              <div className="absolute -top-4 -left-4 w-14 h-14 bg-indigo-400 rounded-xl flex items-center justify-center text-2xl shadow-lg animate-float">🎯</div>
            </div>
            
            <div className="order-1 md:order-2">
              <span className="text-5xl mb-4 block">🪑</span>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                {t('home.seating.heading', 'Plan de salle interactif')}
                <span className="block text-blue-600">{t('home.seating.subheading', 'avec placement par tables')}</span>
              </h2>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                {t('home.seating.description', 'Créez votre plan de salle en glisser-déposer. Assignez vos invités aux tables et visualisez le résultat en temps réel.')}
              </p>
              <div className="space-y-4">
                {[
                  { icon: '🖱️', text: t('home.seating.feature1', 'Interface glisser-déposer intuitive') },
                  { icon: '👥', text: t('home.seating.feature2', 'Attribution automatique des places') },
                  { icon: '🖨️', text: t('home.seating.feature3', 'Export et impression du plan') }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <span className="text-2xl">{item.icon}</span>
                    <span className="text-gray-700 font-medium">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pro Plan Section */}
      <section className="py-24 px-4 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 rounded-[3rem] p-10 md:p-16 relative overflow-hidden shadow-2xl shadow-violet-500/30">
            <div className="absolute top-6 left-6 text-5xl opacity-30 animate-float">⭐</div>
            <div className="absolute bottom-6 right-6 text-5xl opacity-30 animate-float stagger-2">🚀</div>
            
            <div className="relative text-center mb-10">
              <span className="inline-flex items-center gap-2 px-5 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-semibold mb-6">
                <FiZap className="w-4 h-4 text-amber-400" />
                {t('home.pro.badge', 'Forfait Pro')}
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                {t('home.pro.heading', 'Passez au niveau supérieur')}
              </h2>
              <p className="text-xl text-white/80 max-w-2xl mx-auto">
                {t('home.pro.description', 'Débloquez toutes les fonctionnalités et profitez de participants illimités pour vos quiz et événements.')}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-10">
              {[
                { icon: '👥', title: t('home.pro.feature1Title', 'Participants illimités'), desc: t('home.pro.feature1Desc', 'Plus de limite de 5 joueurs') },
                { icon: '📋', title: t('home.pro.feature2Title', 'Questionnaires'), desc: t('home.pro.feature2Desc', 'Créez des sondages complets') },
                { icon: '🎁', title: t('home.pro.feature3Title', 'Événements'), desc: t('home.pro.feature3Desc', 'Listes de cadeaux, invités, plan de salle') }
              ].map((feature, i) => (
                <div key={i} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
                  <span className="text-4xl mb-3 block">{feature.icon}</span>
                  <h3 className="text-lg font-bold text-white mb-1">{feature.title}</h3>
                  <p className="text-white/70 text-sm">{feature.desc}</p>
                </div>
              ))}
            </div>

            <div className="text-center">
              <div className="inline-flex items-baseline gap-2 mb-6">
                <span className="text-5xl font-bold text-white">{t('home.pro.price', 'À partir de 5€')}</span>
                <span className="text-white/70">{t('home.pro.period', '/mois')}</span>
              </div>
              <div>
                <LocalizedLink 
                  to="/pricing" 
                  className="inline-flex items-center gap-3 px-10 py-5 bg-white text-violet-600 text-lg font-bold rounded-2xl shadow-2xl hover:shadow-white/30 transition-all hover:-translate-y-1"
                >
                  {t('home.pro.cta', 'Voir les forfaits')}
                  <FiArrowRight />
                </LocalizedLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 px-4 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-4xl mb-4 block">✨</span>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {t('home.sections.simpleAsHello')}
            </h2>
            <p className="text-xl text-gray-600">{t('home.sections.createShareIn4Steps')}</p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: 1, title: t('home.howItWorks.step1Title'), description: t('home.howItWorks.step1Desc'), icon: '👤', color: 'from-violet-500 to-purple-600' },
              { step: 2, title: t('home.howItWorks.step2Title'), description: t('home.howItWorks.step2Desc'), icon: '✏️', color: 'from-blue-500 to-cyan-500' },
              { step: 3, title: t('home.howItWorks.step3Title'), description: t('home.howItWorks.step3Desc'), icon: '🔗', color: 'from-pink-500 to-rose-500' },
              { step: 4, title: t('home.howItWorks.step4Title'), description: t('home.howItWorks.step4Desc'), icon: '📊', color: 'from-emerald-500 to-green-500' }
            ].map((item) => (
              <div 
                key={item.step} 
                className="group text-center"
              >
                <div className={`w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center text-4xl shadow-lg group-hover:scale-110 transition-transform`}>
                  {item.icon}
                </div>
                <div className="px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-xs font-bold inline-block mb-3">
                  {t('home.howItWorks.step')} {item.step}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-pink-600 rounded-[3rem] p-12 md:p-16 text-center relative overflow-hidden shadow-2xl shadow-violet-500/30">
            {/* Decorative elements */}
            <div className="absolute top-6 left-6 text-5xl opacity-30 animate-float">🎉</div>
            <div className="absolute bottom-6 right-6 text-5xl opacity-30 animate-float stagger-2">✨</div>
            <div className="absolute top-1/2 left-10 text-3xl opacity-20 animate-float stagger-3">🎯</div>
            <div className="absolute top-1/2 right-10 text-3xl opacity-20 animate-float stagger-4">🎁</div>
            
            <div className="relative">
              <span className="text-6xl mb-6 block">🚀</span>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                {t('home.cta.readyToCreate')}
              </h2>
              <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
                {t('home.cta.joinHugoQuiz')}
                <span className="block mt-2 font-semibold text-white">{t('home.cta.foreverFree')}</span>
              </p>
              <LocalizedLink 
                to="/register" 
                className="group inline-flex items-center gap-3 px-12 py-6 bg-white text-violet-600 text-xl font-bold rounded-2xl shadow-2xl hover:shadow-white/30 transition-all hover:-translate-y-1"
              >
                {t('home.cta.createFreeAccount')}
                <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
              </LocalizedLink>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-gray-200 relative z-10 bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Logo */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                {getLogo('footer') || getLogo('header') ? (
                  <img src={getLogo('footer') || getLogo('header')} alt="Logo" className="w-10 h-10 object-contain" />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-purple-600 rounded-xl flex items-center justify-center">
                    <span className="text-xl">🎯</span>
                  </div>
                )}
                <div>
                  <span className="font-bold text-white">{siteName}</span>
                  <p className="text-xs text-gray-400">{siteTagline}</p>
                </div>
              </div>
              <p className="text-gray-400 text-sm">
                {t('footer.description', 'La plateforme interactive pour créer des quiz, questionnaires et gérer vos événements.')}
              </p>
            </div>

            {/* Features */}
            <div>
              <h4 className="font-semibold text-white mb-4">{t('home.navbar.features', 'Fonctionnalités')}</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>🎯 {t('home.navbar.interactiveQuiz')}</li>
                <li>⚡ {t('home.navbar.liveQuiz')}</li>
                <li>📋 {t('home.navbar.questionnaires')}</li>
                <li>🎁 {t('home.navbar.giftLists')}</li>
              </ul>
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
                  <LocalizedLink 
                    to="/cgu" 
                    className="text-gray-400 hover:text-purple-400 transition-colors flex items-center gap-2"
                  >
                    <FiFileText className="text-xs" />
                    {t('footer.terms', 'Conditions Générales d\'Utilisation')}
                  </LocalizedLink>
                </li>
                <li>
                  <LocalizedLink 
                    to="/privacy" 
                    className="text-gray-400 hover:text-purple-400 transition-colors flex items-center gap-2"
                  >
                    <FiShield className="text-xs" />
                    {t('footer.privacy', 'Protection des données')}
                  </LocalizedLink>
                </li>
                <li>
                  <LocalizedLink 
                    to="/help" 
                    className="text-gray-400 hover:text-purple-400 transition-colors flex items-center gap-2"
                  >
                    <FiHelpCircle className="text-xs" />
                    {t('footer.help', 'Aide')}
                  </LocalizedLink>
                </li>
              </ul>
            </div>
          </div>
          
          {/* Bottom bar */}
          <div className="border-t border-gray-800 pt-6 text-center">
            <p className="text-gray-500 text-sm flex items-center justify-center gap-2">
              {t('home.footer.createdWith')} <FiHeart className="w-4 h-4 text-pink-500 animate-heart-beat" /> © {new Date().getFullYear()} HugoQuiz. {t('footer.rights', 'Tous droits réservés.')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Home
