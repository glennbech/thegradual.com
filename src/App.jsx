import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Calendar, Dumbbell, Plus, User, Cloud, CloudOff, TrendingUp, Check, RefreshCw, Copy, Activity, Pencil, Scale } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { pageTransition } from './utils/animations'
import SessionPlanner from './components/SessionPlanner'
import Plan from './components/Plan'
import SessionContainer from './components/SessionContainer'
import SessionHistory from './components/SessionHistory'
import Profile from './components/Profile'
import Analyze from './components/Analyze'
import Body from './components/Body'
import TransferConfirmation from './components/TransferConfirmation'
import AuthButton from './components/AuthButton'
import WelcomeOnboardingModal from './components/WelcomeOnboardingModal'
import LandingPage from './components/LandingPage'
import ConnectionLostModal from './components/ConnectionLostModal'
import ConflictModal from './components/ConflictModal'
import ActiveSessionHeader from './components/ActiveSessionHeader'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { getUserId } from './utils/userManager'
import useWorkoutStore from './stores/workoutStore'
import { Loader } from 'lucide-react'

function AppContent() {
  // Auth state
  const { isAuthenticated } = useAuth()

  // Zustand store
  const activeSession = useWorkoutStore((state) => state.activeSession)
  const isOnline = useWorkoutStore((state) => state.isOnline)
  const isLoading = useWorkoutStore((state) => state.isLoading)
  const loadFromAPI = useWorkoutStore((state) => state.loadFromAPI)
  const clearActiveSession = useWorkoutStore((state) => state.clearActiveSession)
  const updateActiveSession = useWorkoutStore((state) => state.updateActiveSession)
  // Parse initial view from URL pathname
  const getInitialView = () => {
    const path = window.location.pathname.replace(/^\//, '') || 'home'
    const validViews = ['home', 'plan', 'history', 'analyze', 'body', 'profile', 'logger']
    return validViews.includes(path) ? path : 'home'
  }

  const [currentView, setCurrentView] = useState(getInitialView())
  const [selectedExercises, setSelectedExercises] = useState([])
  const [templateReference, setTemplateReference] = useState(null)
  const [showDebugModal, setShowDebugModal] = useState(false)
  const [sessionPlannerKey, setSessionPlannerKey] = useState(0)
  const [completedSessionId, setCompletedSessionId] = useState(null) // Track just-completed session
  const [transferUserId, setTransferUserId] = useState(null) // Transfer from another device
  const [templateToEdit, setTemplateToEdit] = useState(null) // Template being edited in Plan page
  const userId = getUserId() // Get or create user UUID

  // Memoize the clear function to prevent infinite loops
  const handleClearExpandedSession = useCallback(() => {
    setCompletedSessionId(null)
  }, [])

  // Load data from DynamoDB when user is authenticated
  useEffect(() => {
    if (isAuthenticated && isOnline) {
      console.log('[App] Loading data from DynamoDB on mount...')
      loadFromAPI()
    }
  }, [isAuthenticated, isOnline, loadFromAPI])

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
    // Set initial state based on current view
    const initialPath = currentView === 'home' ? '/' : `/${currentView}`
    window.history.replaceState({ view: currentView }, '', initialPath)

    // Handle browser back/forward buttons
    const handlePopState = (event) => {
      const path = window.location.pathname.replace(/^\//, '') || 'home'
      const validViews = ['home', 'plan', 'history', 'analyze', 'body', 'profile', 'logger']
      const view = validViews.includes(path) ? path : 'home'
      setCurrentView(view)
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
    window.history.pushState({ view: 'logger' }, '', '/logger')
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
    window.history.pushState({ view: 'history' }, '', '/history')
  }

  const handleDoItAgain = (exercises) => {
    setSelectedExercises(exercises)
    setCurrentView('logger')
    window.history.pushState({ view: 'logger' }, '', '/logger')
  }

  const handleNavigateToLogger = () => {
    setCurrentView('logger')
    window.history.pushState({ view: 'logger' }, '', '/logger')
  }

  const handleEditTemplate = (template) => {
    setTemplateToEdit(template)
    setCurrentView('plan')
    window.history.pushState({ view: 'plan' }, '', '/plan')
  }

  const handleDiscardSession = async () => {
    // For discard from ExerciseLogger - navigates to home
    console.log('[App] handleDiscardSession called');
    try {
      // CRITICAL: Clear UI state FIRST to prevent re-initialization
      console.log('[App] Clearing UI state first...');
      setSelectedExercises([]);
      setTemplateReference(null);

      console.log('[App] Clearing active session...');
      await clearActiveSession();

      console.log('[App] Active session cleared, navigating to home');
      setCurrentView('home');
      window.history.pushState({ view: 'home' }, '', '/');
      console.log('[App] Navigation complete, view set to home');
    } catch (error) {
      console.error('[App] handleDiscardSession: Error clearing session:', error);
      throw error; // Re-throw so ExerciseLogger can show error
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
    { id: 'plan', label: 'Plan', icon: Pencil },
    { id: 'history', label: 'History', icon: Calendar },
    { id: 'analyze', label: 'Analyze', icon: Activity },
    { id: 'body', label: 'Body', icon: Scale },
    { id: 'profile', label: 'Profile', icon: User },
  ]

  // Show landing page if not authenticated
  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return (
    <div className="min-h-screen bg-mono-50 pb-16">
        {/* Connection Lost Modal - blocks everything when offline */}
        <ConnectionLostModal isOnline={isOnline} />

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
                className="cursor-pointer group"
                onClick={() => {
                  setCurrentView('home')
                  setSelectedExercises([])
                  setTemplateReference(null)
                  setSessionPlannerKey(prev => prev + 1) // Force SessionPlanner to remount
                  window.history.pushState({ view: 'home' }, '', '/')
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center gap-3">
                  {/* Icon Badge */}
                  <div className="w-10 h-10 bg-mono-900 flex items-center justify-center group-hover:bg-mono-800 transition-colors">
                    <Dumbbell className="w-5 h-5 text-white" strokeWidth={2.5} />
                  </div>

                  {/* Wordmark */}
                  <div className="leading-none select-none">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs font-bold uppercase tracking-widest text-mono-400">The</span>
                      <span className="text-2xl font-black uppercase tracking-tight text-mono-900 -ml-0.5">Gradual</span>
                    </div>
                    <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-mono-400 mt-0.5 -ml-px">
                      Progress Tracker
                    </div>
                  </div>
                </div>
              </motion.button>

              {/* Auth Button */}
              <AuthButton />
            </div>
          </div>
      </motion.header>

      {/* Active Session Header - Always visible when session is active */}
      <ActiveSessionHeader
        onNavigateToLogger={handleNavigateToLogger}
        onDiscard={handleDiscardSession}
        currentView={currentView}
      />

      {/* Global Loading State */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-white/80 backdrop-blur-sm z-30 flex items-center justify-center"
        >
          <div className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 border-4 border-mono-900 border-t-transparent rounded-full mx-auto mb-3"
            />
            <p className="text-sm text-mono-600 font-medium">Loading...</p>
          </div>
        </motion.div>
      )}

      {/* Main Content - Scrollable */}
      <main className="container mx-auto px-3 py-4">
        {/* Session Container - Only visible when currentView === 'logger', but stays mounted */}
        {(activeSession || (selectedExercises && selectedExercises.length > 0)) && (
          <div className={currentView === 'logger' ? 'block' : 'hidden'}>
            <SessionContainer
              exercises={selectedExercises}
              templateReference={templateReference}
              isVisible={currentView === 'logger'}
              onComplete={handleCompleteSession}
              onDiscard={handleDiscardSession}
              onSessionCreated={handleSessionCreated}
            />
          </div>
        )}

        {/* Other Views */}
        {currentView !== 'logger' && (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              {...pageTransition}
            >
              {currentView === 'home' && (
                <SessionPlanner
                  key={sessionPlannerKey}
                  onStartSession={handleStartSession}
                  onEditTemplate={handleEditTemplate}
                />
              )}

              {currentView === 'plan' && (
                <Plan
                  onStartSession={handleStartSession}
                  editTemplate={templateToEdit}
                  onEditComplete={() => setTemplateToEdit(null)}
                  onNavigateToLogger={handleNavigateToLogger}
                />
              )}

              {currentView === 'history' && (
                <SessionHistory
                  onDoItAgain={handleDoItAgain}
                  initialExpandedSessionId={completedSessionId}
                  onClearExpandedSession={handleClearExpandedSession}
                />
              )}

              {currentView === 'analyze' && (
                <Analyze />
              )}

              {currentView === 'body' && (
                <Body />
              )}

              {currentView === 'profile' && (
                <Profile />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* Bottom Navigation */}
      <motion.nav
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-mono-200 z-40"
      >
        <div className="container mx-auto px-1 sm:px-4">
          <div className="flex items-center justify-between py-3">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = currentView === item.id

              return (
                <motion.button
                  key={item.id}
                  onClick={() => {
                    setCurrentView(item.id)
                    const path = item.id === 'home' ? '/' : `/${item.id}`
                    window.history.pushState({ view: item.id }, '', path)
                  }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex flex-col items-center gap-0.5 sm:gap-1 px-1 sm:px-3 py-2 transition-all border-b-2 flex-1 ${
                    isActive
                      ? 'border-mono-900 text-mono-900'
                      : 'border-transparent text-mono-500 hover:text-mono-700'
                  }`}
                >
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2} />
                  <span className="text-[9px] sm:text-xs font-medium uppercase tracking-wide whitespace-nowrap">{item.label}</span>
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

      {/* Conflict Modal - Shows when version conflict detected */}
      <ConflictModal />
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
