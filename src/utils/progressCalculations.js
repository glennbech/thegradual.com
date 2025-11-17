/**
 * Progress Calculations Utility
 * Helper functions for calculating exercise statistics, trends, PRs, and achievements
 */

/**
 * Get all exercises that have been performed in at least one session
 * @param {Array} sessions - Array of session objects
 * @returns {Array} Array of unique exercise IDs
 */
export function getPerformedExercises(sessions) {
  const exerciseIds = new Set();

  sessions.forEach(session => {
    if (session.exercises && Array.isArray(session.exercises)) {
      session.exercises.forEach(exercise => {
        exerciseIds.add(exercise.id);
      });
    }
  });

  return Array.from(exerciseIds);
}

/**
 * Get comprehensive statistics for a specific exercise
 * @param {string} exerciseId - Exercise ID to analyze
 * @param {Array} sessions - Array of all sessions
 * @returns {Object} Statistics object with sessionCount, maxWeight, totalVolume, allSessions
 */
export function getExerciseStats(exerciseId, sessions) {
  const exerciseSessions = [];
  let maxWeight = 0;
  let totalVolume = 0;

  // Filter sessions and calculate stats
  sessions.forEach(session => {
    if (!session.exercises || !Array.isArray(session.exercises)) return;

    const exerciseInSession = session.exercises.find(ex => ex.id === exerciseId);

    if (exerciseInSession && exerciseInSession.sets && exerciseInSession.sets.length > 0) {
      // Calculate max weight for this session
      const sessionMaxWeight = Math.max(
        ...exerciseInSession.sets
          .filter(set => set.setType !== 'warm-up') // Exclude warm-up sets
          .map(set => set.weight || 0)
      );

      // Calculate volume for this session
      const sessionVolume = exerciseInSession.sets.reduce((total, set) => {
        return total + (set.reps * set.weight);
      }, 0);

      exerciseSessions.push({
        sessionId: session.id,
        date: session.completedAt || session.createdAt,
        maxWeight: sessionMaxWeight,
        volume: sessionVolume,
        sets: exerciseInSession.sets.length,
        exercise: exerciseInSession
      });

      // Update overall max weight
      if (sessionMaxWeight > maxWeight) {
        maxWeight = sessionMaxWeight;
      }

      totalVolume += sessionVolume;
    }
  });

  // Sort sessions by date (oldest to newest)
  exerciseSessions.sort((a, b) => new Date(a.date) - new Date(b.date));

  return {
    sessionCount: exerciseSessions.length,
    maxWeight,
    totalVolume,
    allSessions: exerciseSessions
  };
}

/**
 * Calculate trend for an exercise (comparing recent vs previous performance)
 * @param {string} exerciseId - Exercise ID to analyze
 * @param {Array} sessions - Array of all sessions
 * @param {number} recentCount - Number of recent sessions to compare (default: 3)
 * @returns {Object} Trend object with percentage, direction, and status
 */
export function calculateTrend(exerciseId, sessions, recentCount = 3) {
  const stats = getExerciseStats(exerciseId, sessions);

  // Need at least 2x recentCount sessions to calculate trend
  if (stats.allSessions.length < recentCount * 2) {
    return {
      percentage: 0,
      direction: 'neutral',
      status: 'insufficient_data',
      message: 'Need more sessions to calculate trend'
    };
  }

  // Get recent sessions (last N)
  const recentSessions = stats.allSessions.slice(-recentCount);
  const recentAvgWeight = recentSessions.reduce((sum, s) => sum + s.maxWeight, 0) / recentCount;

  // Get baseline sessions (N sessions before recent)
  const baselineSessions = stats.allSessions.slice(-(recentCount * 2), -recentCount);
  const baselineAvgWeight = baselineSessions.reduce((sum, s) => sum + s.maxWeight, 0) / recentCount;

  // Calculate percentage change
  const percentageChange = baselineAvgWeight === 0
    ? 0
    : ((recentAvgWeight - baselineAvgWeight) / baselineAvgWeight) * 100;

  // Determine direction
  let direction = 'neutral';
  if (Math.abs(percentageChange) < 1) {
    direction = 'neutral'; // Less than 1% change is considered plateau
  } else if (percentageChange > 0) {
    direction = 'up';
  } else {
    direction = 'down';
  }

  return {
    percentage: Math.abs(percentageChange),
    direction,
    status: 'success',
    recentAvg: recentAvgWeight,
    baselineAvg: baselineAvgWeight
  };
}

/**
 * Get all personal records (PRs) from sessions
 * @param {Array} sessions - Array of all sessions
 * @param {Array} exercises - Array of exercise definitions
 * @returns {Array} Array of PR objects with exercise name, weight, date
 */
export function getPersonalRecords(sessions, exercises) {
  const exerciseMaxWeights = new Map();

  // Find max weight for each exercise
  sessions.forEach(session => {
    if (!session.exercises || !Array.isArray(session.exercises)) return;

    session.exercises.forEach(exercise => {
      if (!exercise.sets || exercise.sets.length === 0) return;

      const maxWeight = Math.max(
        ...exercise.sets
          .filter(set => set.setType !== 'warm-up')
          .map(set => set.weight || 0)
      );

      const existing = exerciseMaxWeights.get(exercise.id);

      if (!existing || maxWeight > existing.weight) {
        exerciseMaxWeights.set(exercise.id, {
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          category: exercise.category,
          muscleGroup: exercise.muscleGroup,
          weight: maxWeight,
          date: session.completedAt || session.createdAt,
          sessionId: session.id
        });
      }
    });
  });

  // Convert to array and sort by weight (descending)
  return Array.from(exerciseMaxWeights.values())
    .filter(pr => pr.weight > 0)
    .sort((a, b) => b.weight - a.weight);
}

/**
 * Calculate volume milestones and achievements
 * @param {Array} sessions - Array of all sessions
 * @returns {Object} Volume statistics and milestones
 */
export function getVolumeMilestones(sessions) {
  let totalVolume = 0;
  let totalSets = 0;
  let totalReps = 0;
  const volumeByMonth = new Map();
  const volumeByMuscleGroup = new Map();

  sessions.forEach(session => {
    if (!session.exercises || !Array.isArray(session.exercises)) return;

    const sessionDate = new Date(session.completedAt || session.createdAt);
    const monthKey = `${sessionDate.getFullYear()}-${String(sessionDate.getMonth() + 1).padStart(2, '0')}`;

    session.exercises.forEach(exercise => {
      if (!exercise.sets || exercise.sets.length === 0) return;

      exercise.sets.forEach(set => {
        const setVolume = (set.reps || 0) * (set.weight || 0);
        totalVolume += setVolume;
        totalSets++;
        totalReps += set.reps || 0;

        // Track by month
        const currentMonthVolume = volumeByMonth.get(monthKey) || 0;
        volumeByMonth.set(monthKey, currentMonthVolume + setVolume);

        // Track by muscle group
        const muscleGroup = exercise.muscleGroup || exercise.category?.toLowerCase() || 'unknown';
        const currentMuscleVolume = volumeByMuscleGroup.get(muscleGroup) || 0;
        volumeByMuscleGroup.set(muscleGroup, currentMuscleVolume + setVolume);
      });
    });
  });

  // Define volume milestones (in kg)
  const milestones = [
    { threshold: 1000, label: 'Lifted 1,000kg', icon: '🏋️' },
    { threshold: 5000, label: 'Lifted 5,000kg', icon: '💪' },
    { threshold: 10000, label: 'Lifted 10,000kg', icon: '🔥' },
    { threshold: 25000, label: 'Lifted 25,000kg', icon: '⚡' },
    { threshold: 50000, label: 'Lifted 50,000kg', icon: '🚀' },
    { threshold: 100000, label: 'Lifted 100,000kg', icon: '👑' },
    { threshold: 250000, label: 'Lifted 250,000kg', icon: '🏆' },
    { threshold: 500000, label: 'Lifted 500,000kg', icon: '💎' },
    { threshold: 1000000, label: 'Lifted 1,000,000kg', icon: '🌟' },
  ];

  const achievedMilestones = milestones.filter(m => totalVolume >= m.threshold);
  const nextMilestone = milestones.find(m => totalVolume < m.threshold);

  return {
    totalVolume,
    totalSets,
    totalReps,
    volumeByMonth: Array.from(volumeByMonth.entries())
      .map(([month, volume]) => ({ month, volume }))
      .sort((a, b) => a.month.localeCompare(b.month)),
    volumeByMuscleGroup: Array.from(volumeByMuscleGroup.entries())
      .map(([muscleGroup, volume]) => ({ muscleGroup, volume }))
      .sort((a, b) => b.volume - a.volume),
    achievedMilestones,
    nextMilestone,
    progressToNext: nextMilestone
      ? ((totalVolume / nextMilestone.threshold) * 100).toFixed(1)
      : 100
  };
}

/**
 * Format weight for display (removes decimal if whole number)
 * @param {number} weight - Weight value
 * @returns {string} Formatted weight string
 */
export function formatWeight(weight) {
  if (!weight || weight === 0) return '0';
  return weight % 1 === 0 ? weight.toString() : weight.toFixed(1);
}

/**
 * Format volume for display with appropriate units
 * @param {number} volume - Volume in kg
 * @returns {string} Formatted volume string
 */
export function formatVolume(volume) {
  if (volume >= 1000000) {
    return `${(volume / 1000000).toFixed(1)}M kg`;
  } else if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}k kg`;
  } else {
    return `${Math.round(volume)} kg`;
  }
}
