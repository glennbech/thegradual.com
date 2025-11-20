import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, Clock, Trash2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import useWorkoutStore from '../stores/workoutStore';
import { formatDuration } from '../utils/design-system';
import ConfirmDialog from './ConfirmDialog';

export default function ActiveSessionHeader({ onNavigateToLogger, onDiscard, currentView }) {
  const activeSession = useWorkoutStore((state) => state.activeSession);

  // Timer state
  const [exerciseStartTime, setExerciseStartTime] = useState(Date.now());
  const [exerciseTime, setExerciseTime] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [restTimeRemaining, setRestTimeRemaining] = useState(90);

  // Track the last trigger timestamp to avoid duplicate processing
  const lastTriggerTimestamp = useRef(null);

  // Discard confirmation dialog
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  const currentExerciseIndex = activeSession?.currentExerciseIndex || 0;
  const isOnLoggerView = currentView === 'logger';

  // Exercise timer - tracks time since exercise started
  useEffect(() => {
    if (!activeSession || isResting) return;

    const interval = setInterval(() => {
      setExerciseTime(Math.floor((Date.now() - exerciseStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [exerciseStartTime, isResting, activeSession]);

  // Rest timer - counts down from 90 seconds
  useEffect(() => {
    if (!activeSession || !isResting) return;

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
          setRestTimeRemaining(90);
          return 90;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isResting, activeSession]);

  // Reset exercise timer when changing exercises
  useEffect(() => {
    if (!activeSession) return;

    console.log('[ActiveSessionHeader] Exercise changed to index:', currentExerciseIndex);
    setExerciseStartTime(Date.now());
    setExerciseTime(0);
    setIsResting(false);
    setRestTimeRemaining(90);
  }, [currentExerciseIndex]); // Only depend on currentExerciseIndex, not entire activeSession!

  // Listen for rest timer trigger from store (using timestamp to track unique triggers)
  useEffect(() => {
    const triggerTimestamp = activeSession?.triggerRestTimerTimestamp;

    if (triggerTimestamp && triggerTimestamp !== lastTriggerTimestamp.current) {
      console.log('[ActiveSessionHeader] 🟠 Rest timer triggered at:', triggerTimestamp);
      lastTriggerTimestamp.current = triggerTimestamp;
      setIsResting(true);
      setRestTimeRemaining(90);
    }
  }, [activeSession?.triggerRestTimerTimestamp]);

  // If no active session, don't render
  if (!activeSession) {
    return null;
  }

  const currentExercise = activeSession.exercises[currentExerciseIndex];

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
          backgroundColor: isResting ? '#ea580c' : '#111827'
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

        {/* Stats Row */}
        <div className="px-4 py-4 flex items-center justify-between">
          {/* Exercise Progress */}
          <div className="flex items-center gap-3">
            <Dumbbell className="w-5 h-5 text-white" strokeWidth={2.5} />
            <div>
              <div className="text-xs text-white/60 uppercase tracking-wide mb-0.5">Exercise</div>
              <div className="text-xl font-black text-white tabular-nums">
                {currentExerciseIndex + 1}/{activeSession.exercises.length}
              </div>
            </div>
          </div>

          {/* Timer Display */}
          <AnimatePresence mode="wait">
            {isResting ? (
              <motion.div
                key="rest-timer"
                initial={{ scale: 0.8, opacity: 0, y: -10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: 10 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="flex items-center gap-2"
              >
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
                >
                  <Clock className="w-5 h-5 text-orange-300" strokeWidth={2.5} />
                </motion.div>
                <div className="text-center">
                  <div className="text-xs text-orange-200 uppercase tracking-wide mb-0.5 font-bold">Rest</div>
                  <motion.div
                    className="text-xl font-black text-orange-300 tabular-nums"
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
                className="flex items-center gap-2"
              >
                <Clock className="w-5 h-5 text-white" strokeWidth={2.5} />
                <div className="text-center">
                  <div className="text-xs text-white/60 uppercase tracking-wide mb-0.5">Time</div>
                  <div className="text-xl font-black text-white tabular-nums">
                    {formatDuration(exerciseTime)}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Resume Button - Only show when NOT on logger view */}
          <AnimatePresence>
            {!isOnLoggerView && (
              <motion.button
                key="resume-button"
                initial={{ scale: 0, opacity: 0, x: 20 }}
                animate={{ scale: 1, opacity: 1, x: 0 }}
                exit={{ scale: 0, opacity: 0, x: 20 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 20
                }}
                onClick={onNavigateToLogger}
                className="px-6 py-2 bg-white text-mono-900 font-bold uppercase text-sm tracking-wide hover:bg-white/90 transition-colors flex items-center gap-2"
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.05 }}
              >
                <span>Resume</span>
                <motion.span
                  animate={{ x: [0, 3, 0] }}
                  transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                >
                  →
                </motion.span>
              </motion.button>
            )}
          </AnimatePresence>

          {/* Discard Button */}
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              setShowDiscardDialog(true);
            }}
            className="text-white/60 hover:text-white"
            whileTap={{ scale: 0.95 }}
          >
            <Trash2 className="w-5 h-5" strokeWidth={2.5} />
          </motion.button>
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
