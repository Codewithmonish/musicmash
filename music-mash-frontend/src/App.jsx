import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, MotionConfig } from 'framer-motion'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import LoadingScreen from './components/animations/LoadingScreen'
import { AppToaster } from './components/ui/Toast'

// Pages are code-split: each route loads its own chunk.
const LandingPage = lazy(() => import('./pages/LandingPage'))
const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'))
const OnboardingPage = lazy(() => import('./pages/onboarding/OnboardingPage'))
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'))
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage'))
const UploadPage = lazy(() => import('./pages/upload/UploadPage'))
const PracticeArenaPage = lazy(() => import('./pages/practice/PracticeArenaPage'))
const ChallengesPage = lazy(() => import('./pages/challenges/ChallengesPage'))
const SocialPage = lazy(() => import('./pages/social/SocialPage'))
const AIAnalysisPage = lazy(() => import('./pages/ai/AIAnalysisPage'))
const JudgeDashboard = lazy(() => import('./pages/judge/JudgeDashboard'))
const CompetitionPage = lazy(() => import('./pages/competition/CompetitionPage'))
const LeaderboardPage = lazy(() => import('./pages/leaderboard/LeaderboardPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const CreditsPage = lazy(() => import('./pages/CreditsPage'))
// Dev-only component gallery; the import is dropped from production builds.
const StyleguidePage = import.meta.env.DEV ? lazy(() => import('./pages/dev/StyleguidePage')) : null

const protectedPage = (Page) => (
  <ProtectedRoute>
    <Page />
  </ProtectedRoute>
)

const AppRoutes = () => {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<LoadingScreen />}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/credits" element={<CreditsPage />} />

          <Route path="/onboarding" element={protectedPage(OnboardingPage)} />
          <Route path="/dashboard" element={protectedPage(DashboardPage)} />
          <Route path="/profile" element={protectedPage(ProfilePage)} />
          <Route path="/upload" element={protectedPage(UploadPage)} />
          <Route path="/practice" element={protectedPage(PracticeArenaPage)} />
          <Route path="/challenges" element={protectedPage(ChallengesPage)} />
          <Route path="/social" element={protectedPage(SocialPage)} />
          <Route path="/ai-analysis/:id" element={protectedPage(AIAnalysisPage)} />
          <Route path="/judge" element={protectedPage(JudgeDashboard)} />
          <Route path="/competitions" element={protectedPage(CompetitionPage)} />
          <Route path="/leaderboard" element={protectedPage(LeaderboardPage)} />

          {StyleguidePage && <Route path="/styleguide" element={<StyleguidePage />} />}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  )
}

function App() {
  return (
    <AuthProvider>
      {/* "user": framer-motion follows the OS prefers-reduced-motion setting everywhere. */}
      <MotionConfig reducedMotion="user">
        <Router>
          <AppToaster />
          <AppRoutes />
        </Router>
      </MotionConfig>
    </AuthProvider>
  )
}

export default App
