/**
 * User Management Utility
 * Handles user identification via UUID stored in localStorage
 */

const USER_ID_KEY = 'thegradual_user_id';

/**
 * Generate a UUID v4
 * @returns {string} UUID string
 */
function generateUUID() {
  // Use crypto.randomUUID if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback to custom implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Get or create user UUID
 * @returns {string} User UUID
 */
export function getUserId() {
  // Check if UUID already exists in localStorage
  let userId = localStorage.getItem(USER_ID_KEY);

  if (!userId) {
    // Generate new UUID for first-time user
    userId = generateUUID();
    localStorage.setItem(USER_ID_KEY, userId);
    console.log('New user created with ID:', userId);
  }

  return userId;
}

/**
 * Clear user ID (for testing/debugging)
 * WARNING: This will effectively create a new user
 */
export function clearUserId() {
  localStorage.removeItem(USER_ID_KEY);
  console.log('User ID cleared');
}

/**
 * Check if user is new (no UUID set yet)
 * @returns {boolean}
 */
export function isNewUser() {
  return !localStorage.getItem(USER_ID_KEY);
}

/**
 * Set user ID (for device transfer)
 * WARNING: This will replace the current user ID and data
 * @param {string} newUserId - The new UUID to set
 * @returns {string} The new user ID
 */
export function setUserId(newUserId) {
  if (!newUserId || typeof newUserId !== 'string') {
    throw new Error('Invalid user ID provided');
  }

  localStorage.setItem(USER_ID_KEY, newUserId);
  console.log('User ID set to:', newUserId);
  return newUserId;
}
