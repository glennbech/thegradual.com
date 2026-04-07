import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, Clock, Trash2, Plus, Minus, SkipForward, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';
import useWorkoutStore from '../stores/workoutStore';
import { formatDuration } from '../utils/design-system';
import ConfirmDialog from './ConfirmDialog';

export default function ActiveSessionHeader({ onNavigateToLogger, onDiscard, currentView }) {
  const activeSession = useWorkoutStore((state) => state.activeSession);
  const restTimerDuration = useWorkoutStore((state) => state.restTimerDuration);

  // Timer state
  const [exerciseStartTime, setExerciseStartTime] = useState(Date.now());
  const [exerciseTime, setExerciseTime] = useState(0);
  const [restTimeRemaining, setRestTimeRemaining] = useState(restTimerDuration);
  const updateActiveSession = useWorkoutStore((state) => state.updateActiveSession);

  // Discard confirmation dialog
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  const currentExerciseIndex = activeSession?.currentExerciseIndex || 0;
  const isOnLoggerView = currentView === 'logger';

  // Rest timer adjustment functions
  const adjustRestTime = (seconds) => {
    if (!activeSession?.isResting || !activeSession?.restStartTime) return;

    // To add time: move restStartTime backward (subtract milliseconds)
    // To subtract time: move restStartTime forward (add milliseconds)
    // Positive seconds = add time to timer (move start back)
    // Negative seconds = subtract time from timer (move start forward)
    const newRestStartTime = activeSession.restStartTime + (seconds * 1000);

    updateActiveSession({
      restStartTime: newRestStartTime
    });
  };

  const skipRest = () => {
    if (!activeSession?.isResting) return;

    // Set restStartTime to a time in the past so remaining becomes 0
    const newRestStartTime = Date.now() - (restTimerDuration * 1000);

    updateActiveSession({
      restStartTime: newRestStartTime
    });
  };

  // Exercise timer - tracks time since exercise started
  useEffect(() => {
    if (!activeSession || activeSession.isResting) return;

    const interval = setInterval(() => {
      setExerciseTime(Math.floor((Date.now() - exerciseStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [exerciseStartTime, activeSession?.isResting, activeSession]);

  // Rest timer - calculates from timestamp (survives screen lock!)
  useEffect(() => {
    if (!activeSession || !activeSession.isResting || !activeSession.restStartTime) return;

    const updateRestTimer = () => {
      const elapsed = Math.floor((Date.now() - activeSession.restStartTime) / 1000);
      const remaining = Math.max(0, restTimerDuration - elapsed);

      setRestTimeRemaining(remaining);

      // Rest time is up
      if (remaining === 0) {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.3 },
          colors: ['#F97316', '#10B981'],
          scalar: 1.0,
        });

        // Clear rest state in DynamoDB
        updateActiveSession({
          restStartTime: null,
          isResting: false
        });
      }
    };

    // Initial calculation
    updateRestTimer();

    // Update every second
    const interval = setInterval(updateRestTimer, 1000);
    return () => clearInterval(interval);
  }, [activeSession?.isResting, activeSession?.restStartTime, activeSession, updateActiveSession, restTimerDuration]);

  // Reset exercise timer when changing exercises
  useEffect(() => {
    if (!activeSession) return;

    console.log('[ActiveSessionHeader] Exercise changed to index:', currentExerciseIndex);
    setExerciseStartTime(Date.now());
    setExerciseTime(0);
  }, [currentExerciseIndex, activeSession]); // Only depend on currentExerciseIndex, not entire activeSession!

  // Page Visibility API - recalculate timers when screen unlocks
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && activeSession) {
        console.log('[ActiveSessionHeader] 🔓 Screen unlocked - recalculating timers');

        // Recalculate exercise time
        if (!activeSession.isResting) {
          setExerciseTime(Math.floor((Date.now() - exerciseStartTime) / 1000));
        }

        // Rest timer will auto-recalculate from restStartTime in its useEffect
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [activeSession, exerciseStartTime]);

  // If no active session, don't render
  if (!activeSession) {
    return null;
  }

  const currentExercise = activeSession.exercises[currentExerciseIndex];

  const isResting = activeSession.isResting || false;
  const isDeload = activeSession.isDeload || false;

  // Deload colors (calm teal/cyan) vs normal colors (black/pink)
  const exerciseColor = isDeload ? '#0D9488' : '#111827'; // teal-600 vs black
  const restColor = isDeload ? '#06B6D4' : '#ec4899';     // cyan-500 vs pink

  // Calculate completed exercises (all sets completed)
  const completedExercises = activeSession.exercises.filter(exercise =>
    exercise.sets.length > 0 && exercise.sets.every(set => set.completed)
  ).length;

  // Safely calculate total workout duration
  // startTime should be in milliseconds, but guard against seconds (Unix timestamp)
  const totalExerciseTime = (() => {
    if (!activeSession.startTime) return 0;
    const now = Date.now();
    const start = activeSession.startTime;

    // If startTime looks like Unix seconds (< year 2000 in ms), convert to ms
    const startMs = start < 946684800000 ? start * 1000 : start;

    return Math.floor((now - startMs) / 1000);
  })();

  return (
    <motion.div
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      exit={{ y: -100 }}
      className="sticky top-[73px] z-30 bg-mono-50"
    >
      <motion.div
        className="border-b-4 border-mono-900"
        animate={{
          backgroundColor: isResting ? restColor : exerciseColor
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

        {/* Stats Container - Clear typographic hierarchy */}
        <div className="px-4 py-3">
          {/* PRIMARY: Current Timer - Dominant element */}
          <AnimatePresence mode="wait">
            {isResting ? (
              <motion.div
                key="rest-timer"
                initial={{ scale: 0.8, opacity: 0, y: -10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: 10 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="mb-3"
              >
                <div className="flex items-center gap-4 mb-2">
                  <motion.div
                    animate={{
                      rotate: [0, -15, 15, -15, 15, 0],
                      scale: [1, 1.1, 1, 1.1, 1]
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <Clock className={`w-8 h-8 ${isDeload ? 'text-cyan-300' : 'text-pink-400'}`} strokeWidth={2.5} />
                  </motion.div>
                  <div className="flex-1">
                    <div className={`text-xs uppercase tracking-widest mb-1 font-bold ${isDeload ? 'text-cyan-200' : 'text-pink-300'}`}>Rest</div>
                    <motion.div
                      className={`text-4xl font-black tabular-nums leading-none ${isDeload ? 'text-cyan-300' : 'text-pink-400'}`}
                      animate={{
                        scale: restTimeRemaining <= 10 ? [1, 1.1, 1] : 1,
                        color: restTimeRemaining <= 10
                          ? (isDeload ? ['#67e8f9', '#06B6D4', '#67e8f9'] : ['#f9a8d4', '#ec4899', '#f9a8d4'])
                          : (isDeload ? '#67e8f9' : '#f9a8d4')
                      }}
                      transition={{
                        duration: 0.6,
                        repeat: restTimeRemaining <= 10 ? Infinity : 0,
                        ease: "easeInOut"
                      }}
                    >
                      {Math.floor(restTimeRemaining / 60)}:{String(restTimeRemaining % 60).padStart(2, '0')}
                    </motion.div>
                  </div>
                </div>

                {/* Rest Timer Controls */}
                <div className="flex gap-2">
                  <motion.button
                    onClick={() => adjustRestTime(15)}
                    whileTap={{ scale: 0.95 }}
                    className={`flex-1 py-2 px-3 font-bold text-sm uppercase tracking-wide transition-colors flex items-center justify-center gap-1 ${
                      isDeload
                        ? 'bg-cyan-400/20 border border-cyan-400/40 text-cyan-300 hover:bg-cyan-400/30'
                        : 'bg-pink-400/20 border border-pink-400/40 text-pink-300 hover:bg-pink-400/30'
                    }`}
                  >
                    <Minus className="w-4 h-4" strokeWidth={3} />
                    <span>15s</span>
                  </motion.button>
                  <motion.button
                    onClick={skipRest}
                    whileTap={{ scale: 0.95 }}
                    className="flex-1 bg-white/20 border border-white/40 text-white py-2 px-3 font-bold text-sm uppercase tracking-wide hover:bg-white/30 transition-colors flex items-center justify-center gap-1"
                  >
                    <SkipForward className="w-4 h-4" strokeWidth={3} />
                    <span>Skip</span>
                  </motion.button>
                  <motion.button
                    onClick={() => adjustRestTime(-15)}
                    whileTap={{ scale: 0.95 }}
                    className={`flex-1 py-2 px-3 font-bold text-sm uppercase tracking-wide transition-colors flex items-center justify-center gap-1 ${
                      isDeload
                        ? 'bg-cyan-400/20 border border-cyan-400/40 text-cyan-300 hover:bg-cyan-400/30'
                        : 'bg-pink-400/20 border border-pink-400/40 text-pink-300 hover:bg-pink-400/30'
                    }`}
                  >
                    <Plus className="w-4 h-4" strokeWidth={3} />
                    <span>15s</span>
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="exercise-timer"
                initial={{ scale: 0.8, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: -10 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="flex items-center gap-4 mb-3"
              >
                <Clock className="w-8 h-8 text-white" strokeWidth={2.5} />
                <div className="flex-1">
                  <div className="text-xs text-white/60 uppercase tracking-widest mb-1">Exercise Time</div>
                  <div className="text-4xl font-black text-white tabular-nums leading-none">
                    {Math.floor(exerciseTime / 60)}:{String(exerciseTime % 60).padStart(2, '0')}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* DELOAD BADGE */}
          {isDeload && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-2 mb-3 px-3 py-2 bg-white/10 border border-white/20 rounded-lg"
            >
              <Zap className="w-4 h-4 text-cyan-300" strokeWidth={2.5} />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Deload Mode
              </span>
              <span className="text-xs text-white/60">
                {activeSession.deloadRepPercentage}% reps • {activeSession.deloadWeightPercentage}% weight
              </span>
            </motion.div>
          )}

          {/* SECONDARY: Context info - smaller, consistent sizing */}
          <div className="flex items-center justify-between text-white/80 mb-3">
            <div className="flex items-center gap-2">
              <Dumbbell className="w-4 h-4" strokeWidth={2.5} />
              <span className="text-sm font-medium">
                {completedExercises}/{activeSession.exercises.length} completed
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" strokeWidth={2.5} />
              <span className="text-sm font-medium">
                {formatDuration(totalExerciseTime)} total
              </span>
            </div>
          </div>

          {/* TERTIARY: Action buttons - clear hierarchy */}
          <div className="flex gap-2">
            {/* Resume Button - Only show when NOT on logger view */}
            <AnimatePresence>
              {!isOnLoggerView && (
                <motion.button
                  key="resume-button"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 20
                  }}
                  onClick={onNavigateToLogger}
                  className="flex-1 px-6 py-3 bg-white text-mono-900 font-bold uppercase text-sm tracking-wide hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
                  whileTap={{ scale: 0.98 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <span>Resume Workout</span>
                  <motion.span
                    animate={{ x: [0, 3, 0] }}
                    transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                  >
                    →
                  </motion.span>
                </motion.button>
              )}
            </AnimatePresence>

            {/* Discard Button - Only show on logger view */}
            {isOnLoggerView && (
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDiscardDialog(true);
                }}
                className="ml-auto text-white/60 hover:text-white p-2"
                whileTap={{ scale: 0.95 }}
              >
                <Trash2 className="w-5 h-5" strokeWidth={2.5} />
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Discard Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDiscardDialog}
        onClose={() => setShowDiscardDialog(false)}
        onConfirm={onDiscard}
        title="Discard Workout?"
        message="All progress from this workout will be lost. This action cannot be undone."
        confirmText="Discard"
        cancelText="Keep Going"
        variant="warning"
      />
    </motion.div>
  );
}
