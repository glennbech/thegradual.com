/**
 * Typography System - TheGradual
 *
 * Standardized typography styles for consistent visual hierarchy
 * across the application.
 *
 * Design Principles:
 * - UPPERCASE for all headings (athletic, bold aesthetic)
 * - Tracking-tight for headings (clean, compact)
 * - Tracking-widest for labels (better readability)
 * - Icons on H2/H3 headings (w-5 h-5 for H2, w-4 h-4 for H3)
 */

/**
 * Heading Styles
 * Use these className strings directly in components
 */
export const headingStyles = {
  // H1 - Page Titles (1 per page)
  // Usage: Main page titles like "Workout History", "Exercise Library"
  h1: "text-3xl font-bold text-mono-900 uppercase tracking-tight",

  // H2 - Major Section Headings (2-4 per page)
  // Usage: "Quick Start", "Personal Workouts", "Suggested Workouts", "Exercise Library"
  // Always paired with icon (w-5 h-5)
  h2: "text-xl font-bold text-mono-900 uppercase tracking-tight",

  // H3 - Subsection Headings (4-8 per page)
  // Usage: "Completed Sets", "Exercise Details", "Focus Areas"
  // Optional icon (w-4 h-4)
  h3: "text-lg font-semibold text-mono-900 uppercase tracking-wide",

  // H4 - Card Titles / Minor Headings
  // Usage: Workout card names, exercise card names
  // No icon
  h4: "text-sm font-semibold text-mono-900 uppercase tracking-tight",

  // Body text
  body: "text-sm font-normal text-mono-900",

  // Secondary body text
  bodySecondary: "text-sm font-normal text-mono-600",

  // Labels and meta information
  label: "text-xs font-medium text-mono-500 uppercase tracking-widest",

  // Button text
  button: "text-sm font-bold uppercase tracking-wide",
};

/**
 * Icon Sizes
 * Standardized icon dimensions for headings
 */
export const iconSizes = {
  // H2 section heading icons
  h2: "w-5 h-5",

  // H3 subsection heading icons
  h3: "w-4 h-4",

  // Card icons (small)
  card: "w-4 h-4",

  // Button icons (small)
  button: "w-4 h-4",
};

/**
 * Heading Classes with Icons
 * Pre-combined classes for headings with icons
 */
export const headingWithIcon = {
  h2: `${headingStyles.h2} flex items-center gap-2`,
  h3: `${headingStyles.h3} flex items-center gap-2`,
};

/**
 * Helper function to get heading class
 * @param {number} level - Heading level (1-4)
 * @param {boolean} withIcon - Whether heading includes an icon
 * @returns {string} - className string
 */
export const getHeadingClass = (level, withIcon = false) => {
  const key = `h${level}`;
  if (withIcon && (level === 2 || level === 3)) {
    return headingWithIcon[key];
  }
  return headingStyles[key];
};

/**
 * Color variants for headings
 * Use when headings need different colors (e.g., white text on dark backgrounds)
 */
export const headingColors = {
  default: "text-mono-900",
  light: "text-white",
  muted: "text-mono-600",
  danger: "text-red-600",
};
