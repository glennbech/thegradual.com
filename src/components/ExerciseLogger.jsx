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
  Edit2,
  Check,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sessionService } from '../services/stateService';
import { useActiveSession } from '../hooks/useStateManager';
import { headingStyles, iconSizes } from '../utils/typography';
import { ComparisonRow } from './ComparisonBadge';
import { getMuscleColor, formatDuration, colors, comparePerformance } from '../utils/design-system';
import ConfirmDialog from './ConfirmDialog';

export default function ExerciseLogger({
  exercises,
  templateReference,
  onComplete,
  onSessionCreated,
}) {
  const { activeSession, setActiveSession, loading: activeSessionLoading } = useActiveSession();
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

  // Rest Timer State
  const [restTime, setRestTime] = useState(90);
  const [isResting, setIsResting] = useState(false);
  const [lastSetTime, setLastSetTime] = useState(null);

  // Session Tracking
  const [sessionStartTime] = useState(Date.now());
  const [sessionTime, setSessionTime] = useState(0);
  const hasInitialized = useRef(false);

  // Add Set Form - Collapsed by default
  const [showAddSetForm, setShowAddSetForm] = useState(false);

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
  useEffect(() => {
    if (activeSession?.currentExerciseIndex !== undefined) {
      setCurrentExerciseIndex(activeSession.currentExerciseIndex);
    }
  }, [activeSession?.id]); // Only run when activeSession changes

  // Initialize session - runs once on mount
  useEffect(() => {
    // CRITICAL: Wait for activeSession to finish loading before making decisions
    if (activeSessionLoading) {
      return;
    }

    // If we already have an activeSession from StateManager, restore UI state from it
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
        console.log('=== ExerciseLogger: Initializing Session ===');
        console.log('templateReference:', templateReference);
        console.log('exercises:', exercises);

        // Get previous session data if template is specified
        let previousSession = null;
        if (templateReference?.templateId) {
          console.log('Looking for previous session with templateId:', templateReference.templateId);
          previousSession = await sessionService.getPreviousSessionByTemplate(
            templateReference.templateId
          );
          console.log('Previous session found:', previousSession);
        } else {
          console.log('No templateReference provided - skipping previous session lookup');
        }

        // Create new session with exercises
        const newSession = {
          exercises: exercises.map((ex, idx) => {
            // Find matching exercise in previous session
            const prevExercise = previousSession?.exercises?.find(
              (prevEx) => prevEx.id === ex.id
            );

            console.log(`Exercise ${idx + 1} (${ex.name}):`);
            console.log('  - Current exercise ID:', ex.id);
            console.log('  - Previous exercise found:', prevExercise ? 'YES' : 'NO');

            // Pre-populate sets from previous session as PLANNED (not yet completed)
            const prePopulatedSets = prevExercise?.sets?.map((set) => ({
              reps: set.reps,
              weight: set.weight,
              setType: set.setType || 'working',
              completed: false, // IMPORTANT: Mark as planned, not completed!
              plannedFromPrevious: true,
            })) || [];

            console.log('  - Pre-populated sets:', prePopulatedSets.length, 'sets');
            console.log('  - Sets detail:', prePopulatedSets);

            return {
              ...ex,
              sets: prePopulatedSets,
            };
          }),
          startTime: Date.now(),
          templateReference: templateReference || null,
        };

        console.log('Creating new session with data:', newSession);
        const session = await sessionService.create(newSession);
        console.log('Session created successfully:', session);
        setActiveSession(session);
        if (onSessionCreated) {
          onSessionCreated(session);
        }
      } catch (error) {
        console.error('Failed to initialize session:', error);
        hasInitialized.current = false;
      }
    };

    initSession();
  }, [activeSessionLoading, activeSession, exercises, templateReference, setActiveSession, onSessionCreated]);

  // Session timer
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionTime(
        Math.floor((Date.now() - (activeSession?.startTime || sessionStartTime)) / 1000)
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSession, sessionStartTime]);

  // Load exercise data - SIMPLIFIED: Just sync what's in activeSession
  useEffect(() => {
    if (!activeSession || !activeSession.exercises[currentExerciseIndex]) {
      return;
    }

    const currentEx = activeSession.exercises[currentExerciseIndex];

    // Simple: Just load whatever sets exist in activeSession
    setSets(currentEx.sets || []);

    // Load previous session data for display only (doesn't modify current sets)
    sessionService.getPreviousSessionForExercise(currentEx.id).then((prevData) => {
      setPreviousSessionData(prevData);
    });
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
      restDuration: isNowCompleted && lastSetTime ? Math.floor((Date.now() - lastSetTime) / 1000) : null
    };

    const updatedExercises = [...activeSession.exercises];
    updatedExercises[currentExerciseIndex].sets = updatedSets;

    // Update local state first
    setSets(updatedSets);

    // Celebrate when completing a set
    if (isNowCompleted) {
      celebrateSet();
      setLastSetTime(Date.now());
      setIsResting(true);

      // Check if all sets are now complete
      const allSetsComplete = updatedSets.every(s => s.completed !== false);
      if (allSetsComplete) {
        // Delay exercise celebration slightly so it doesn't overlap with set celebration
        setTimeout(() => {
          celebrateExercise();
        }, 300);
      }
    }

    // Update StateManager
    sessionService.update(activeSession.id, { exercises: updatedExercises })
      .then((updated) => {
        setActiveSession(updated);
      })
      .catch((error) => {
        console.error('Error updating session:', error);
      });
  };

  const handleAddSet = () => {
    if (!currentExercise) return;

    // Calculate rest duration from previous set
    let restDuration = null;
    if (lastSetTime) {
      restDuration = Math.floor((Date.now() - lastSetTime) / 1000);
    }

    const newSet = {
      reps: currentSet.reps,
      weight: currentSet.weight,
      completedAt: new Date().toISOString(),
      restDuration,
      setType,
      completed: true, // Manually added sets are immediately completed
    };

    const updatedExercises = [...activeSession.exercises];
    updatedExercises[currentExerciseIndex].sets = [...sets, newSet];

    sessionService.update(activeSession.id, { exercises: updatedExercises }).then((updated) => {
      setActiveSession(updated);
    });

    setSets([...sets, newSet]);
    setLastSetTime(Date.now());

    // Celebrate the added set!
    celebrateSet();

    // Reset set type to 'working' for next set
    setSetType('working');

    // Auto-start rest timer
    setIsResting(true);
  };


  const handleRemoveSet = (index) => {
    const updatedSets = sets.filter((_, i) => i !== index);
    const updatedExercises = [...activeSession.exercises];
    updatedExercises[currentExerciseIndex].sets = updatedSets;

    sessionService.update(activeSession.id, { exercises: updatedExercises }).then(setActiveSession);

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

    sessionService.update(activeSession.id, { exercises: updatedExercises }).then(setActiveSession);

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
      sessionService.update(activeSession.id, { currentExerciseIndex: newIndex }).then(setActiveSession);
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
      sessionService.update(activeSession.id, { currentExerciseIndex: newIndex }).then(setActiveSession);
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
    try {
      // Celebrate workout completion!
      celebrateWorkout();

      // Complete the session (moves to history, clears active)
      const completedSession = await sessionService.complete(activeSession.id);

      // Clear active session in local state
      setActiveSession(null);

      // Call parent callback to navigate to history with session ID
      if (onComplete) {
        onComplete(completedSession.exercises, completedSession.id);
      }
    } catch (error) {
      console.error('Error completing workout:', error);
      alert('Error completing workout. Please try again.');
    }
  };

  const handleSaveSession = () => {
    if (confirm('Save and exit this workout?')) {
      sessionService.complete(activeSession.id).then(() => {
        setActiveSession(null);
        onComplete?.(activeSession.exercises);
      });
    }
  };

  const handleDiscardSession = () => {
    if (confirm('Discard this workout? All progress will be lost.')) {
      setActiveSession(null);
      onComplete?.();
    }
  };

  const handleRestComplete = () => {
    setIsResting(false);
  };

  const handleRestSkip = () => {
    setIsResting(false);
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
      {/* Simplified Top Bar: Just session progress */}
      <div className="sticky top-0 z-20 bg-white border-b border-mono-200 -mx-4 px-4 py-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-mono-500 uppercase tracking-wide">
            {formatDuration(sessionTime)} • {totalSetsCompleted} sets
          </span>
          <motion.button
            onClick={handleDiscardSession}
            className="text-mono-400 hover:text-mono-900"
            whileTap={{ scale: 0.95 }}
          >
            <X className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {/* Exercise Navigation Bar - Cleaner */}
      <div className="bg-white border-2 border-mono-900">
        <div className="flex items-center gap-3 p-4">
          {/* Exercise Name - Prominent */}
          <div className="flex-1">
            <p className={`${headingStyles.label} mb-1 tabular-nums`}>
              Exercise {currentExerciseIndex + 1} / {activeSession.exercises.length}
            </p>
            <h2 className={headingStyles.h1}>
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

      {/* Rest Timer - PROMINENT when active */}
      {isResting && (
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-mono-900 text-white border-2 border-mono-900 p-6"
        >
          <div className="text-center">
            <p className={`${headingStyles.label} text-mono-400 mb-2`}>
              Rest Time
            </p>
            <p className="text-7xl font-black tabular-nums mb-4">
              {formatDuration(restTime - (Math.floor((Date.now() - lastSetTime) / 1000)))}
            </p>
            <motion.button
              onClick={handleRestSkip}
              className="px-6 py-3 bg-white text-mono-900 font-bold uppercase tracking-wide"
              whileTap={{ scale: 0.95 }}
            >
              Skip Rest
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Previous Session - Compact Banner */}
      {previousSessionData && previousSessionData.sets && previousSessionData.sets.length > 0 && (
        <div className="px-4 py-3 bg-amber-50 border-2 border-amber-200">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-900 mb-2 flex items-center gap-2">
            <Trophy className="w-3 h-3" />
            Last Time: {previousSessionData.sets.length} sets
          </p>
          <div className="flex gap-2 overflow-x-auto">
            {previousSessionData.sets.map((set, idx) => (
              <div
                key={idx}
                className="flex-shrink-0 px-3 py-1.5 bg-white border border-amber-300 text-xs"
              >
                <span className="font-bold text-amber-900">{set.reps}</span>
                <span className="text-mono-500 mx-1">×</span>
                <span className="font-bold text-amber-900">{set.weight}kg</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Sets List */}
      {sets.length > 0 && (
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
                          : 'bg-white border-mono-900 hover:border-cyan-500'
                      }`}
                      type="button"
                    >
                      {set.completed ? (
                        <Check className="w-6 h-6 text-white" strokeWidth={3} />
                      ) : (
                        <span className="text-mono-400 text-sm font-bold">{index + 1}</span>
                      )}
                    </motion.button>

                    {/* Set details */}
                    <div className="flex-1">
                      <p className={`text-lg font-black mb-0.5 ${set.completed ? 'text-mono-900' : 'text-mono-600'}`}>
                        {set.reps} reps × {set.weight}kg
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
                        onClick={() => handleStartEditSet(index)}
                        className="p-2 text-mono-400 hover:text-cyan-500"
                      >
                        <Edit2 className="w-4 h-4" />
                      </motion.button>
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
      )}

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

              {/* LOG SET Button - Normal size */}
              <motion.button
                onClick={() => {
                  handleAddSet();
                  setShowAddSetForm(false); // Close form after adding
                }}
                className="w-full h-14 bg-mono-900 text-white font-bold uppercase tracking-wide text-base flex items-center justify-center gap-2"
                whileTap={{ scale: 0.98 }}
              >
                Log Set {sets.length + 1}
              </motion.button>

              {/* Rest Time Selector */}
              <div className="pt-3 border-t border-mono-200">
                <p className="text-xs font-medium uppercase tracking-widest text-mono-500 mb-2 text-center">
                  Rest: {restTime}s
                </p>
                <div className="flex gap-2 justify-center">
                  {[60, 90, 120, 180].map((time) => (
                    <motion.button
                      key={time}
                      onClick={() => setRestTime(time)}
                      className={`w-14 h-9 text-xs font-bold border-2 ${
                        restTime === time
                          ? 'bg-mono-900 text-white border-mono-900'
                          : 'bg-white text-mono-600 border-mono-200'
                      }`}
                      whileTap={{ scale: 0.95 }}
                    >
                      {time}
                    </motion.button>
                  ))}
                </div>
              </div>
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
    </>
  );
}
