import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dumbbell, Clock, CheckCircle, X, Play, Trash2 } from 'lucide-react'

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
          className="bg-mono-900 border-b-2 border-mono-900 overflow-hidden"
        >
          <div className="container mx-auto px-4">
            {/* Progress Bar - Clean black/white */}
            <div className="h-1 bg-mono-700">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ width: { duration: 0.3 } }}
                className="h-full bg-white"
              />
            </div>

            {/* Session Info - Minimal */}
            <div className="py-4 flex items-center justify-between gap-4">
              {/* Left: Workout Info */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 flex-shrink-0 bg-white flex items-center justify-center">
                  <Dumbbell className="w-5 h-5 text-mono-900" strokeWidth={2.5} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white text-sm uppercase tracking-wide truncate">
                    {activeSession?.templateReference?.templateName || 'Workout'} In Progress
                  </div>
                  <div className="flex items-center gap-2 text-xs text-mono-300">
                    <span>{formatTime(elapsedTime)}</span>
                    <span>•</span>
                    <span>{completedExercises}/{totalExercises} done</span>
                  </div>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* PRIMARY: Return to workout */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={onReturnToSession}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-mono-100 text-mono-900 font-bold text-xs uppercase tracking-wide transition-colors"
                >
                  <Play className="w-4 h-4" fill="currentColor" strokeWidth={2} />
                  <span className="hidden sm:inline">Resume</span>
                </motion.button>

                {/* SECONDARY: Discard */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowConfirmModal(true)}
                  className="p-2 text-mono-400 hover:text-white transition-colors"
                  title="Discard workout"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={2.5} />
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Confirmation Modal - Flat Design */}
      {showConfirmModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowConfirmModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white border-2 border-mono-900 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-mono-900 px-6 py-4">
              <h3 className="text-lg font-bold text-white uppercase tracking-tight">
                Discard Workout?
              </h3>
            </div>

            {/* Content */}
            <div className="px-6 py-6">
              <p className="text-sm text-mono-600 leading-relaxed">
                All progress will be lost. You won't be able to continue this session later.
              </p>
            </div>

            {/* Actions */}
            <div className="border-t-2 border-mono-200 p-4 flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-3 bg-white border-2 border-mono-900 hover:bg-mono-50 text-mono-900 font-bold uppercase text-sm tracking-wide transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowConfirmModal(false)
                  if (onClose) {
                    await onClose()
                  } else {
                    console.error('FloatingSessionIndicator: onClose callback is undefined!')
                  }
                }}
                className="flex-1 px-4 py-3 bg-mono-900 hover:bg-mono-800 text-white font-bold uppercase text-sm tracking-wide transition-colors"
              >
                Discard
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
