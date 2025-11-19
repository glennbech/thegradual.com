import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Loader } from 'lucide-react';
import useWorkoutStore from '../stores/workoutStore';
import defaultExercises from '../data/exercises.json';
import {
  getPerformedExercises,
  getExerciseStats,
  calculateTrend,
  getPersonalRecords,
  getVolumeMilestones
} from '../utils/progressCalculations';
import { staggerContainer, staggerItem, pageTransition } from '../utils/animations';
import ExerciseProgressCard from './ExerciseProgressCard';
import ExerciseProgressDetail from './ExerciseProgressDetail';
import Achievements from './Achievements';

export default function Progress() {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [performedExercises, setPerformedExercises] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [selectedStats, setSelectedStats] = useState(null);
  const [personalRecords, setPersonalRecords] = useState([]);
  const [volumeMilestones, setVolumeMilestones] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    try {
      // Load sessions from Zustand store
      const sessionsData = useWorkoutStore.getState().getSessions();
      const customExercises = useWorkoutStore.getState().getCustomExercises();

      // Combine default and custom exercises
      const exercisesData = [...defaultExercises, ...customExercises];

      // Filter only completed sessions
      const completedSessions = sessionsData.filter(s => s.status === 'completed');

      setSessions(completedSessions);
      setExercises(exercisesData);

      // Get exercises that have been performed
      const performedIds = getPerformedExercises(completedSessions);

      // Map exercise IDs to full exercise objects
      const performedExercisesData = performedIds
        .map(id => exercisesData.find(ex => ex.id === id))
        .filter(Boolean); // Remove any undefined exercises

      setPerformedExercises(performedExercisesData);

      // Calculate personal records and volume milestones
      const prs = getPersonalRecords(completedSessions, exercisesData);
      const milestones = getVolumeMilestones(completedSessions);

      setPersonalRecords(prs);
      setVolumeMilestones(milestones);

    } catch (error) {
      console.error('Error loading progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExerciseClick = (exercise) => {
    // Calculate stats for the clicked exercise
    const stats = getExerciseStats(exercise.id, sessions);
    setSelectedExercise(exercise);
    setSelectedStats(stats);
  };

  const handleCloseDetail = () => {
    setSelectedExercise(null);
    setSelectedStats(null);
  };

  if (loading) {
    return (
      <motion.div
        variants={pageTransition}
        initial="initial"
        animate="animate"
        exit="exit"
        className="flex items-center justify-center min-h-screen"
      >
        <div className="text-center">
          <Loader className="w-12 h-12 text-mono-900 animate-spin mx-auto mb-4" />
          <p className="text-mono-500 font-semibold uppercase text-sm">Loading progress...</p>
        </div>
      </motion.div>
    );
  }

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
          Track your strength gains and achievements
        </motion.p>
      </div>

      {/* Empty State */}
      {performedExercises.length === 0 ? (
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
            Complete your first workout session to start tracking your progress and achievements.
          </p>
        </motion.div>
      ) : (
        <>
          {/* Exercise Progress Cards */}
          <div>
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
                const stats = getExerciseStats(exercise.id, sessions);
                const trend = calculateTrend(exercise.id, sessions);

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
          </div>

          {/* Achievements Section */}
          {volumeMilestones && (
            <Achievements
              personalRecords={personalRecords}
              volumeMilestones={volumeMilestones}
            />
          )}
        </>
      )}

      {/* Exercise Progress Detail Modal */}
      {selectedExercise && selectedStats && (
        <ExerciseProgressDetail
          exercise={selectedExercise}
          stats={selectedStats}
          isOpen={!!selectedExercise}
          onClose={handleCloseDetail}
        />
      )}
    </motion.div>
  );
}
