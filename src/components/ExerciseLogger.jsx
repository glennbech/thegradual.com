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
  Clock,
  Dumbbell,
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
  onSessionCreated,
}) {
  // Zustand store
  const activeSession = useWorkoutStore((state) => state.activeSession);
  const startSession = useWorkoutStore((state) => state.startSession);
  const updateActiveSession = useWorkoutStore((state) => state.updateActiveSession);
  const completeSession = useWorkoutStore((state) => state.completeSession);
  const getPreviousSessionForExercise = useWorkoutStore((state) => state.getPreviousSessionForExercise);
  const sessions = useWorkoutStore((state) => state.sessions);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [sets, setSets] = useState([]);
  const [currentSet, setCurrentSet] = useState({ reps: 10, weight: 20 });
  const [setType, setSetType] = useState('working');
  const [showSetTypeSelector, setShowSetTypeSelector] = useState(false);
  const [showExerciseDescription, setShowExerciseDescription] = useState(false);
  const [editingSetIndex, setEditingSetIndex] = useState(null);
  const [editingSetData, setEditingSetData] = useState(null);

  // Historical comparison
  const [previousSessionData, setPreviousSessionData] = useState(null);
  const [comparison, setComparison] = useState(null);

  // Session Tracking
  const [sessionStartTime] = useState(Date.now());
  const [sessionTime, setSessionTime] = useState(0);
  const hasInitialized = useRef(false);

  // Exercise Timer & Rest Timer
  const [exerciseStartTime, setExerciseStartTime] = useState(Date.now());
  const [exerciseTime, setExerciseTime] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [restTimeRemaining, setRestTimeRemaining] = useState(90); // 1:30 in seconds

  // Add Set Form - Collapsed by default
  const [showAddSetForm, setShowAddSetForm] = useState(false);

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

  // Restore currentExerciseIndex from activeSession when it loads
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

  useEffect(() => {
    if (activeSession?.currentExerciseIndex !== undefined) {
      setCurrentExerciseIndex(activeSession.currentExerciseIndex);
    }
  }, [activeSession?.id]); // Only run when activeSession changes

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

    if (!exercises || exercises.length === 0) {
      return;
    }

    hasInitialized.current = true;

    const initSession = async () => {
      try {
        // Get previous session data if template is specified
        let previousSession = null;
        if (templateReference?.templateId) {
          // Find most recent session with this template
          const sortedSessions = sessions
            .filter(s => s.templateReference?.templateId === templateReference.templateId && s.status === 'completed')
            .sort((a, b) => new Date(b.completedAt || b.endTime) - new Date(a.completedAt || a.endTime));
          previousSession = sortedSessions[0];
        }

        // Prepare exercises with pre-populated sets
        const preparedExercises = exercises.map((ex) => {
          // Find matching exercise in previous session
          const prevExercise = previousSession?.exercises?.find(
            (prevEx) => prevEx.id === ex.id
          );

          // Pre-populate sets from previous session as PLANNED (not yet completed)
          const prePopulatedSets = prevExercise?.sets?.map((set) => ({
            reps: set.reps,
            weight: set.weight,
            setType: set.setType || 'working',
            completed: false, // IMPORTANT: Mark as planned, not completed!
            plannedFromPrevious: true,
          })) || [];

          // If no previous session data, create default planned sets
          const defaultPlannedSets = [
            { reps: 10, weight: 20, completed: false, setType: 'working' },
            { reps: 10, weight: 20, completed: false, setType: 'working' },
            { reps: 10, weight: 20, completed: false, setType: 'working' },
          ];

          const initialSets = prePopulatedSets.length > 0 ? prePopulatedSets : defaultPlannedSets;

          return {
            ...ex,
            sets: initialSets,
          };
        });

        // Create session using Zustand store (await for API persistence)
        const session = await startSession(preparedExercises, templateReference);
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

  // Session timer
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionTime(
        Math.floor((Date.now() - (activeSession?.startTime || sessionStartTime)) / 1000)
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSession, sessionStartTime]);

  // Exercise timer - tracks time since exercise started
  useEffect(() => {
    if (isResting) return; // Don't update exercise time during rest

    const interval = setInterval(() => {
      setExerciseTime(Math.floor((Date.now() - exerciseStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [exerciseStartTime, isResting]);

  // Rest timer - counts down from 90 seconds
  useEffect(() => {
    if (!isResting) return;

    const interval = setInterval(() => {
      setRestTimeRemaining((prev) => {
        if (prev <= 1) {
          // Rest time is up - celebration and switch back to exercise timer
          confetti({
            particleCount: 50,
            spread: 70,
            origin: { y: 0.3 },
            colors: ['#F97316', '#10B981'],
            scalar: 1.0,
          });
          setIsResting(false);
          setRestTimeRemaining(90); // Reset for next time
          return 90;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isResting]);

  // Reset exercise timer when changing exercises
  useEffect(() => {
    setExerciseStartTime(Date.now());
    setExerciseTime(0);
    setIsResting(false);
    setRestTimeRemaining(90);
  }, [currentExerciseIndex]);

  // Load exercise data - SIMPLIFIED: Just sync what's in activeSession
  useEffect(() => {
    if (!activeSession || !activeSession.exercises[currentExerciseIndex]) {
      return;
    }

    const currentEx = activeSession.exercises[currentExerciseIndex];

    // Simple: Just load whatever sets exist in activeSession
    setSets(currentEx.sets || []);

    // Load previous session data for display only (doesn't modify current sets)
    const prevData = getPreviousSessionForExercise(currentEx.id);
    setPreviousSessionData(prevData);
  }, [currentExerciseIndex, activeSession]);

  // Update comparison when sets change
  useEffect(() => {
    if (previousSessionData && sets.length > 0) {
      const comp = comparePerformance({ sets }, previousSessionData);
      setComparison(comp);
    } else {
      setComparison(null);
    }
  }, [sets, previousSessionData]);

  const currentExercise = activeSession?.exercises[currentExerciseIndex];

  const handleToggleSet = (index) => {
    if (!currentExercise) {
      return;
    }

    const updatedSets = [...sets];
    const set = updatedSets[index];

    // Toggle completed status
    const isNowCompleted = !set.completed;

    updatedSets[index] = {
      ...set,
      completed: isNowCompleted,
      completedAt: isNowCompleted ? new Date().toISOString() : null,
    };

    const updatedExercises = [...activeSession.exercises];
    updatedExercises[currentExerciseIndex].sets = updatedSets;

    // Update local state first
    setSets(updatedSets);

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
        setIsResting(true);
        setRestTimeRemaining(90);
      }
    } else {
      // If unchecking a set, stop resting
      setIsResting(false);
    }

    // Update Zustand store
    updateActiveSession({ exercises: updatedExercises });
  };

  const handleAddSet = (setData = null) => {
    if (!currentExercise) return;

    const newSet = setData || {
      reps: currentSet.reps,
      weight: currentSet.weight,
      completedAt: new Date().toISOString(),
      setType,
      completed: true, // Manually added sets are immediately completed
    };

    const updatedExercises = [...activeSession.exercises];
    updatedExercises[currentExerciseIndex].sets = [...sets, newSet];

    updateActiveSession({ exercises: updatedExercises });

    setSets([...sets, newSet]);

    // Celebrate the added set!
    celebrateSet();

    // Reset set type to 'working' for next set
    setSetType('working');
  };


  const handleRemoveSet = (index) => {
    const updatedSets = sets.filter((_, i) => i !== index);
    const updatedExercises = [...activeSession.exercises];
    updatedExercises[currentExerciseIndex].sets = updatedSets;

    updateActiveSession({ exercises: updatedExercises });

    setSets(updatedSets);
  };

  const handleStartEditSet = (index) => {
    setEditingSetIndex(index);
    setEditingSetData({ ...sets[index] });
  };

  const handleCancelEditSet = () => {
    setEditingSetIndex(null);
    setEditingSetData(null);
  };

  const handleSaveEditSet = () => {
    if (editingSetIndex === null || !editingSetData) return;

    const updatedSets = [...sets];
    updatedSets[editingSetIndex] = { ...editingSetData };

    const updatedExercises = [...activeSession.exercises];
    updatedExercises[currentExerciseIndex].sets = updatedSets;

    updateActiveSession({ exercises: updatedExercises });

    setSets(updatedSets);
    setEditingSetIndex(null);
    setEditingSetData(null);
  };

  const handleNextExercise = () => {
    if (currentExerciseIndex < activeSession.exercises.length - 1) {
      const newIndex = currentExerciseIndex + 1;
      setCurrentExerciseIndex(newIndex);
      setCurrentSet({ reps: 10, weight: 20 });
      setIsResting(false);
      setShowExerciseDescription(false);
      setShowSetTypeSelector(false);

      // Save current exercise index to activeSession
      updateActiveSession({ currentExerciseIndex: newIndex });
    }
  };

  const handlePreviousExercise = () => {
    if (currentExerciseIndex > 0) {
      const newIndex = currentExerciseIndex - 1;
      setCurrentExerciseIndex(newIndex);
      setCurrentSet({ reps: 10, weight: 20 });
      setIsResting(false);
      setShowExerciseDescription(false);
      setShowSetTypeSelector(false);

      // Save current exercise index to activeSession
      updateActiveSession({ currentExerciseIndex: newIndex });
    }
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
    if (confirm('Discard this workout? All progress will be lost.')) {
      setActiveSession(null);
      onComplete?.();
    }
  };

  if (!currentExercise) {
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

      <div className="space-y-4 pb-32">
      {/* Prominent Progress Bar - 50% Taller */}
      <motion.div
        className="border-b-4 border-mono-900 -mx-4"
        animate={{
          backgroundColor: isResting ? '#ea580c' : '#111827' // Orange when resting, dark when exercising
        }}
        transition={{ duration: 0.5 }}
      >
        {/* Progress Bar Visual */}
        <div className="h-2 bg-mono-700">
          <motion.div
            className="h-full bg-white"
            initial={{ width: 0 }}
            animate={{
              width: `${((currentExerciseIndex + 1) / activeSession.exercises.length) * 100}%`
            }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>

        {/* Stats Row - 50% taller (py-3 -> py-5) */}
        <div className="px-4 py-5 flex items-center justify-between">
          {/* Exercise Progress - PROMINENT */}
          <div className="flex items-center gap-3">
            <Dumbbell className="w-6 h-6 text-white" strokeWidth={2.5} />
            <div>
              <div className="text-xs text-white/60 uppercase tracking-wide mb-0.5">Exercise</div>
              <div className="text-2xl font-black text-white tabular-nums">
                {currentExerciseIndex + 1}/{activeSession.exercises.length}
              </div>
            </div>
          </div>

          {/* Timer Display - Switches between Exercise Timer and Rest Timer */}
          <AnimatePresence mode="wait">
            {isResting ? (
              <motion.div
                key="rest-timer"
                initial={{ scale: 0.8, opacity: 0, y: -10 }}
                animate={{
                  scale: 1,
                  opacity: 1,
                  y: 0,
                }}
                exit={{ scale: 0.8, opacity: 0, y: 10 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="flex items-center gap-3"
              >
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
                >
                  <Clock className="w-6 h-6 text-orange-300" strokeWidth={2.5} />
                </motion.div>
                <div className="text-center">
                  <div className="text-xs text-orange-200 uppercase tracking-wide mb-0.5 font-bold">Rest Timer</div>
                  <motion.div
                    className="text-2xl font-black text-orange-300 tabular-nums"
                    animate={{
                      scale: restTimeRemaining <= 10 ? [1, 1.1, 1] : 1,
                      color: restTimeRemaining <= 10 ? ['#fdba74', '#fbbf24', '#fdba74'] : '#fdba74'
                    }}
                    transition={{ duration: 0.5, repeat: restTimeRemaining <= 10 ? Infinity : 0 }}
                  >
                    {Math.floor(restTimeRemaining / 60)}:{String(restTimeRemaining % 60).padStart(2, '0')}
                  </motion.div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="exercise-timer"
                initial={{ scale: 0.8, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: -10 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="flex items-center gap-3"
              >
                <Clock className="w-6 h-6 text-white" strokeWidth={2.5} />
                <div className="text-center">
                  <div className="text-xs text-white/60 uppercase tracking-wide mb-0.5">Exercise Time</div>
                  <div className="text-2xl font-black text-white tabular-nums">
                    {formatDuration(exerciseTime)}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Discard Button */}
          <motion.button
            onClick={handleDiscardSession}
            className="text-white/60 hover:text-white"
            whileTap={{ scale: 0.95 }}
          >
            <Trash2 className="w-6 h-6" strokeWidth={2.5} />
          </motion.button>
        </div>
      </motion.div>

      {/* Exercise Navigation Bar - Cleaner */}
      <div className="bg-white border-2 border-mono-900">
        <div className="flex items-center gap-3 p-4">
          {/* Exercise Name - Prominent & Clickable */}
          <div
            className="flex-1 cursor-pointer hover:bg-mono-50 -m-2 p-2 rounded transition-colors"
            onClick={() => setShowExerciseDetail(true)}
          >
            <p className={`${headingStyles.label} mb-1 tabular-nums flex items-center gap-2`}>
              <span>Exercise {currentExerciseIndex + 1} / {activeSession.exercises.length}</span>
              <Info className="w-3 h-3 text-mono-500" />
            </p>
            <h2
              className={headingStyles.h1}
              style={{ color: getMuscleColor(currentExercise.category) }}
            >
              {currentExercise.name}
            </h2>
            <p className={`${headingStyles.label} mt-1`}>
              {currentExercise.category}
            </p>
          </div>

          {/* Navigation Buttons - Compact */}
          <div className="flex gap-2">
            {currentExerciseIndex > 0 && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handlePreviousExercise}
                className="w-10 h-10 bg-white border border-mono-300 text-mono-900 flex items-center justify-center"
              >
                <ChevronLeft className="w-5 h-5" />
              </motion.button>
            )}

            {currentExerciseIndex < activeSession.exercises.length - 1 ? (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleNextExercise}
                className="w-10 h-10 bg-mono-900 text-white flex items-center justify-center"
              >
                <ChevronRight className="w-5 h-5" />
              </motion.button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleCompleteWorkout}
                className="px-4 h-10 bg-mono-900 text-white flex items-center justify-center gap-2 font-bold uppercase text-sm"
              >
                <Trophy className="w-4 h-4" />
                Finish
              </motion.button>
            )}
          </div>
        </div>
      </div>


      {/* Previous Session - Clean Banner */}
      {previousSessionData && previousSessionData.sets && previousSessionData.sets.length > 0 && (
        <div className="px-4 py-3 bg-mono-50 border-2 border-mono-200">
          <p className="text-xs font-bold uppercase tracking-widest text-mono-600 mb-2 flex items-center gap-2">
            <Trophy className="w-3 h-3" />
            Last Time: {previousSessionData.sets.length} sets
          </p>
          <div className="flex gap-2 overflow-x-auto">
            {previousSessionData.sets.map((set, idx) => (
              <div
                key={idx}
                className="flex-shrink-0 px-3 py-1.5 bg-white border-2 border-mono-900 text-xs"
              >
                <span className="font-bold text-mono-900">{set.reps}</span>
                <span className="text-mono-500 mx-1">×</span>
                <span className="font-bold text-mono-900">{set.weight}kg</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sets List */}
      <div className="space-y-3">
        <h3 className={`${headingStyles.h3} flex items-center gap-2`}>
          Sets ({sets.filter(s => s.completed !== false).length}/{sets.length})
        </h3>
        <div className="space-y-2">
          {sets.map((set, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className={`bg-white overflow-hidden ${
                  set.completed === false
                    ? 'border-2 border-mono-900'
                    : 'border border-mono-200'
                }`}
              >
                {editingSetIndex === index && editingSetData ? (
                  // Edit Mode
                  <div className="space-y-3 p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-mono-900 text-white flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                      <span className="text-sm font-semibold text-mono-600 uppercase tracking-wide">
                        Editing Set
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
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
                      <div>
                        <label className="block text-xs font-medium text-mono-500 uppercase tracking-wide mb-1">
                          Weight (kg)
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
                  // Display Mode - Simple horizontal layout with checkbox on left
                  <div className="flex items-center gap-4 py-4 px-4">
                    {/* Checkbox - toggleable */}
                    <motion.button
                      onClick={() => handleToggleSet(index)}
                      whileTap={{ scale: 0.95 }}
                      className={`w-10 h-10 flex-shrink-0 border-2 flex items-center justify-center transition-colors ${
                        set.completed
                          ? 'bg-mono-900 border-mono-900'
                          : 'bg-white border-mono-900 hover:bg-mono-50'
                      }`}
                      type="button"
                    >
                      {set.completed ? (
                        <Check className="w-6 h-6 text-white" strokeWidth={3} />
                      ) : (
                        <span className="text-mono-400 text-sm font-bold">{index + 1}</span>
                      )}
                    </motion.button>

                    {/* Set details - clickable when not completed */}
                    <div
                      className={`flex-1 ${!set.completed ? 'cursor-pointer hover:bg-mono-50 -m-2 p-2 rounded transition-colors' : ''}`}
                      onClick={() => {
                        if (!set.completed) {
                          handleStartEditSet(index);
                        }
                      }}
                    >
                      <p className={`text-lg font-black mb-0.5 ${set.completed ? 'text-mono-900' : 'text-mono-600'}`}>
                        {set.reps} reps × {set.weight}kg
                        {!set.completed && (
                          <span className="text-xs text-mono-400 ml-2">(tap to edit)</span>
                        )}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-mono-500">
                        <span className="font-semibold">{(set.reps * set.weight).toFixed(1)}kg</span>
                        {set.setType !== 'working' && (
                          <>
                            <span>•</span>
                            <span className="uppercase">{set.setType}</span>
                          </>
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
                        onClick={() => handleRemoveSet(index)}
                        className="p-2 text-mono-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
        </div>
      </div>

      {/* Add Another Set - Collapsible Form */}
      <div className="bg-white border-2 border-mono-200">
        {!showAddSetForm ? (
          // Collapsed State - Small "+ Add Set" button
          <motion.button
            onClick={() => setShowAddSetForm(true)}
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
                  onClick={() => setShowAddSetForm(false)}
                  className="text-mono-400 hover:text-mono-900"
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              {/* Reps & Weight Inputs */}
              <div className="grid grid-cols-2 gap-4">
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

                <div className="flex flex-col gap-2">
                  <label className={headingStyles.label}>Weight (kg)</label>
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
              </div>

              {/* Note: User now clicks checkbox to complete set */}
              <p className="text-xs text-mono-500 text-center">
                Click checkbox on set to mark complete
              </p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Navigation Buttons (Fixed at bottom) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-mono-900 p-4 z-10">
        <div className="max-w-2xl mx-auto flex gap-3">
          {currentExerciseIndex > 0 ? (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handlePreviousExercise}
              className="flex-1 h-14 bg-white border-2 border-mono-900 text-mono-900 font-bold uppercase tracking-wide flex items-center justify-center gap-2"
            >
              <ChevronLeft className="w-5 h-5" />
              Previous
            </motion.button>
          ) : (
            <div className="flex-1" />
          )}

          {currentExerciseIndex < activeSession.exercises.length - 1 ? (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleNextExercise}
              className="flex-1 h-14 bg-mono-900 text-white font-bold uppercase tracking-wide flex items-center justify-center gap-2"
            >
              Next Exercise
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleCompleteWorkout}
              className="flex-1 h-14 bg-mono-900 text-white font-bold uppercase tracking-wide flex items-center justify-center gap-2"
            >
              <Trophy className="w-5 h-5" />
              Complete Workout
            </motion.button>
          )}
        </div>
      </div>
      </div>

      {/* Exercise Detail Modal */}
      <ExerciseDetailModal
        exercise={currentExercise}
        isOpen={showExerciseDetail}
        onClose={() => setShowExerciseDetail(false)}
      />
    </>
  );
}
