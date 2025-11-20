import { motion } from 'framer-motion';
import { CloudOff, WifiOff } from 'lucide-react';

/**
 * Connection Lost Modal
 * Shown when the app loses internet connection
 * Blocks all user interaction until connection is restored
 */
export default function ConnectionLostModal({ isOnline }) {
  if (isOnline) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-mono-900/90 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-lg shadow-2xl p-8 max-w-md mx-4 text-center"
      >
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <CloudOff className="w-20 h-20 text-mono-400" strokeWidth={1.5} />
            <motion.div
              animate={{
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute -bottom-2 -right-2 bg-red-500 rounded-full p-2"
            >
              <WifiOff className="w-6 h-6 text-white" strokeWidth={2} />
            </motion.div>
          </div>
        </div>

        {/* Message */}
        <h2 className="text-2xl font-bold text-mono-900 mb-3">
          Connection Lost
        </h2>
        <p className="text-mono-600 mb-2">
          TheGradual requires an active internet connection to save your workouts.
        </p>
        <p className="text-mono-500 text-sm">
          Please check your connection and the app will automatically reconnect.
        </p>

        {/* Pulsing indicator */}
        <div className="flex items-center justify-center gap-2 mt-6">
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-3 h-3 bg-red-500 rounded-full"
          />
          <span className="text-sm text-mono-500 font-medium">Waiting for connection...</span>
        </div>
      </motion.div>
    </div>
  );
}
