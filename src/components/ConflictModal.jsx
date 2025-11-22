import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import useWorkoutStore from '../stores/workoutStore';

/**
 * ConflictModal - Displays when version conflict is detected
 * Forces user to reload to get latest data before making changes
 */
export default function ConflictModal() {
  const isStale = useWorkoutStore((state) => state.isStale);
  const conflictMessage = useWorkoutStore((state) => state.conflictMessage);
  const loadFromAPI = useWorkoutStore((state) => state.loadFromAPI);

  const handleReload = async () => {
    try {
      await loadFromAPI();
      // isStale will be set to false by loadFromAPI on success
    } catch (error) {
      console.error('Failed to reload:', error);
      // Keep modal open if reload fails
    }
  };

  return (
    <AnimatePresence>
      {isStale && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden"
            >
              {/* Header */}
              <div className="bg-orange-500 px-6 py-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-white" strokeWidth={2.5} />
                  <h2 className="text-xl font-bold text-white uppercase tracking-wide">
                    Data Conflict
                  </h2>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-6">
                <div className="space-y-4">
                  <p className="text-mono-700 leading-relaxed">
                    Your data was modified on another device or browser.
                  </p>
                  <p className="text-mono-700 leading-relaxed">
                    {conflictMessage || 'Please reload to get the latest version before making changes.'}
                  </p>
                  <div className="bg-mono-100 border-l-4 border-orange-500 p-4 rounded">
                    <p className="text-sm text-mono-600 font-medium">
                      <strong>Note:</strong> Your current unsaved changes cannot be saved and will be lost when you reload.
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="px-6 py-4 bg-mono-50 border-t border-mono-200 flex justify-end gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleReload}
                  className="flex items-center gap-2 bg-mono-900 text-white px-6 py-3 rounded font-bold uppercase tracking-wide hover:bg-mono-800 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reload Data
                </motion.button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
