import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Sparkles, Clock } from 'lucide-react';
import useWorkoutStore from '../stores/workoutStore';
import { getMuscleColor } from '../utils/design-system';
import {
  getE1RMProgression,
  getBestE1RM,
  calculateProgressionRate,
  getStrengthLevel,
  getExercisesWithStandards,
} from '../utils/strengthCalculations';
import {
  getPerformedExercises,
  getExerciseStats,
  calculateTrend
} from '../utils/progressCalculations';
import StrengthChart from './StrengthChart';
import ExerciseProgressCard from './ExerciseProgressCard';
import ExerciseProgressDetail from './ExerciseProgressDetail';
import InsightsModal from './InsightsModal';
import { pageTransition, staggerContainer, staggerItem } from '../utils/animations';
import defaultExercises from '../data/exercises.json';

/**
 * Analyze component - Scientific strength metrics and analytics
 */
export default function Analyze({ onNavigateToSession }) {
  const { sessions, dailyInsights, lastAnalyzed } = useWorkoutStore();
  const [expandedExerciseId, setExpandedExerciseId] = useState(null);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [selectedStats, setSelectedStats] = useState(null);
  const [showInsightsModal, setShowInsightsModal] = useState(false);

  // Handle session click - navigate to history with selected session
  const handleSessionClick = (sessionId) => {
    console.log('[Analyze] handleSessionClick called with sessionId:', sessionId);
    if (onNavigateToSession) {
      console.log('[Analyze] Calling onNavigateToSession with:', sessionId);
      onNavigateToSession(sessionId);
    } else {
      console.warn('[Analyze] onNavigateToSession callback is not defined');
    }
  };

  // Get custom exercises from store
  const customExercises = useWorkoutStore((state) => state.getCustomExercises());
  const exercises = useMemo(() => [...defaultExercises, ...customExercises], [customExercises]);

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

  // Get exercises that have been performed (for exercise progress cards)
  // Only show exercises with 5+ sessions
  const performedExercises = useMemo(() => {
    if (!sessions || sessions.length === 0) return [];
    const completedSessions = sessions.filter(s => s.status === 'completed');
    const performedIds = getPerformedExercises(completedSessions);
    return performedIds
      .map(id => {
        const exercise = exercises.find(ex => ex.id === id);
        if (!exercise) return null;

        // Count sessions for this exercise
        const stats = getExerciseStats(id, completedSessions, exercise);
        return stats.sessionCount >= 5 ? exercise : null;
      })
      .filter(Boolean);
  }, [sessions, exercises]);

  const handleExerciseClick = (exercise) => {
    const completedSessions = sessions.filter(s => s.status === 'completed');
    const stats = getExerciseStats(exercise.id, completedSessions, exercise);
    setSelectedExercise(exercise);
    setSelectedStats(stats);
  };

  const handleCloseDetail = () => {
    setSelectedExercise(null);
    setSelectedStats(null);
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffHours < 48) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Expandable card for exercise details
  const ExerciseCard = ({ exercise, progression, latest, strengthLevel, rate }) => {
    const isExpanded = expandedExerciseId === exercise.id;
    const bestE1RM = Math.max(...progression.map(p => p.e1rm));
    const firstE1RM = progression[0].e1rm;

    return (
      <motion.div
        layout
        className="bg-white border-l-4 border-mono-200 rounded-lg overflow-hidden"
        style={{ borderLeftColor: getMuscleColor(exercise.muscleGroup) }}
      >
        {/* Card Header - Always Visible */}
        <motion.div
          layout
          className="p-4 cursor-pointer hover:bg-mono-50 transition-colors"
          onClick={() => setExpandedExerciseId(isExpanded ? null : exercise.id)}
        >
          {/* Exercise name and category */}
          <div className="mb-3">
            <div className="flex items-start justify-between">
              <h3 className="font-semibold text-mono-900 mb-1">{exercise.name}</h3>
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-mono-500"
              >
                ▼
              </motion.div>
            </div>
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
                {progression.length} sessions tracked • Click to {isExpanded ? 'collapse' : 'expand'}
              </div>
            </div>
          )}
        </motion.div>

        {/* Expanded Details */}
        {isExpanded && (
          <motion.div
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 pb-4 space-y-4 border-t border-mono-200"
          >
            {/* Current Stats */}
            <div className="grid grid-cols-3 gap-2 pt-4">
              <div className="bg-mono-100 rounded-lg p-3">
                <div className="text-xs text-mono-500 uppercase tracking-wide mb-1">Latest</div>
                <div className="text-lg font-bold text-mono-900">{latest.e1rm}kg</div>
              </div>
              <div className="bg-mono-100 rounded-lg p-3">
                <div className="text-xs text-mono-500 uppercase tracking-wide mb-1">Best</div>
                <div className="text-lg font-bold text-emerald-600">{bestE1RM}kg</div>
              </div>
              <div className="bg-mono-100 rounded-lg p-3">
                <div className="text-xs text-mono-500 uppercase tracking-wide mb-1">Gain</div>
                <div className="text-lg font-bold text-cyan-600">+{Math.round((bestE1RM - firstE1RM) * 10) / 10}kg</div>
              </div>
            </div>

            {/* Strength Level Progress Bar */}
            {strengthLevel && strengthLevel.nextLevel && (
              <div>
                <div className="text-xs text-mono-500 uppercase tracking-wide mb-2">
                  Progress to {strengthLevel.nextLevel}
                </div>
                <div className="h-3 bg-mono-200 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${strengthLevel.percentage}%` }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: strengthLevel.color }}
                  ></motion.div>
                </div>
                <div className="text-xs text-mono-500 mt-1 text-right">
                  {strengthLevel.percentage}%
                </div>
              </div>
            )}

            {/* Progression Rate */}
            {rate && progression.length >= 3 && (
              <div>
                <div className="text-xs text-mono-500 uppercase tracking-wide mb-2">Progression Rate</div>
                <div className="bg-mono-100 rounded-lg p-3">
                  <div className="text-base font-semibold text-mono-900">
                    {rate.slopePerMonth > 0 ? '+' : ''}{Math.round(rate.slopePerMonth * 10) / 10}kg/month
                  </div>
                  <div className="text-xs text-mono-500 mt-1">
                    R² = {rate.r2} ({rate.r2 >= 0.8 ? 'Strong' : rate.r2 >= 0.5 ? 'Moderate' : 'Weak'} correlation)
                  </div>
                </div>
              </div>
            )}

            {/* Chart */}
            <div>
              <div className="text-xs text-mono-500 uppercase tracking-wide mb-2">e1RM Progression</div>
              <StrengthChart data={progression} color={getMuscleColor(exercise.muscleGroup)} />
            </div>

            {/* Formula Breakdown */}
            <div className="pt-2">
              <div className="text-xs text-mono-500 uppercase tracking-wide mb-2">1RM Formula Breakdown</div>
              <div className="bg-mono-100 rounded-lg p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-mono-600">Epley:</span>
                  <span className="font-mono text-mono-900">
                    {progression[progression.length - 1].e1rm}kg
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-mono-600">Brzycki:</span>
                  <span className="font-mono text-mono-900">
                    {progression[progression.length - 1].e1rm}kg
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-mono-600">Lombardi:</span>
                  <span className="font-mono text-mono-900">
                    {progression[progression.length - 1].e1rm}kg
                  </span>
                </div>
                <div className="pt-2 border-t border-mono-300 flex justify-between font-semibold">
                  <span className="text-mono-700">Average:</span>
                  <span className="font-mono text-emerald-600">
                    {progression[progression.length - 1].e1rm}kg
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
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
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-16 bg-white border-2 border-mono-200"
        >
          <div className="bg-mono-900 p-6 rounded-full inline-block mb-4">
            <TrendingUp className="w-16 h-16 text-white" strokeWidth={2} />
          </div>
          <h2 className="text-2xl font-bold text-mono-900 mb-2 uppercase">No Data Yet</h2>
          <p className="text-mono-500 max-w-md mx-auto">
            Complete some workouts to see your strength analytics
          </p>
        </motion.div>
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
          Scientific strength metrics and analytics
        </p>
      </div>

      {/* Daily Insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {dailyInsights ? (
          // Show insights when available
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-purple-600 p-2 rounded-lg">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-mono-900 uppercase tracking-tight">
                    Insights
                  </h2>
                  <p className="text-xs text-mono-500 uppercase tracking-wide">
                    Powered by Claude 3.5 Sonnet
                  </p>
                </div>
              </div>
              {lastAnalyzed && (
                <div className="flex items-center gap-2 text-xs text-mono-500">
                  <Clock className="w-4 h-4" />
                  <span className="uppercase tracking-wide">{formatTimestamp(lastAnalyzed)}</span>
                </div>
              )}
            </div>

            {/* Summary */}
            {dailyInsights.summary && (
              <p className="text-mono-700 leading-relaxed mb-4">
                {dailyInsights.summary}
              </p>
            )}

            {/* Top Priority Recommendation */}
            {dailyInsights.recommendations && dailyInsights.recommendations.length > 0 && (
              <div className="bg-white border-l-4 border-orange-500 rounded-r-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <div className="px-2 py-1 rounded text-xs font-bold uppercase tracking-wide border border-orange-600 text-orange-600 bg-orange-50">
                    {dailyInsights.recommendations[0].priority || 'priority'}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-mono-900 mb-1">
                      {dailyInsights.recommendations[0].title}
                    </h3>
                    <p className="text-mono-700 text-sm">{dailyInsights.recommendations[0].message}</p>
                  </div>
                </div>
              </div>
            )}

            {/* View All Insights Button */}
            <button
              onClick={() => setShowInsightsModal(true)}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold uppercase tracking-wide rounded hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              View All Insights
            </button>
          </div>
        ) : (
          // Show placeholder when no insights yet
          <div className="bg-mono-100 border-2 border-mono-200 rounded-lg p-6 text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="bg-mono-300 p-2 rounded-lg">
                <Sparkles className="w-6 h-6 text-mono-600" />
              </div>
              <h2 className="text-xl font-bold text-mono-900 uppercase tracking-tight">
                Insights
              </h2>
            </div>
            <p className="text-mono-600 text-sm">
              Your personalized insights will appear here after the daily analysis runs at midnight CET.
            </p>
            <p className="text-mono-500 text-xs mt-2 uppercase tracking-wide">
              Powered by Claude 3.5 Sonnet
            </p>
          </div>
        )}
      </motion.div>

      {/* Exercise Progress Section */}
      {performedExercises.length > 0 && (
        <motion.section variants={staggerContainer} initial="initial" animate="animate">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-mono-900 p-2">
              <TrendingUp className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-mono-900 uppercase tracking-tight">
                Exercise Progress
              </h2>
              <p className="text-xs text-mono-500 uppercase">
                {performedExercises.length} exercises tracked
              </p>
            </div>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {performedExercises.map((exercise) => {
              const completedSessions = sessions.filter(s => s.status === 'completed');
              const stats = getExerciseStats(exercise.id, completedSessions, exercise);
              const trend = calculateTrend(exercise.id, completedSessions);

              return (
                <motion.div key={exercise.id} variants={staggerItem}>
                  <ExerciseProgressCard
                    exercise={exercise}
                    stats={stats}
                    trend={trend}
                    onClick={() => handleExerciseClick(exercise)}
                  />
                </motion.div>
              );
            })}
          </motion.div>
        </motion.section>
      )}

      {/* 3. Estimated 1RM Section */}
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
            <div className="space-y-4">
              {exerciseAnalytics.map(({ exercise, latest, strengthLevel, progression, rate }) => (
                <motion.div key={exercise.id} variants={staggerItem}>
                  <ExerciseCard
                    exercise={exercise}
                    progression={progression}
                    latest={latest}
                    strengthLevel={strengthLevel}
                    rate={rate}
                  />
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
          Click any exercise card to expand and see detailed progression charts and formula breakdowns.
        </p>
      </motion.section>

      {/* Exercise Progress Detail Modal */}
      {selectedExercise && selectedStats && (
        <ExerciseProgressDetail
          exercise={selectedExercise}
          stats={selectedStats}
          isOpen={!!selectedExercise}
          onClose={handleCloseDetail}
          onSessionClick={handleSessionClick}
        />
      )}

      {/* Insights Modal */}
      <InsightsModal
        isOpen={showInsightsModal}
        onClose={() => setShowInsightsModal(false)}
        insights={dailyInsights}
        loading={false}
        error={null}
      />
    </motion.div>
  );
}
