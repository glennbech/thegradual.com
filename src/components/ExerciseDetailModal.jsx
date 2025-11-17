import { motion, AnimatePresence } from 'framer-motion'
import { X, Dumbbell, Zap, Target, Award } from 'lucide-react'
import { slideUp, modalBackdrop } from '../utils/animations'

export default function ExerciseDetailModal({ exercise, isOpen, onClose }) {
  if (!exercise) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            {...modalBackdrop}
            onClick={onClose}
            className="fixed inset-0 bg-mono-900/50 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            {...slideUp}
            className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-mono-900 z-50 max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-mono-200 px-6 py-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="bg-mono-900 p-3">
                    <Dumbbell className="w-6 h-6 text-white" strokeWidth={2} />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-mono-900 uppercase tracking-tight">{exercise.name}</h2>
                    <p className="text-xs text-mono-500 uppercase tracking-wide">{exercise.category}</p>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                  className="text-mono-500 hover:text-mono-900 p-2"
                >
                  <X className="w-6 h-6" strokeWidth={2} />
                </motion.button>
              </div>

              {/* Badges */}
              {exercise.difficulty && (
                <div className="flex gap-2 mt-3">
                  <span className="px-3 py-1 text-xs font-medium border border-mono-200 text-mono-900 uppercase">
                    {exercise.difficulty}
                  </span>
                  {exercise.equipment && (
                    <span className="px-3 py-1 text-xs font-medium border border-mono-200 text-mono-900 uppercase">
                      {exercise.equipment}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Description */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-5 h-5 text-mono-900" strokeWidth={2} />
                  <h3 className="font-semibold text-mono-900 text-sm uppercase tracking-wide">How To Perform</h3>
                </div>
                <p className="text-mono-700 leading-relaxed bg-mono-50 p-4 border border-mono-200">
                  {exercise.description}
                </p>
              </div>

              {/* Primary Muscles */}
              {exercise.primaryMuscles && exercise.primaryMuscles.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-5 h-5 text-mono-900" strokeWidth={2} />
                    <h3 className="font-semibold text-mono-900 text-sm uppercase tracking-wide">Primary Muscles</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {exercise.primaryMuscles.map((muscle, index) => (
                      <motion.span
                        key={index}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.1 + index * 0.05 }}
                        className="px-4 py-2 bg-mono-900 text-white text-sm font-medium uppercase"
                      >
                        {muscle}
                      </motion.span>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Secondary Muscles */}
              {exercise.secondaryMuscles && exercise.secondaryMuscles.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Award className="w-5 h-5 text-mono-900" strokeWidth={2} />
                    <h3 className="font-semibold text-mono-900 text-sm uppercase tracking-wide">Secondary Muscles</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {exercise.secondaryMuscles.map((muscle, index) => (
                      <motion.span
                        key={index}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2 + index * 0.05 }}
                        className="px-4 py-2 bg-mono-200 text-mono-900 text-sm font-medium border border-mono-300 uppercase"
                      >
                        {muscle}
                      </motion.span>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Tips Section */}
              <div className="bg-mono-100 p-4 border border-mono-200">
                <p className="text-sm text-mono-700">
                  <span className="font-bold text-mono-900 uppercase">Pro Tip:</span> Focus on mind-muscle connection by actively thinking about contracting the target muscles during each repetition.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
