import { motion } from 'framer-motion';
import { Trophy, Award, TrendingUp, Target } from 'lucide-react';
import { getMuscleColor } from '../utils/design-system';
import { formatWeight, formatVolume } from '../utils/progressCalculations';
import { staggerContainer, staggerItem } from '../utils/animations';

export default function Achievements({ personalRecords, volumeMilestones }) {
  return (
    <div className="space-y-6">
      {/* Personal Records Section */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-mono-900 p-2">
            <Trophy className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-mono-900 uppercase tracking-tight">
              Personal Records
            </h2>
            <p className="text-xs text-mono-500 uppercase">
              Your strongest lifts
            </p>
          </div>
        </div>

        {personalRecords.length === 0 ? (
          <div className="bg-white border-2 border-mono-200 p-8 text-center">
            <Trophy className="w-12 h-12 text-mono-300 mx-auto mb-3" />
            <p className="text-mono-500 font-semibold">No personal records yet</p>
            <p className="text-xs text-mono-400 mt-1">Complete workouts to track your PRs</p>
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {personalRecords.slice(0, 6).map((pr) => {
              const muscleColor = getMuscleColor(pr.muscleGroup || pr.category?.toLowerCase() || 'core');
              return (
                <motion.div
                  key={pr.exerciseId}
                  variants={staggerItem}
                  className="bg-white border-2 border-mono-900 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div
                    className="h-2"
                    style={{ backgroundColor: muscleColor }}
                  />
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-mono-900 text-sm uppercase tracking-tight truncate">
                          {pr.exerciseName}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className="text-xs px-2 py-0.5 border font-semibold uppercase text-white"
                            style={{
                              backgroundColor: muscleColor,
                              borderColor: muscleColor
                            }}
                          >
                            {pr.category}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-2xl font-bold text-mono-900 tabular-nums">
                          {formatWeight(pr.weight)}
                          <span className="text-sm font-normal ml-0.5">kg</span>
                        </p>
                        <p className="text-xs text-mono-500">
                          {new Date(pr.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* Volume Milestones Section */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-mono-900 p-2">
            <Award className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-mono-900 uppercase tracking-tight">
              Volume Milestones
            </h2>
            <p className="text-xs text-mono-500 uppercase">
              Total weight lifted achievements
            </p>
          </div>
        </div>

        {/* Total Volume Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border-2 border-mono-900 overflow-hidden mb-4"
        >
          <div className="bg-gradient-to-r from-mono-900 to-mono-700 h-2" />
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs text-mono-500 uppercase tracking-wide mb-1">
                  All-Time Total Volume
                </p>
                <p className="text-4xl font-bold text-mono-900 tabular-nums">
                  {formatVolume(volumeMilestones.totalVolume)}
                </p>
              </div>
              <div className="bg-mono-900 p-3">
                <TrendingUp className="w-6 h-6 text-white" strokeWidth={2} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="bg-mono-50 border border-mono-200 p-3">
                <p className="text-xs text-mono-500 uppercase tracking-wide mb-1">
                  Total Sets
                </p>
                <p className="text-lg font-bold text-mono-900 tabular-nums">
                  {volumeMilestones.totalSets.toLocaleString()}
                </p>
              </div>
              <div className="bg-mono-50 border border-mono-200 p-3">
                <p className="text-xs text-mono-500 uppercase tracking-wide mb-1">
                  Total Reps
                </p>
                <p className="text-lg font-bold text-mono-900 tabular-nums">
                  {volumeMilestones.totalReps.toLocaleString()}
                </p>
              </div>
              <div className="bg-mono-50 border border-mono-200 p-3">
                <p className="text-xs text-mono-500 uppercase tracking-wide mb-1">
                  Avg/Set
                </p>
                <p className="text-lg font-bold text-mono-900 tabular-nums">
                  {volumeMilestones.totalSets > 0
                    ? ((volumeMilestones.totalVolume / volumeMilestones.totalSets).toFixed(0))
                    : 0}
                  <span className="text-xs font-normal ml-0.5">kg</span>
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Milestone Cards */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {volumeMilestones.achievedMilestones.map((milestone, index) => (
            <motion.div
              key={milestone.threshold}
              variants={staggerItem}
              className="bg-white border-2 border-mono-900 p-4 text-center"
            >
              <div className="text-3xl mb-2">{milestone.icon}</div>
              <p className="text-xs font-bold text-mono-900 uppercase tracking-tight">
                {milestone.label}
              </p>
              <div className="mt-2 flex items-center justify-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-xs text-green-600 font-semibold uppercase">Unlocked</span>
              </div>
            </motion.div>
          ))}

          {/* Next Milestone (if exists) */}
          {volumeMilestones.nextMilestone && (
            <motion.div
              variants={staggerItem}
              className="bg-mono-50 border-2 border-mono-300 border-dashed p-4 text-center relative overflow-hidden"
            >
              <div className="relative z-10">
                <div className="text-3xl mb-2 opacity-50">{volumeMilestones.nextMilestone.icon}</div>
                <p className="text-xs font-bold text-mono-500 uppercase tracking-tight">
                  {volumeMilestones.nextMilestone.label}
                </p>
                <div className="mt-2">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Target className="w-3 h-3 text-mono-500" />
                    <span className="text-xs text-mono-500 font-semibold uppercase">
                      {volumeMilestones.progressToNext}% Progress
                    </span>
                  </div>
                  <div className="w-full bg-mono-200 h-1.5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${volumeMilestones.progressToNext}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                      className="bg-mono-900 h-full rounded-full"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Volume by Muscle Group */}
      {volumeMilestones.volumeByMuscleGroup.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-mono-900 p-2">
              <TrendingUp className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-mono-900 uppercase tracking-tight">
                Volume by Muscle Group
              </h2>
              <p className="text-xs text-mono-500 uppercase">
                Distribution of training volume
              </p>
            </div>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="bg-white border-2 border-mono-900 overflow-hidden"
          >
            <div className="divide-y-2 divide-mono-200">
              {volumeMilestones.volumeByMuscleGroup.map((item, index) => {
                const muscleColor = getMuscleColor(item.muscleGroup);
                const percentage = ((item.volume / volumeMilestones.totalVolume) * 100).toFixed(1);

                return (
                  <motion.div
                    key={item.muscleGroup}
                    variants={staggerItem}
                    className="p-4 hover:bg-mono-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: muscleColor }}
                        />
                        <span className="text-sm font-bold text-mono-900 uppercase">
                          {item.muscleGroup}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-mono-900 tabular-nums">
                          {formatVolume(item.volume)}
                        </p>
                        <p className="text-xs text-mono-500 tabular-nums">
                          {percentage}%
                        </p>
                      </div>
                    </div>
                    <div className="w-full bg-mono-100 h-2 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 1, delay: index * 0.1 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: muscleColor }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
