import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'

// Pages
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import AdminPanel from './pages/AdminPanel'
import CreateQuiz from './pages/CreateQuiz'
import EditQuiz from './pages/EditQuiz'
import PlayQuiz from './pages/PlayQuiz'
import QuizResults from './pages/QuizResults'
import CreateQuestionnaire from './pages/CreateQuestionnaire'
import EditQuestionnaire from './pages/EditQuestionnaire'
import PlayQuestionnaire from './pages/PlayQuestionnaire'
import QuestionnaireResults from './pages/QuestionnaireResults'
import QuizResponses from './pages/QuizResponses'
import QuestionnaireResponses from './pages/QuestionnaireResponses'
import PendingValidation from './pages/PendingValidation'
import NotFound from './pages/NotFound'

// Components
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import Layout from './components/Layout'

function App() {
  return (
    <AuthProvider>
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
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/pending" element={<PendingValidation />} />
          
          {/* Quiz Play (Public with code) */}
          <Route path="/play/quiz/:quizId" element={<PlayQuiz />} />
          <Route path="/play/questionnaire/:questionnaireId" element={<PlayQuestionnaire />} />
          <Route path="/results/quiz/:sessionId" element={<QuizResults />} />
          <Route path="/results/questionnaire/:sessionId" element={<QuestionnaireResults />} />

          {/* Protected Routes - Require Authentication & Validation */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/quiz/create" element={<CreateQuiz />} />
              <Route path="/quiz/edit/:quizId" element={<EditQuiz />} />
              <Route path="/questionnaire/create" element={<CreateQuestionnaire />} />
              <Route path="/questionnaire/edit/:questionnaireId" element={<EditQuestionnaire />} />
              <Route path="/quiz/:quizId/responses" element={<QuizResponses />} />
              <Route path="/questionnaire/:questionnaireId/responses" element={<QuestionnaireResponses />} />
            </Route>
          </Route>

          {/* Admin Routes */}
          <Route element={<AdminRoute />}>
            <Route element={<Layout />}>
              <Route path="/admin" element={<AdminPanel />} />
            </Route>
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
