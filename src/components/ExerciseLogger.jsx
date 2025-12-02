import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Trophy,
  Trash2,
  ChevronDown,
  ChevronUp,
  Save,
  X,
  Info,
  Check,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import useWorkoutStore from '../stores/workoutStore';
import { headingStyles, iconSizes } from '../utils/typography';
import { ComparisonRow } from './ComparisonBadge';
import { getMuscleColor, formatDuration, colors, comparePerformance } from '../utils/design-system';
import ConfirmDialog from './ConfirmDialog';
import ExerciseDetailModal from './ExerciseDetailModal';

export default function ExerciseLogger({
  exercises,
  templateReference,
  onComplete,
  onDiscard,
  onSessionCreated,
}) {
  // Zustand store
  const activeSession = useWorkoutStore((state) => state.activeSession);
  const startSession = useWorkoutStore((state) => state.startSession);
  const updateActiveSession = useWorkoutStore((state) => state.updateActiveSession);
  const completeSession = useWorkoutStore((state) => state.completeSession);
  const clearActiveSession = useWorkoutStore((state) => state.clearActiveSession);
  const getPreviousSessionForExercise = useWorkoutStore((state) => state.getPreviousSessionForExercise);
  const sessions = useWorkoutStore((state) => state.sessions);
  const [currentSet, setCurrentSet] = useState({ reps: 10, weight: 20, duration: 30 });
  const [setType, setSetType] = useState('working');
  const [showSetTypeSelector, setShowSetTypeSelector] = useState(false);
  const [showExerciseDescription, setShowExerciseDescription] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [editingSetIndex, setEditingSetIndex] = useState(null);
  const [editingSetData, setEditingSetData] = useState(null);

  // Editing state - track which exercise's set is being edited
  const [editingExerciseIndex, setEditingExerciseIndex] = useState(null);

  // Session Tracking
  const hasInitialized = useRef(false);

  // Add Set Form - Track which exercise has form open (null = none open)
  const [addSetFormOpenForExercise, setAddSetFormOpenForExercise] = useState(null);

  // Exercise info modal
  const [showExerciseDetail, setShowExerciseDetail] = useState(false);

  // Confirmation dialogs
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [completeDialogConfig, setCompleteDialogConfig] = useState({
    title: '',
    message: '',
    variant: 'success'
  });

  // Celebration effects
  const celebrateSet = () => {
    confetti({
      particleCount: 30,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#06B6D4', '#10B981', '#F97316'],
      scalar: 0.8,
    });
  };

  const celebrateExercise = () => {
    confetti({
      particleCount: 100,
      spread: 100,
      origin: { y: 0.5 },
      colors: ['#EC4899', '#06B6D4', '#A855F7', '#F97316', '#6366F1', '#10B981'],
      scalar: 1.2,
    });
  };

  const celebrateWorkout = () => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#EC4899', '#06B6D4', '#A855F7', '#F97316', '#6366F1', '#10B981'],
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#EC4899', '#06B6D4', '#A855F7', '#F97316', '#6366F1', '#10B981'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  };

  // Debug logging for component lifecycle
  useEffect(() => {
    console.log('🔵 [ExerciseLogger] Component MOUNTED');
    return () => {
      console.log('🔵 [ExerciseLogger] Component UNMOUNTING');
    };
  }, []);

  // Debug logging for activeSession changes
  useEffect(() => {
    console.log('🔵 [ExerciseLogger] activeSession changed:', activeSession);
  }, [activeSession]);

  // Initialize session - runs once on mount
  useEffect(() => {
    // If we already have an activeSession from Zustand, restore UI state from it
    if (activeSession && !hasInitialized.current) {
      hasInitialized.current = true;
      // activeSession already has all the data, just return
      return;
    }

    // If already initialized or have session, skip
    if (hasInitialized.current) {
      return;
    }

    // GUARD: Don't initialize if exercises array is empty or undefined
    // This prevents re-initialization when discarding a session
    if (!exercises || exercises.length === 0) {
      console.log('[ExerciseLogger] Skipping initialization - no exercises provided');
      return;
    }

    hasInitialized.current = true;

    const initSession = async () => {
      try {
        console.log('[ExerciseLogger] Initializing new session with', exercises.length, 'exercises');

        // Prepare exercises with pre-populated sets
        const preparedExercises = exercises.map((ex) => {
          // Find most recent session containing this exercise (across all templates)
          const prevExercise = getPreviousSessionForExercise(ex.id);

          // Pre-populate sets from previous session as PLANNED (not yet completed)
          const prePopulatedSets = prevExercise?.sets?.map((set) => ({
            ...(set.reps !== undefined && { reps: set.reps }),
            ...(set.weight !== undefined && { weight: set.weight }),
            ...(set.duration !== undefined && { duration: set.duration }),
            setType: set.setType || 'working',
            completed: false, // IMPORTANT: Mark as planned, not completed!
            plannedFromPrevious: true,
          })) || [];

          // If no previous session data, create default planned sets based on exercise type
          const defaultPlannedSets = (() => {
            const exerciseType = ex.exerciseType || 'weight+reps'; // Fallback for old exercises
            if (exerciseType === 'time-based') {
              return [
                { duration: 30, completed: false, setType: 'working' },
                { duration: 30, completed: false, setType: 'working' },
                { duration: 30, completed: false, setType: 'working' },
              ];
            } else if (exerciseType === 'reps-only') {
              return [
                { reps: 10, completed: false, setType: 'working' },
                { reps: 10, completed: false, setType: 'working' },
                { reps: 10, completed: false, setType: 'working' },
              ];
            } else {
              // weight+reps (default)
              return [
                { reps: 10, weight: 20, completed: false, setType: 'working' },
                { reps: 10, weight: 20, completed: false, setType: 'working' },
                { reps: 10, weight: 20, completed: false, setType: 'working' },
              ];
            }
          })();

          const initialSets = prePopulatedSets.length > 0 ? prePopulatedSets : defaultPlannedSets;

          return {
            ...ex,
            sets: initialSets,
          };
        });

        // Create session using Zustand store (await for API persistence)
        const session = await startSession(preparedExercises, templateReference);
        console.log('[ExerciseLogger] Session initialized:', session.id);
        if (onSessionCreated) {
          onSessionCreated(session);
        }
      } catch (error) {
        console.error('Failed to initialize session:', error);
        hasInitialized.current = false;
      }
    };

    initSession();
  }, [activeSession, exercises, templateReference, startSession, onSessionCreated, sessions]);

  // Safe getter for exercise type with fallback to 'weight+reps' for backward compatibility
  const getExerciseType = (exercise) => {
    return exercise?.exerciseType || 'weight+reps';
  };

  const handleToggleSet = (exerciseIndex, setIndex) => {
    const exercise = activeSession?.exercises[exerciseIndex];
    if (!exercise) return;

    const updatedSets = [...exercise.sets];
    const set = updatedSets[setIndex];

    // Toggle completed status
    const isNowCompleted = !set.completed;

    updatedSets[setIndex] = {
      ...set,
      completed: isNowCompleted,
      completedAt: isNowCompleted ? new Date().toISOString() : null,
    };

    const updatedExercises = [...activeSession.exercises];
    updatedExercises[exerciseIndex].sets = updatedSets;

    // Celebrate when completing a set
    if (isNowCompleted) {
      celebrateSet();

      // Check if all sets are now complete
      const allSetsComplete = updatedSets.every(s => s.completed !== false);
      if (allSetsComplete) {
        // Delay exercise celebration slightly so it doesn't overlap with set celebration
        setTimeout(() => {
          celebrateExercise();
        }, 300);
      } else {
        // Start rest timer after completing a set (but not the last one)
        // Trigger rest timer in the ActiveSessionHeader using a timestamp (so it's unique)
        updateActiveSession({
          exercises: updatedExercises,
          triggerRestTimerTimestamp: Date.now()
        });
        return; // Return early since we already updated
      }
    }

    // Update Zustand store
    updateActiveSession({ exercises: updatedExercises });
  };

  const handleAddSet = (exerciseIndex, setData = null) => {
    const exercise = activeSession?.exercises[exerciseIndex];
    if (!exercise) return;

    const newSet = setData || (() => {
      // Create set based on exercise type
      const baseSet = {
        setType,
        completed: false, // Manually added sets start unchecked
      };

      const exerciseType = getExerciseType(exercise);
      if (exerciseType === 'time-based') {
        return { ...baseSet, duration: currentSet.duration };
      } else if (exerciseType === 'reps-only') {
        return { ...baseSet, reps: currentSet.reps };
      } else {
        // weight+reps (default)
        return { ...baseSet, reps: currentSet.reps, weight: currentSet.weight };
      }
    })();

    const updatedExercises = [...activeSession.exercises];
    updatedExercises[exerciseIndex].sets = [...exercise.sets, newSet];

    updateActiveSession({ exercises: updatedExercises });

    // Reset set type to 'working' for next set
    setSetType('working');
  };

  const handleRemoveSet = (exerciseIndex, setIndex) => {
    const exercise = activeSession?.exercises[exerciseIndex];
    if (!exercise) return;

    const updatedSets = exercise.sets.filter((_, i) => i !== setIndex);
    const updatedExercises = [...activeSession.exercises];
    updatedExercises[exerciseIndex].sets = updatedSets;

    updateActiveSession({ exercises: updatedExercises });
  };

  const handleStartEditSet = (exerciseIndex, setIndex) => {
    const exercise = activeSession?.exercises[exerciseIndex];
    if (!exercise) return;

    setEditingExerciseIndex(exerciseIndex);
    setEditingSetIndex(setIndex);
    setEditingSetData({ ...exercise.sets[setIndex] });
  };

  const handleCancelEditSet = () => {
    setEditingExerciseIndex(null);
    setEditingSetIndex(null);
    setEditingSetData(null);
  };

  const handleSaveEditSet = () => {
    if (editingExerciseIndex === null || editingSetIndex === null || !editingSetData) return;

    const exercise = activeSession?.exercises[editingExerciseIndex];
    if (!exercise) return;

    const updatedSets = [...exercise.sets];
    updatedSets[editingSetIndex] = { ...editingSetData };

    const updatedExercises = [...activeSession.exercises];
    updatedExercises[editingExerciseIndex].sets = updatedSets;

    updateActiveSession({ exercises: updatedExercises });

    setEditingExerciseIndex(null);
    setEditingSetIndex(null);
    setEditingSetData(null);
  };

  const handleCompleteWorkout = () => {
    // Check for incomplete sets across all exercises
    const incompleteSets = [];
    activeSession.exercises.forEach((ex, exIndex) => {
      const incomplete = ex.sets?.filter(s => s.completed === false).length || 0;
      if (incomplete > 0) {
        incompleteSets.push({ exercise: ex.name, count: incomplete, index: exIndex });
      }
    });

    if (incompleteSets.length > 0) {
      const message = `You have ${incompleteSets.length} exercise(s) with incomplete sets:\n\n${
        incompleteSets.map(({ exercise, count }) => `• ${exercise}: ${count} incomplete set(s)`).join('\n')
      }\n\nAre you sure you want to finish?`;

      setCompleteDialogConfig({
        title: 'Incomplete Sets',
        message,
        variant: 'warning'
      });
    } else {
      setCompleteDialogConfig({
        title: 'Complete Workout',
        message: 'Great job! Ready to finish this workout?',
        variant: 'success'
      });
    }

    setShowCompleteDialog(true);
  };

  const confirmCompleteWorkout = async () => {
    setShowCompleteDialog(false);

    try {
      // Celebrate workout completion!
      celebrateWorkout();

      // Complete the session using Zustand (automatically moves to history and clears active)
      // AWAIT for API persistence before navigating
      const completedSession = await completeSession();

      // Navigate immediately - confetti will continue running on the history page
      if (onComplete && completedSession) {
        onComplete(completedSession.exercises, completedSession.id);
      }
    } catch (error) {
      console.error('[ExerciseLogger] Error completing workout:', error);
      alert('Error completing workout. Please try again.');
    }
  };

  const handleSaveSession = async () => {
    if (confirm('Save and exit this workout?')) {
      // AWAIT for API persistence before navigating
      const completedSession = await completeSession();
      if (onComplete && completedSession) {
        onComplete(completedSession.exercises, completedSession.id);
      }
    }
  };

  const handleDiscardSession = () => {
    setShowDiscardDialog(true);
  };

  const confirmDiscardSession = async () => {
    console.log('[ExerciseLogger] Discarding session...');
    try {
      setShowDiscardDialog(false);
      if (onDiscard) {
        console.log('[ExerciseLogger] Calling onDiscard callback');
        await onDiscard(); // This handles clearing session AND navigation
        console.log('[ExerciseLogger] onDiscard completed successfully');
      } else {
        // Fallback if onDiscard not provided
        console.log('[ExerciseLogger] No onDiscard callback, using fallback');
        await clearActiveSession();
        onComplete?.();
      }
    } catch (error) {
      console.error('[ExerciseLogger] Failed to discard session:', error);
      alert('Failed to discard session. Please try again.');
      // Show the error but still try to clear the dialog
      setShowDiscardDialog(false);
    }
  };

  if (!activeSession || !activeSession.exercises || activeSession.exercises.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-mono-400">Loading...</p>
      </div>
    );
  }

  const totalSetsCompleted = activeSession?.exercises?.reduce(
    (acc, ex) => acc + (ex.sets?.length || 0),
    0
  ) || 0;

  const setTypeOptions = [
    { value: 'warm-up', label: 'Warm-up', icon: '🔥' },
    { value: 'working', label: 'Working', icon: '💪' },
    { value: 'drop', label: 'Drop', icon: '📉' },
    { value: 'failure', label: 'Failure', icon: '⚡' },
  ];

  const selectedSetTypeLabel = setTypeOptions.find((opt) => opt.value === setType)?.label || 'Working';

  return (
    <>
      <ConfirmDialog
        isOpen={showCompleteDialog}
        onClose={() => setShowCompleteDialog(false)}
        onConfirm={confirmCompleteWorkout}
        title={completeDialogConfig.title}
        message={completeDialogConfig.message}
        variant={completeDialogConfig.variant}
        confirmText="Finish Workout"
        cancelText="Keep Going"
      />

      {/* Discard Session Dialog */}
      <AnimatePresence>
        {showDiscardDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-mono-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowDiscardDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white border-2 border-mono-900 max-w-md w-full"
            >
              <div className="bg-red-500 h-1" />
              <div className="p-6 space-y-4">
                <h3 className={headingStyles.h2}>Discard Workout?</h3>
                <p className="text-sm text-mono-700">
                  All progress from this workout will be lost. You won't be able to continue this session later.
                </p>
                <div className="bg-mono-50 border border-mono-200 p-3 text-xs text-mono-600">
                  <p><strong>Warning:</strong></p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>All sets and progress will be deleted</li>
                    <li>This action cannot be undone</li>
                    <li>You'll return to the home screen</li>
                  </ul>
                </div>

                <div className="flex gap-3 pt-2">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowDiscardDialog(false)}
                    className="flex-1 bg-mono-200 hover:bg-mono-300 text-mono-900 py-3 font-medium transition-colors"
                  >
                    CANCEL
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={confirmDiscardSession}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 font-medium transition-colors"
                  >
                    DISCARD
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scrollable Content Area - Vertical Layout */}
      <div className="container mx-auto px-3 space-y-6 pb-32">
        {activeSession.exercises.map((exercise, exerciseIndex) => (
          <div key={exercise.id} className="space-y-4">
            {/* Exercise Header */}
            <div className="bg-white border-2 border-mono-900 p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className={`${headingStyles.label} mb-1 flex items-center gap-2`}>
                    <span className="uppercase">{exercise.category}</span>
                    <span className="text-mono-400">•</span>
                    <span>Exercise {exerciseIndex + 1} of {activeSession.exercises.length}</span>
                  </p>
                  <h2
                    className={headingStyles.h2}
                    style={{ color: getMuscleColor(exercise.category) }}
                  >
                    {exercise.name}
                  </h2>
                </div>
              </div>
            </div>

            {/* Sets List */}
            <div className="space-y-3">
              <h3 className={`${headingStyles.h3} flex items-center gap-2`}>
                Sets ({exercise.sets.filter(s => s.completed !== false).length}/{exercise.sets.length})
              </h3>
              <div className="space-y-2">
                {exercise.sets.map((set, setIndex) => (
                  <motion.div
                    key={setIndex}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className={`bg-white overflow-hidden ${
                  set.completed === false
                    ? 'border-2 border-mono-900'
                    : 'border border-mono-200'
                }`}
                  >
                    {editingExerciseIndex === exerciseIndex && editingSetIndex === setIndex && editingSetData ? (
                      // Edit Mode
                      <div className="space-y-3 p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-mono-900 text-white flex items-center justify-center font-bold text-sm">
                            {setIndex + 1}
                          </div>
                          <span className="text-sm font-semibold text-mono-600 uppercase tracking-wide">
                            Editing Set
                          </span>
                        </div>

                        <div className={`grid ${getExerciseType(exercise) === 'time-based' ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
                          {getExerciseType(exercise) === 'time-based' ? (
                        // Time-based: Show only duration
                        <div>
                          <label className="block text-xs font-medium text-mono-500 uppercase tracking-wide mb-1">
                            Duration (seconds)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={editingSetData.duration || 30}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              if (val >= 0 && val <= 3600) {
                                setEditingSetData({ ...editingSetData, duration: val });
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveEditSet();
                              } else if (e.key === 'Escape') {
                                handleCancelEditSet();
                              }
                            }}
                            className="w-full h-12 px-3 border-2 border-mono-900 bg-white text-mono-900 text-lg font-bold text-center tabular-nums focus:border-mono-900 focus:outline-none focus:ring-2 focus:ring-mono-900"
                          />
                        </div>
                      ) : (
                        <>
                          {/* Reps input - shown for both reps-only and weight+reps */}
                          <div>
                            <label className="block text-xs font-medium text-mono-500 uppercase tracking-wide mb-1">
                              Reps
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={editingSetData.reps}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                if (val >= 0 && val <= 100) {
                                  setEditingSetData({ ...editingSetData, reps: val });
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveEditSet();
                                } else if (e.key === 'Escape') {
                                  handleCancelEditSet();
                                }
                              }}
                              className="w-full h-12 px-3 border-2 border-mono-900 bg-white text-mono-900 text-lg font-bold text-center tabular-nums focus:border-mono-900 focus:outline-none focus:ring-2 focus:ring-mono-900"
                            />
                          </div>

                          {/* Weight input - only shown for weight+reps */}
                          {getExerciseType(exercise) === 'weight+reps' && (
                            <div>
                              <label className="block text-xs font-medium text-mono-500 uppercase tracking-wide mb-1">
                                Weight
                              </label>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={editingSetData.weight}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  if (val >= 0 && val <= 500) {
                                    setEditingSetData({ ...editingSetData, weight: val });
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSaveEditSet();
                                  } else if (e.key === 'Escape') {
                                    handleCancelEditSet();
                                  }
                                }}
                                className="w-full h-12 px-3 border-2 border-mono-900 bg-white text-mono-900 text-lg font-bold text-center tabular-nums focus:border-mono-900 focus:outline-none focus:ring-2 focus:ring-mono-900"
                              />
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveEditSet}
                        className="flex-1 bg-mono-900 text-white py-2 px-4 font-bold text-sm uppercase tracking-wide flex items-center justify-center gap-2 hover:bg-mono-800 transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        Save
                      </button>
                      <button
                        onClick={handleCancelEditSet}
                        className="flex-1 bg-mono-200 text-mono-900 py-2 px-4 font-bold text-sm uppercase tracking-wide flex items-center justify-center gap-2 hover:bg-mono-300 transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                      // Display Mode - Horizontal layout with checkbox on right
                      <div className="flex items-center gap-4 py-4 px-4">
                        {/* Set details - clickable when not completed */}
                        <div
                          className={`flex-1 ${!set.completed ? 'cursor-pointer hover:bg-mono-50 -m-2 p-2 rounded transition-colors' : ''}`}
                          onClick={() => {
                            if (!set.completed) {
                              handleStartEditSet(exerciseIndex, setIndex);
                            }
                          }}
                        >
                          <p className={`text-lg font-black mb-0.5 ${set.completed ? 'text-mono-900' : 'text-mono-600'}`}>
                            {getExerciseType(exercise) === 'time-based' ? (
                              // Time-based: Show duration only
                              `${set.duration || 30}s`
                            ) : getExerciseType(exercise) === 'reps-only' ? (
                              // Reps-only: Show reps only
                              `${set.reps} reps`
                            ) : (
                              // Weight+reps: Show reps × weight (default)
                              `${set.reps} reps × ${set.weight}kg`
                            )}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-mono-500">
                            {set.setType !== 'working' && (
                              <span className="uppercase">{set.setType}</span>
                            )}
                            {set.completed && set.restDuration && (
                              <>
                                <span>•</span>
                                <span>{set.restDuration}s rest</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleRemoveSet(exerciseIndex, setIndex)}
                            className="p-2 text-mono-400 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        </div>

                        {/* Checkbox - toggleable (right side for thumb reach) */}
                        <motion.button
                          onClick={() => handleToggleSet(exerciseIndex, setIndex)}
                          whileTap={{ scale: 0.95 }}
                          className={`w-10 h-10 flex-shrink-0 border-2 flex items-center justify-center transition-colors ${
                            set.completed
                              ? 'bg-mono-900 border-mono-900'
                              : 'bg-white border-mono-900 hover:bg-mono-50'
                          }`}
                          type="button"
                        >
                          {set.completed && (
                            <Check className="w-6 h-6 text-white" strokeWidth={3} />
                          )}
                        </motion.button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Add Another Set - Collapsible Form */}
            <div className="bg-white border-2 border-mono-200">
              {addSetFormOpenForExercise !== exerciseIndex ? (
                // Collapsed State - Small "+ Add Set" button
                <motion.button
                  onClick={() => setAddSetFormOpenForExercise(exerciseIndex)}
                  className="w-full py-4 flex items-center justify-center gap-2 text-mono-600 hover:text-mono-900 hover:bg-mono-50 transition-colors"
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="text-2xl font-bold">+</span>
                  <span className="font-bold uppercase tracking-wide text-sm">Add Another Set</span>
                </motion.button>
              ) : (
          // Expanded State - Input Form
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6 space-y-4">
                {/* Header with close button */}
                <div className="flex items-center justify-between">
                  <h3 className={headingStyles.h3}>Add Extra Set</h3>
                  <motion.button
                    onClick={() => setAddSetFormOpenForExercise(null)}
                    className="text-mono-400 hover:text-mono-900"
                    whileTap={{ scale: 0.9 }}
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>

              {/* Input fields - conditional based on exercise type */}
              <div className={`grid ${getExerciseType(exercise) === 'time-based' ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                {getExerciseType(exercise) === 'time-based' ? (
                  // Time-based: Show only duration
                  <div className="flex flex-col gap-2">
                    <label className={headingStyles.label}>Duration (seconds)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={currentSet.duration}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        if (val >= 0 && val <= 3600) {
                          setCurrentSet({ ...currentSet, duration: val });
                        }
                      }}
                      className="h-14 px-4 border-2 border-mono-900 bg-white text-mono-900 text-xl font-bold text-center tabular-nums focus:border-mono-900 focus:outline-none focus:ring-2 focus:ring-mono-900"
                    />
                  </div>
                ) : (
                  <>
                    {/* Reps input - shown for both reps-only and weight+reps */}
                    <div className="flex flex-col gap-2">
                      <label className={headingStyles.label}>Reps</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={currentSet.reps}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          if (val >= 0 && val <= 100) {
                            setCurrentSet({ ...currentSet, reps: val });
                          }
                        }}
                        className="h-14 px-4 border-2 border-mono-900 bg-white text-mono-900 text-xl font-bold text-center tabular-nums focus:border-mono-900 focus:outline-none focus:ring-2 focus:ring-mono-900"
                      />
                    </div>

                    {/* Weight input - only shown for weight+reps */}
                    {getExerciseType(exercise) === 'weight+reps' && (
                      <div className="flex flex-col gap-2">
                        <label className={headingStyles.label}>Weight</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={currentSet.weight}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            if (val >= 0 && val <= 500) {
                              setCurrentSet({ ...currentSet, weight: val });
                            }
                          }}
                          className="h-14 px-4 border-2 border-mono-900 bg-white text-mono-900 text-xl font-bold text-center tabular-nums focus:border-mono-900 focus:outline-none focus:ring-2 focus:ring-mono-900"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>

                {/* Submit button */}
                <motion.button
                  onClick={() => {
                    handleAddSet(exerciseIndex);
                    setAddSetFormOpenForExercise(null);
                  }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full h-14 bg-mono-900 text-white font-bold uppercase tracking-wide flex items-center justify-center gap-2"
                >
                  <span className="text-2xl font-bold">+</span>
                  Add Set
                </motion.button>

                {/* Note: User now clicks checkbox to complete set */}
                <p className="text-xs text-mono-500 text-center">
                  Click checkbox on set to mark complete
                </p>
              </div>
            </motion.div>
          )}
            </div>
          </div>
        ))}

        {/* Complete Workout Button */}
        <div className="pt-6">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleCompleteWorkout}
            className="w-full h-16 bg-mono-900 text-white font-bold uppercase tracking-wide flex items-center justify-center gap-3 text-lg"
          >
            <Trophy className="w-6 h-6" />
            Complete Workout
          </motion.button>
        </div>
      </div>
    </>
  );
}
