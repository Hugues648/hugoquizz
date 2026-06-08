import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import { SiteConfigProvider } from './contexts/SiteConfigContext'
import LanguageWrapper, { LanguageRedirect, LegacyRedirect } from './components/LanguageWrapper'

// Global URL cleaner - strips invisible characters added by WhatsApp, Telegram, etc.
// These chars make URLs look identical but break routing
function UrlCleaner({ children }) {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    // Remove zero-width spaces, LTR/RTL marks, BOM, non-breaking spaces, and other invisible chars
    const cleanPath = decodeURIComponent(location.pathname)
      .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF\u00A0\u034F\u061C\u180E]/g, '')
      .replace(/\s+$/, '')
    
    const originalDecoded = decodeURIComponent(location.pathname)
    
    if (cleanPath !== originalDecoded) {
      console.log('URL cleaned: removed invisible characters from', location.pathname)
      navigate(cleanPath + location.search + location.hash, { replace: true })
    }
  }, [location.pathname])

  return children
}

// Pages
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import AdminPanel from './pages/AdminPanel'
import AdminQuizMusic from './pages/AdminQuizMusic'
import AdminChat from './pages/AdminChat'
import CreateQuiz from './pages/CreateQuiz'
import EditQuiz from './pages/EditQuiz'
import PlayQuiz from './pages/PlayQuiz'
import PlayQuizLive from './pages/PlayQuizLive'
import JoinQuizLive from './pages/JoinQuizLive'
import HostQuiz from './pages/HostQuiz'
import QuizResults from './pages/QuizResults'
import QuizLeaderboard from './pages/QuizLeaderboard'
import CreateQuestionnaire from './pages/CreateQuestionnaire'
import EditQuestionnaire from './pages/EditQuestionnaire'
import PlayQuestionnaire from './pages/PlayQuestionnaire'
import QuestionnaireResults from './pages/QuestionnaireResults'
import QuizResponses from './pages/QuizResponses'
import QuestionnaireResponses from './pages/QuestionnaireResponses'
import CreateEvent from './pages/CreateEvent'
import EditEvent from './pages/EditEvent'
import ViewEvent from './pages/ViewEvent'
import EventResponses from './pages/EventResponses'
import EventVisitors from './pages/EventVisitors'
import GuestManagement from './pages/GuestManagement'
import TableManagement from './pages/TableManagement'
import SeatingPlan from './pages/SeatingPlan'
import Guestbook from './pages/Guestbook'
import QRScanner from './pages/QRScanner'
import EventPlanning from './pages/EventPlanning'
import EditEventProgram from './pages/EditEventProgram'
import EditEventMenu from './pages/EditEventMenu'
import EventTasks from './pages/EventTasks'
import ViewEventPlanning from './pages/ViewEventPlanning'
import PendingValidation from './pages/PendingValidation'
import Settings from './pages/Settings'
import Pricing from './pages/Pricing'
import Profile from './pages/Profile'
import Notifications from './pages/Notifications'
import { SubscriptionSuccess, SubscriptionCancel } from './pages/SubscriptionResult'
import CGU from './pages/CGU'
import Privacy from './pages/Privacy'
import Help from './pages/Help'
import NotFound from './pages/NotFound'
// Services Marketplace
import ServicesMarketplace from './pages/ServicesMarketplace'
import ServiceView from './pages/ServiceView'
import ServiceVerify from './pages/ServiceVerify'
import CreateService from './pages/CreateService'
import ServiceMessages from './pages/ServiceMessages'

// Components
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import Layout from './components/Layout'
import KeyboardShortcuts from './components/KeyboardShortcuts'
import Tutorial from './components/Tutorial'
import Chatbot from './components/ChatbotHybrid'

function App() {
  return (
    <AuthProvider>
      <SiteConfigProvider>
        <Router>
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
                borderRadius: '12px',
              },
              success: {
                iconTheme: {
                  primary: '#22c55e',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        
        {/* Global Components */}
        <KeyboardShortcuts />
        <Tutorial />
        <Chatbot />
        
        <UrlCleaner>
        <Routes>
          {/* Racine - Redirection douce vers /:lang */}
          <Route path="/" element={<LanguageRedirect><Home /></LanguageRedirect>} />
          
          {/* Routes avec préfixe de langue */}
          <Route path="/:lang" element={<LanguageWrapper />}>
            {/* Public Routes */}
            <Route index element={<Home />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="pending" element={<PendingValidation />} />
            
            {/* Quiz Play (Public with code) */}
            <Route path="play/quiz/:quizId" element={<PlayQuiz />} />
            <Route path="join/quiz/:quizId" element={<JoinQuizLive />} />
            <Route path="play/quiz/:quizId/live/:sessionId" element={<PlayQuizLive />} />
            <Route path="play/questionnaire/:questionnaireId" element={<PlayQuestionnaire />} />
            <Route path="results/quiz/:sessionId" element={<QuizResults />} />
            <Route path="quiz/:quizId/leaderboard" element={<QuizLeaderboard />} />
            <Route path="results/questionnaire/:sessionId" element={<QuestionnaireResults />} />
            
            {/* Subscription / Pricing */}
            <Route path="pricing" element={<Pricing />} />
            <Route path="subscription/success" element={<SubscriptionSuccess />} />
            <Route path="subscription/cancel" element={<SubscriptionCancel />} />
            
            {/* Legal Pages */}
            <Route path="cgu" element={<CGU />} />
            <Route path="privacy" element={<Privacy />} />
            <Route path="help" element={<Help />} />
            
            {/* Event (Public view) */}
            <Route path="event/:id" element={<ViewEvent />} />
            <Route path="event/:id/guestbook" element={<Guestbook />} />
            <Route path="event/:id/planning/:shareCode" element={<ViewEventPlanning />} />

            {/* Services Marketplace (Public) */}
            <Route path="services" element={<ServicesMarketplace />} />
            <Route path="service/:serviceId" element={<ServiceView />} />

            {/* Protected Routes - Require Authentication & Validation */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="profile" element={<Profile />} />
                <Route path="quiz/create" element={<CreateQuiz />} />
                <Route path="quiz/edit/:quizId" element={<EditQuiz />} />
                <Route path="questionnaire/create" element={<CreateQuestionnaire />} />
                <Route path="questionnaire/edit/:questionnaireId" element={<EditQuestionnaire />} />
                <Route path="quiz/:quizId/responses" element={<QuizResponses />} />
                <Route path="quiz/:quizId/host" element={<HostQuiz />} />
                <Route path="questionnaire/:questionnaireId/responses" element={<QuestionnaireResponses />} />
                <Route path="event/create" element={<CreateEvent />} />
                <Route path="event/:id/edit" element={<EditEvent />} />
                <Route path="event/:id/responses" element={<EventResponses />} />
                <Route path="event/:id/visitors" element={<EventVisitors />} />
                <Route path="event/:id/guests" element={<GuestManagement />} />
                <Route path="event/:id/tables" element={<TableManagement />} />
                <Route path="event/:id/seating" element={<SeatingPlan />} />
                <Route path="event/:id/planning" element={<EventPlanning />} />
                <Route path="event/:id/tasks" element={<EventTasks />} />
                <Route path="event/:id/program/create" element={<EditEventProgram />} />
                <Route path="event/:id/program/:programId/edit" element={<EditEventProgram />} />
                <Route path="event/:id/menu/create" element={<EditEventMenu />} />
                <Route path="event/:id/menu/:menuId/edit" element={<EditEventMenu />} />
                <Route path="event/:id/scanner" element={<QRScanner />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="settings" element={<Settings />} />
                {/* Services (provider area) */}
                <Route path="service/verify" element={<ServiceVerify />} />
                <Route path="service/create" element={<CreateService />} />
                <Route path="service/edit/:serviceId" element={<CreateService />} />
                <Route path="service/messages" element={<ServiceMessages />} />
              </Route>
            </Route>

            {/* Admin Routes */}
            <Route element={<AdminRoute />}>
              <Route element={<Layout />}>
                <Route path="admin" element={<AdminPanel />} />
                <Route path="admin/quiz-music" element={<AdminQuizMusic />} />
                <Route path="admin/chat" element={<AdminChat />} />
              </Route>
            </Route>
          </Route>

          {/* Anciennes routes sans langue - Redirection automatique vers /:lang/... */}
          <Route path="/login" element={<LegacyRedirect />} />
          <Route path="/register" element={<LegacyRedirect />} />
          <Route path="/dashboard" element={<LegacyRedirect />} />
          <Route path="/pricing" element={<LegacyRedirect />} />
          <Route path="/pending" element={<LegacyRedirect />} />
          <Route path="/profile" element={<LegacyRedirect />} />
          <Route path="/settings" element={<LegacyRedirect />} />
          <Route path="/admin/*" element={<LegacyRedirect />} />
          <Route path="/cgu" element={<LegacyRedirect />} />
          <Route path="/privacy" element={<LegacyRedirect />} />
          <Route path="/help" element={<LegacyRedirect />} />
          <Route path="/quiz/*" element={<LegacyRedirect />} />
          <Route path="/questionnaire/*" element={<LegacyRedirect />} />
          <Route path="/event/*" element={<LegacyRedirect />} />
          <Route path="/play/*" element={<LegacyRedirect />} />
          <Route path="/join/*" element={<LegacyRedirect />} />
          <Route path="/results/*" element={<LegacyRedirect />} />
          <Route path="/subscription/*" element={<LegacyRedirect />} />
          <Route path="/services" element={<LegacyRedirect />} />
          <Route path="/service/*" element={<LegacyRedirect />} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </UrlCleaner>
        </Router>
      </SiteConfigProvider>
    </AuthProvider>
  )
}

export default App
