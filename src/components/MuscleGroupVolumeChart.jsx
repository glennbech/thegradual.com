import React from 'react';
import { motion } from 'framer-motion';
import { getMuscleColor } from '../utils/design-system';

/**
 * MuscleGroupVolumeChart - Shows volume distribution by muscle group
 * Displays horizontal bars with percentages and absolute volumes
 */
export default function MuscleGroupVolumeChart({ volumeByMuscleGroup }) {
  if (!volumeByMuscleGroup || Object.keys(volumeByMuscleGroup).length === 0) {
    return (
      <div className="text-center py-8 text-mono-500">
        No volume data available yet
      </div>
    );
  }

  // Calculate total volume across all muscle groups
  const totalVolume = Object.values(volumeByMuscleGroup).reduce((sum, vol) => sum + vol, 0);

  // Sort muscle groups by volume (descending)
  const sortedGroups = Object.entries(volumeByMuscleGroup)
    .map(([group, volume]) => ({
      group,
      volume,
      percentage: totalVolume > 0 ? (volume / totalVolume) * 100 : 0,
    }))
    .sort((a, b) => b.volume - a.volume);

  // Format muscle group name for display
  const formatGroupName = (group) => {
    const names = {
      chest: 'Chest',
      back: 'Back',
      legs: 'Legs',
      shoulders: 'Shoulders',
      arms: 'Arms',
      core: 'Core',
    };
    return names[group] || group;
  };

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-mono-100 p-4">
          <div className="text-xs text-mono-500 uppercase tracking-wide mb-1">
            Total Volume
          </div>
          <div className="text-2xl font-bold text-mono-900">
            {Math.round(totalVolume).toLocaleString()}
            <span className="text-sm text-mono-500 ml-1">kg</span>
          </div>
        </div>
        <div className="bg-mono-100 p-4">
          <div className="text-xs text-mono-500 uppercase tracking-wide mb-1">
            Muscle Groups Trained
          </div>
          <div className="text-2xl font-bold text-mono-900">
            {sortedGroups.length}
            <span className="text-sm text-mono-500 ml-1">of 6</span>
          </div>
        </div>
      </div>

      {/* Volume Bars */}
      <div className="space-y-3">
        {sortedGroups.map(({ group, volume, percentage }) => {
          const color = getMuscleColor(group);

          return (
            <motion.div
              key={group}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Label Row */}
              <div className="flex items-baseline justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-semibold text-mono-900 text-sm uppercase tracking-wide">
                    {formatGroupName(group)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-mono-900 text-sm">
                    {percentage.toFixed(1)}%
                  </span>
                  <span className="text-xs text-mono-500 ml-2">
                    ({Math.round(volume).toLocaleString()}kg)
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-8 bg-mono-200 overflow-hidden relative">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.8, delay: 0.1 }}
                  className="h-full flex items-center px-3"
                  style={{ backgroundColor: color }}
                >
                  {percentage > 15 && (
                    <span className="text-xs font-semibold text-white">
                      {percentage.toFixed(1)}%
                    </span>
                  )}
                </motion.div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Balance Indicator */}
      <div className="mt-6 pt-4 border-t border-mono-200">
        <div className="text-xs text-mono-500 uppercase tracking-wide mb-2">
          Balance Analysis
        </div>
        <div className="text-sm text-mono-700">
          {getBalanceInsight(sortedGroups)}
        </div>
      </div>
    </div>
  );
}

/**
 * Provides insight about muscle group balance
 */
function getBalanceInsight(sortedGroups) {
  if (sortedGroups.length === 0) return 'No data available';

  const highest = sortedGroups[0];
  const lowest = sortedGroups[sortedGroups.length - 1];
  const ratio = highest.percentage / (lowest.percentage || 1);

  // Format group names
  const formatName = (group) => group.charAt(0).toUpperCase() + group.slice(1);

  if (ratio > 3) {
    return `⚠️ Significant imbalance: ${formatName(highest.group)} volume is ${ratio.toFixed(1)}x higher than ${formatName(lowest.group)}. Consider adding more ${formatName(lowest.group)} exercises.`;
  } else if (ratio > 2) {
    return `${formatName(highest.group)} is your highest volume muscle group (${highest.percentage.toFixed(1)}%). Consider balancing with more ${formatName(lowest.group)} work.`;
  } else {
    return `✓ Good balance across muscle groups. Continue maintaining varied training volume.`;
  }
}
