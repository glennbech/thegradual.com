import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Calendar, Dumbbell, Plus, Activity, Cloud, CloudOff, TrendingUp, Check, RefreshCw, Copy } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { pageTransition } from './utils/animations'
import SessionPlanner from './components/SessionPlanner'
import ExerciseLogger from './components/ExerciseLogger'
import SessionHistory from './components/SessionHistory'
import HealthMetrics from './components/HealthMetrics'
import Progress from './components/Progress'
import FloatingSessionIndicator from './components/FloatingSessionIndicator'
import TransferConfirmation from './components/TransferConfirmation'
import { useActiveSession, useSyncStatus } from './hooks/useStateManager'
import { initializeState } from './services/stateService'
import { getUserId } from './utils/userManager'
import StateManager from './services/StateManager'

function App() {
  const { activeSession, loading, setActiveSession, clearActiveSession } = useActiveSession()
  const { isOnline, lastSync } = useSyncStatus()
  const [isInitializing, setIsInitializing] = useState(true)
  const [currentView, setCurrentView] = useState('home')
  const [selectedExercises, setSelectedExercises] = useState([])
  const [templateReference, setTemplateReference] = useState(null)
  const [showDebugModal, setShowDebugModal] = useState(false)
  const [sessionPlannerKey, setSessionPlannerKey] = useState(0)
  const [completedSessionId, setCompletedSessionId] = useState(null) // Track just-completed session
  const [transferUserId, setTransferUserId] = useState(null) // Transfer from another device
  const userId = getUserId() // Get or create user UUID

  // Check if synced recently (within last 5 seconds)
  const isSynced = lastSync && (Date.now() - lastSync.getTime() < 5000)

  // Check for transfer URL parameter on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const userIdParam = urlParams.get('userId')

    if (userIdParam) {
      console.log('Transfer detected:', userIdParam)
      setTransferUserId(userIdParam)
    }
  }, [])

  // Initialize StateManager on app startup
  useEffect(() => {
    const initApp = async () => {
      try {
        await initializeState()
        console.log('StateManager initialized successfully')
      } catch (error) {
        console.error('Failed to initialize StateManager:', error)
      } finally {
        setIsInitializing(false)
      }
    }

    initApp()
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
    setActiveSession(session)
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

    // Clear active session in App state (should already be null from StateManager)
    setActiveSession(null)

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
    console.log('handleCloseSession: Clearing active session...')
    try {
      await clearActiveSession()
      console.log('handleCloseSession: Active session cleared successfully')
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
    { id: 'home', label: 'Plan', icon: Plus },
    { id: 'history', label: 'History', icon: Calendar },
    { id: 'progress', label: 'Progress', icon: TrendingUp },
    { id: 'health', label: 'Health', icon: Activity }, // All the way to the right
  ]

  // Show loading screen while initializing
  if (isInitializing || loading) {
    return (
      <div className="min-h-screen bg-mono-50 flex items-center justify-center">
        <div className="text-center">
          <Dumbbell size={48} className="text-cyan-500 mx-auto mb-4 animate-pulse" />
          <h2 className="text-xl font-bold text-mono-900 mb-2">
            Loading your workouts...
          </h2>
          <p className="text-sm text-mono-600">
            Syncing from cloud...
          </p>
        </div>
      </div>
    )
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
              className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => {
                setCurrentView('home')
                setSelectedExercises([])
                setTemplateReference(null)
                setSessionPlannerKey(prev => prev + 1) // Force SessionPlanner to remount
                window.history.pushState({ view: 'home' }, '', window.location.pathname)
              }}
            >
              <Dumbbell size={40} className="text-mono-900" strokeWidth={1.5} />
              <div>
                <h1 className="text-3xl font-bold text-mono-900 tracking-tight">
                  thegradual.com
                </h1>
                <p className="text-sm text-mono-500 uppercase tracking-wide">
                  Your Step by Step Gym Tracker
                </p>
              </div>
            </motion.button>
          </div>
        </div>

        {/* Debug Status Bar - Height increased by 10% */}
        <div className="w-full bg-mono-900 text-mono-50 px-4 py-1.5 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowDebugModal(true)}
              className="flex items-center gap-1.5 hover:bg-mono-800 px-2 py-1 rounded transition-colors cursor-pointer"
              title="Click to view QR code and transfer options"
            >
              <span className="text-mono-400">ID:</span>
              <span className="text-white font-medium underline decoration-dotted">{userId.slice(0, 4)}</span>
            </button>
            <div className="flex items-center gap-1">
              {isOnline ? (
                <Cloud size={14} className="text-green-400" />
              ) : (
                <CloudOff size={14} className="text-orange-400" />
              )}
            </div>
            <div className="flex items-center gap-1">
              {isSynced ? (
                <Check size={14} className="text-green-400" />
              ) : (
                <RefreshCw size={14} className="text-mono-400" />
              )}
            </div>
            {lastSync && (
              <div className="flex items-center gap-1.5">
                <span className="text-mono-500 text-[10px]">{lastSync.toLocaleTimeString()}</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowDebugModal(true)}
            className="text-mono-400 hover:text-white transition-colors text-[10px] uppercase"
          >
            [debug]
          </button>
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

            {currentView === 'health' && (
              <HealthMetrics />
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

      {/* Debug Modal */}
      <AnimatePresence>
        {showDebugModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDebugModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-mono-200">
                <h3 className="text-lg font-bold text-mono-900">Debug: User State</h3>
                <button
                  onClick={() => setShowDebugModal(false)}
                  className="text-mono-400 hover:text-mono-600 transition-colors"
                >
                  ×
                </button>
              </div>
              <div className="p-4 overflow-auto flex-1">
                {/* Device Transfer Section */}
                <div className="mb-6 pb-6 border-b border-mono-200">
                  <h4 className="text-sm font-bold text-mono-900 mb-3">📱 Transfer to Another Device</h4>

                  {/* QR Code */}
                  <div className="flex justify-center mb-4">
                    <div className="p-4 bg-white border-2 border-mono-900 inline-block">
                      <QRCodeSVG
                        value={`https://thegradual.com/transfer?userId=${userId}`}
                        size={200}
                        level="H"
                        includeMargin={false}
                      />
                    </div>
                  </div>

                  {/* Transfer Link */}
                  <div className="mb-4">
                    <label className="block text-xs font-bold text-mono-700 mb-2">
                      Or copy this link:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={`https://thegradual.com/transfer?userId=${userId}`}
                        className="flex-1 px-3 py-2 text-xs border border-mono-300 rounded font-mono bg-mono-50"
                        onClick={(e) => e.target.select()}
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`https://thegradual.com/transfer?userId=${userId}`)
                          alert('Link copied!')
                        }}
                        className="px-3 py-2 bg-mono-900 text-white rounded hover:bg-mono-800 transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="bg-cyan-50 border-l-4 border-cyan-500 p-3 text-xs text-mono-700">
                    <p className="font-bold mb-2">📖 How to transfer:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Open this app on your new device</li>
                      <li>Scan the QR code or paste the link</li>
                      <li>Accept the transfer to sync your data</li>
                    </ol>
                  </div>
                </div>

                {/* Debug Info Section */}
                <div className="mb-4 text-xs text-mono-600 space-y-1">
                  <div><strong>User ID:</strong> {userId}</div>
                  <div><strong>Status:</strong> {isOnline ? 'Online' : 'Offline'}</div>
                  <div><strong>Last Sync:</strong> {StateManager.getLastSyncTime()?.toLocaleString() || 'Never'}</div>
                </div>
                <pre className="bg-mono-100 p-4 rounded text-xs font-mono overflow-auto">
                  {JSON.stringify(StateManager.state, null, 2)}
                </pre>
              </div>
              <div className="p-4 border-t border-mono-200 flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(StateManager.state, null, 2))
                    alert('State copied to clipboard!')
                  }}
                  className="flex-1 bg-cyan-500 text-white px-4 py-2 rounded hover:bg-cyan-600 transition-colors text-sm"
                >
                  Copy JSON
                </button>
                <button
                  onClick={() => setShowDebugModal(false)}
                  className="flex-1 bg-mono-200 text-mono-700 px-4 py-2 rounded hover:bg-mono-300 transition-colors text-sm"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transfer Confirmation Modal */}
      {transferUserId && (
        <TransferConfirmation
          transferUserId={transferUserId}
          onCancel={handleCancelTransfer}
          onSuccess={handleSuccessTransfer}
        />
      )}
    </div>
  )
}

export default App
