/**
 * TheGradual Design System
 * Centralized theme constants for consistent styling across all components
 */

// ============================================================================
// COLOR PALETTE - Light Monochrome Theme
// ============================================================================

export const colors = {
  // Backgrounds
  bg: {
    primary: '#ffffff',      // White - main background
    secondary: '#fafafa',    // mono-50 - subtle background
    tertiary: '#f5f5f5',     // mono-100 - cards, panels
  },

  // Borders
  border: {
    default: '#e5e5e5',      // mono-200 - default border
    active: '#404040',       // mono-700 - active/hover border
    focus: '#171717',        // mono-900 - focused border
  },

  // Text
  text: {
    primary: '#171717',      // mono-900 - main text
    secondary: '#737373',    // mono-500 - secondary text
    tertiary: '#a3a3a3',     // mono-400 - disabled/placeholder
    inverse: '#ffffff',      // White - text on dark backgrounds
  },

  // Muscle Group Accents (used for borders and subtle highlights)
  muscle: {
    chest: '#EC4899',        // pink-500
    back: '#06B6D4',         // cyan-500
    legs: '#A855F7',         // purple-500
    shoulders: '#F97316',    // orange-500
    arms: '#6366F1',         // indigo-500
    core: '#10B981',         // emerald-500
  },

  // Status Colors
  status: {
    success: '#10B981',      // emerald-500
    warning: '#F97316',      // orange-500
    danger: '#EF4444',       // red-500
    info: '#06B6D4',         // cyan-500
  },
};

// ============================================================================
// SPACING SCALE
// ============================================================================

export const spacing = {
  xs: '0.25rem',    // 4px
  sm: '0.5rem',     // 8px
  md: '1rem',       // 16px
  lg: '1.5rem',     // 24px
  xl: '2rem',       // 32px
  '2xl': '3rem',    // 48px
  '3xl': '4rem',    // 64px
};

// ============================================================================
// TYPOGRAPHY
// ============================================================================

export const typography = {
  // Font Family
  fontFamily: {
    primary: 'Space Grotesk, system-ui, sans-serif',
  },

  // Font Sizes
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem',// 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem',    // 48px
  },

  // Font Weights
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  // Letter Spacing
  letterSpacing: {
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
};

// ============================================================================
// COMPONENT SIZES
// ============================================================================

export const sizes = {
  // Touch Targets (minimum for gym environment)
  touchTarget: {
    min: '44px',      // Minimum touch target
    comfortable: '48px', // Comfortable touch target
    large: '56px',    // Large touch target
    xlarge: '64px',   // Extra large (primary actions)
  },

  // Border Radius
  borderRadius: {
    none: '0',
    sm: '0.125rem',   // 2px
    md: '0.25rem',    // 4px
    lg: '0.5rem',     // 8px
    full: '9999px',   // Full rounded
  },

  // Border Width
  borderWidth: {
    default: '1px',
    medium: '2px',
    thick: '4px',     // Muscle group accent borders
  },
};

// ============================================================================
// SHADOWS
// ============================================================================

export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  default: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
};

// ============================================================================
// ANIMATION
// ============================================================================

export const animation = {
  // Durations
  duration: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
  },

  // Easing
  easing: {
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get muscle group color by muscle group slug
 */
export const getMuscleColor = (muscleGroup) => {
  const muscleMap = {
    chest: colors.muscle.chest,
    back: colors.muscle.back,
    legs: colors.muscle.legs,
    shoulders: colors.muscle.shoulders,
    arms: colors.muscle.arms,
    core: colors.muscle.core,
  };

  return muscleMap[muscleGroup?.toLowerCase()] || colors.border.default;
};

/**
 * Get muscle group code (3-letter abbreviation)
 */
export const getMuscleCode = (muscleGroup) => {
  const codeMap = {
    chest: 'CHT',
    back: 'BCK',
    legs: 'LEG',
    shoulders: 'SHD',
    arms: 'ARM',
    core: 'COR',
  };

  return codeMap[muscleGroup?.toLowerCase()] || 'GEN';
};

/**
 * Get difficulty badge text
 */
export const getDifficultyBadge = (difficulty) => {
  const badgeMap = {
    beginner: 'B',
    intermediate: 'I',
    advanced: 'A',
  };

  return badgeMap[difficulty?.toLowerCase()] || 'I';
};

/**
 * Format weight with unit
 */
export const formatWeight = (weight, unit = 'kg') => {
  return `${weight}${unit}`;
};

/**
 * Calculate total volume (sets × reps × weight)
 */
export const calculateVolume = (sets) => {
  if (!sets || !Array.isArray(sets)) return 0;
  return sets
    .filter(set => set.completed)
    .reduce((total, set) => {
      return total + (set.reps * set.weight);
    }, 0);
};

/**
 * Format duration in seconds to MM:SS
 */
export const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

/**
 * Get time ago string (e.g., "2 days ago")
 */
export const getTimeAgo = (timestamp) => {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);

  if (weeks > 0) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
};

/**
 * Compare performance and return improvement metrics
 */
export const comparePerformance = (current, previous) => {
  if (!previous || !current) return null;
  if (!current.sets || !Array.isArray(current.sets) || current.sets.length === 0) return null;
  if (!previous.sets || !Array.isArray(previous.sets) || previous.sets.length === 0) return null;

  const currentVolume = calculateVolume(current.sets);
  const previousVolume = calculateVolume(previous.sets);
  const volumeDiff = currentVolume - previousVolume;

  const currentCompletedSets = current.sets.filter(s => s.completed);
  const previousCompletedSets = previous.sets.filter(s => s.completed);

  const currentMaxWeight = currentCompletedSets.length > 0 ? Math.max(...currentCompletedSets.map(s => s.weight)) : 0;
  const previousMaxWeight = previousCompletedSets.length > 0 ? Math.max(...previousCompletedSets.map(s => s.weight)) : 0;
  const weightDiff = currentMaxWeight - previousMaxWeight;

  const currentTotalReps = currentCompletedSets.reduce((sum, s) => sum + s.reps, 0);
  const previousTotalReps = previousCompletedSets.reduce((sum, s) => sum + s.reps, 0);
  const repsDiff = currentTotalReps - previousTotalReps;

  return {
    volumeDiff,
    volumePercent: previousVolume > 0 ? ((volumeDiff / previousVolume) * 100).toFixed(1) : 0,
    weightDiff,
    repsDiff,
    isImprovement: volumeDiff > 0 || (volumeDiff === 0 && weightDiff > 0),
  };
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  colors,
  spacing,
  typography,
  sizes,
  shadows,
  animation,
  getMuscleColor,
  getMuscleCode,
  getDifficultyBadge,
  formatWeight,
  calculateVolume,
  formatDuration,
  getTimeAgo,
  comparePerformance,
};
