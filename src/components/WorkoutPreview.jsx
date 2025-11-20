import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Clock, Dumbbell } from 'lucide-react';
import { slideUp, modalBackdrop } from '../utils/animations';
import { getMuscleColor } from '../utils/design-system';

/**
 * WorkoutPreview - Shows template details and exercise list before starting
 * Replaces direct workout start with a preview step
 */
export default function WorkoutPreview({ template, exercises, isOpen, onClose, onStartWorkout }) {
  if (!template || !exercises) return null;

  const handleStartWorkout = (e) => {
    e.stopPropagation();
    if (onStartWorkout) {
      onStartWorkout(template, exercises);
    }
    onClose();
  };

  // Group exercises by muscle group for display
  const exercisesByMuscle = exercises.reduce((acc, exercise) => {
    const muscle = exercise.muscleGroup;
    if (!acc[muscle]) {
      acc[muscle] = [];
    }
    acc[muscle].push(exercise);
    return acc;
  }, {});

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
            onClick={(e) => e.stopPropagation()}
            className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-mono-900 z-50 max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-mono-200 px-6 py-4 z-10">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="bg-mono-900 p-3">
                    <Dumbbell className="w-6 h-6 text-white" strokeWidth={2} />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-mono-900 uppercase tracking-tight">
                      {template.name}
                    </h2>
                    <p className="text-xs text-mono-500 uppercase tracking-wide">
                      {template.description}
                    </p>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                  className="text-mono-500 hover:text-mono-900 p-2"
                >
                  <X className="w-6 h-6" strokeWidth={2} />
                </motion.button>
              </div>

              {/* Metadata Badges */}
              <div className="flex gap-2 mt-3 flex-wrap">
                {template.duration && (
                  <span className="px-3 py-1 text-xs font-medium border border-mono-200 text-mono-900 uppercase flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {template.duration}
                  </span>
                )}
                <span className="px-3 py-1 text-xs font-medium border border-mono-200 text-mono-900 uppercase">
                  {exercises.length} exercises
                </span>
                {template.difficulty && (
                  <span className="px-3 py-1 text-xs font-medium border border-mono-200 text-mono-900 uppercase">
                    {template.difficulty}
                  </span>
                )}
              </div>
            </div>

            {/* Prominent START WORKOUT CTA */}
            <div className="px-6 pt-4 pb-2 bg-white sticky top-[120px] z-10 border-b border-mono-200">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleStartWorkout}
                className="w-full bg-mono-900 hover:bg-mono-800 text-white py-4 px-6 text-base font-bold
                           flex items-center justify-center gap-3 transition-colors uppercase tracking-wide
                           shadow-lg"
              >
                <Play size={24} strokeWidth={2.5} fill="white" />
                Start Workout
              </motion.button>
            </div>

            {/* Exercise List */}
            <div className="p-6 space-y-6">
              <div>
                <h3 className="font-semibold text-mono-900 text-sm uppercase tracking-wide mb-4">
                  Exercises ({exercises.length})
                </h3>

                {/* Group by muscle */}
                <div className="space-y-4">
                  {Object.entries(exercisesByMuscle).map(([muscleGroup, muscleExercises]) => (
                    <div key={muscleGroup}>
                      {/* Muscle Group Header */}
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-3 h-3 rounded-sm"
                          style={{ backgroundColor: getMuscleColor(muscleGroup) }}
                        />
                        <h4 className="text-xs font-semibold text-mono-600 uppercase tracking-wide">
                          {muscleGroup}
                        </h4>
                      </div>

                      {/* Exercises in this muscle group */}
                      <div className="space-y-2">
                        {muscleExercises.map((exercise, idx) => (
                          <div
                            key={exercise.id}
                            className="bg-mono-50 border border-mono-200 p-3 flex items-start gap-3"
                          >
                            <div className="text-mono-400 font-bold text-sm min-w-[24px]">
                              {idx + 1}
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold text-mono-900 text-sm">
                                {exercise.name}
                              </div>
                              <div className="text-xs text-mono-500 uppercase mt-1">
                                {exercise.category}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Additional Info */}
              {template.frequency && (
                <div className="bg-mono-50 border border-mono-200 p-4">
                  <div className="text-xs text-mono-500 uppercase tracking-wide mb-1">
                    Recommended Frequency
                  </div>
                  <div className="text-sm text-mono-900 font-semibold">
                    {template.frequency}
                  </div>
                </div>
              )}

              {/* Bottom spacing for safe area */}
              <div className="h-8" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
