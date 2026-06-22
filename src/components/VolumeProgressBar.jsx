import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';

/**
 * VolumeProgressBar - Shows current vs reference volume/reps progress
 * Displays a horizontal bar that fills from left to right as volume accumulates
 */
export default function VolumeProgressBar({
  currentExercise,
  previousExercise,
  muscleColor
}) {
  // Don't render if no previous session exists
  if (!previousExercise || !previousExercise.sets || previousExercise.sets.length === 0) {
    return null;
  }

  const exerciseType = currentExercise?.exerciseType || 'weight+reps';

  // Skip time-based exercises for now
  if (exerciseType === 'time-based') {
    return null;
  }

  /**
   * Calculate volume for completed working sets only
   */
  const calculateVolume = (sets, completedOnly = false) => {
    if (!sets || sets.length === 0) return 0;

    const workingSets = sets.filter(set => {
      const isWorkingSet = set.setType === 'working' || !set.setType; // Include sets without setType (legacy data)
      return completedOnly ? (set.completed && isWorkingSet) : isWorkingSet;
    });

    if (exerciseType === 'reps-only') {
      // For bodyweight: sum total reps
      return workingSets.reduce((sum, set) => sum + (set.reps || 0), 0);
    } else {
      // For weight+reps: sum (weight × reps)
      return workingSets.reduce((sum, set) => sum + ((set.reps || 0) * (set.weight || 0)), 0);
    }
  };

  const completedVolume = calculateVolume(currentExercise.sets, true); // Only completed sets
  const projectedVolume = calculateVolume(currentExercise.sets, false); // All sets (completed + planned)
  const referenceVolume = calculateVolume(previousExercise.sets, true);

  // Don't render if reference volume is 0 (no previous working sets)
  if (referenceVolume === 0) {
    return null;
  }

  const completedPercentage = (completedVolume / referenceVolume) * 100;
  const projectedPercentage = (projectedVolume / referenceVolume) * 100;
  const isOverflow = projectedPercentage > 100;

  // Calculate intensity for burning effect (1.0 at 100%, increases beyond)
  const burnIntensity = Math.max(0, (projectedPercentage - 100) / 50); // 0 at 100%, 1 at 150%

  // Format display text based on exercise type
  const formatVolume = (volume) => {
    if (exerciseType === 'reps-only') {
      return `${Math.round(volume)}`;
    } else {
      return `${Math.round(volume)}kg`;
    }
  };

  const displayUnit = exerciseType === 'reps-only' ? 'reps' : '';

  return (
    <div className="mt-3 mb-4">
      {/* Volume numbers */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-mono-900">
            {formatVolume(projectedVolume)} <span className="text-mono-500">/ {formatVolume(referenceVolume)}</span>
          </span>
          {displayUnit && (
            <span className="text-xs text-mono-500 uppercase tracking-wide">{displayUnit}</span>
          )}
        </div>

        {/* Progress percentage */}
        <div className="flex items-center gap-1">
          {isOverflow && (
            <TrendingUp className="w-4 h-4" style={{ color: muscleColor }} strokeWidth={2.5} />
          )}
          <span
            className="text-sm font-bold tabular-nums"
            style={{ color: isOverflow ? muscleColor : '#6B7280' }}
          >
            {Math.round(projectedPercentage)}%
          </span>
        </div>
      </div>

      {/* Progress bar with "zoom out" effect */}
      <div className="relative h-2.5 bg-mono-200 rounded-full overflow-hidden">
        {/* Calculate scale factor: how much to "zoom out" when exceeding 100% */}
        {/* At 100%: scale = 1 (marker at 80% container width) */}
        {/* At 150%: scale = 1.5 (marker slides left to ~53% container width) */}
        {(() => {
          const scaleFactor = Math.max(1, projectedPercentage / 100);
          const markerPosition = 80 / scaleFactor; // 80% when at 100%, slides left when exceeding
          const completedBarWidth = (completedPercentage / projectedPercentage) * 100;

          return (
            <>
              {/* Completed volume bar (darker, fills from left) */}
              <motion.div
                className="absolute top-0 left-0 h-full rounded-full"
                style={{
                  backgroundColor: muscleColor,
                  opacity: 0.5
                }}
                initial={{ width: 0 }}
                animate={{
                  width: `${completedBarWidth}%`,
                }}
                transition={{
                  duration: 0.5,
                  ease: 'easeOut',
                  delay: 0.1
                }}
              />

              {/* Projected volume bar (fills to 100% container width = rightmost edge) */}
              <motion.div
                className="absolute top-0 left-0 h-full rounded-full"
                style={{
                  backgroundColor: muscleColor,
                  opacity: isOverflow ? 0.85 : 0.3,
                  boxShadow: isOverflow ? `0 0 ${6 + burnIntensity * 8}px ${muscleColor}` : 'none',
                  filter: isOverflow ? `brightness(${1 + burnIntensity * 0.15})` : 'none'
                }}
                initial={{ width: 0 }}
                animate={{
                  width: '100%', // Always fills to right edge
                }}
                transition={{
                  duration: 0.6,
                  ease: 'easeOut',
                  delay: 0.2
                }}
              >
                {/* Subtle pulsing glow when exceeding 100% */}
                {isOverflow && (
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{
                      backgroundColor: muscleColor,
                      filter: 'brightness(1.1)'
                    }}
                    animate={{
                      opacity: [0.2, 0.4, 0.2],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut'
                    }}
                  />
                )}

                {/* Shimmer effect only for very high overflow */}
                {projectedPercentage > 140 && (
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${muscleColor}99, transparent)`,
                    }}
                    animate={{
                      x: ['-100%', '200%']
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: 'linear'
                    }}
                  />
                )}
              </motion.div>

              {/* 100% marker - vertical line that slides left when exceeding */}
              <motion.div
                className="absolute top-0 h-full w-0.5"
                style={{
                  backgroundColor: isOverflow ? muscleColor : '#6B7280',
                  opacity: isOverflow ? 0.9 : 0.5,
                  boxShadow: isOverflow ? `0 0 4px ${muscleColor}88` : 'none',
                  zIndex: 10
                }}
                initial={{ left: '80%' }}
                animate={{
                  left: `${markerPosition}%`,
                }}
                transition={{
                  duration: 0.7,
                  ease: 'easeOut',
                  delay: 0.3
                }}
              />
            </>
          );
        })()}
      </div>

      {/* Optional: Show "Personal Record" badge if overflow is significant */}
      {projectedPercentage >= 110 && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.8, type: 'spring', stiffness: 300 }}
          className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold uppercase tracking-wide"
          style={{
            backgroundColor: `${muscleColor}20`,
            color: muscleColor,
            boxShadow: projectedPercentage > 125 ? `0 0 10px ${muscleColor}40` : 'none'
          }}
        >
          <TrendingUp className="w-3 h-3" strokeWidth={3} />
          <span>
            {projectedPercentage >= 150 ? 'CRUSHING IT!' : projectedPercentage >= 125 ? 'Beast Mode!' : 'New PR!'}
          </span>
        </motion.div>
      )}
    </div>
  );
}
