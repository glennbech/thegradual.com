import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { X, TrendingUp, Dumbbell, BarChart3 } from 'lucide-react';
import { getMuscleColor } from '../utils/design-system';
import { formatWeight, formatVolume } from '../utils/progressCalculations';

export default function ExerciseProgressDetail({ exercise, stats, isOpen, onClose }) {
  if (!isOpen) return null;

  const exerciseType = stats.exerciseType || 'weight+reps';

  // Prepare chart data from sessions - adapt to exercise type
  const chartData = stats.allSessions.map(session => ({
    date: new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    fullDate: new Date(session.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }),
    // Weight+reps metrics
    maxWeight: session.maxWeight,
    volume: session.volume,
    // Reps-only metrics
    totalReps: session.totalReps,
    maxReps: session.maxReps,
    // Time-based metrics
    maxDuration: session.maxDuration,
    totalDuration: session.totalDuration,
    sets: session.sets
  }));

  const muscleColor = getMuscleColor(exercise.muscleGroup || exercise.category?.toLowerCase() || 'core');

  // Custom tooltip for charts - adapt to exercise type
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border-2 border-mono-900 shadow-lg">
          <p className="font-bold text-mono-900 mb-2">{data.fullDate}</p>
          {payload.map((entry, index) => {
            let unit = '';
            let value = entry.value;

            if (exerciseType === 'time-based') {
              unit = 's';
            } else if (exerciseType === 'reps-only') {
              unit = ' reps';
            } else {
              unit = entry.dataKey === 'maxWeight' ? ' kg' : ' kg';
            }

            return (
              <p key={index} className="text-sm font-semibold text-mono-900">
                {entry.name}: {value.toFixed(exerciseType === 'time-based' ? 0 : 1)}{unit}
              </p>
            );
          })}
          <p className="text-xs text-mono-500 mt-1">{data.sets} sets</p>
        </div>
      );
    }
    return null;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 top-20 md:top-10 bg-mono-50 z-50 overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b-2 border-mono-900 z-10">
              <div className="max-w-4xl mx-auto p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div
                      className="p-2 shrink-0"
                      style={{ backgroundColor: muscleColor }}
                    >
                      <Dumbbell className="w-5 h-5 text-white" strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-2xl font-bold text-mono-900 uppercase tracking-tight truncate">
                        {exercise.name}
                      </h2>
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
                        <span className="text-xs text-mono-500 uppercase">
                          {stats.sessionCount} sessions
                        </span>
                      </div>
                    </div>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={onClose}
                    className="bg-mono-900 p-2 hover:bg-mono-700 transition-colors"
                  >
                    <X className="w-5 h-5 text-white" strokeWidth={2} />
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto p-4 space-y-6 pb-24">
              {/* Summary Stats - Adaptive */}
              <div className="grid grid-cols-3 gap-3">
                {/* Primary Metric */}
                <div className="bg-white border-2 border-mono-900 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4" style={{ color: muscleColor }} strokeWidth={2} />
                    <span className="text-xs text-mono-500 uppercase tracking-wide">
                      {exerciseType === 'time-based' ? 'Best Time' :
                       exerciseType === 'reps-only' ? 'Max Reps' :
                       'Max Weight'}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-mono-900 tabular-nums">
                    {exerciseType === 'time-based' ?
                      `${stats.maxDuration}s` :
                     exerciseType === 'reps-only' ?
                      stats.maxReps :
                      `${formatWeight(stats.maxWeight)} kg`}
                  </p>
                </div>

                {/* Secondary Metric */}
                <div className="bg-white border-2 border-mono-900 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-4 h-4" style={{ color: muscleColor }} strokeWidth={2} />
                    <span className="text-xs text-mono-500 uppercase tracking-wide">
                      {exerciseType === 'time-based' ? 'Total Time' :
                       exerciseType === 'reps-only' ? 'Total Reps' :
                       'Total Volume'}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-mono-900 tabular-nums">
                    {exerciseType === 'time-based' ?
                      `${Math.floor(stats.totalDuration / 60)}m ${stats.totalDuration % 60}s` :
                     exerciseType === 'reps-only' ?
                      stats.totalReps :
                      formatVolume(stats.totalVolume)}
                  </p>
                </div>

                {/* Sessions */}
                <div className="bg-white border-2 border-mono-900 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Dumbbell className="w-4 h-4" style={{ color: muscleColor }} strokeWidth={2} />
                    <span className="text-xs text-mono-500 uppercase tracking-wide">Sessions</span>
                  </div>
                  <p className="text-2xl font-bold text-mono-900 tabular-nums">
                    {stats.sessionCount}
                  </p>
                </div>
              </div>

              {/* Primary Metric Chart */}
              {chartData.length > 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border-2 border-mono-900 overflow-hidden"
                >
                  <div className="p-4 border-b-2 border-mono-900">
                    <h3 className="text-lg font-bold text-mono-900 uppercase tracking-tight">
                      {exerciseType === 'time-based' ? 'Max Duration Progression' :
                       exerciseType === 'reps-only' ? 'Max Reps Progression' :
                       'Max Weight Progression'}
                    </h3>
                    <p className="text-xs text-mono-500 uppercase mt-1">
                      {exerciseType === 'time-based' ? 'Longest duration per session' :
                       exerciseType === 'reps-only' ? 'Most reps in a single set per session' :
                       'Heaviest weight lifted per session'}
                    </p>
                  </div>
                  <div className="p-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="date"
                          stroke="#6b7280"
                          style={{ fontSize: '12px', fontWeight: 600 }}
                        />
                        <YAxis
                          stroke="#6b7280"
                          style={{ fontSize: '12px', fontWeight: 600 }}
                          label={{
                            value: exerciseType === 'time-based' ? 'Duration (s)' :
                                   exerciseType === 'reps-only' ? 'Reps' :
                                   'Weight (kg)',
                            angle: -90,
                            position: 'insideLeft',
                            style: { fontSize: '12px', fontWeight: 600 }
                          }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: '14px', fontWeight: 600 }} />
                        <Line
                          type="monotone"
                          dataKey={exerciseType === 'time-based' ? 'maxDuration' :
                                   exerciseType === 'reps-only' ? 'maxReps' :
                                   'maxWeight'}
                          stroke={muscleColor}
                          strokeWidth={3}
                          name={exerciseType === 'time-based' ? 'Max Duration (s)' :
                                exerciseType === 'reps-only' ? 'Max Reps' :
                                'Max Weight (kg)'}
                          dot={{ fill: muscleColor, r: 5, strokeWidth: 2, stroke: '#fff' }}
                          activeDot={{ r: 7 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              )}

              {/* Secondary Metric Chart */}
              {chartData.length > 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white border-2 border-mono-900 overflow-hidden"
                >
                  <div className="p-4 border-b-2 border-mono-900">
                    <h3 className="text-lg font-bold text-mono-900 uppercase tracking-tight">
                      {exerciseType === 'time-based' ? 'Total Duration Progression' :
                       exerciseType === 'reps-only' ? 'Total Reps Progression' :
                       'Volume Progression'}
                    </h3>
                    <p className="text-xs text-mono-500 uppercase mt-1">
                      {exerciseType === 'time-based' ? 'Total time across all sets per session' :
                       exerciseType === 'reps-only' ? 'Total reps across all sets per session' :
                       'Total volume (sets × reps × weight) per session'}
                    </p>
                  </div>
                  <div className="p-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="date"
                          stroke="#6b7280"
                          style={{ fontSize: '12px', fontWeight: 600 }}
                        />
                        <YAxis
                          stroke="#6b7280"
                          style={{ fontSize: '12px', fontWeight: 600 }}
                          label={{
                            value: exerciseType === 'time-based' ? 'Duration (s)' :
                                   exerciseType === 'reps-only' ? 'Total Reps' :
                                   'Volume (kg)',
                            angle: -90,
                            position: 'insideLeft',
                            style: { fontSize: '12px', fontWeight: 600 }
                          }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: '14px', fontWeight: 600 }} />
                        <Line
                          type="monotone"
                          dataKey={exerciseType === 'time-based' ? 'totalDuration' :
                                   exerciseType === 'reps-only' ? 'totalReps' :
                                   'volume'}
                          stroke={muscleColor}
                          strokeWidth={3}
                          name={exerciseType === 'time-based' ? 'Total Duration (s)' :
                                exerciseType === 'reps-only' ? 'Total Reps' :
                                'Volume (kg)'}
                          dot={{ fill: muscleColor, r: 5, strokeWidth: 2, stroke: '#fff' }}
                          activeDot={{ r: 7 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              )}

              {/* Session History Table - Adaptive */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white border-2 border-mono-900 overflow-hidden"
              >
                <div className="p-4 border-b-2 border-mono-900">
                  <h3 className="text-lg font-bold text-mono-900 uppercase tracking-tight">
                    Session History
                  </h3>
                  <p className="text-xs text-mono-500 uppercase mt-1">
                    All recorded sessions for this exercise
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-mono-900 bg-mono-50">
                        <th className="text-left py-3 px-4 text-xs font-bold text-mono-900 uppercase tracking-wide">
                          Date
                        </th>
                        <th className="text-right py-3 px-4 text-xs font-bold text-mono-900 uppercase tracking-wide">
                          Sets
                        </th>
                        <th className="text-right py-3 px-4 text-xs font-bold text-mono-900 uppercase tracking-wide">
                          {exerciseType === 'time-based' ? 'Max Time' :
                           exerciseType === 'reps-only' ? 'Max Reps' :
                           'Max Weight'}
                        </th>
                        <th className="text-right py-3 px-4 text-xs font-bold text-mono-900 uppercase tracking-wide">
                          {exerciseType === 'time-based' ? 'Total Time' :
                           exerciseType === 'reps-only' ? 'Total Reps' :
                           'Volume'}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...stats.allSessions].reverse().map((session, index) => (
                        <tr
                          key={session.sessionId}
                          className="border-b border-mono-200 hover:bg-mono-50 transition-colors"
                        >
                          <td className="py-3 px-4 text-sm font-medium text-mono-900">
                            {new Date(session.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </td>
                          <td className="py-3 px-4 text-sm text-right font-bold text-mono-900 tabular-nums">
                            {session.sets}
                          </td>
                          <td className="py-3 px-4 text-sm text-right font-bold text-mono-900 tabular-nums">
                            {exerciseType === 'time-based' ?
                              `${session.maxDuration}s` :
                             exerciseType === 'reps-only' ?
                              session.maxReps :
                              `${formatWeight(session.maxWeight)} kg`}
                          </td>
                          <td className="py-3 px-4 text-sm text-right font-bold text-mono-900 tabular-nums">
                            {exerciseType === 'time-based' ?
                              `${Math.floor(session.totalDuration / 60)}m ${session.totalDuration % 60}s` :
                             exerciseType === 'reps-only' ?
                              session.totalReps :
                              formatVolume(session.volume)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
