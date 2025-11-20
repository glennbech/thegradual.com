import { useEffect, useRef } from 'react';
import useWorkoutStore from '../stores/workoutStore';
import ExerciseLogger from './ExerciseLogger';

/**
 * SessionContainer - Persistent component that manages active sessions
 *
 * This component stays mounted regardless of navigation, preventing
 * the session initialization race conditions that occur when
 * ExerciseLogger unmounts/remounts during navigation.
 *
 * When not visible (navigated away), the ExerciseLogger stays mounted
 * but hidden, preserving all state and timers.
 */
export default function SessionContainer({
  exercises,
  templateReference,
  isVisible,
  onComplete,
  onDiscard,
  onSessionCreated,
}) {
  const activeSession = useWorkoutStore((state) => state.activeSession);
  const hasInitialized = useRef(false);

  // Reset initialization flag when exercises change from empty to populated
  useEffect(() => {
    if (exercises && exercises.length > 0) {
      hasInitialized.current = false;
    }
  }, [exercises]);

  // Reset initialization flag when active session is cleared
  useEffect(() => {
    if (!activeSession) {
      hasInitialized.current = false;
    }
  }, [activeSession]);

  // Determine if we should render ExerciseLogger
  const shouldRender = activeSession || (exercises && exercises.length > 0);

  if (!shouldRender) {
    return null;
  }

  // Always render and always visible when there's a session
  // Component stays mounted and preserves all state
  return (
    <ExerciseLogger
      exercises={activeSession ? activeSession.exercises : exercises}
      templateReference={activeSession ? activeSession.templateReference : templateReference}
      onComplete={onComplete}
      onDiscard={onDiscard}
      onSessionCreated={onSessionCreated}
    />
  );
}
