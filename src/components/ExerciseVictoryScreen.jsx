import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { getMuscleColor } from '../utils/design-system';
import { X } from 'lucide-react';

/**
 * Battle Royale-Style Exercise Victory Screen
 * Shows stats flying in with record achievements
 */
const ExerciseVictoryScreen = ({ exercise, stats, onDismiss }) => {
  useEffect(() => {
    if (!stats) return;

    // Trigger confetti based on records broken
    const triggerVictoryConfetti = () => {
      const exerciseColor = getMuscleColor(exercise.category);
      const recordCount = stats.records?.length || 0;

      if (recordCount > 0) {
        // Epic confetti for records
        confetti({
          particleCount: 100,
          spread: 100,
          origin: { y: 0.6 },
          colors: [exerciseColor, '#FFD700', '#FFFFFF'],
          scalar: 1.2,
        });

        // Extra burst for multiple records
        if (recordCount >= 2) {
          setTimeout(() => {
            confetti({
              particleCount: 50,
              angle: 60,
              spread: 60,
              origin: { x: 0, y: 0.6 },
              colors: [exerciseColor, '#FFD700'],
            });
            confetti({
              particleCount: 50,
              angle: 120,
              spread: 60,
              origin: { x: 1, y: 0.6 },
              colors: [exerciseColor, '#FFD700'],
            });
          }, 200);
        }
      } else {
        // Normal completion confetti
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
          colors: [exerciseColor, '#FFFFFF'],
        });
      }
    };

    triggerVictoryConfetti();

    // Auto-dismiss after 4 seconds
    const timer = setTimeout(() => {
      onDismiss();
    }, 4000);

    return () => clearTimeout(timer);
  }, [stats, exercise, onDismiss]);

  if (!stats) return null;

  const exerciseColor = getMuscleColor(exercise.category);
  const hasRecords = stats.records && stats.records.length > 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90"
        onClick={onDismiss}
      >
        {/* Victory Card */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative bg-white w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onDismiss}
            className="absolute top-4 right-4 p-2 hover:bg-mono-100 transition-colors z-10"
          >
            <X className="w-5 h-5 text-mono-900" />
          </button>

          {/* Header - Exercise Name */}
          <div className="p-6 pb-4 border-b-2 border-mono-900">
            <motion.div
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <div className="text-xs font-bold text-mono-500 uppercase tracking-wider mb-1">
                Exercise Complete
              </div>
              <h2
                className="text-2xl font-bold mb-2"
                style={{ color: exerciseColor }}
              >
                {exercise.name}
              </h2>
            </motion.div>
          </div>

          {/* Stats Grid - Animated entries */}
          <div className="p-6 space-y-3">
            {/* Stat 1: Total Reps */}
            <motion.div
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="flex items-center justify-between p-4 border-2 border-mono-900 bg-mono-50"
            >
              <div>
                <div className="text-xs font-bold text-mono-500 uppercase tracking-wide mb-1">
                  Total Reps
                </div>
                <div className="text-3xl font-bold text-mono-900 tabular-nums">
                  {stats.totalReps}
                </div>
              </div>
              {stats.previousBest && (
                <div className="text-right">
                  <div className="text-xs text-mono-400">Previous</div>
                  <div className="text-lg text-mono-600 tabular-nums">
                    {stats.previousBest.totalReps}
                  </div>
                </div>
              )}
            </motion.div>

            {/* Stat 2: Total Volume (if weighted) */}
            {stats.maxWeight > 0 && (
              <motion.div
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                className="flex items-center justify-between p-4 border-2 border-mono-900 bg-mono-50"
              >
                <div>
                  <div className="text-xs font-bold text-mono-500 uppercase tracking-wide mb-1">
                    Total Volume
                  </div>
                  <div className="text-3xl font-bold text-mono-900 tabular-nums">
                    {stats.totalVolume.toLocaleString()}
                    <span className="text-lg ml-1">kg</span>
                  </div>
                </div>
                {stats.previousBest && (
                  <div className="text-right">
                    <div className="text-xs text-mono-400">Previous</div>
                    <div className="text-lg text-mono-600 tabular-nums">
                      {stats.previousBest.totalVolume.toLocaleString()}
                      <span className="text-sm ml-1">kg</span>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Stat 3: Max Weight (if weighted) */}
            {stats.maxWeight > 0 && (
              <motion.div
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
                className="flex items-center justify-between p-4 border-2 border-mono-900 bg-mono-50"
              >
                <div>
                  <div className="text-xs font-bold text-mono-500 uppercase tracking-wide mb-1">
                    Max Weight (Single Set)
                  </div>
                  <div className="text-3xl font-bold text-mono-900 tabular-nums">
                    {stats.maxWeight}
                    <span className="text-lg ml-1">kg</span>
                  </div>
                </div>
                {stats.previousBest && (
                  <div className="text-right">
                    <div className="text-xs text-mono-400">Previous</div>
                    <div className="text-lg text-mono-600 tabular-nums">
                      {stats.previousBest.maxWeight}
                      <span className="text-sm ml-1">kg</span>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Records Section - If any broken */}
          {hasRecords && (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="border-t-2 border-mono-900 bg-mono-900 p-6"
            >
              <div className="text-xs font-bold text-white uppercase tracking-wider mb-3">
                🏆 Records Broken
              </div>
              <div className="space-y-2">
                {stats.records.map((record, index) => (
                  <motion.div
                    key={record.type}
                    initial={{ x: 50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    className="flex items-center justify-between p-3 bg-white"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{record.icon}</span>
                      <div>
                        <div className="text-sm font-bold text-mono-900">
                          {record.label}
                        </div>
                        <div className="text-xs text-mono-500">
                          {record.type === 'totalReps' && `${record.current} reps`}
                          {record.type === 'totalVolume' && `${record.current.toLocaleString()} kg`}
                          {record.type === 'maxWeight' && `${record.current} kg`}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className="text-lg font-bold tabular-nums"
                        style={{ color: exerciseColor }}
                      >
                        +{record.improvement}
                      </div>
                      <div className="text-xs text-mono-500">
                        +{record.improvementPercent}%
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Footer - Tap to continue */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="p-4 text-center text-xs text-mono-500 border-t-2 border-mono-200"
          >
            Tap anywhere to continue
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ExerciseVictoryScreen;
