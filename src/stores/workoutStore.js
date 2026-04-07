/**
 * Zustand Store for TheGradual Workout App
 * CONNECTION-ONLY: DynamoDB is the single source of truth
 * The cloud is cheap, the cloud never fails
 * No localStorage - all operations go directly to API
 * OPTIMISTIC LOCKING: Version-based concurrency control prevents data loss
 */

import { create } from 'zustand';
import { saveUserState, fetchUserState, ConflictError } from '../services/apiClient';
import { filterSessionsWithCompletedSets } from '../utils/progressCalculations';
import { applyDeloadToExercises } from '../utils/deloadCalculations';

const useWorkoutStore = create((set, get) => ({
      // ==========================================
      // STATE
      // ==========================================
      sessions: [],
      activeSession: null,
      customExercises: [],
      customTemplates: [],
      bodyMeasurements: [],
      restTimerDuration: 120, // Rest timer in seconds (default 2 minutes)

      // Deload mode settings
      deloadMode: false,
      deloadRepsOnlyPercentage: 100,    // Percentage of reps for bodyweight exercises (60-100%)
      deloadWeightedRepsPercentage: 100, // Percentage of reps for weighted exercises (60-100%)
      deloadWeightPercentage: 100,       // Percentage of weight for weighted exercises (60-100%)

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

        const state = get();
        const { deloadMode, deloadRepsOnlyPercentage, deloadWeightedRepsPercentage, deloadWeightPercentage } = state;

        // Apply deload if active
        let processedExercises = exercises.map((ex) => ({
          ...ex,
          sets: ex.sets || [],
        }));

        if (deloadMode) {
          processedExercises = applyDeloadToExercises(
            processedExercises,
            deloadRepsOnlyPercentage,
            deloadWeightedRepsPercentage,
            deloadWeightPercentage
          );
        }

        const newSession = {
          id: `session-${Date.now()}`,
          exercises: processedExercises,
          startTime: Date.now(),
          createdAt: new Date().toISOString(),
          templateReference,
          status: 'active',
          currentExerciseIndex: 0,
          restStartTime: null,
          isResting: false,
          // Tag deload sessions with percentages used
          ...(deloadMode && {
            isDeload: true,
            deloadRepsOnlyPercentage,
            deloadWeightedRepsPercentage,
            deloadWeightPercentage,
          }),
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

        if (!activeSession) {
          console.warn('[workoutStore] No active session to update');
          return null;
        }

        const updatedSession = { ...activeSession, ...updates };

        // OPTIMISTIC UPDATE: Update local state immediately for instant UI feedback
        set({ activeSession: updatedSession });

        // Sync to API in background (non-blocking)
        if (isOnline) {
          try {
            const state = get();
            await state._saveWithVersion({
              sessions: state.sessions,
              customExercises: state.customExercises,
              customTemplates: state.customTemplates,
              activeSession: updatedSession,
            });
            console.log('[workoutStore] Active session synced to DynamoDB');
          } catch (error) {
            console.error('[workoutStore] Background sync failed:', error);
            // Could implement retry logic or rollback here if needed
          }
        }

        return updatedSession;
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
       * Get all sessions (excludes sessions with zero completed sets)
       */
      getSessions: () => {
        const sessions = get().sessions;
        // Filter out sessions with no completed sets
        return filterSessionsWithCompletedSets(sessions);
      },

      /**
       * Get all sessions including those with zero completed sets (for internal use)
       */
      getAllSessionsIncludingEmpty: () => {
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
        const completedSessions = filterSessionsWithCompletedSets(sessions)
          .filter((s) => s.status === 'completed' && !s.isDeload) // Skip deload sessions
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
      // BODY MEASUREMENTS ACTIONS
      // ==========================================

      /**
       * Add body measurement
       * API-FIRST: Saves to DynamoDB before updating local state
       */
      addBodyMeasurement: async (measurement) => {
        const { isOnline, bodyMeasurements } = get();

        if (!isOnline) {
          throw new Error('Cannot add measurement while offline');
        }

        set({ isLoading: true });

        const newMeasurement = {
          ...measurement,
          id: `measurement-${Date.now()}`,
          date: measurement.date || new Date().toISOString(),
        };

        const updatedMeasurements = [...bodyMeasurements, newMeasurement]
          .sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort newest first

        try {
          const state = get();
          await state._saveWithVersion({
            sessions: state.sessions,
            customExercises: state.customExercises,
            customTemplates: state.customTemplates,
            activeSession: state.activeSession,
            bodyMeasurements: updatedMeasurements,
          });

          set({ bodyMeasurements: updatedMeasurements, isLoading: false });
          console.log('[workoutStore] Body measurement added and saved to DynamoDB');
          return newMeasurement;
        } catch (error) {
          set({ isLoading: false });
          console.error('[workoutStore] Failed to add body measurement:', error);
          throw error;
        }
      },

      /**
       * Update body measurement
       * API-FIRST: Saves to DynamoDB before updating local state
       */
      updateBodyMeasurement: async (measurementId, updates) => {
        const { isOnline, bodyMeasurements } = get();

        if (!isOnline) {
          throw new Error('Cannot update measurement while offline');
        }

        set({ isLoading: true });

        const updatedMeasurements = bodyMeasurements
          .map((m) => (m.id === measurementId ? { ...m, ...updates } : m))
          .sort((a, b) => new Date(b.date) - new Date(a.date));

        try {
          const state = get();
          await state._saveWithVersion({
            sessions: state.sessions,
            customExercises: state.customExercises,
            customTemplates: state.customTemplates,
            activeSession: state.activeSession,
            bodyMeasurements: updatedMeasurements,
          });

          set({ bodyMeasurements: updatedMeasurements, isLoading: false });
          console.log('[workoutStore] Body measurement updated and saved to DynamoDB');
        } catch (error) {
          set({ isLoading: false });
          console.error('[workoutStore] Failed to update body measurement:', error);
          throw error;
        }
      },

      /**
       * Delete body measurement
       * API-FIRST: Saves to DynamoDB before updating local state
       */
      deleteBodyMeasurement: async (measurementId) => {
        const { isOnline, bodyMeasurements } = get();

        if (!isOnline) {
          throw new Error('Cannot delete measurement while offline');
        }

        set({ isLoading: true });

        const updatedMeasurements = bodyMeasurements.filter((m) => m.id !== measurementId);

        try {
          const state = get();
          await state._saveWithVersion({
            sessions: state.sessions,
            customExercises: state.customExercises,
            customTemplates: state.customTemplates,
            activeSession: state.activeSession,
            bodyMeasurements: updatedMeasurements,
          });

          set({ bodyMeasurements: updatedMeasurements, isLoading: false });
          console.log('[workoutStore] Body measurement deleted and saved to DynamoDB');
        } catch (error) {
          set({ isLoading: false });
          console.error('[workoutStore] Failed to delete body measurement:', error);
          throw error;
        }
      },

      /**
       * Get all body measurements (sorted newest first)
       */
      getBodyMeasurements: () => {
        return get().bodyMeasurements;
      },

      /**
       * Get latest body measurement
       */
      getLatestBodyMeasurement: () => {
        const measurements = get().bodyMeasurements;
        return measurements.length > 0 ? measurements[0] : null;
      },

      // ==========================================
      // SETTINGS ACTIONS
      // ==========================================

      /**
       * Update rest timer duration (in seconds)
       * API-FIRST: Saves to DynamoDB before updating local state
       */
      setRestTimerDuration: async (duration) => {
        const { isOnline } = get();

        if (!isOnline) {
          throw new Error('Cannot update settings while offline');
        }

        // Validate duration (60s to 300s / 1-5 minutes)
        const validDuration = Math.max(60, Math.min(300, duration));

        set({ isLoading: true });

        try {
          const state = get();
          await state._saveWithVersion({
            sessions: state.sessions,
            customExercises: state.customExercises,
            customTemplates: state.customTemplates,
            activeSession: state.activeSession,
            bodyMeasurements: state.bodyMeasurements,
            restTimerDuration: validDuration,
          });

          set({ restTimerDuration: validDuration, isLoading: false });
          console.log('[workoutStore] Rest timer duration updated:', validDuration);
          return validDuration;
        } catch (error) {
          set({ isLoading: false });
          console.error('[workoutStore] Failed to update rest timer duration:', error);
          throw error;
        }
      },

      /**
       * Get rest timer duration
       */
      getRestTimerDuration: () => {
        return get().restTimerDuration;
      },

      /**
       * Update deload settings
       * API-FIRST: Saves to DynamoDB before updating local state
       */
      setDeloadSettings: async (deloadMode, repsOnlyPct, weightedRepsPct, weightPct) => {
        const { isOnline } = get();

        if (!isOnline) {
          throw new Error('Cannot update settings while offline');
        }

        // Validate percentages (60-100)
        const validRepsOnlyPct = Math.max(60, Math.min(100, repsOnlyPct));
        const validWeightedRepsPct = Math.max(60, Math.min(100, weightedRepsPct));
        const validWeightPct = Math.max(60, Math.min(100, weightPct));

        set({ isLoading: true });

        try {
          const state = get();
          await state._saveWithVersion({
            sessions: state.sessions,
            customExercises: state.customExercises,
            customTemplates: state.customTemplates,
            activeSession: state.activeSession,
            bodyMeasurements: state.bodyMeasurements,
            restTimerDuration: state.restTimerDuration,
            deloadMode,
            deloadRepsOnlyPercentage: validRepsOnlyPct,
            deloadWeightedRepsPercentage: validWeightedRepsPct,
            deloadWeightPercentage: validWeightPct,
          });

          set({
            deloadMode,
            deloadRepsOnlyPercentage: validRepsOnlyPct,
            deloadWeightedRepsPercentage: validWeightedRepsPct,
            deloadWeightPercentage: validWeightPct,
            isLoading: false,
          });
          console.log('[workoutStore] Deload settings updated:', {
            deloadMode,
            repsOnlyPct: validRepsOnlyPct,
            weightedRepsPct: validWeightedRepsPct,
            weightPct: validWeightPct
          });
          return {
            deloadMode,
            deloadRepsOnlyPercentage: validRepsOnlyPct,
            deloadWeightedRepsPercentage: validWeightedRepsPct,
            deloadWeightPercentage: validWeightPct
          };
        } catch (error) {
          set({ isLoading: false });
          console.error('[workoutStore] Failed to update deload settings:', error);
          throw error;
        }
      },

      /**
       * Get deload settings
       */
      getDeloadSettings: () => {
        const { deloadMode, deloadRepsOnlyPercentage, deloadWeightedRepsPercentage, deloadWeightPercentage } = get();
        return { deloadMode, deloadRepsOnlyPercentage, deloadWeightedRepsPercentage, deloadWeightPercentage };
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
              bodyMeasurements: data.bodyMeasurements || [],
              restTimerDuration: data.restTimerDuration || 120,
              deloadMode: data.deloadMode || false,
              deloadRepsOnlyPercentage: data.deloadRepsOnlyPercentage || 100,
              deloadWeightedRepsPercentage: data.deloadWeightedRepsPercentage || 100,
              deloadWeightPercentage: data.deloadWeightPercentage || 100,
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
              bodyMeasurements: (data.bodyMeasurements || []).length,
            });
            return { success: true };
          } else {
            // DynamoDB is empty - new user (version 1)
            set({
              sessions: [],
              activeSession: null,
              customExercises: [],
              customTemplates: [],
              bodyMeasurements: [],
              restTimerDuration: 120,
              deloadMode: false,
              deloadRepsOnlyPercentage: 100,
              deloadWeightedRepsPercentage: 100,
              deloadWeightPercentage: 100,
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
          bodyMeasurements: [],
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
