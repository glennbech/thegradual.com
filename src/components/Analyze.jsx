import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import useWorkoutStore from '../stores/workoutStore';
import { getMuscleColor } from '../utils/design-system';
import {
  getE1RMProgression,
  getBestE1RM,
  calculateProgressionRate,
  getStrengthLevel,
  getExercisesWithStandards,
  getVolumeHeatmapData,
} from '../utils/strengthCalculations';
import StrengthChart from './StrengthChart';
import VolumeHeatmap from './VolumeHeatmap';
import { pageTransition, staggerContainer, staggerItem } from '../utils/animations';
import defaultExercises from '../data/exercises.json';

/**
 * Analyze component - Scientific strength metrics and analytics
 */
export default function Analyze() {
  const { sessions } = useWorkoutStore();
  const [selectedExercise, setSelectedExercise] = useState(null);

  // Get exercises that have strength standards defined
  const exercisesWithStandards = useMemo(() => {
    const standardIds = getExercisesWithStandards();
    return defaultExercises.filter(ex => standardIds.includes(ex.id));
  }, []);

  // Calculate analytics for all exercises with session data
  const exerciseAnalytics = useMemo(() => {
    if (!sessions || sessions.length === 0) return [];

    const analytics = [];

    exercisesWithStandards.forEach(exercise => {
      const progression = getE1RMProgression(sessions, exercise.id);

      if (progression.length > 0) {
        const latest = progression[progression.length - 1];
        const strengthLevel = getStrengthLevel(exercise.id, latest.e1rm);
        const rate = calculateProgressionRate(progression);

        analytics.push({
          exercise,
          progression,
          latest,
          strengthLevel,
          rate,
        });
      }
    });

    // Sort by latest e1RM descending
    return analytics.sort((a, b) => b.latest.e1rm - a.latest.e1rm);
  }, [sessions, exercisesWithStandards]);

  // Volume heatmap data
  const volumeData = useMemo(() => {
    return getVolumeHeatmapData(sessions, 90);
  }, [sessions]);

  // Modal for detailed exercise view
  const ExerciseDetailModal = ({ exerciseData, onClose }) => {
    if (!exerciseData) return null;

    const { exercise, progression, latest, strengthLevel, rate } = exerciseData;

    // Find best e1RM from all sessions
    const bestE1RM = Math.max(...progression.map(p => p.e1rm));
    const firstE1RM = progression[0].e1rm;

    return (
      <motion.div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-mono-900 border border-mono-700 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-start justify-between mb-2">
              <h2 className="text-2xl font-bold text-mono-100">{exercise.name}</h2>
              <button
                onClick={onClose}
                className="text-mono-500 hover:text-mono-300 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div
              className="inline-block px-2 py-1 rounded text-xs font-semibold uppercase tracking-wide"
              style={{ backgroundColor: getMuscleColor(exercise.muscleGroup) + '20', color: getMuscleColor(exercise.muscleGroup) }}
            >
              {exercise.category}
            </div>
          </div>

          {/* Current Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-mono-800 rounded-lg p-4">
              <div className="text-xs text-mono-500 uppercase tracking-wide mb-1">Latest e1RM</div>
              <div className="text-2xl font-bold text-mono-100">{latest.e1rm}kg</div>
            </div>
            <div className="bg-mono-800 rounded-lg p-4">
              <div className="text-xs text-mono-500 uppercase tracking-wide mb-1">Best e1RM</div>
              <div className="text-2xl font-bold text-emerald-500">{bestE1RM}kg</div>
            </div>
            <div className="bg-mono-800 rounded-lg p-4">
              <div className="text-xs text-mono-500 uppercase tracking-wide mb-1">Total Gain</div>
              <div className="text-2xl font-bold text-cyan-500">+{Math.round((bestE1RM - firstE1RM) * 10) / 10}kg</div>
            </div>
          </div>

          {/* Strength Level */}
          {strengthLevel && (
            <div className="mb-6">
              <div className="text-xs text-mono-500 uppercase tracking-wide mb-2">Strength Level</div>
              <div className="flex items-center gap-3">
                <div
                  className="px-3 py-1 rounded font-semibold"
                  style={{ backgroundColor: strengthLevel.color + '20', color: strengthLevel.color }}
                >
                  {strengthLevel.levelDisplay}
                </div>
                {strengthLevel.nextLevel && (
                  <div className="flex-1">
                    <div className="flex justify-between text-xs text-mono-500 mb-1">
                      <span>Progress to {strengthLevel.nextLevel}</span>
                      <span>{strengthLevel.percentage}%</span>
                    </div>
                    <div className="h-2 bg-mono-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${strengthLevel.percentage}%`,
                          backgroundColor: strengthLevel.color
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Progression Rate */}
          {rate && progression.length >= 3 && (
            <div className="mb-6">
              <div className="text-xs text-mono-500 uppercase tracking-wide mb-2">Progression Rate</div>
              <div className="bg-mono-800 rounded-lg p-4">
                <div className="text-lg font-semibold text-mono-100">
                  {rate.slopePerMonth > 0 ? '+' : ''}{Math.round(rate.slopePerMonth * 10) / 10}kg/month
                </div>
                <div className="text-xs text-mono-500 mt-1">
                  R² = {rate.r2} ({rate.r2 >= 0.8 ? 'Strong' : rate.r2 >= 0.5 ? 'Moderate' : 'Weak'} correlation)
                </div>
              </div>
            </div>
          )}

          {/* Chart */}
          <div className="mb-6">
            <div className="text-xs text-mono-500 uppercase tracking-wide mb-2">e1RM Progression</div>
            <StrengthChart data={progression} color={getMuscleColor(exercise.muscleGroup)} />
          </div>

          {/* Formula Breakdown - Latest Session */}
          <div>
            <div className="text-xs text-mono-500 uppercase tracking-wide mb-2">1RM Formula Breakdown</div>
            <div className="bg-mono-800 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-mono-400">Epley Formula:</span>
                <span className="font-mono text-mono-100">
                  {progression[progression.length - 1].e1rm}kg
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-mono-400">Brzycki Formula:</span>
                <span className="font-mono text-mono-100">
                  {progression[progression.length - 1].e1rm}kg
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-mono-400">Lombardi Formula:</span>
                <span className="font-mono text-mono-100">
                  {progression[progression.length - 1].e1rm}kg
                </span>
              </div>
              <div className="pt-2 border-t border-mono-700 flex justify-between font-semibold">
                <span className="text-mono-300">Average (e1RM):</span>
                <span className="font-mono text-emerald-500">
                  {progression[progression.length - 1].e1rm}kg
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  // Empty state
  if (!sessions || sessions.length === 0) {
    return (
      <motion.div
        className="space-y-8 pb-24"
        variants={pageTransition}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-mono-900 mb-2 uppercase tracking-tight">
            Analyze
          </h1>
          <p className="text-mono-500 text-sm uppercase tracking-wide">
            Scientific strength metrics and 1RM estimations
          </p>
        </div>

        {/* Empty state */}
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-mono-900 mb-2">No Data Yet</h3>
          <p className="text-mono-500">
            Complete some workouts to see your strength analytics
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="space-y-8 pb-24"
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-mono-900 mb-2 uppercase tracking-tight">
          Analyze
        </h1>
        <p className="text-mono-500 text-sm uppercase tracking-wide">
          Scientific strength metrics and 1RM estimations
        </p>
      </div>

      {/* Volume Heatmap Section */}
      {volumeData && volumeData.length > 0 && (
        <motion.section variants={staggerContainer} initial="initial" animate="animate">
          <motion.div variants={staggerItem}>
            <h2 className="text-xl font-bold text-mono-900 mb-4 uppercase tracking-tight">
              Training Volume
            </h2>
            <div className="bg-white border border-mono-200 rounded-lg p-6">
              <VolumeHeatmap data={volumeData} />
            </div>
          </motion.div>
        </motion.section>
      )}

      {/* Estimated 1RM Section */}
      <motion.section variants={staggerContainer} initial="initial" animate="animate">
        <motion.div variants={staggerItem}>
          <h2 className="text-xl font-bold text-mono-900 mb-4 uppercase tracking-tight">
            Estimated 1RM by Exercise
          </h2>

          {exerciseAnalytics.length === 0 ? (
            <div className="text-center py-8 text-mono-500">
              No exercises with tracked progress yet. Start logging barbell compound movements!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {exerciseAnalytics.map(({ exercise, latest, strengthLevel, progression }) => (
                <motion.div
                  key={exercise.id}
                  variants={staggerItem}
                  className="bg-white border-l-4 border-mono-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
                  style={{ borderLeftColor: getMuscleColor(exercise.muscleGroup) }}
                  onClick={() => setSelectedExercise({ exercise, latest, strengthLevel, progression, rate: calculateProgressionRate(progression) })}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Exercise name and category */}
                  <div className="mb-3">
                    <h3 className="font-semibold text-mono-900 mb-1">{exercise.name}</h3>
                    <div
                      className="inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide"
                      style={{
                        backgroundColor: getMuscleColor(exercise.muscleGroup) + '20',
                        color: getMuscleColor(exercise.muscleGroup)
                      }}
                    >
                      {exercise.category}
                    </div>
                  </div>

                  {/* e1RM value */}
                  <div className="mb-3">
                    <div className="text-xs text-mono-500 uppercase tracking-wide mb-1">
                      Estimated 1RM
                    </div>
                    <div className="text-3xl font-bold text-mono-900">
                      {latest.e1rm}
                      <span className="text-lg text-mono-500 ml-1">kg</span>
                    </div>
                  </div>

                  {/* Strength level badge */}
                  {strengthLevel && (
                    <div className="flex items-center gap-2">
                      <div
                        className="px-2 py-1 rounded text-xs font-semibold uppercase tracking-wide"
                        style={{
                          backgroundColor: strengthLevel.color + '20',
                          color: strengthLevel.color
                        }}
                      >
                        {strengthLevel.levelDisplay}
                      </div>
                      {strengthLevel.nextLevel && (
                        <div className="text-xs text-mono-500">
                          {strengthLevel.percentage}% to {strengthLevel.nextLevel}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mini progression indicator */}
                  {progression.length > 1 && (
                    <div className="mt-3 pt-3 border-t border-mono-200">
                      <div className="text-xs text-mono-500">
                        {progression.length} sessions tracked
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </motion.section>

      {/* Info Section */}
      <motion.section
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="bg-mono-100 border border-mono-200 rounded-lg p-6"
      >
        <h3 className="font-semibold text-mono-900 mb-2 uppercase tracking-wide text-sm">
          About 1RM Estimation
        </h3>
        <p className="text-sm text-mono-700 mb-3">
          Estimated 1 Rep Max (e1RM) is calculated using the average of three scientifically-validated formulas:
          Epley, Brzycki, and Lombardi. These estimates are most accurate for sets of 1-12 reps.
        </p>
        <p className="text-sm text-mono-700">
          Strength levels are based on absolute weight standards and represent general population benchmarks.
          Click any exercise card to see detailed progression charts and formula breakdowns.
        </p>
      </motion.section>

      {/* Modal */}
      {selectedExercise && (
        <ExerciseDetailModal
          exerciseData={selectedExercise}
          onClose={() => setSelectedExercise(null)}
        />
      )}
    </motion.div>
  );
}
