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
 * Parse JWT token to extract payload
 * @param {string} token - JWT token
 * @returns {Object|null} Parsed payload or null
 */
function parseJWT(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error parsing JWT:', error);
    return null;
  }
}

/**
 * Get or create user UUID
 * Priority: Cognito sub > localStorage UUID > new UUID
 * @returns {string} User UUID
 */
export function getUserId() {
  // PRIORITY 1: Check if user is authenticated with Cognito
  const idToken = localStorage.getItem('idToken');

  if (idToken) {
    try {
      const payload = parseJWT(idToken);
      if (payload?.sub) {
        // Use Cognito sub as user ID for authenticated users
        return payload.sub;
      }
    } catch (error) {
    }
  }

  // PRIORITY 2: Check if anonymous UUID already exists in localStorage
  let userId = localStorage.getItem(USER_ID_KEY);

  if (!userId) {
    // PRIORITY 3: Generate new UUID for first-time anonymous user
    userId = generateUUID();
    localStorage.setItem(USER_ID_KEY, userId);
  }

  return userId;
}

/**
 * Clear user ID (for testing/debugging)
 * WARNING: This will effectively create a new user
 */
export function clearUserId() {
  localStorage.removeItem(USER_ID_KEY);
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
  return newUserId;
}
