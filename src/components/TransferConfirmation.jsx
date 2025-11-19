import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Check, X } from 'lucide-react'
import confetti from 'canvas-confetti'
import { setUserId } from '../utils/userManager'
import useWorkoutStore from '../stores/workoutStore'

export default function TransferConfirmation({ transferUserId, onCancel, onSuccess }) {
  const [isTransferring, setIsTransferring] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleAcceptTransfer = async () => {
    setIsTransferring(true)

    try {
      // Clear existing Zustand store cache
      const clearCache = useWorkoutStore.getState().clearCache
      clearCache()

      // Set new user ID
      setUserId(transferUserId)

      // Load data from API with new user ID
      const loadFromAPI = useWorkoutStore.getState().loadFromAPI
      await loadFromAPI()

      // Celebrate!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      })

      // Show success message
      setShowSuccess(true)

      // Auto-close and navigate after 2 seconds
      setTimeout(() => {
        if (onSuccess) {
          onSuccess()
        }
      }, 2000)
    } catch (error) {
      console.error('Transfer failed:', error)
      alert('Transfer failed. Please try again.')
      setIsTransferring(false)
    }
  }

  if (showSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-lg shadow-2xl max-w-md w-full p-8 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4"
          >
            <Check className="w-10 h-10 text-green-600" strokeWidth={3} />
          </motion.div>
          <h2 className="text-2xl font-bold text-mono-900 mb-2">
            Transfer Successful!
          </h2>
          <p className="text-mono-600">
            Your workouts are now synced to this device.
          </p>
        </motion.div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden"
      >
        <div className="p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-orange-600" strokeWidth={2} />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-mono-900 mb-2">
                Transfer Workout Data?
              </h2>
              <p className="text-sm text-mono-600 mb-3">
                This will replace your current workout data with data from another device.
              </p>
              <div className="bg-mono-50 border-l-4 border-orange-500 p-3">
                <p className="text-xs font-medium text-mono-700 mb-1">
                  ⚠️ Warning
                </p>
                <p className="text-xs text-mono-600">
                  Any workouts currently saved on this device will be replaced. Make sure you've synced any important data before proceeding.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-mono-100 rounded p-3 mb-4">
            <p className="text-xs font-bold text-mono-500 uppercase tracking-wide mb-1">
              Transferring From
            </p>
            <p className="text-sm font-mono text-mono-900 break-all">
              {transferUserId}
            </p>
          </div>
        </div>

        <div className="border-t border-mono-200 p-4 flex gap-3">
          <button
            onClick={onCancel}
            disabled={isTransferring}
            className="flex-1 px-4 py-3 bg-mono-100 hover:bg-mono-200 text-mono-700 font-medium rounded transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleAcceptTransfer}
            disabled={isTransferring}
            className="flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isTransferring ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                />
                Transferring...
              </>
            ) : (
              'Accept Transfer'
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
