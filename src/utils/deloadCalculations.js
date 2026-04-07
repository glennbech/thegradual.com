/**
 * Deload Calculations
 * Utilities for applying deload percentages to sets
 */

/**
 * Apply deload percentages to a set (reps and weight)
 * Uses different rep percentages for reps-only vs weighted exercises
 * Both values are rounded down to whole numbers
 *
 * @param {Object} set - The set object with reps and weight
 * @param {string} exerciseType - "reps-only" or "weight+reps"
 * @param {number} repsOnlyPercentage - Percentage for reps on bodyweight exercises (60-100)
 * @param {number} weightedRepsPercentage - Percentage for reps on weighted exercises (60-100)
 * @param {number} weightPercentage - Percentage for weight (60-100)
 * @returns {Object} New set object with deloaded values
 */
export function applyDeloadToSet(set, exerciseType, repsOnlyPercentage, weightedRepsPercentage, weightPercentage) {
  if (!set) return set;

  // Choose the correct rep percentage based on exercise type
  const repPercentage = exerciseType === 'reps-only'
    ? repsOnlyPercentage
    : weightedRepsPercentage;

  const deloadedReps = set.reps
    ? Math.floor((set.reps * repPercentage) / 100)
    : set.reps;

  const deloadedWeight = set.weight
    ? Math.floor((set.weight * weightPercentage) / 100)
    : set.weight;

  return {
    ...set,
    reps: deloadedReps,
    weight: deloadedWeight,
    // Store original values for display purposes
    originalReps: set.reps,
    originalWeight: set.weight,
  };
}

/**
 * Apply deload percentages to an array of sets
 *
 * @param {Array} sets - Array of set objects
 * @param {string} exerciseType - "reps-only" or "weight+reps"
 * @param {number} repsOnlyPercentage - Percentage for reps on bodyweight exercises (60-100)
 * @param {number} weightedRepsPercentage - Percentage for reps on weighted exercises (60-100)
 * @param {number} weightPercentage - Percentage for weight (60-100)
 * @returns {Array} New array of sets with deloaded values
 */
export function applyDeloadToSets(sets, exerciseType, repsOnlyPercentage, weightedRepsPercentage, weightPercentage) {
  if (!sets || !Array.isArray(sets)) return sets;

  return sets.map((set) => applyDeloadToSet(set, exerciseType, repsOnlyPercentage, weightedRepsPercentage, weightPercentage));
}

/**
 * Apply deload percentages to all exercises in a session
 *
 * @param {Array} exercises - Array of exercise objects with sets
 * @param {number} repsOnlyPercentage - Percentage for reps on bodyweight exercises (60-100)
 * @param {number} weightedRepsPercentage - Percentage for reps on weighted exercises (60-100)
 * @param {number} weightPercentage - Percentage for weight (60-100)
 * @returns {Array} New array of exercises with deloaded sets
 */
export function applyDeloadToExercises(exercises, repsOnlyPercentage, weightedRepsPercentage, weightPercentage) {
  if (!exercises || !Array.isArray(exercises)) return exercises;

  return exercises.map((exercise) => ({
    ...exercise,
    sets: applyDeloadToSets(exercise.sets, exercise.exerciseType, repsOnlyPercentage, weightedRepsPercentage, weightPercentage),
  }));
}
