/**
 * API Client for TheGradual Backend
 * Handles communication with the Lambda/DynamoDB backend
 */

import { getUserId } from '../utils/userManager';

// API Configuration
const API_BASE_URL = 'https://api.thegradual.com';
const API_TIMEOUT = 10000; // 10 seconds

/**
 * User state structure matching DynamoDB schema
 * @typedef {Object} UserState
 * @property {string} uuid - User identifier
 * @property {number} version - Version number for optimistic locking
 * @property {string} lastModified - ISO timestamp of last modification
 * @property {Array} sessions - Workout sessions
 * @property {Array} customExercises - User-created exercises
 * @property {Array} customTemplates - Modified templates
 * @property {Object|null} activeSession - Current in-progress workout
 * @property {string} lastUpdated - ISO timestamp of last update
 */

/**
 * API Error for version conflicts (409)
 */
export class ConflictError extends Error {
  constructor(message, currentVersion) {
    super(message);
    this.name = 'ConflictError';
    this.currentVersion = currentVersion;
    this.statusCode = 409;
  }
}

/**
 * Fetch user state from API
 * @returns {Promise<UserState|null>} User state with version or null if empty
 */
export async function fetchUserState() {
  const userId = getUserId();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const response = await fetch(`${API_BASE_URL}/api/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Lambda returns JSON strings - parse them back into objects
    const parsedData = {
      uuid: data.uuid,
      version: data.version || 1,  // Version for optimistic locking
      lastModified: data.lastModified || '',
      sessions: JSON.parse(data.sessions || '[]'),
      customExercises: JSON.parse(data.customExercises || '[]'),
      customTemplates: JSON.parse(data.customTemplates || '[]'),
      activeSession: JSON.parse(data.activeSession || 'null'),
      lastUpdated: data.lastUpdated,
    };

    // Check if this is an empty state (no data in arrays/objects)
    const isEmpty =
      parsedData.sessions.length === 0 &&
      parsedData.customExercises.length === 0 &&
      parsedData.customTemplates.length === 0 &&
      !parsedData.activeSession;

    if (isEmpty) {
      // Return empty state with version 1 (ready for first save)
      return {
        uuid: userId,
        version: 1,
        lastModified: '',
        sessions: [],
        customExercises: [],
        customTemplates: [],
        activeSession: null,
        lastUpdated: '',
      };
    }

    return parsedData;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('API request timeout');
      throw new Error('Request timeout - please check your connection');
    }
    console.error('Error fetching user state:', error);
    throw error;
  }
}

/**
 * Save user state to API with optimistic locking
 * @param {Object} state - User state to save
 * @param {number} state.version - Current version (for optimistic locking)
 * @param {Array} state.sessions - Workout sessions
 * @param {Array} state.customExercises - User-created exercises
 * @param {Array} state.customTemplates - Modified templates
 * @param {Object|null} state.activeSession - Current workout
 * @returns {Promise<Object>} Response with new version
 * @throws {ConflictError} If version conflict detected (409)
 */
export async function saveUserState(state) {
  const userId = getUserId();

  // Build UserState object - Lambda expects JSON strings, not objects!
  const userState = {
    uuid: userId,
    version: state.version || 1,  // Send current version for optimistic locking
    sessions: JSON.stringify(state.sessions || []),
    customExercises: JSON.stringify(state.customExercises || []),
    customTemplates: JSON.stringify(state.customTemplates || []),
    activeSession: JSON.stringify(state.activeSession || null),
    lastUpdated: new Date().toISOString(),
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const response = await fetch(`${API_BASE_URL}/api/${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userState),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle 409 Conflict (version mismatch)
    if (response.status === 409) {
      const errorData = await response.json();
      throw new ConflictError(
        errorData.message || 'Data was modified elsewhere',
        errorData.currentVersion
      );
    }

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;  // Contains { uuid, status, message, version, lastModified }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('API request timeout');
      throw new Error('Request timeout - please check your connection');
    }
    if (error instanceof ConflictError) {
      throw error;  // Re-throw conflicts
    }
    console.error('Error saving user state:', error);
    throw error;
  }
}

/**
 * Check if API is reachable
 * @returns {Promise<boolean>} True if API is available
 */
export async function checkAPIHealth() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${API_BASE_URL}/api/health-check`, {
      method: 'OPTIONS',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return true;
  } catch (error) {
    return false;
  }
}
