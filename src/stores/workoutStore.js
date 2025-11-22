/**
 * Zustand Store for TheGradual Workout App
 * CONNECTION-ONLY: DynamoDB is the single source of truth
 * The cloud is cheap, the cloud never fails
 * No localStorage - all operations go directly to API
 * OPTIMISTIC LOCKING: Version-based concurrency control prevents data loss
 */

import { create } from 'zustand';
import { saveUserState, fetchUserState, ConflictError } from '../services/apiClient';

const useWorkoutStore = create((set, get) => ({
      // ==========================================
      // STATE
      // ==========================================
      sessions: [],
      activeSession: null,
      customExercises: [],
      customTemplates: [],
      isOnline: navigator.onLine,
      isLoading: false, // Track loading state for API operations

      // Optimistic locking fields
      stateVersion: 1,        // Current version from API
      lastModified: null,     // Last modification timestamp
      isStale: false,         // True if version conflict detected
      conflictMessage: null,  // Error message for conflicts

      // ==========================================
      // INTERNAL HELPERS
      // ==========================================

      /**
       * Save state with version tracking and conflict handling
       * @private
       */
      _saveWithVersion: async (stateToSave) => {
        const state = get();
        try {
          const result = await saveUserState({
            version: state.stateVersion,
            ...stateToSave,
          });

          // Update version after successful save
          set({
            stateVersion: result.version,
            lastModified: result.lastModified,
            isStale: false,
            conflictMessage: null,
          });

          return result;
        } catch (error) {
          if (error instanceof ConflictError) {
            // Version conflict detected - mark state as stale
            set({
              isStale: true,
              conflictMessage: error.message,
            });
            console.error('[workoutStore] ⚠️ Version conflict:', error.message);
          }
          throw error;
        }
      },

      // ==========================================
      // SESSION ACTIONS
      // ==========================================

      /**
       * Start a new workout session
       * API-FIRST: Saves to DynamoDB before updating local state
       */
      startSession: async (exercises, templateReference = null) => {
        if (!get().isOnline) {
          throw new Error('Cannot start session while offline');
        }

        set({ isLoading: true });

        const newSession = {
          id: `session-${Date.now()}`,
          exercises: exercises.map((ex) => ({
            ...ex,
            sets: ex.sets || [],
          })),
          startTime: Date.now(),
          createdAt: new Date().toISOString(),
          templateReference,
          status: 'active',
          currentExerciseIndex: 0,
          triggerRestTimerTimestamp: null,
        };

        try {
          // Save to API FIRST with version
          const state = get();
          await state._saveWithVersion({
            sessions: state.sessions,
            customExercises: state.customExercises,
            customTemplates: state.customTemplates,
            activeSession: newSession,
          });

          // Only update local state after successful API save
          set({ activeSession: newSession, isLoading: false });
          console.log('[workoutStore] Session started and saved to DynamoDB');
          return newSession;
        } catch (error) {
          set({ isLoading: false });
          console.error('[workoutStore] Failed to save session to API:', error);
          throw error;
        }
      },

      /**
       * Complete active session (move to history)
       * API-FIRST: Saves to DynamoDB before updating local state
       */
      completeSession: async () => {
        const { activeSession, sessions, isOnline } = get();

        if (!isOnline) {
          throw new Error('Cannot complete session while offline');
        }

        if (!activeSession) {
          console.warn('[workoutStore] No active session to complete');
          return null;
        }

        set({ isLoading: true });

        const completedSession = {
          ...activeSession,
          status: 'completed',
          endTime: Date.now(),
          completedAt: new Date().toISOString(),
        };

        try {
          // Save to API FIRST with version
          const state = get();
          await state._saveWithVersion({
            sessions: [...state.sessions, completedSession],
            customExercises: state.customExercises,
            customTemplates: state.customTemplates,
            activeSession: null,
          });

          // Only update local state after successful API save
          set({
            sessions: [...sessions, completedSession],
            activeSession: null,
            isLoading: false,
          });
          console.log('[workoutStore] Session completed and saved to DynamoDB');
          return completedSession;
        } catch (error) {
          set({ isLoading: false });
          console.error('[workoutStore] Failed to save completed session:', error);
          throw error;
        }
      },

      /**
       * Update active session (e.g., add/update sets)
       * API-FIRST: Saves to DynamoDB before updating local state
       */
      updateActiveSession: async (updates) => {
        const { activeSession, isOnline } = get();

        if (!isOnline) {
          throw new Error('Cannot update session while offline');
        }

        if (!activeSession) {
          console.warn('[workoutStore] No active session to update');
          return null;
        }

        set({ isLoading: true });

        const updatedSession = { ...activeSession, ...updates };

        try {
          // Save to API FIRST with version
          const state = get();
          await state._saveWithVersion({
            sessions: state.sessions,
            customExercises: state.customExercises,
            customTemplates: state.customTemplates,
            activeSession: updatedSession,
          });

          // Only update local state after successful API save
          set({ activeSession: updatedSession, isLoading: false });
          console.log('[workoutStore] Active session updated and saved to DynamoDB');
          return updatedSession;
        } catch (error) {
          set({ isLoading: false });
          console.error('[workoutStore] Failed to save session update:', error);
          throw error;
        }
      },

      /**
       * Clear/cancel active session
       * API-FIRST: Saves to DynamoDB before updating local state
       */
      clearActiveSession: async () => {
        const { isOnline } = get();

        if (!isOnline) {
          throw new Error('Cannot clear session while offline');
        }

        set({ isLoading: true });

        try {
          const state = get();
          await state._saveWithVersion({
            sessions: state.sessions,
            customExercises: state.customExercises,
            customTemplates: state.customTemplates,
            activeSession: null,
          });

          set({ activeSession: null, isLoading: false });
          console.log('[workoutStore] Active session cleared and saved to DynamoDB');
        } catch (error) {
          set({ isLoading: false });
          console.error('[workoutStore] Failed to clear session:', error);
          throw error;
        }
      },

      /**
       * Update a completed session (e.g., edit sets)
       * API-FIRST: Saves to DynamoDB before updating local state
       */
      updateSession: async (sessionId, updates) => {
        const { isOnline, sessions } = get();

        if (!isOnline) {
          throw new Error('Cannot update session while offline');
        }

        set({ isLoading: true });

        const updatedSessions = sessions.map((s) =>
          s.id === sessionId ? { ...s, ...updates } : s
        );

        try {
          const state = get();
          await state._saveWithVersion({
            sessions: updatedSessions,
            customExercises: state.customExercises,
            customTemplates: state.customTemplates,
            activeSession: state.activeSession,
          });

          set({ sessions: updatedSessions, isLoading: false });
          console.log('[workoutStore] Session updated and saved to DynamoDB');
        } catch (error) {
          set({ isLoading: false });
          console.error('[workoutStore] Failed to update session:', error);
          throw error;
        }
      },

      /**
       * Delete a session from history
       * API-FIRST: Saves to DynamoDB before updating local state
       */
      deleteSession: async (sessionId) => {
        const { isOnline, sessions } = get();

        if (!isOnline) {
          throw new Error('Cannot delete session while offline');
        }

        set({ isLoading: true });

        const updatedSessions = sessions.filter((s) => s.id !== sessionId);

        try {
          const state = get();
          await state._saveWithVersion({
            sessions: updatedSessions,
            customExercises: state.customExercises,
            customTemplates: state.customTemplates,
            activeSession: state.activeSession,
          });

          set({ sessions: updatedSessions, isLoading: false });
          console.log('[workoutStore] Session deleted and saved to DynamoDB');
        } catch (error) {
          set({ isLoading: false });
          console.error('[workoutStore] Failed to delete session:', error);
          throw error;
        }
      },

      /**
       * Get all sessions
       */
      getSessions: () => {
        return get().sessions;
      },

      /**
       * Get session by ID
       */
      getSessionById: (sessionId) => {
        return get().sessions.find((s) => s.id === sessionId);
      },

      /**
       * Get previous session for an exercise
       */
      getPreviousSessionForExercise: (exerciseId) => {
        const sessions = get().sessions;
        const completedSessions = sessions
          .filter((s) => s.status === 'completed')
          .sort((a, b) => new Date(b.completedAt || b.endTime) - new Date(a.completedAt || a.endTime));

        for (const session of completedSessions) {
          const exercise = session.exercises?.find((ex) => ex.id === exerciseId);
          if (exercise && exercise.sets?.length > 0) {
            return exercise;
          }
        }

        return null;
      },

      // ==========================================
      // CUSTOM EXERCISES ACTIONS
      // ==========================================

      /**
       * Add custom exercise
       * API-FIRST: Saves to DynamoDB before updating local state
       * Uses optimistic locking to prevent conflicts
       */
      addCustomExercise: async (exercise) => {
        const { isOnline, customExercises, stateVersion } = get();

        if (!isOnline) {
          throw new Error('Cannot add exercise while offline');
        }

        set({ isLoading: true });

        const newExercise = {
          ...exercise,
          id: exercise.id || `custom-${Date.now()}`,
          isCustom: true,
        };

        const updatedExercises = [...customExercises, newExercise];

        try {
          const state = get();
          await state._saveWithVersion({
            sessions: state.sessions,
            customExercises: updatedExercises,
            customTemplates: state.customTemplates,
            activeSession: state.activeSession,
          });

          set({ customExercises: updatedExercises, isLoading: false });
          console.log('[workoutStore] Custom exercise added and saved to DynamoDB');
          return newExercise;
        } catch (error) {
          set({ isLoading: false });
          console.error('[workoutStore] Failed to add custom exercise:', error);
          throw error;
        }
      },

      /**
       * Delete custom exercise
       * API-FIRST: Saves to DynamoDB before updating local state
       */
      deleteCustomExercise: async (exerciseId) => {
        const { isOnline, customExercises } = get();

        if (!isOnline) {
          throw new Error('Cannot delete exercise while offline');
        }

        set({ isLoading: true });

        const updatedExercises = customExercises.filter((e) => e.id !== exerciseId);

        try {
          const state = get();
          await state._saveWithVersion({
            sessions: state.sessions,
            customExercises: updatedExercises,
            customTemplates: state.customTemplates,
            activeSession: state.activeSession,
          });

          set({ customExercises: updatedExercises, isLoading: false });
          console.log('[workoutStore] Custom exercise deleted and saved to DynamoDB');
        } catch (error) {
          set({ isLoading: false });
          console.error('[workoutStore] Failed to delete exercise:', error);
          throw error;
        }
      },

      /**
       * Get all custom exercises
       */
      getCustomExercises: () => {
        return get().customExercises;
      },

      // ==========================================
      // CUSTOM TEMPLATES ACTIONS
      // ==========================================

      /**
       * Add custom template
       * API-FIRST: Saves to DynamoDB before updating local state
       */
      addCustomTemplate: async (template) => {
        const { isOnline, customTemplates } = get();

        if (!isOnline) {
          throw new Error('Cannot add template while offline');
        }

        set({ isLoading: true });

        const newTemplate = {
          ...template,
          id: template.id || `custom-template-${Date.now()}`,
          isCustom: true,
        };

        const updatedTemplates = [...customTemplates, newTemplate];

        try {
          const state = get();
          await state._saveWithVersion({
            sessions: state.sessions,
            customExercises: state.customExercises,
            customTemplates: updatedTemplates,
            activeSession: state.activeSession,
          });

          set({ customTemplates: updatedTemplates, isLoading: false });
          console.log('[workoutStore] Custom template added and saved to DynamoDB');
          return newTemplate;
        } catch (error) {
          set({ isLoading: false });
          console.error('[workoutStore] Failed to add custom template:', error);
          throw error;
        }
      },

      /**
       * Update custom template
       * API-FIRST: Saves to DynamoDB before updating local state
       */
      updateCustomTemplate: async (templateId, updates) => {
        const { isOnline, customTemplates } = get();

        if (!isOnline) {
          throw new Error('Cannot update template while offline');
        }

        set({ isLoading: true });

        const updatedTemplates = customTemplates.map((t) =>
          t.id === templateId ? { ...t, ...updates } : t
        );

        try {
          const state = get();
          await state._saveWithVersion({
            sessions: state.sessions,
            customExercises: state.customExercises,
            customTemplates: updatedTemplates,
            activeSession: state.activeSession,
          });

          set({ customTemplates: updatedTemplates, isLoading: false });
          console.log('[workoutStore] Custom template updated and saved to DynamoDB');
        } catch (error) {
          set({ isLoading: false });
          console.error('[workoutStore] Failed to update custom template:', error);
          throw error;
        }
      },

      /**
       * Delete custom template
       * API-FIRST: Saves to DynamoDB before updating local state
       */
      deleteCustomTemplate: async (templateId) => {
        const { isOnline, customTemplates } = get();

        if (!isOnline) {
          throw new Error('Cannot delete template while offline');
        }

        set({ isLoading: true });

        const updatedTemplates = customTemplates.filter((t) => t.id !== templateId);

        try {
          const state = get();
          await state._saveWithVersion({
            sessions: state.sessions,
            customExercises: state.customExercises,
            customTemplates: updatedTemplates,
            activeSession: state.activeSession,
          });

          set({ customTemplates: updatedTemplates, isLoading: false });
          console.log('[workoutStore] Custom template deleted and saved to DynamoDB');
        } catch (error) {
          set({ isLoading: false });
          console.error('[workoutStore] Failed to delete custom template:', error);
          throw error;
        }
      },

      /**
       * Get all custom templates
       */
      getCustomTemplates: () => {
        return get().customTemplates;
      },

      // ==========================================
      // DATA LOADING & CONNECTION
      // ==========================================

      /**
       * Set online status
       */
      setOnlineStatus: (isOnline) => {
        set({ isOnline });
        console.log('[workoutStore] Online status:', isOnline);
      },

      /**
       * Check if online
       */
      isOnlineMode: () => {
        return get().isOnline;
      },

      /**
       * Load fresh data from API
       * DynamoDB is the single source of truth
       * Returns { success: boolean, error?: string}
       */
      loadFromAPI: async () => {
        console.log('[workoutStore] 📥 Loading data from DynamoDB...');

        set({ isLoading: true });

        try {
          const data = await fetchUserState();

          if (data) {
            set({
              sessions: data.sessions || [],
              activeSession: data.activeSession || null,
              customExercises: data.customExercises || [],
              customTemplates: data.customTemplates || [],
              stateVersion: data.version || 1,
              lastModified: data.lastModified || null,
              isStale: false,
              conflictMessage: null,
              isLoading: false,
            });

            console.log('[workoutStore] ✅ Loaded data from DynamoDB:', {
              version: data.version,
              sessions: (data.sessions || []).length,
              customExercises: (data.customExercises || []).length,
              customTemplates: (data.customTemplates || []).length,
            });
            return { success: true };
          } else {
            // DynamoDB is empty - new user (version 1)
            set({
              sessions: [],
              activeSession: null,
              customExercises: [],
              customTemplates: [],
              stateVersion: 1,
              lastModified: null,
              isStale: false,
              conflictMessage: null,
              isLoading: false,
            });
            return { success: true };
          }
        } catch (error) {
          console.error('[workoutStore] ❌ Failed to load from DynamoDB:', error);
          set({ isLoading: false });
          return { success: false, error: error.message };
        }
      },

      /**
       * Clear all in-memory data (used on logout)
       */
      clearCache: () => {
        console.log('[workoutStore] Clearing in-memory state');
        set({
          sessions: [],
          activeSession: null,
          customExercises: [],
          customTemplates: [],
        });
      },
    }));

// Setup online/offline listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useWorkoutStore.getState().setOnlineStatus(true);
  });

  window.addEventListener('offline', () => {
    useWorkoutStore.getState().setOnlineStatus(false);
  });
}

export default useWorkoutStore;
