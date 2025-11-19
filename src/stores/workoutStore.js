/**
 * Zustand Store for TheGradual Workout App
 * Replaces: StateManager, stateService, and useStateManager hooks
 * Single source of truth with localStorage persistence and API sync
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { saveUserState, fetchUserState } from '../services/apiClient';

// Cache keys for localStorage
const STORAGE_KEY = 'thegradual-workout-store';

const useWorkoutStore = create(
  persist(
    (set, get) => ({
      // ==========================================
      // STATE
      // ==========================================
      sessions: [],
      activeSession: null,
      customExercises: [],
      customTemplates: [],
      isOnline: navigator.onLine,
      lastSync: null,
      isSyncing: false,

      // ==========================================
      // SESSION ACTIONS
      // ==========================================

      /**
       * Start a new workout session
       * IMMEDIATE PERSISTENCE: Waits for API confirmation before returning
       */
      startSession: async (exercises, templateReference = null) => {
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
        };

        // Update local state immediately (optimistic update)
        set({ activeSession: newSession });

        // Persist to API IMMEDIATELY
        try {
          await get().syncToAPI();
          console.log('[workoutStore] Session started and synced to API');
        } catch (error) {
          console.error('[workoutStore] Failed to sync new session:', error);
          // Keep local state even if API fails
        }

        return newSession;
      },

      /**
       * Complete active session (move to history)
       * IMMEDIATE PERSISTENCE: Waits for API confirmation before returning
       */
      completeSession: async () => {
        const { activeSession, sessions } = get();

        if (!activeSession) {
          console.warn('[workoutStore] No active session to complete');
          return null;
        }

        const completedSession = {
          ...activeSession,
          status: 'completed',
          endTime: Date.now(),
          completedAt: new Date().toISOString(),
        };

        // Single atomic state update (optimistic)
        set({
          sessions: [...sessions, completedSession],
          activeSession: null,
        });

        // Persist to API IMMEDIATELY (blocking)
        try {
          await get().syncToAPI();
          console.log('[workoutStore] Session completed and synced to API');
        } catch (error) {
          console.error('[workoutStore] Failed to sync completed session:', error);
          // Keep local state even if API fails
        }

        return completedSession;
      },

      /**
       * Update active session (e.g., add/update sets)
       * IMMEDIATE PERSISTENCE: Waits for API confirmation before returning
       */
      updateActiveSession: async (updates) => {
        const { activeSession } = get();

        if (!activeSession) {
          console.warn('[workoutStore] No active session to update');
          return null;
        }

        const updatedSession = { ...activeSession, ...updates };
        set({ activeSession: updatedSession });

        // Persist to API IMMEDIATELY (even for single set updates)
        try {
          await get().syncToAPI();
          console.log('[workoutStore] Active session updated and synced to API');
        } catch (error) {
          console.error('[workoutStore] Failed to sync session update:', error);
          // Keep local state even if API fails
        }

        return updatedSession;
      },

      /**
       * Clear/cancel active session
       * IMMEDIATE PERSISTENCE: Waits for API confirmation before returning
       */
      clearActiveSession: async () => {
        set({ activeSession: null });

        try {
          await get().syncToAPI();
          console.log('[workoutStore] Active session cleared and synced to API');
        } catch (error) {
          console.error('[workoutStore] Failed to sync session clear:', error);
        }
      },

      /**
       * Delete a session from history
       * IMMEDIATE PERSISTENCE: Waits for API confirmation before returning
       */
      deleteSession: async (sessionId) => {
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== sessionId),
        }));

        try {
          await get().syncToAPI();
          console.log('[workoutStore] Session deleted and synced to API');
        } catch (error) {
          console.error('[workoutStore] Failed to sync session deletion:', error);
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
       * IMMEDIATE PERSISTENCE: Waits for API confirmation before returning
       */
      addCustomExercise: async (exercise) => {
        const newExercise = {
          ...exercise,
          id: exercise.id || `custom-${Date.now()}`,
          isCustom: true,
        };

        set((state) => ({
          customExercises: [...state.customExercises, newExercise],
        }));

        try {
          await get().syncToAPI();
          console.log('[workoutStore] Custom exercise added and synced to API');
        } catch (error) {
          console.error('[workoutStore] Failed to sync custom exercise:', error);
        }

        return newExercise;
      },

      /**
       * Delete custom exercise
       * IMMEDIATE PERSISTENCE: Waits for API confirmation before returning
       */
      deleteCustomExercise: async (exerciseId) => {
        set((state) => ({
          customExercises: state.customExercises.filter((e) => e.id !== exerciseId),
        }));

        try {
          await get().syncToAPI();
          console.log('[workoutStore] Custom exercise deleted and synced to API');
        } catch (error) {
          console.error('[workoutStore] Failed to sync exercise deletion:', error);
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
       * IMMEDIATE PERSISTENCE: Waits for API confirmation before returning
       */
      addCustomTemplate: async (template) => {
        const newTemplate = {
          ...template,
          id: template.id || `custom-template-${Date.now()}`,
          isCustom: true,
        };

        set((state) => ({
          customTemplates: [...state.customTemplates, newTemplate],
        }));

        try {
          await get().syncToAPI();
          console.log('[workoutStore] Custom template added and synced to API');
        } catch (error) {
          console.error('[workoutStore] Failed to sync custom template:', error);
        }

        return newTemplate;
      },

      /**
       * Update custom template
       * IMMEDIATE PERSISTENCE: Waits for API confirmation before returning
       */
      updateCustomTemplate: async (templateId, updates) => {
        set((state) => ({
          customTemplates: state.customTemplates.map((t) =>
            t.id === templateId ? { ...t, ...updates } : t
          ),
        }));

        try {
          await get().syncToAPI();
          console.log('[workoutStore] Custom template updated and synced to API');
        } catch (error) {
          console.error('[workoutStore] Failed to sync template update:', error);
        }
      },

      /**
       * Delete custom template
       * IMMEDIATE PERSISTENCE: Waits for API confirmation before returning
       */
      deleteCustomTemplate: async (templateId) => {
        set((state) => ({
          customTemplates: state.customTemplates.filter((t) => t.id !== templateId),
        }));

        try {
          await get().syncToAPI();
          console.log('[workoutStore] Custom template deleted and synced to API');
        } catch (error) {
          console.error('[workoutStore] Failed to sync template deletion:', error);
        }
      },

      /**
       * Get all custom templates
       */
      getCustomTemplates: () => {
        return get().customTemplates;
      },

      // ==========================================
      // SYNC & PERSISTENCE
      // ==========================================

      /**
       * Sync state to API (debounced by Zustand)
       */
      syncToAPI: async () => {
        const { isOnline, isSyncing } = get();

        // Skip if offline or already syncing
        if (!isOnline) {
          console.warn('[workoutStore] Skipping sync - offline');
          return;
        }

        if (isSyncing) {
          console.warn('[workoutStore] Skipping sync - already syncing');
          return;
        }

        set({ isSyncing: true });

        try {
          const state = get();

          console.log('[workoutStore] 📤 Syncing to API...', {
            sessions: state.sessions.length,
            customExercises: state.customExercises.length,
            customTemplates: state.customTemplates.length,
            hasActiveSession: !!state.activeSession,
          });

          await saveUserState({
            sessions: state.sessions,
            customExercises: state.customExercises,
            customTemplates: state.customTemplates,
            activeSession: state.activeSession,
          });

          console.log('[workoutStore] ✅ Sync successful');
          set({ lastSync: new Date(), isSyncing: false });
        } catch (error) {
          console.error('[workoutStore] ❌ API sync failed:', error);
          set({ isSyncing: false });
          // Don't throw - localStorage is already updated by persistence middleware
        }
      },

      /**
       * Set online status
       */
      setOnlineStatus: (isOnline) => {
        set({ isOnline });

        // If coming back online, sync to API
        if (isOnline) {
          get().syncToAPI();
        }
      },

      /**
       * Get last sync time
       */
      getLastSyncTime: () => {
        return get().lastSync;
      },

      /**
       * Check if online
       */
      isOnlineMode: () => {
        return get().isOnline;
      },

      /**
       * Load fresh data from API (used on login)
       * DynamoDB is master - ALWAYS overwrites localStorage
       * Returns { success: boolean, error?: string}
       */
      loadFromAPI: async () => {
        console.log('[workoutStore] 📥 Loading data from API (DynamoDB is master)...');

        try {
          const data = await fetchUserState();

          if (data) {
            // DynamoDB has data - overwrite localStorage
            set({
              sessions: data.sessions || [],
              activeSession: data.activeSession || null,
              customExercises: data.customExercises || [],
              customTemplates: data.customTemplates || [],
              lastSync: new Date(),
            });

            console.log('[workoutStore] ✅ Loaded data from API:', {
              sessions: (data.sessions || []).length,
              customExercises: (data.customExercises || []).length,
              customTemplates: (data.customTemplates || []).length,
            });
            return { success: true };
          } else {
            // DynamoDB is empty - clear localStorage (new user or reset)
            console.warn('[workoutStore] ⚠️ DynamoDB empty - clearing localStorage');
            set({
              sessions: [],
              activeSession: null,
              customExercises: [],
              customTemplates: [],
              lastSync: new Date(),
            });
            return { success: true };
          }
        } catch (error) {
          console.error('[workoutStore] ❌ Failed to load from API:', error);
          return { success: false, error: error.message };
        }
      },

      /**
       * Clear all cached data (used on logout)
       */
      clearCache: () => {
        console.log('[workoutStore] Clearing all cached data');
        set({
          sessions: [],
          activeSession: null,
          customExercises: [],
          customTemplates: [],
          lastSync: null,
        });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // Only persist the data, not the sync status
      partialize: (state) => ({
        sessions: state.sessions,
        activeSession: state.activeSession,
        customExercises: state.customExercises,
        customTemplates: state.customTemplates,
        lastSync: state.lastSync,
      }),
    }
  )
);

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
