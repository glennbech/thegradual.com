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
          className="bg-gradient-to-r from-cyan-500 to-cyan-600 border-b-4 border-cyan-700 overflow-hidden shadow-lg"
        >
          <div className="container mx-auto px-4">
            {/* Thicker Progress Bar with pulse animation */}
            <div className="h-1.5 bg-cyan-700/30">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${progress}%`,
                  opacity: [0.8, 1, 0.8]
                }}
                transition={{
                  width: { duration: 0.3 },
                  opacity: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                }}
                className="h-full bg-white shadow-sm"
              />
            </div>

            {/* Session Info - DOUBLED HEIGHT */}
            <div className="py-6 flex flex-col gap-4">
              {/* Top Section: Workout Info */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 flex-shrink-0 bg-white/20 flex items-center justify-center rounded">
                  <Dumbbell className="w-6 h-6 text-white" strokeWidth={2.5} />
                </div>

                <div className="flex-1 min-w-0">
                  {/* Workout Name - Large and bold */}
                  <div className="font-bold text-white text-base md:text-lg truncate mb-1">
                    {activeSession?.templateReference?.templateName || 'Custom Workout'} • In Progress
                  </div>

                  {/* Stats Row */}
                  <div className="flex items-center gap-3 text-sm text-white/90">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" strokeWidth={2} />
                      <span className="font-medium">{formatTime(elapsedTime)} elapsed</span>
                    </div>
                    <span className="text-white/50">•</span>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4" strokeWidth={2} />
                      <span className="font-medium">{completedExercises}/{totalExercises} exercises completed</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Section: Action Buttons */}
              <div className="flex items-center gap-3">
                {/* PRIMARY: Jump Back In */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onReturnToSession}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold text-sm uppercase tracking-wide transition-colors shadow-md"
                >
                  <Play className="w-5 h-5" fill="white" strokeWidth={2} />
                  JUMP BACK IN
                </motion.button>

                {/* SECONDARY: Discard Session */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowConfirmModal(true)}
                  className="flex items-center gap-2 px-4 py-3 text-white/80 hover:text-white font-medium text-sm transition-colors"
                  title="Discard workout"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={2.5} />
                  <span className="hidden sm:inline">Discard</span>
                </motion.button>
              </div>
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
                    Discard This Workout?
                  </h3>
                  <p className="text-sm text-mono-600">
                    Are you sure you want to discard this workout session? All progress will be lost and you won't be able to continue later.
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
                  console.log('FloatingSessionIndicator: User confirmed session discard')
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
                Yes, Discard Session
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
