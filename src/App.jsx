import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Calendar, Dumbbell, Plus, User, Cloud, CloudOff, TrendingUp, Check, RefreshCw, Copy, Activity } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { pageTransition } from './utils/animations'
import SessionPlanner from './components/SessionPlanner'
import ExerciseLogger from './components/ExerciseLogger'
import SessionHistory from './components/SessionHistory'
import Profile from './components/Profile'
import Progress from './components/Progress'
import Analyze from './components/Analyze'
import FloatingSessionIndicator from './components/FloatingSessionIndicator'
import TransferConfirmation from './components/TransferConfirmation'
import AuthButton from './components/AuthButton'
import WelcomeOnboardingModal from './components/WelcomeOnboardingModal'
import LandingPage from './components/LandingPage'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { getUserId } from './utils/userManager'
import useWorkoutStore from './stores/workoutStore'

function AppContent() {
  // Auth state
  const { isAuthenticated } = useAuth()

  // Zustand store
  const activeSession = useWorkoutStore((state) => state.activeSession)
  const isOnline = useWorkoutStore((state) => state.isOnline)
  const lastSync = useWorkoutStore((state) => state.lastSync)
  const clearActiveSession = useWorkoutStore((state) => state.clearActiveSession)
  const updateActiveSession = useWorkoutStore((state) => state.updateActiveSession)
  const [currentView, setCurrentView] = useState('home')
  const [selectedExercises, setSelectedExercises] = useState([])
  const [templateReference, setTemplateReference] = useState(null)
  const [showDebugModal, setShowDebugModal] = useState(false)
  const [sessionPlannerKey, setSessionPlannerKey] = useState(0)
  const [completedSessionId, setCompletedSessionId] = useState(null) // Track just-completed session
  const [transferUserId, setTransferUserId] = useState(null) // Transfer from another device
  const userId = getUserId() // Get or create user UUID

  // Check if synced recently (within last 5 seconds)
  const isSynced = lastSync && (Date.now() - new Date(lastSync).getTime() < 5000)

  // Debug logging for view changes
  useEffect(() => {
    console.log('🟢 [App] currentView changed to:', currentView);
  }, [currentView]);

  // Check for transfer URL parameter on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const userIdParam = urlParams.get('userId')

    if (userIdParam) {
      setTransferUserId(userIdParam)
    }
  }, [])

  // Initialize history state
  useEffect(() => {
    // Set initial state
    window.history.replaceState({ view: 'home' }, '', window.location.pathname)

    // Handle browser back/forward buttons
    const handlePopState = (event) => {
      if (event.state && event.state.view) {
        setCurrentView(event.state.view)
      } else {
        // If no state, push to home
        setCurrentView('home')
        window.history.pushState({ view: 'home' }, '', window.location.pathname)
      }
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  const handleStartSession = (exercises, templateRef = null) => {
    setSelectedExercises(exercises)
    setTemplateReference(templateRef) // NEW: Store template reference
    setCurrentView('logger')
    window.history.pushState({ view: 'logger' }, '', window.location.pathname)
  }

  const handleSessionCreated = (session) => {
    // Session is already created in the store by ExerciseLogger
    // This callback is just for compatibility
  }

  const handleCompleteSession = (completedExercises, sessionId) => {
    // Keep exercises for "do it again" functionality
    if (completedExercises) {
      setSelectedExercises(completedExercises)
    }

    // Store the completed session ID to auto-expand in history
    if (sessionId) {
      setCompletedSessionId(sessionId)
    }

    // Navigate to history (activeSession is already cleared by Zustand store)
    setCurrentView('history')
    window.history.pushState({ view: 'history' }, '', window.location.pathname)
  }

  const handleDoItAgain = (exercises) => {
    setSelectedExercises(exercises)
    setCurrentView('logger')
    window.history.pushState({ view: 'logger' }, '', window.location.pathname)
  }

  const handleReturnToSession = () => {
    setCurrentView('logger')
    window.history.pushState({ view: 'logger' }, '', window.location.pathname)
  }

  const handleCloseSession = async () => {
    // Confirmation is now handled in FloatingSessionIndicator modal
    try {
      await clearActiveSession()
      setCurrentView('home')
      window.history.pushState({ view: 'home' }, '', window.location.pathname)
    } catch (error) {
      console.error('handleCloseSession: Error clearing session:', error)
    }
  }

  const handleCancelTransfer = () => {
    setTransferUserId(null)
    // Clean up URL
    window.history.replaceState({}, '', window.location.pathname)
  }

  const handleSuccessTransfer = () => {
    setTransferUserId(null)
    // Clean up URL
    window.history.replaceState({}, '', window.location.pathname)
    // Navigate to home
    setCurrentView('home')
    // Force reload StateManager
    window.location.reload()
  }

  const navItems = [
    { id: 'home', label: 'Work Out', icon: Plus },
    { id: 'history', label: 'History', icon: Calendar },
    { id: 'progress', label: 'Progress', icon: TrendingUp },
    { id: 'analyze', label: 'Analyze', icon: Activity },
    { id: 'profile', label: 'Profile', icon: User }, // Replaced Health with Profile
  ]

  // Show landing page if not authenticated
  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return (
    <div className="min-h-screen bg-mono-50 pb-16">
        {/* Header */}
        <motion.header
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          className="border-b border-mono-200 bg-white sticky top-0 z-20"
        >
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => {
                  setCurrentView('home')
                  setSelectedExercises([])
                  setTemplateReference(null)
                  setSessionPlannerKey(prev => prev + 1) // Force SessionPlanner to remount
                  window.history.pushState({ view: 'home' }, '', window.location.pathname)
                }}
              >
                <Dumbbell size={36} className="text-mono-900" strokeWidth={2} />
                <h1 className="text-3xl font-bold text-mono-900 tracking-tight leading-none">
                  TheGradual.com
                </h1>
              </motion.button>

              {/* Auth Button */}
              <AuthButton />
            </div>
          </div>

        {/* Integrated Session Dock */}
        <FloatingSessionIndicator
          activeSession={activeSession}
          currentView={currentView}
          onReturnToSession={handleReturnToSession}
          onClose={handleCloseSession}
        />
      </motion.header>

      {/* Main Content */}
      <main className="container mx-auto px-3 py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            {...pageTransition}
          >
            {currentView === 'home' && (
              <SessionPlanner key={sessionPlannerKey} onStartSession={handleStartSession} />
            )}

            {currentView === 'logger' && activeSession && (
              <ExerciseLogger
                exercises={activeSession.exercises}
                templateReference={activeSession.templateReference}
                onComplete={handleCompleteSession}
                onSessionCreated={handleSessionCreated}
              />
            )}

            {currentView === 'logger' && !activeSession && selectedExercises.length > 0 && (
              <ExerciseLogger
                exercises={selectedExercises}
                templateReference={templateReference}
                onComplete={handleCompleteSession}
                onSessionCreated={handleSessionCreated}
              />
            )}

            {currentView === 'history' && (
              <SessionHistory
                onDoItAgain={handleDoItAgain}
                initialExpandedSessionId={completedSessionId}
                onClearExpandedSession={() => setCompletedSessionId(null)}
              />
            )}

            {currentView === 'progress' && (
              <Progress />
            )}

            {currentView === 'analyze' && (
              <Analyze />
            )}

            {currentView === 'profile' && (
              <Profile />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <motion.nav
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-mono-200 z-40"
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-around py-3">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = currentView === item.id

              return (
                <motion.button
                  key={item.id}
                  onClick={() => {
                    setCurrentView(item.id)
                    window.history.pushState({ view: item.id }, '', window.location.pathname)
                  }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex flex-col items-center gap-1 px-6 py-2 transition-all border-b-2 ${
                    isActive
                      ? 'border-mono-900 text-mono-900'
                      : 'border-transparent text-mono-500 hover:text-mono-700'
                  }`}
                >
                  <Icon className="w-5 h-5" strokeWidth={2} />
                  <span className="text-xs font-medium uppercase tracking-wide">{item.label}</span>
                </motion.button>
              )
            })}
          </div>
        </div>
      </motion.nav>

      {/* Transfer Confirmation Modal */}
      {transferUserId && (
        <TransferConfirmation
          transferUserId={transferUserId}
          onCancel={handleCancelTransfer}
          onSuccess={handleSuccessTransfer}
        />
      )}

      {/* Welcome Onboarding Modal (for new users) */}
      <WelcomeOnboardingModal />
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
