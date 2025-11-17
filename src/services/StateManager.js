/**
 * StateManager - Centralized state persistence layer
 *
 * Architecture:
 * - API is the source of truth
 * - localStorage is used as a fast cache
 * - All reads try API first, fallback to cache
 * - All writes go to API immediately, update cache on success
 * - Handles offline mode gracefully
 *
 * Usage:
 *   const stateManager = StateManager.getInstance();
 *   await stateManager.init();
 *
 *   const sessions = await stateManager.getSessions();
 *   await stateManager.updateSessions(newSessions);
 */

import { fetchUserState, saveUserState } from './apiClient';
import { getUserId } from '../utils/userManager';

// Storage keys (for cache layer only)
const CACHE_KEYS = {
  SESSIONS: 'gymbot_sessions',
  ACTIVE_SESSION: 'gymbot_active_session',
  CUSTOM_EXERCISES: 'gymbot_custom_exercises',
  CUSTOM_TEMPLATES: 'gymbot_custom_templates',
  LAST_SYNC: 'gymbot_last_sync',
  CACHE_VERSION: 'gymbot_cache_version',
};

const CACHE_VERSION = '1.0.0';
const DEBOUNCE_DELAY = 2000; // 2 seconds

class StateManager {
  constructor() {
    if (StateManager.instance) {
      return StateManager.instance;
    }

    this.initialized = false;
    this.state = {
      sessions: [],
      activeSession: null,
      customExercises: [],
      customTemplates: [],
    };

    this.pendingSave = null; // Debounce timer
    this.saveQueue = new Set(); // Track what needs saving
    this.isOnline = navigator.onLine;
    this.listeners = new Map(); // State change listeners

    // Monitor online/offline status
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('StateManager: Online - syncing pending changes');
      this.forceSyncToAPI();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('StateManager: Offline - using cache');
    });

    StateManager.instance = this;
  }

  /**
   * Get singleton instance
   */
  static getInstance() {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager();
    }
    return StateManager.instance;
  }

  /**
   * Initialize StateManager - load from API, fallback to cache
   */
  async init() {
    if (this.initialized) {
      return this.state;
    }

    console.log('StateManager: Initializing...');

    // Always load from cache first (instant)
    this.loadFromCache();
    this.initialized = true;

    // Then try to load from API if online (background sync)
    if (this.isOnline) {
      try {
        const apiState = await fetchUserState();

        if (apiState) {
          console.log('StateManager: Loaded from API, updating state');
          this.state = {
            sessions: apiState.sessions || [],
            activeSession: apiState.activeSession || null,
            customExercises: apiState.customExercises || [],
            customTemplates: apiState.customTemplates || [],
          };

          // Update cache with API data
          this.updateCache();

          // Notify all listeners of the update
          this.notifyListeners('sessions');
          this.notifyListeners('activeSession');
          this.notifyListeners('customExercises');
          this.notifyListeners('customTemplates');
        } else {
          console.log('StateManager: No API data found, using cache');
        }
      } catch (error) {
        console.warn('StateManager: API load failed, continuing with cache:', error);
        // Cache is already loaded, so we're OK
      }
    } else {
      console.log('StateManager: Offline, using cache only');
    }

    return this.state;
  }

  /**
   * Load state from localStorage cache
   */
  loadFromCache() {
    try {
      this.state.sessions = JSON.parse(localStorage.getItem(CACHE_KEYS.SESSIONS) || '[]');
      this.state.activeSession = JSON.parse(localStorage.getItem(CACHE_KEYS.ACTIVE_SESSION) || 'null');
      this.state.customExercises = JSON.parse(localStorage.getItem(CACHE_KEYS.CUSTOM_EXERCISES) || '[]');
      this.state.customTemplates = JSON.parse(localStorage.getItem(CACHE_KEYS.CUSTOM_TEMPLATES) || '[]');
      console.log('StateManager: Loaded from cache');
    } catch (error) {
      console.error('StateManager: Cache load failed:', error);
      // Reset to defaults if cache is corrupted
      this.state = {
        sessions: [],
        activeSession: null,
        customExercises: [],
        customTemplates: [],
      };
    }
  }

  /**
   * Update localStorage cache with current state
   */
  updateCache() {
    try {
      localStorage.setItem(CACHE_KEYS.SESSIONS, JSON.stringify(this.state.sessions));
      localStorage.setItem(CACHE_KEYS.ACTIVE_SESSION, JSON.stringify(this.state.activeSession));
      localStorage.setItem(CACHE_KEYS.CUSTOM_EXERCISES, JSON.stringify(this.state.customExercises));
      localStorage.setItem(CACHE_KEYS.CUSTOM_TEMPLATES, JSON.stringify(this.state.customTemplates));
      localStorage.setItem(CACHE_KEYS.LAST_SYNC, new Date().toISOString());
      localStorage.setItem(CACHE_KEYS.CACHE_VERSION, CACHE_VERSION);
    } catch (error) {
      console.error('StateManager: Cache update failed:', error);
    }
  }

  /**
   * Save current state to API (debounced)
   */
  async saveToAPI(immediate = false) {
    // Always update cache immediately
    this.updateCache();

    // Clear existing debounce timer
    if (this.pendingSave) {
      clearTimeout(this.pendingSave);
      this.pendingSave = null;
    }

    // If offline, just return success (cache is updated)
    if (!this.isOnline) {
      console.log('StateManager: Offline - saved to cache only');
      return Promise.resolve();
    }

    if (immediate) {
      return this.executeSave();
    }

    // Debounce: wait for user to stop making changes
    return new Promise((resolve) => {
      this.pendingSave = setTimeout(async () => {
        try {
          await this.executeSave();
          resolve();
        } catch (error) {
          // Don't reject - cache is already saved
          console.error('StateManager: API save failed, but cache is updated:', error);
          resolve();
        }
      }, DEBOUNCE_DELAY);
    });
  }

  /**
   * Execute the actual save to API
   */
  async executeSave() {
    if (!this.isOnline) {
      console.log('StateManager: Offline - save queued for later');
      return true;
    }

    try {
      console.log('StateManager: Saving to API...');
      await saveUserState(this.state);
      console.log('StateManager: API save successful');
      return true;
    } catch (error) {
      console.error('StateManager: API save failed (cache already updated):', error);
      // Don't throw - cache is already saved in saveToAPI()
      return false;
    }
  }

  /**
   * Force immediate sync to API
   */
  async forceSyncToAPI() {
    return this.saveToAPI(true);
  }

  /**
   * Subscribe to state changes
   */
  subscribe(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);

    // Return unsubscribe function
    return () => {
      const keyListeners = this.listeners.get(key);
      if (keyListeners) {
        keyListeners.delete(callback);
      }
    };
  }

  /**
   * Notify listeners of state changes
   */
  notifyListeners(key) {
    const keyListeners = this.listeners.get(key);
    if (keyListeners) {
      keyListeners.forEach(callback => callback(this.state[key]));
    }
  }

  // ==========================================
  // SESSIONS
  // ==========================================

  /**
   * Get all sessions
   */
  async getSessions() {
    if (!this.initialized) await this.init();
    return [...this.state.sessions]; // Return copy
  }

  /**
   * Add a new session
   */
  async addSession(session) {
    if (!this.initialized) await this.init();

    // Prevent duplicate sessions (check by ID)
    const existingIndex = this.state.sessions.findIndex(s => s.id === session.id);
    if (existingIndex !== -1) {
      this.state.sessions[existingIndex] = session;
    } else {
      this.state.sessions.push(session);
    }

    this.notifyListeners('sessions');
    await this.saveToAPI();

    return session;
  }

  /**
   * Update a session
   */
  async updateSession(sessionId, updates) {
    if (!this.initialized) await this.init();

    const index = this.state.sessions.findIndex(s => s.id === sessionId);
    if (index === -1) {
      throw new Error(`Session ${sessionId} not found`);
    }

    this.state.sessions[index] = { ...this.state.sessions[index], ...updates };
    this.notifyListeners('sessions');
    await this.saveToAPI();

    return this.state.sessions[index];
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId) {
    if (!this.initialized) await this.init();

    this.state.sessions = this.state.sessions.filter(s => s.id !== sessionId);
    this.notifyListeners('sessions');
    await this.saveToAPI();

    return true;
  }

  /**
   * Update all sessions
   */
  async updateSessions(sessions) {
    if (!this.initialized) await this.init();

    this.state.sessions = sessions;
    this.notifyListeners('sessions');
    await this.saveToAPI();

    return sessions;
  }

  // ==========================================
  // ACTIVE SESSION
  // ==========================================

  /**
   * Get active session
   */
  async getActiveSession() {
    if (!this.initialized) await this.init();
    return this.state.activeSession;
  }

  /**
   * Set active session
   */
  async setActiveSession(session) {
    if (!this.initialized) await this.init();

    this.state.activeSession = session;
    this.notifyListeners('activeSession');
    await this.saveToAPI();

    return session;
  }

  /**
   * Clear active session
   */
  async clearActiveSession() {
    if (!this.initialized) await this.init();

    this.state.activeSession = null;
    this.notifyListeners('activeSession');
    await this.saveToAPI();

    return null;
  }

  // ==========================================
  // CUSTOM EXERCISES
  // ==========================================

  /**
   * Get all custom exercises
   */
  async getCustomExercises() {
    if (!this.initialized) await this.init();
    return [...this.state.customExercises];
  }

  /**
   * Add custom exercise
   */
  async addCustomExercise(exercise) {
    if (!this.initialized) await this.init();

    this.state.customExercises.push(exercise);
    this.notifyListeners('customExercises');
    await this.saveToAPI();

    return exercise;
  }

  /**
   * Update custom exercise
   */
  async updateCustomExercise(exerciseId, updates) {
    if (!this.initialized) await this.init();

    const index = this.state.customExercises.findIndex(e => e.id === exerciseId);
    if (index === -1) {
      throw new Error(`Custom exercise ${exerciseId} not found`);
    }

    this.state.customExercises[index] = { ...this.state.customExercises[index], ...updates };
    this.notifyListeners('customExercises');
    await this.saveToAPI();

    return this.state.customExercises[index];
  }

  /**
   * Delete custom exercise
   */
  async deleteCustomExercise(exerciseId) {
    if (!this.initialized) await this.init();

    this.state.customExercises = this.state.customExercises.filter(e => e.id !== exerciseId);
    this.notifyListeners('customExercises');
    await this.saveToAPI();

    return true;
  }

  // ==========================================
  // CUSTOM TEMPLATES
  // ==========================================

  /**
   * Get all custom templates
   */
  async getCustomTemplates() {
    if (!this.initialized) await this.init();
    return [...this.state.customTemplates];
  }

  /**
   * Add custom template
   */
  async addCustomTemplate(template) {
    if (!this.initialized) await this.init();

    this.state.customTemplates.push(template);
    this.notifyListeners('customTemplates');
    await this.saveToAPI();

    return template;
  }

  /**
   * Update custom template
   */
  async updateCustomTemplate(templateId, updates) {
    if (!this.initialized) await this.init();

    const index = this.state.customTemplates.findIndex(t => t.id === templateId);
    if (index === -1) {
      throw new Error(`Custom template ${templateId} not found`);
    }

    this.state.customTemplates[index] = { ...this.state.customTemplates[index], ...updates };
    this.notifyListeners('customTemplates');
    await this.saveToAPI();

    return this.state.customTemplates[index];
  }

  /**
   * Delete custom template
   */
  async deleteCustomTemplate(templateId) {
    if (!this.initialized) await this.init();

    this.state.customTemplates = this.state.customTemplates.filter(t => t.id !== templateId);
    this.notifyListeners('customTemplates');
    await this.saveToAPI();

    return true;
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  /**
   * Get full state snapshot
   */
  async getState() {
    if (!this.initialized) await this.init();
    return { ...this.state };
  }

  /**
   * Check if online
   */
  isOnlineMode() {
    return this.isOnline;
  }

  /**
   * Get last sync time
   */
  getLastSyncTime() {
    const lastSync = localStorage.getItem(CACHE_KEYS.LAST_SYNC);
    return lastSync ? new Date(lastSync) : null;
  }

  /**
   * Clear all data (logout)
   */
  async clearAll() {
    this.state = {
      sessions: [],
      activeSession: null,
      customExercises: [],
      customTemplates: [],
    };

    // Clear cache
    Object.values(CACHE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });

    // Clear listeners
    this.listeners.clear();

    this.initialized = false;
    console.log('StateManager: All data cleared');
  }
}

// Export singleton instance
export default StateManager.getInstance();
