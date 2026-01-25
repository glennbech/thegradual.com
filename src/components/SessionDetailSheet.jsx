import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Play,
  Trash2,
  Save,
  Dumbbell,
  BarChart3,
  Check,
} from 'lucide-react';
import { headingStyles } from '../utils/typography';
import SessionTimeline from './SessionTimeline';
import { getMuscleColor } from '../utils/design-system';

export default function SessionDetailSheet({
  session,
  isOpen,
  onClose,
  onDoItAgain,
  onDelete,
  onSaveAsTemplate,
  editingSet,
  onStartEditSet,
  onSaveEditSet,
  onCancelEditSet,
  onSetFieldChange,
  onKeyDown,
}) {
  const calculateStats = (exercise) => {
    if (!exercise?.sets) return null;
    return {
      totalSets: exercise.sets.length,
      totalReps: exercise.sets.reduce((sum, set) => sum + set.reps, 0),
      totalWeight: exercise.sets.reduce((sum, set) => sum + set.weight * set.reps, 0),
      maxWeight: Math.max(...exercise.sets.map((s) => s.weight)),
    };
  };

  return (
    <AnimatePresence>
      {isOpen && session && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.2 }}
            onDragEnd={(e, info) => {
              // Close if dragged down more than 150px
              if (info.offset.y > 150) {
                onClose();
              }
            }}
            className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-mono-900 z-50 max-h-[85vh] overflow-hidden flex flex-col"
          >
            {/* Drag Handle */}
            <div className="py-2 cursor-grab active:cursor-grabbing">
              <div className="w-12 h-1.5 bg-mono-300 mx-auto" />
            </div>

            {/* Header */}
            <div className="px-6 py-4 border-b-2 border-mono-200 shrink-0">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h2 className={`${headingStyles.h2} mb-1`}>
                    {session.templateReference
                      ? session.templateReference.templateName
                      : new Date(session.completedAt || session.createdAt).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                  </h2>
                  <p className={headingStyles.label}>
                    {new Date(session.completedAt || session.createdAt).toLocaleDateString('en-US', {
                      weekday: 'long',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <motion.button
                  onClick={onClose}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 hover:bg-mono-100 transition-colors"
                >
                  <X className="w-6 h-6 text-mono-600" />
                </motion.button>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <motion.button
                  onClick={() => {
                    onDoItAgain(session.exercises);
                    onClose();
                  }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 bg-mono-900 text-white px-4 py-3 font-bold uppercase tracking-wide text-sm flex items-center justify-center gap-2 hover:bg-mono-800 transition-colors"
                >
                  <Play className="w-4 h-4" fill="currentColor" />
                  Again
                </motion.button>

                <motion.button
                  onClick={(e) => {
                    onSaveAsTemplate(session, e);
                    onClose(); // Close bottom sheet first so modal is visible
                  }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 bg-white border-2 border-mono-900 text-mono-900 px-4 py-3 font-bold uppercase tracking-wide text-sm flex items-center justify-center gap-2 hover:bg-mono-50 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Save Template
                </motion.button>

                <motion.button
                  onClick={() => {
                    onDelete(session.id);
                    onClose();
                  }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-white border-2 border-red-600 text-red-600 px-4 py-3 font-bold uppercase tracking-wide text-sm flex items-center justify-center hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </motion.button>
              </div>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* Session Timeline Visualization */}
              <SessionTimeline session={session} />

              {/* Exercise Details */}
              <div className="space-y-6">
                {session.exercises.map((exercise, index) => {
                  const exerciseStats = calculateStats(exercise);

                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-white border-2 border-mono-300 overflow-hidden shadow-md"
                    >
                      <div
                        className="h-2"
                        style={{ backgroundColor: getMuscleColor(exercise.muscleGroup) }}
                      />
                      <div className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div
                            className="p-2"
                            style={{
                              backgroundColor: getMuscleColor(exercise.muscleGroup),
                            }}
                          >
                            <Dumbbell className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className={headingStyles.h4}>
                              {exercise.name}
                            </h4>
                            <p className={headingStyles.label}>
                              {exercise.category}
                            </p>
                          </div>
                          {exerciseStats && (
                            <div className="text-right">
                              <p className={headingStyles.label}>
                                Max Weight
                              </p>
                              <p className="text-lg font-bold text-mono-900 tabular-nums">
                                {exerciseStats.maxWeight}kg
                              </p>
                            </div>
                          )}
                        </div>

                        {exerciseStats && (
                          <div className="grid grid-cols-3 gap-2 mb-3">
                            <div className="bg-mono-50 border border-mono-200 p-2 text-center">
                              <p className={headingStyles.label}>
                                Sets
                              </p>
                              <p className="text-base font-bold text-mono-900 tabular-nums">
                                {exerciseStats.totalSets}
                              </p>
                            </div>
                            <div className="bg-mono-50 border border-mono-200 p-2 text-center">
                              <p className={headingStyles.label}>
                                Reps
                              </p>
                              <p className="text-base font-bold text-mono-900 tabular-nums">
                                {exerciseStats.totalReps}
                              </p>
                            </div>
                            <div className="bg-mono-50 border border-mono-200 p-2 text-center">
                              <p className={headingStyles.label}>
                                Volume
                              </p>
                              <p className="text-base font-bold text-mono-900 tabular-nums">
                                {exerciseStats.totalWeight.toFixed(0)}kg
                              </p>
                            </div>
                          </div>
                        )}

                        {exercise.sets && exercise.sets.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 mb-2">
                              <BarChart3 className="w-4 h-4 text-mono-500" />
                              <span className="text-xs font-semibold text-mono-500 uppercase tracking-wide">
                                Set Details
                              </span>
                              <span className="text-xs text-mono-400 uppercase ml-auto">
                                Tap to edit
                              </span>
                            </div>
                            {exercise.sets.map((set, setIndex) => {
                              const isEditingThisSet = editingSet?.sessionId === session.id &&
                                editingSet?.exerciseIndex === index &&
                                editingSet?.setIndex === setIndex;

                              return (
                                <motion.div
                                  key={setIndex}
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: setIndex * 0.05 }}
                                  className={`flex items-center justify-between p-3 ${
                                    isEditingThisSet
                                      ? 'bg-yellow-50 border-2 border-yellow-400'
                                      : 'bg-mono-50 border border-mono-200 cursor-pointer hover:border-mono-400'
                                  }`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!isEditingThisSet) {
                                      onStartEditSet(session.id, index, setIndex, set, e);
                                    }
                                  }}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="bg-mono-900 text-white w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">
                                      {setIndex + 1}
                                    </div>

                                    {isEditingThisSet ? (
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="number"
                                          inputMode="numeric"
                                          value={editingSet.reps}
                                          onChange={(e) => onSetFieldChange('reps', e.target.value, e)}
                                          onKeyDown={(e) => onKeyDown(e, session.id)}
                                          onFocus={(e) => e.target.select()}
                                          onClick={(e) => e.stopPropagation()}
                                          className="w-16 px-2 py-1 border-2 border-mono-900 text-sm font-semibold text-center focus:outline-none focus:border-yellow-500"
                                          placeholder="Reps"
                                          min="0"
                                          max="100"
                                        />
                                        <span className="text-xs text-mono-500">reps</span>
                                      </div>
                                    ) : (
                                      <span className="text-sm font-semibold text-mono-900">
                                        {set.reps} reps
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {isEditingThisSet ? (
                                      <>
                                        <span className="text-sm text-mono-500">×</span>
                                        <input
                                          type="text"
                                          inputMode="decimal"
                                          pattern="[0-9]*[.,]?[0-9]*"
                                          value={editingSet.weight}
                                          onChange={(e) => onSetFieldChange('weight', e.target.value, e)}
                                          onKeyDown={(e) => onKeyDown(e, session.id)}
                                          onFocus={(e) => e.target.select()}
                                          onClick={(e) => e.stopPropagation()}
                                          className="w-20 px-2 py-1 border-2 border-mono-900 text-lg font-bold text-center focus:outline-none focus:border-yellow-500 tabular-nums"
                                          placeholder="kg"
                                        />
                                        <span className="text-sm text-mono-500">kg</span>
                                        <div className="flex gap-1 ml-2">
                                          <motion.button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onSaveEditSet(session.id);
                                            }}
                                            whileTap={{ scale: 0.9 }}
                                            className="p-1 bg-green-600 text-white hover:bg-green-700 transition-colors"
                                            title="Save"
                                          >
                                            <Check className="w-4 h-4" />
                                          </motion.button>
                                          <motion.button
                                            onClick={onCancelEditSet}
                                            whileTap={{ scale: 0.9 }}
                                            className="p-1 bg-mono-400 text-white hover:bg-mono-500 transition-colors"
                                            title="Cancel"
                                          >
                                            <X className="w-4 h-4" />
                                          </motion.button>
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        <span className="text-sm text-mono-500">×</span>
                                        <span className="text-lg font-bold text-mono-900 tabular-nums">
                                          {set.weight}kg
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
