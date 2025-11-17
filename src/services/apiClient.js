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
 * @property {Array} sessions - Workout sessions
 * @property {Array} customExercises - User-created exercises
 * @property {Array} customTemplates - Modified templates
 * @property {Object|null} activeSession - Current in-progress workout
 * @property {string} lastUpdated - ISO timestamp of last update
 */

/**
 * Fetch user state from API
 * @returns {Promise<UserState|null>} User state or null if not found
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

    // API always returns full structure (even for new users)
    // Check if this is an empty state (no data in arrays/objects)
    const isEmpty =
      (!data.sessions || data.sessions.length === 0) &&
      (!data.customExercises || data.customExercises.length === 0) &&
      (!data.customTemplates || data.customTemplates.length === 0) &&
      !data.activeSession;

    if (isEmpty) {
      console.log('User state is empty (new user or no data)');
      return null;
    }

    console.log('User state fetched from API:', data);
    return data;
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
 * Save user state to API
 * @param {Object} state - User state to save
 * @param {Array} state.sessions - Workout sessions
 * @param {Array} state.customExercises - User-created exercises
 * @param {Array} state.customTemplates - Modified templates
 * @param {Object|null} state.activeSession - Current workout
 * @returns {Promise<UserState>} Saved user state
 */
export async function saveUserState(state) {
  const userId = getUserId();

  // Build UserState object
  const userState = {
    uuid: userId,
    sessions: state.sessions || [],
    customExercises: state.customExercises || [],
    customTemplates: state.customTemplates || [],
    activeSession: state.activeSession || null,
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

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('User state saved to API:', data);
    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('API request timeout');
      throw new Error('Request timeout - please check your connection');
    }
    console.error('Error saving user state:', error);
    throw error;
  }
}

/**
 * Sync localStorage to API
 * Reads all relevant localStorage keys and saves to backend
 * @returns {Promise<UserState>} Saved user state
 */
export async function syncToAPI() {
  const state = {
    sessions: JSON.parse(localStorage.getItem('gymbot_sessions') || '[]'),
    customExercises: JSON.parse(localStorage.getItem('gymbot_custom_exercises') || '[]'),
    customTemplates: JSON.parse(localStorage.getItem('gymbot_custom_templates') || '[]'),
    activeSession: JSON.parse(localStorage.getItem('gymbot_active_session') || 'null'),
  };

  return saveUserState(state);
}

/**
 * Load user state from API to localStorage
 * @returns {Promise<boolean>} True if data was loaded, false if no data exists
 */
export async function loadFromAPI() {
  const userState = await fetchUserState();

  if (!userState) {
    // No data in API - user is new or hasn't synced yet
    return false;
  }

  // Update localStorage with API data (using existing keys)
  localStorage.setItem('gymbot_sessions', JSON.stringify(userState.sessions || []));
  localStorage.setItem('gymbot_custom_exercises', JSON.stringify(userState.customExercises || []));
  localStorage.setItem('gymbot_custom_templates', JSON.stringify(userState.customTemplates || []));

  if (userState.activeSession) {
    localStorage.setItem('gymbot_active_session', JSON.stringify(userState.activeSession));
  } else {
    localStorage.removeItem('gymbot_active_session');
  }

  console.log('User state loaded from API to localStorage');
  return true;
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
    console.warn('API health check failed:', error);
    return false;
  }
}
