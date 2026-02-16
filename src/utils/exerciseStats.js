/**
 * Exercise Statistics Calculator
 * Analyzes completed exercise performance vs historical data
 */

/**
 * Calculate total reps for an exercise
 */
const calculateTotalReps = (sets) => {
  return sets
    .filter(set => set.completed && set.setType === 'working')
    .reduce((sum, set) => sum + (set.reps || 0), 0);
};

/**
 * Calculate total volume for an exercise (sum of reps × weight)
 */
const calculateTotalVolume = (sets) => {
  return sets
    .filter(set => set.completed && set.setType === 'working')
    .reduce((sum, set) => sum + ((set.reps || 0) * (set.weight || 0)), 0);
};

/**
 * Find max weight from a single set
 */
const findMaxWeight = (sets) => {
  const workingSets = sets.filter(set => set.completed && set.setType === 'working');
  if (workingSets.length === 0) return 0;
  return Math.max(...workingSets.map(set => set.weight || 0));
};

/**
 * Analyze exercise performance and detect records
 * @param {Object} currentExercise - The exercise just completed
 * @param {Array} sessions - All completed sessions from history
 * @returns {Object} Stats with record flags
 */
export const analyzeExercisePerformance = (currentExercise, sessions) => {
  // Calculate current stats
  const currentTotalReps = calculateTotalReps(currentExercise.sets);
  const currentTotalVolume = calculateTotalVolume(currentExercise.sets);
  const currentMaxWeight = findMaxWeight(currentExercise.sets);

  // Find all previous sessions with this exercise
  const previousSessions = sessions
    .filter(s => s.status === 'completed')
    .map(session => {
      const exercise = session.exercises?.find(ex => ex.id === currentExercise.id);
      if (!exercise) return null;

      return {
        totalReps: calculateTotalReps(exercise.sets),
        totalVolume: calculateTotalVolume(exercise.sets),
        maxWeight: findMaxWeight(exercise.sets),
        date: session.completedAt || session.endTime
      };
    })
    .filter(Boolean);

  // If no history, everything is a "first time" (not a record)
  if (previousSessions.length === 0) {
    return {
      totalReps: currentTotalReps,
      totalVolume: currentTotalVolume,
      maxWeight: currentMaxWeight,
      records: [],
      isFirstTime: true
    };
  }

  // Find historical bests
  const bestTotalReps = Math.max(...previousSessions.map(s => s.totalReps));
  const bestTotalVolume = Math.max(...previousSessions.map(s => s.totalVolume));
  const bestMaxWeight = Math.max(...previousSessions.map(s => s.maxWeight));

  // Detect records
  const records = [];

  // Total Reps Record
  if (currentTotalReps > bestTotalReps) {
    records.push({
      type: 'totalReps',
      label: 'TOTAL REPS RECORD',
      icon: '🔥',
      current: currentTotalReps,
      previous: bestTotalReps,
      improvement: currentTotalReps - bestTotalReps,
      improvementPercent: Math.round(((currentTotalReps - bestTotalReps) / bestTotalReps) * 100)
    });
  }

  // Total Volume Record (for weighted exercises)
  if (currentMaxWeight > 0 && currentTotalVolume > bestTotalVolume) {
    records.push({
      type: 'totalVolume',
      label: 'TOTAL VOLUME RECORD',
      icon: '💪',
      current: currentTotalVolume,
      previous: bestTotalVolume,
      improvement: currentTotalVolume - bestTotalVolume,
      improvementPercent: Math.round(((currentTotalVolume - bestTotalVolume) / bestTotalVolume) * 100)
    });
  }

  // Max Weight Record (single set)
  if (currentMaxWeight > 0 && currentMaxWeight > bestMaxWeight) {
    records.push({
      type: 'maxWeight',
      label: 'MAX WEIGHT RECORD',
      icon: '🏆',
      current: currentMaxWeight,
      previous: bestMaxWeight,
      improvement: currentMaxWeight - bestMaxWeight,
      improvementPercent: Math.round(((currentMaxWeight - bestMaxWeight) / bestMaxWeight) * 100)
    });
  }

  return {
    totalReps: currentTotalReps,
    totalVolume: currentTotalVolume,
    maxWeight: currentMaxWeight,
    records,
    isFirstTime: false,
    previousBest: {
      totalReps: bestTotalReps,
      totalVolume: bestTotalVolume,
      maxWeight: bestMaxWeight
    }
  };
};
