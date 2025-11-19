/**
 * State Service - Simplified API for components
 *
 * This wraps StateManager with a more familiar service-like interface
 * All persistence logic is handled by StateManager internally
 */

import StateManager from './StateManager';
import defaultExercises from '../data/exercises.json';
import defaultTemplates from '../data/workoutTemplates.json';

// ==========================================
// EXERCISE SERVICE
// ==========================================

export const exerciseService = {
  /**
   * Get all exercises (default + custom)
   */
  async getAll() {
    const customExercises = await StateManager.getCustomExercises();
    return [...defaultExercises, ...customExercises];
  },

  /**
   * Get all custom exercises only
   */
  async getAllCustom() {
    return StateManager.getCustomExercises();
  },

  /**
   * Get exercise by ID
   */
  async getById(id) {
    const all = await this.getAll();
    return all.find(ex => ex.id === id);
  },

  /**
   * Get exercises by category
   */
  async getByCategory(category) {
    const all = await this.getAll();
    return all.filter(ex => ex.category === category);
  },

  /**
   * Create custom exercise
   */
  async create(exercise) {
    const newExercise = {
      ...exercise,
      id: exercise.id || `custom-${Date.now()}`,
      isCustom: true,
      createdAt: new Date().toISOString(),
    };

    await StateManager.addCustomExercise(newExercise);
    return newExercise;
  },

  /**
   * Update custom exercise
   */
  async update(id, updates) {
    // Only allow updating custom exercises
    const customExercises = await StateManager.getCustomExercises();
    const exercise = customExercises.find(ex => ex.id === id);

    if (!exercise) {
      throw new Error('Cannot update default exercises or exercise not found');
    }

    return StateManager.updateCustomExercise(id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  },

  /**
   * Delete custom exercise
   */
  async delete(id) {
    return StateManager.deleteCustomExercise(id);
  },
};

// ==========================================
// SESSION SERVICE
// ==========================================

export const sessionService = {
  /**
   * Get all sessions
   */
  async getAll() {
    return StateManager.getSessions();
  },

  /**
   * Get session by ID
   */
  async getById(id) {
    const sessions = await StateManager.getSessions();
    return sessions.find(s => s.id === id);
  },

  /**
   * Get active session
   */
  async getActive() {
    return StateManager.getActiveSession();
  },

  /**
   * Create new session (becomes active)
   */
  async create(session) {
    const newSession = {
      ...session,
      id: session.id || `session-${Date.now()}`,
      status: 'active',
      createdAt: new Date().toISOString(),
      startTime: session.startTime || new Date().toISOString(),
    };

    await StateManager.setActiveSession(newSession);
    return newSession;
  },

  /**
   * Update active session
   */
  async update(id, updates) {
    const activeSession = await StateManager.getActiveSession();

    if (!activeSession) {
      throw new Error('No active session to update');
    }

    if (activeSession.id !== id) {
      throw new Error('Can only update the active session');
    }

    const updatedSession = {
      ...activeSession,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await StateManager.setActiveSession(updatedSession);
    return updatedSession;
  },

  /**
   * Complete active session (move to history)
   */
  async complete(id) {
    console.log('🟡 [sessionService] complete - START');
    console.log('🟡 [sessionService] Requested session ID:', id);

    const activeSession = await StateManager.getActiveSession();
    console.log('🟡 [sessionService] Active session retrieved:', activeSession);

    if (!activeSession || activeSession.id !== id) {
      console.error('❌ [sessionService] No matching active session!');
      console.error('❌ [sessionService] activeSession:', activeSession);
      console.error('❌ [sessionService] requested id:', id);
      throw new Error('No matching active session to complete');
    }

    // Mark as completed
    const completedSession = {
      ...activeSession,
      status: 'completed',
      endTime: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };
    console.log('🟡 [sessionService] Created completedSession:', completedSession);

    // Add to sessions history
    console.log('🟡 [sessionService] Adding session to history...');
    await StateManager.addSession(completedSession);
    console.log('🟡 [sessionService] Session added to history');

    // Clear active session
    console.log('🟡 [sessionService] Clearing active session from StateManager...');
    await StateManager.clearActiveSession();
    console.log('🟡 [sessionService] Active session cleared from StateManager');

    console.log('🟡 [sessionService] complete - COMPLETE, returning:', completedSession);
    return completedSession;
  },

  /**
   * Cancel active session
   */
  async cancel() {
    await StateManager.clearActiveSession();
    return true;
  },

  /**
   * Delete session from history
   */
  async delete(id) {
    return StateManager.deleteSession(id);
  },

  /**
   * Get the last completed session
   */
  async getLastCompletedSession() {
    const sessions = await StateManager.getSessions();
    const completedSessions = sessions
      .filter(s => s.status === 'completed')
      .sort((a, b) => new Date(b.completedAt || b.endTime) - new Date(a.completedAt || a.endTime));

    return completedSessions[0] || null;
  },

  /**
   * Get the previous session that used a specific template
   */
  async getPreviousSessionByTemplate(templateId) {

    const sessions = await StateManager.getSessions();

    const templateSessions = sessions
      .filter(s => {
        const isCompleted = s.status === 'completed';
        const hasTemplateRef = s.templateReference?.templateId === templateId;
        return isCompleted && hasTemplateRef;
      })
      .sort((a, b) => new Date(b.completedAt || b.endTime) - new Date(a.completedAt || a.endTime));


    return templateSessions[0] || null;
  },

  /**
   * Get the previous session that included a specific exercise
   */
  async getPreviousSessionForExercise(exerciseId) {
    const sessions = await StateManager.getSessions();
    const exerciseSessions = sessions
      .filter(s =>
        s.status === 'completed' &&
        s.exercises?.some(ex => ex.id === exerciseId)
      )
      .sort((a, b) => new Date(b.completedAt || b.endTime) - new Date(a.completedAt || a.endTime));

    if (!exerciseSessions[0]) {
      return null;
    }

    // Return the specific exercise data from that session
    const session = exerciseSessions[0];
    const exercise = session.exercises.find(ex => ex.id === exerciseId);

    return {
      session: {
        id: session.id,
        date: session.completedAt || session.endTime,
        templateReference: session.templateReference,
      },
      exercise,
    };
  },
};

// ==========================================
// TEMPLATE SERVICE
// ==========================================

export const templateService = {
  /**
   * Get all templates (default + custom)
   */
  async getAll() {
    const customTemplates = await StateManager.getCustomTemplates();
    return [...defaultTemplates, ...customTemplates];
  },

  /**
   * Get all custom templates only
   */
  async getAllCustom() {
    return StateManager.getCustomTemplates();
  },

  /**
   * Get template by ID
   */
  async getById(id) {
    const all = await this.getAll();
    return all.find(t => t.id === id);
  },

  /**
   * Create custom template
   */
  async create(template) {
    const newTemplate = {
      ...template,
      id: template.id || `template-${Date.now()}`,
      isCustom: true,
      createdAt: new Date().toISOString(),
    };

    await StateManager.addCustomTemplate(newTemplate);
    return newTemplate;
  },

  /**
   * Create template from session
   */
  async createFromSession(session, templateName, templateDescription = '') {
    const exerciseIds = session.exercises.map(ex => ex.id);

    const newTemplate = {
      id: `template-${Date.now()}`,
      name: templateName,
      description: templateDescription || `Created from session on ${new Date().toLocaleDateString()}`,
      exerciseIds,
      isCustom: true,
      createdAt: new Date().toISOString(),
      basedOnSession: session.id,
    };

    await StateManager.addCustomTemplate(newTemplate);
    return newTemplate;
  },

  /**
   * Update custom template
   */
  async update(id, updates) {
    const customTemplates = await StateManager.getCustomTemplates();
    const template = customTemplates.find(t => t.id === id);

    if (!template) {
      throw new Error('Cannot update default templates or template not found');
    }

    return StateManager.updateCustomTemplate(id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  },

  /**
   * Delete custom template
   */
  async delete(id) {
    return StateManager.deleteCustomTemplate(id);
  },
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Initialize StateManager (call on app startup)
 */
export async function initializeState() {
  return StateManager.init();
}

/**
 * Force immediate sync to API
 */
export async function syncNow() {
  return StateManager.forceSyncToAPI();
}

/**
 * Check if online
 */
export function isOnline() {
  return StateManager.isOnlineMode();
}

/**
 * Get last sync time
 */
export function getLastSyncTime() {
  return StateManager.getLastSyncTime();
}

/**
 * Subscribe to state changes
 */
export function subscribe(key, callback) {
  return StateManager.subscribe(key, callback);
}

/**
 * Clear all data (logout)
 */
export async function clearAllData() {
  return StateManager.clearAll();
}
