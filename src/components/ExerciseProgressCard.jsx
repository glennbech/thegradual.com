import { motion } from 'framer-motion';
import { Dumbbell, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { getMuscleColor } from '../utils/design-system';
import { formatWeight } from '../utils/progressCalculations';

export default function ExerciseProgressCard({ exercise, stats, trend, onClick }) {
  // Determine trend icon and color
  const getTrendDisplay = () => {
    if (trend.status !== 'success') {
      return {
        icon: Minus,
        color: 'text-mono-400',
        text: 'Not enough data',
        showPercentage: false
      };
    }

    if (trend.direction === 'up') {
      return {
        icon: TrendingUp,
        color: 'text-green-600',
        text: `+${trend.percentage.toFixed(1)}%`,
        showPercentage: true
      };
    } else if (trend.direction === 'down') {
      return {
        icon: TrendingDown,
        color: 'text-red-600',
        text: `-${trend.percentage.toFixed(1)}%`,
        showPercentage: true
      };
    } else {
      return {
        icon: Minus,
        color: 'text-mono-500',
        text: 'Plateau',
        showPercentage: false
      };
    }
  };

  const trendDisplay = getTrendDisplay();
  const TrendIcon = trendDisplay.icon;
  const muscleColor = getMuscleColor(exercise.muscleGroup || exercise.category?.toLowerCase() || 'core');

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="w-full bg-white border-2 border-mono-900 p-4 text-left hover:shadow-lg transition-shadow"
    >
      {/* Exercise Header */}
      <div className="flex items-start gap-3 mb-4">
        <div
          className="p-2 shrink-0"
          style={{ backgroundColor: muscleColor }}
        >
          <Dumbbell className="w-4 h-4 text-white" strokeWidth={2} />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-mono-900 text-base uppercase tracking-tight truncate">
            {exercise.name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="text-xs px-2 py-0.5 border font-semibold uppercase text-white"
              style={{
                backgroundColor: muscleColor,
                borderColor: muscleColor
              }}
            >
              {exercise.category}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2">
        {/* Session Count */}
        <div className="bg-mono-50 border border-mono-200 p-2">
          <p className="text-xs text-mono-500 uppercase tracking-wide mb-1">
            Sessions
          </p>
          <p className="text-lg font-bold text-mono-900 tabular-nums">
            {stats.sessionCount}
          </p>
        </div>

        {/* Max Weight */}
        <div className="bg-mono-50 border border-mono-200 p-2">
          <p className="text-xs text-mono-500 uppercase tracking-wide mb-1">
            Max Weight
          </p>
          <p className="text-lg font-bold text-mono-900 tabular-nums">
            {formatWeight(stats.maxWeight)}
            <span className="text-xs font-normal ml-0.5">kg</span>
          </p>
        </div>

        {/* Trend */}
        <div className="bg-mono-50 border border-mono-200 p-2">
          <p className="text-xs text-mono-500 uppercase tracking-wide mb-1">
            Trend
          </p>
          <div className="flex items-center gap-1">
            <TrendIcon className={`w-4 h-4 ${trendDisplay.color}`} strokeWidth={2} />
            <p className={`text-sm font-bold tabular-nums ${trendDisplay.color}`}>
              {trendDisplay.text}
            </p>
          </div>
        </div>
      </div>

      {/* Total Volume (smaller stat below) */}
      <div className="mt-3 pt-3 border-t border-mono-200">
        <div className="flex items-center justify-between">
          <p className="text-xs text-mono-500 uppercase tracking-wide">
            Total Volume
          </p>
          <p className="text-sm font-bold text-mono-900 tabular-nums">
            {(stats.totalVolume / 1000).toFixed(1)}
            <span className="text-xs font-normal ml-0.5">tons</span>
          </p>
        </div>
      </div>
    </motion.button>
  );
}
