import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import useWorkoutStore from '../stores/workoutStore';
import { getVolumeHeatmapData } from '../utils/strengthCalculations';
import { pageTransition } from '../utils/animations';
import VolumeHeatmap from './VolumeHeatmap';

export default function Progress() {
  const { sessions } = useWorkoutStore();

  // Volume heatmap data
  const volumeData = useMemo(() => {
    return getVolumeHeatmapData(sessions, 90);
  }, [sessions]);

  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-8 pb-24"
    >
      {/* Header */}
      <div className="text-center">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-bold text-mono-900 mb-2 uppercase tracking-tight"
        >
          Progress
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-mono-500 text-sm uppercase tracking-wide"
        >
          Track your workout activity and volume
        </motion.p>
      </div>

      {/* Empty State */}
      {!sessions || sessions.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-16 bg-white border-2 border-mono-200"
        >
          <div className="bg-mono-900 p-6 rounded-full inline-block mb-4">
            <TrendingUp className="w-16 h-16 text-white" strokeWidth={2} />
          </div>
          <h2 className="text-2xl font-bold text-mono-900 mb-2 uppercase">No Progress Data Yet</h2>
          <p className="text-mono-500 max-w-md mx-auto">
            Complete your first workout session to start tracking your progress and volume.
          </p>
        </motion.div>
      ) : (
        <>
          {/* Volume Heatmap Section */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-mono-900 p-2">
                <TrendingUp className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-mono-900 uppercase tracking-tight">
                  Training Volume
                </h2>
                <p className="text-xs text-mono-500 uppercase">
                  Last 90 days of activity
                </p>
              </div>
            </div>

            <VolumeHeatmap data={volumeData} />
          </div>
        </>
      )}
    </motion.div>
  );
}
