/**
 * React hooks for StateManager
 *
 * These hooks provide React integration with the centralized StateManager
 * All state is managed through StateManager (API-first, localStorage cache)
 */

import { useState, useEffect, useCallback } from 'react';
import StateManager from '../services/StateManager';

/**
 * Hook for sessions
 */
export function useSessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const loadSessions = async () => {
      try {
        setLoading(true);
        const data = await StateManager.getSessions();
        if (mounted) {
          setSessions(data);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err);
          console.error('Error loading sessions:', err);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadSessions();

    // Subscribe to changes
    const unsubscribe = StateManager.subscribe('sessions', (newSessions) => {
      if (mounted) {
        setSessions(newSessions);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const addSession = useCallback(async (session) => {
    try {
      const newSession = await StateManager.addSession(session);
      return newSession;
    } catch (err) {
      setError(err);
      throw err;
    }
  }, []);

  const updateSession = useCallback(async (id, updates) => {
    try {
      const updated = await StateManager.updateSession(id, updates);
      return updated;
    } catch (err) {
      setError(err);
      throw err;
    }
  }, []);

  const deleteSession = useCallback(async (id) => {
    try {
      await StateManager.deleteSession(id);
      return true;
    } catch (err) {
      setError(err);
      throw err;
    }
  }, []);

  return {
    sessions,
    loading,
    error,
    addSession,
    updateSession,
    deleteSession,
  };
}

/**
 * Hook for active session
 */
export function useActiveSession() {
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const loadActiveSession = async () => {
      try {
        setLoading(true);
        const data = await StateManager.getActiveSession();
        if (mounted) {
          setActiveSession(data);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err);
          console.error('Error loading active session:', err);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadActiveSession();

    // Subscribe to changes
    const unsubscribe = StateManager.subscribe('activeSession', (newActiveSession) => {
      if (mounted) {
        setActiveSession(newActiveSession);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const updateActiveSession = useCallback(async (session) => {
    try {
      const updated = await StateManager.setActiveSession(session);
      return updated;
    } catch (err) {
      setError(err);
      throw err;
    }
  }, []);

  const clearActiveSession = useCallback(async () => {
    try {
      await StateManager.clearActiveSession();
      return true;
    } catch (err) {
      setError(err);
      throw err;
    }
  }, []);

  return {
    activeSession,
    loading,
    error,
    setActiveSession: updateActiveSession,
    clearActiveSession,
  };
}

/**
 * Hook for custom exercises
 */
export function useCustomExercises() {
  const [customExercises, setCustomExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const loadCustomExercises = async () => {
      try {
        setLoading(true);
        const data = await StateManager.getCustomExercises();
        if (mounted) {
          setCustomExercises(data);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err);
          console.error('Error loading custom exercises:', err);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadCustomExercises();

    // Subscribe to changes
    const unsubscribe = StateManager.subscribe('customExercises', (newExercises) => {
      if (mounted) {
        setCustomExercises(newExercises);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const addExercise = useCallback(async (exercise) => {
    try {
      const newExercise = await StateManager.addCustomExercise(exercise);
      return newExercise;
    } catch (err) {
      setError(err);
      throw err;
    }
  }, []);

  const updateExercise = useCallback(async (id, updates) => {
    try {
      const updated = await StateManager.updateCustomExercise(id, updates);
      return updated;
    } catch (err) {
      setError(err);
      throw err;
    }
  }, []);

  const deleteExercise = useCallback(async (id) => {
    try {
      await StateManager.deleteCustomExercise(id);
      return true;
    } catch (err) {
      setError(err);
      throw err;
    }
  }, []);

  return {
    customExercises,
    loading,
    error,
    addExercise,
    updateExercise,
    deleteExercise,
  };
}

/**
 * Hook for custom templates
 */
export function useCustomTemplates() {
  const [customTemplates, setCustomTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const loadCustomTemplates = async () => {
      try {
        setLoading(true);
        const data = await StateManager.getCustomTemplates();
        if (mounted) {
          setCustomTemplates(data);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err);
          console.error('Error loading custom templates:', err);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadCustomTemplates();

    // Subscribe to changes
    const unsubscribe = StateManager.subscribe('customTemplates', (newTemplates) => {
      if (mounted) {
        setCustomTemplates(newTemplates);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const addTemplate = useCallback(async (template) => {
    try {
      const newTemplate = await StateManager.addCustomTemplate(template);
      return newTemplate;
    } catch (err) {
      setError(err);
      throw err;
    }
  }, []);

  const updateTemplate = useCallback(async (id, updates) => {
    try {
      const updated = await StateManager.updateCustomTemplate(id, updates);
      return updated;
    } catch (err) {
      setError(err);
      throw err;
    }
  }, []);

  const deleteTemplate = useCallback(async (id) => {
    try {
      await StateManager.deleteCustomTemplate(id);
      return true;
    } catch (err) {
      setError(err);
      throw err;
    }
  }, []);

  return {
    customTemplates,
    loading,
    error,
    addTemplate,
    updateTemplate,
    deleteTemplate,
  };
}

/**
 * Hook for sync status
 */
export function useSyncStatus() {
  const [isOnline, setIsOnline] = useState(StateManager.isOnlineMode());
  const [lastSync, setLastSync] = useState(StateManager.getLastSyncTime());

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastSync(StateManager.getLastSyncTime());
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const forceSync = useCallback(async () => {
    try {
      await StateManager.forceSyncToAPI();
      setLastSync(StateManager.getLastSyncTime());
      return true;
    } catch (err) {
      console.error('Force sync failed:', err);
      throw err;
    }
  }, []);

  return {
    isOnline,
    lastSync,
    forceSync,
  };
}
