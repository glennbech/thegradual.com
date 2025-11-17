import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dumbbell, Clock, CheckCircle, X } from 'lucide-react'

export default function FloatingSessionIndicator({ activeSession, currentView, onReturnToSession, onClose }) {
  const [elapsedTime, setElapsedTime] = useState(0)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  useEffect(() => {
    if (!activeSession) return

    const startTime = activeSession.startTime || Date.now()

    const updateElapsed = () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      setElapsedTime(elapsed)
    }

    updateElapsed()
    const interval = setInterval(updateElapsed, 1000)

    return () => clearInterval(interval)
  }, [activeSession])

  // Show if there's an active session and we're NOT in the logger view
  const shouldShow = activeSession && currentView !== 'logger'

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Count completed exercises (exercises with at least one set)
  const completedExercises = activeSession ? activeSession.exercises.filter(ex =>
    ex.sets && ex.sets.length > 0
  ).length : 0

  const totalExercises = activeSession ? activeSession.exercises.length : 0
  const progress = totalExercises > 0 ? (completedExercises / totalExercises) * 100 : 0

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="bg-mono-100 border-b border-mono-200 overflow-hidden"
        >
          <div className="container mx-auto px-4">
            {/* Thin Progress Bar */}
            <div className="h-0.5 bg-mono-200">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
                className="h-full bg-mono-900"
              />
            </div>

            {/* Session Info - Height increased by 25% */}
            <div className="py-2.5 flex items-center gap-3">
              {/* Workout Icon */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onReturnToSession}
                className="w-10 h-10 flex-shrink-0 bg-mono-900 hover:bg-mono-800 flex items-center justify-center transition-colors"
              >
                <Dumbbell className="w-5 h-5 text-white" strokeWidth={2} />
              </motion.button>

              {/* Session Details - Prominent workout name */}
              <div
                onClick={onReturnToSession}
                className="flex-1 min-w-0 cursor-pointer"
              >
                {/* Workout Template Name - Prominent */}
                {activeSession?.templateReference?.templateName && (
                  <div className="font-bold text-mono-900 text-sm truncate mb-0.5">
                    {activeSession.templateReference.templateName}
                  </div>
                )}
                {/* Session Status & Stats */}
                <div className="flex items-center gap-2 text-xs text-mono-600">
                  <span className="text-cyan-600 font-medium uppercase text-[10px]">Active Session</span>
                  <span className="text-mono-300">•</span>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" strokeWidth={2} />
                    <span className="font-medium">{formatTime(elapsedTime)}</span>
                  </div>
                  <span className="text-mono-300">•</span>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" strokeWidth={2} />
                    <span className="font-medium">{completedExercises}/{totalExercises}</span>
                  </div>
                </div>
              </div>

              {/* Finish Session Button - Compact on mobile to avoid z-index overlap */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowConfirmModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white font-medium text-xs transition-colors"
                title="Finish workout"
              >
                <X className="w-4 h-4" strokeWidth={2.5} />
                <span className="hidden sm:inline">Finish</span>
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowConfirmModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <X className="w-6 h-6 text-red-600" strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-mono-900 mb-2">
                    Finish This Workout?
                  </h3>
                  <p className="text-sm text-mono-600">
                    Are you sure you want to end this workout session? All progress will be lost and you won't be able to continue later.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-mono-200 p-4 flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-3 bg-mono-100 hover:bg-mono-200 text-mono-700 font-medium rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  console.log('FloatingSessionIndicator: User confirmed session abort')
                  setShowConfirmModal(false)
                  if (onClose) {
                    await onClose()
                    console.log('FloatingSessionIndicator: onClose callback completed')
                  } else {
                    console.error('FloatingSessionIndicator: onClose callback is undefined!')
                  }
                }}
                className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded transition-colors"
              >
                Yes, Finish Session
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
