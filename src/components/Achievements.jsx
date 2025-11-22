import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { getMuscleColor } from '../utils/design-system';
import { formatWeight } from '../utils/progressCalculations';
import { staggerContainer, staggerItem } from '../utils/animations';

export default function Achievements({ personalRecords }) {
  return (
    <div className="space-y-6">
      {/* Personal Records Section - Only show if we have personal records */}
      {personalRecords && personalRecords.length > 0 && (
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
      </div>
      )}
    </div>
  );
}
