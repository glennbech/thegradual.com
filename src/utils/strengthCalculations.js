/**
 * Scientific strength calculations for 1RM estimation and strength standards
 */

/**
 * Calculate estimated 1RM using multiple formulas
 * @param {number} weight - Weight lifted (kg)
 * @param {number} reps - Reps performed
 * @returns {object} Object with individual formula results and average
 */
export function calculateE1RM(weight, reps) {
  // Only calculate for reps >= 1 and <= 12 for accuracy
  if (reps < 1 || reps > 12) {
    return null;
  }

  // If already 1 rep, that's the 1RM
  if (reps === 1) {
    return {
      epley: weight,
      brzycki: weight,
      lombardi: weight,
      average: weight
    };
  }

  // Epley formula: 1RM = weight × (1 + reps/30)
  const epley = weight * (1 + reps / 30);

  // Brzycki formula: 1RM = weight × (36/(37-reps))
  const brzycki = weight * (36 / (37 - reps));

  // Lombardi formula: 1RM = weight × reps^0.10
  const lombardi = weight * Math.pow(reps, 0.10);

  // Average of all three
  const average = (epley + brzycki + lombardi) / 3;

  return {
    epley: Math.round(epley * 10) / 10,
    brzycki: Math.round(brzycki * 10) / 10,
    lombardi: Math.round(lombardi * 10) / 10,
    average: Math.round(average * 10) / 10
  };
}

/**
 * Get best estimated 1RM from all sets in a session
 * @param {array} sets - Array of set objects with reps and weight
 * @returns {object} Best e1RM calculation
 */
export function getBestE1RM(sets) {
  if (!sets || sets.length === 0) return null;

  let bestE1RM = null;
  let bestAverage = 0;

  sets.forEach(set => {
    // Only count working sets that are completed
    if (set.setType !== 'working') return;
    if (!set.completed) return;

    const e1rm = calculateE1RM(set.weight, set.reps);
    if (e1rm && e1rm.average > bestAverage) {
      bestE1RM = e1rm;
      bestAverage = e1rm.average;
    }
  });

  return bestE1RM;
}

/**
 * Calculate e1RM progression over time for an exercise
 * @param {array} sessions - Array of session objects
 * @param {string} exerciseId - Exercise ID to analyze
 * @returns {array} Array of {date, e1rm} objects sorted by date
 */
export function getE1RMProgression(sessions, exerciseId) {
  if (!sessions || sessions.length === 0) return [];

  const progression = [];

  sessions.forEach(session => {
    if (session.status !== 'completed') return;

    const exercise = session.exercises?.find(ex => ex.id === exerciseId);
    if (!exercise || !exercise.sets || exercise.sets.length === 0) return;

    const bestE1RM = getBestE1RM(exercise.sets);
    if (bestE1RM) {
      progression.push({
        date: session.completedAt || session.createdAt,
        e1rm: bestE1RM.average,
        sessionId: session.id
      });
    }
  });

  // Sort by date ascending
  return progression.sort((a, b) => new Date(a.date) - new Date(b.date));
}

/**
 * Calculate linear regression for e1RM progression
 * @param {array} progression - Array of {date, e1rm} from getE1RMProgression
 * @returns {object} Slope (kg/month), intercept, and R² value
 */
export function calculateProgressionRate(progression) {
  if (!progression || progression.length < 2) return null;

  // Convert dates to days since first session
  const firstDate = new Date(progression[0].date);
  const points = progression.map(p => ({
    x: (new Date(p.date) - firstDate) / (1000 * 60 * 60 * 24), // days
    y: p.e1rm
  }));

  const n = points.length;
  const sumX = points.reduce((sum, p) => sum + p.x, 0);
  const sumY = points.reduce((sum, p) => sum + p.y, 0);
  const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
  const sumX2 = points.reduce((sum, p) => sum + p.x * p.x, 0);
  const sumY2 = points.reduce((sum, p) => sum + p.y * p.y, 0);

  // Linear regression: y = mx + b
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R² (coefficient of determination)
  const yMean = sumY / n;
  const ssTotal = points.reduce((sum, p) => sum + Math.pow(p.y - yMean, 2), 0);
  const ssResidual = points.reduce((sum, p) => {
    const predicted = slope * p.x + intercept;
    return sum + Math.pow(p.y - predicted, 2);
  }, 0);
  const r2 = 1 - (ssResidual / ssTotal);

  return {
    slopePerDay: slope,
    slopePerMonth: slope * 30.44, // Average days per month
    intercept,
    r2: Math.round(r2 * 100) / 100,
    prediction: (days) => slope * days + intercept
  };
}

/**
 * Strength standards for major exercises (absolute weights in kg)
 * Based on general population standards, gender-neutral
 */
const STRENGTH_STANDARDS = {
  // Chest exercises
  'chest-1': { // Barbell Bench Press
    name: 'Bench Press',
    novice: 40,
    beginner: 60,
    intermediate: 80,
    advanced: 100,
    elite: 140
  },
  'chest-2': { // Dumbbell Bench Press
    name: 'Dumbbell Bench Press',
    novice: 30,
    beginner: 45,
    intermediate: 60,
    advanced: 75,
    elite: 100
  },

  // Back exercises
  'back-1': { // Barbell Deadlift
    name: 'Deadlift',
    novice: 60,
    beginner: 80,
    intermediate: 120,
    advanced: 160,
    elite: 200
  },
  'back-3': { // Barbell Row
    name: 'Barbell Row',
    novice: 40,
    beginner: 60,
    intermediate: 80,
    advanced: 100,
    elite: 130
  },

  // Leg exercises
  'legs-1': { // Barbell Squat
    name: 'Squat',
    novice: 50,
    beginner: 80,
    intermediate: 100,
    advanced: 140,
    elite: 180
  },
  'legs-3': { // Leg Press
    name: 'Leg Press',
    novice: 80,
    beginner: 120,
    intermediate: 180,
    advanced: 250,
    elite: 350
  },

  // Shoulder exercises
  'shoulders-1': { // Barbell Overhead Press
    name: 'Overhead Press',
    novice: 25,
    beginner: 40,
    intermediate: 55,
    advanced: 70,
    elite: 90
  },
  'shoulders-2': { // Dumbbell Shoulder Press
    name: 'Dumbbell Shoulder Press',
    novice: 20,
    beginner: 30,
    intermediate: 40,
    advanced: 50,
    elite: 70
  },

  // Arms exercises
  'arms-1': { // Barbell Curl
    name: 'Barbell Curl',
    novice: 20,
    beginner: 30,
    intermediate: 40,
    advanced: 50,
    elite: 65
  },
  'arms-5': { // Close-Grip Bench Press
    name: 'Close-Grip Bench',
    novice: 35,
    beginner: 50,
    intermediate: 65,
    advanced: 85,
    elite: 110
  }
};

/**
 * Get strength level for an exercise based on e1RM
 * @param {string} exerciseId - Exercise ID
 * @param {number} e1rm - Estimated 1RM in kg
 * @returns {object} Level name, percentage to next level, and color
 */
export function getStrengthLevel(exerciseId, e1rm) {
  const standards = STRENGTH_STANDARDS[exerciseId];

  // If no standards defined, return null
  if (!standards) {
    return null;
  }

  let level = 'novice';
  let nextLevel = 'beginner';
  let current = standards.novice;
  let next = standards.beginner;
  let percentage = 0;

  if (e1rm >= standards.elite) {
    level = 'elite';
    nextLevel = null;
    percentage = 100;
  } else if (e1rm >= standards.advanced) {
    level = 'advanced';
    nextLevel = 'elite';
    current = standards.advanced;
    next = standards.elite;
    percentage = ((e1rm - current) / (next - current)) * 100;
  } else if (e1rm >= standards.intermediate) {
    level = 'intermediate';
    nextLevel = 'advanced';
    current = standards.intermediate;
    next = standards.advanced;
    percentage = ((e1rm - current) / (next - current)) * 100;
  } else if (e1rm >= standards.beginner) {
    level = 'beginner';
    nextLevel = 'intermediate';
    current = standards.beginner;
    next = standards.intermediate;
    percentage = ((e1rm - current) / (next - current)) * 100;
  } else if (e1rm >= standards.novice) {
    level = 'novice';
    nextLevel = 'beginner';
    current = standards.novice;
    next = standards.beginner;
    percentage = ((e1rm - current) / (next - current)) * 100;
  }

  // Level colors (flat, no gradients)
  const colors = {
    novice: '#9CA3AF',      // gray-400
    beginner: '#60A5FA',    // blue-400
    intermediate: '#A78BFA', // purple-400
    advanced: '#F59E0B',    // amber-500
    elite: '#EF4444'        // red-500
  };

  return {
    level,
    levelDisplay: level.charAt(0).toUpperCase() + level.slice(1),
    nextLevel,
    percentage: Math.round(percentage),
    color: colors[level],
    currentThreshold: current,
    nextThreshold: next
  };
}

/**
 * Get all exercises that have strength standards defined
 * @returns {array} Array of exercise IDs with standards
 */
export function getExercisesWithStandards() {
  return Object.keys(STRENGTH_STANDARDS);
}

/**
 * Calculate volume for a specific day
 * @param {array} sessions - All sessions
 * @param {string} date - Date string (YYYY-MM-DD)
 * @returns {number} Total volume in kg
 */
export function getVolumeForDay(sessions, date) {
  if (!sessions || sessions.length === 0) return 0;

  const targetDate = new Date(date).toDateString();
  let totalVolume = 0;

  sessions.forEach(session => {
    if (session.status !== 'completed') return;

    const sessionDate = new Date(session.completedAt || session.createdAt).toDateString();
    if (sessionDate !== targetDate) return;

    session.exercises?.forEach(exercise => {
      exercise.sets?.forEach(set => {
        if (set.setType === 'working' && set.completed) {
          totalVolume += (set.reps || 0) * (set.weight || 0);
        }
      });
    });
  });

  return Math.round(totalVolume);
}

/**
 * Get volume data for calendar heatmap
 * @param {array} sessions - All sessions
 * @param {number} days - Number of days to look back (default 90)
 * @returns {array} Array of {date, volume} objects
 */
export function getVolumeHeatmapData(sessions, days = 90) {
  const data = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const volume = getVolumeForDay(sessions, dateStr);

    data.push({
      date: dateStr,
      volume,
      dayOfWeek: date.getDay(),
      weekNumber: Math.floor(i / 7)
    });
  }

  return data;
}
