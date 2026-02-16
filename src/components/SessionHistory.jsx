import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Dumbbell,
  Trophy,
  ChevronDown,
  Repeat2,
  BarChart3,
  Trash2,
  Sparkles,
  X,
  Play,
  Clock,
  MoreHorizontal,
  Check,
} from 'lucide-react';
import { scaleIn } from '../utils/animations';
import useWorkoutStore from '../stores/workoutStore';
import { headingStyles, iconSizes } from '../utils/typography';
import SessionTimeline from './SessionTimeline';
import { getMuscleColor } from '../utils/design-system';
import BubbleCalendar from './BubbleCalendar';
import SessionDetailSheet from './SessionDetailSheet';
import { filterSessionsWithCompletedSets } from '../utils/progressCalculations';

export default function SessionHistory({ onDoItAgain, initialExpandedSessionId, onClearExpandedSession }) {
  console.log('[SessionHistory] Component rendering. initialExpandedSessionId:', initialExpandedSessionId);

  // Zustand store - get raw sessions
  const rawSessions = useWorkoutStore((state) => state.sessions);
  const deleteSession = useWorkoutStore((state) => state.deleteSession);
  const updateSession = useWorkoutStore((state) => state.updateSession);
  const addCustomTemplate = useWorkoutStore((state) => state.addCustomTemplate);

  // Memoize filtered and sorted sessions (newest first) to prevent reference changes
  const sessions = useMemo(() => {
    const filtered = filterSessionsWithCompletedSets(rawSessions);
    return filtered.sort((a, b) => {
      const dateA = new Date(a.completedAt || a.createdAt).getTime();
      const dateB = new Date(b.completedAt || b.createdAt).getTime();
      return dateB - dateA; // Descending order (newest first)
    });
  }, [rawSessions]);

  const [selectedSession, setSelectedSession] = useState(null); // For bottom sheet
  const [deletingSession, setDeletingSession] = useState(null);
  const [sessionToDelete, setSessionToDelete] = useState(null); // For confirmation
  const [editingName, setEditingName] = useState(null);
  const [editedName, setEditedName] = useState('');
  const [makingTemplate, setMakingTemplate] = useState(null);
  const [visibleCount, setVisibleCount] = useState(5);
  const [editingSet, setEditingSet] = useState(null); // { sessionId, exerciseIndex, setIndex, reps, weight }
  const processedSessionIdRef = useRef(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    difficulty: 'intermediate',
    duration: '',
  });

  // Auto-open the just-completed session in bottom sheet
  useEffect(() => {
    console.log('[SessionHistory] useEffect triggered. initialExpandedSessionId:', initialExpandedSessionId, 'sessions.length:', sessions.length, 'processedRef:', processedSessionIdRef.current);

    if (!initialExpandedSessionId) {
      console.log('[SessionHistory] No initialExpandedSessionId provided');
      return;
    }

    // Check if we've already processed this session ID
    if (initialExpandedSessionId === processedSessionIdRef.current) {
      console.log('[SessionHistory] Already processed this sessionId, skipping');
      return;
    }

    // Wait for sessions to be available
    if (sessions.length === 0) {
      console.log('[SessionHistory] Sessions not loaded yet, waiting...');
      return;
    }

    console.log('[SessionHistory] Looking for session with id:', initialExpandedSessionId);
    console.log('[SessionHistory] Available session IDs:', sessions.map(s => s.id));

    const session = sessions.find(s => s.id === initialExpandedSessionId);

    if (session) {
      console.log('[SessionHistory] Found session, opening bottom sheet:', session);
      // Use setTimeout to ensure the component has fully rendered
      setTimeout(() => {
        setSelectedSession(session);
        processedSessionIdRef.current = initialExpandedSessionId;

        // Clear the expanded session ID from parent after opening
        if (onClearExpandedSession) {
          setTimeout(() => {
            onClearExpandedSession();
          }, 100);
        }
      }, 50);
    } else {
      console.warn('[SessionHistory] Session not found:', initialExpandedSessionId);
      console.warn('[SessionHistory] This might be because the session was filtered out or does not exist');
    }
  }, [initialExpandedSessionId, onClearExpandedSession, sessions]);

  const handleDeleteSession = (sessionId, e) => {
    if (e) e.stopPropagation();
    // Find the session to show in confirmation
    const session = sessions.find(s => s.id === sessionId);
    setSessionToDelete(session);
  };

  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return;

    const sessionId = sessionToDelete.id;
    setDeletingSession(sessionId);
    setSessionToDelete(null); // Close modal

    setTimeout(async () => {
      // AWAIT for API persistence before clearing UI state
      await deleteSession(sessionId);
      setDeletingSession(null);
      if (selectedSession?.id === sessionId) {
        setSelectedSession(null);
      }
    }, 300);
  };

  const handleEditName = (session, e) => {
    e.stopPropagation();
    setEditingName(session.id);
    setEditedName(session.name || '');
  };

  const handleSaveName = (sessionId, e) => {
    e.stopPropagation();
    // TODO: Add session name editing to Zustand store if needed
    setEditingName(null);
  };

  const handleMakeTemplate = (session, e) => {
    if (e) e.stopPropagation();
    setMakingTemplate(session);
    const sessionDate = new Date(session.completedAt || session.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    setTemplateForm({
      name: session.templateReference?.templateName || `Workout from ${sessionDate}`,
      description: `Custom template with ${session.exercises.length} exercises`,
      difficulty: 'intermediate',
      duration: '60-75 min',
    });
  };

  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    if (!makingTemplate || !templateForm.name) return;

    const exerciseIds = makingTemplate.exercises.map((ex) => ex.id);

    await addCustomTemplate({
      name: templateForm.name,
      description: templateForm.description,
      difficulty: templateForm.difficulty,
      duration: templateForm.duration,
      exerciseIds,
    });

    setMakingTemplate(null);
    setTemplateForm({
      name: '',
      description: '',
      difficulty: 'intermediate',
      duration: '',
    });
  };

  const handleStartEditSet = (sessionId, exerciseIndex, setIndex, currentSet, e) => {
    e.stopPropagation();
    console.log('Starting edit for:', { sessionId, exerciseIndex, setIndex, currentSet });
    setEditingSet({
      sessionId,
      exerciseIndex,
      setIndex,
      reps: currentSet.reps,
      weight: currentSet.weight,
    });
    console.log('Edit state set');
  };

  const handleSaveEditSet = async (sessionId) => {
    if (!editingSet) return;

    // Find the session and update the specific set
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    const updatedExercises = [...session.exercises];
    // Parse string values to numbers before saving
    const reps = typeof editingSet.reps === 'string'
      ? parseInt(editingSet.reps) || 0
      : editingSet.reps;
    const weight = typeof editingSet.weight === 'string'
      ? parseFloat(editingSet.weight.replace(',', '.')) || 0
      : editingSet.weight;

    updatedExercises[editingSet.exerciseIndex].sets[editingSet.setIndex] = {
      ...updatedExercises[editingSet.exerciseIndex].sets[editingSet.setIndex],
      reps,
      weight,
    };

    // Update session in store
    await updateSession(sessionId, {
      exercises: updatedExercises,
    });

    setEditingSet(null);
  };

  const handleCancelEditSet = (e) => {
    e.stopPropagation();
    setEditingSet(null);
  };

  const handleSetFieldChange = (field, value, e) => {
    e.stopPropagation();

    if (field === 'reps') {
      // Allow empty and numbers only for reps
      if (value === '' || /^[0-9]*$/.test(value)) {
        const numValue = parseInt(value);
        if (value === '' || isNaN(numValue) || (numValue >= 0 && numValue <= 100)) {
          setEditingSet({ ...editingSet, [field]: value });
        }
      }
    } else if (field === 'weight') {
      // Allow empty, numbers, and decimal separators (. or ,) for weight
      if (value === '' || /^[0-9]*[.,]?[0-9]*$/.test(value)) {
        const normalizedValue = String(value).replace(',', '.');
        const numValue = parseFloat(normalizedValue);
        if (value === '' || isNaN(numValue) || (numValue >= 0 && numValue <= 500)) {
          setEditingSet({ ...editingSet, [field]: value });
        }
      }
    }
  };

  const handleKeyDown = (e, sessionId) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleSaveEditSet(sessionId);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      handleCancelEditSet(e);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateStats = (session) => {
    const totalSets = session.exercises.reduce((acc, ex) => acc + (ex.sets?.length || 0), 0);
    const totalReps = session.exercises.reduce(
      (acc, ex) => acc + (ex.sets?.reduce((sum, set) => sum + set.reps, 0) || 0),
      0
    );
    const totalWeight = session.exercises.reduce(
      (acc, ex) => acc + (ex.sets?.reduce((sum, set) => sum + set.weight * set.reps, 0) || 0),
      0
    );
    return { totalSets, totalReps, totalWeight };
  };

  const handleOpenSession = (session) => {
    setSelectedSession(session);
  };

  const handleCloseSheet = () => {
    setSelectedSession(null);
    setEditingSet(null); // Clear any editing state when closing
  };

  const visibleSessions = sessions.slice(0, visibleCount);
  const hasMore = visibleCount < sessions.length;

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 5);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-mono-200 pb-4"
      >
        <h1 className={`${headingStyles.h1} mb-1`}>
          Workout History
        </h1>
        <p className={headingStyles.label}>
          {sessions.length} completed sessions
        </p>
      </motion.div>

      {/* Workout Calendar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <BubbleCalendar sessions={sessions} />
      </motion.div>

      {/* Empty State */}
      {sessions.length === 0 && (
        <motion.div
          {...scaleIn}
          className="flex flex-col items-center justify-center h-64 text-center"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="bg-mono-900 p-6 mb-4"
          >
            <Trophy className="w-16 h-16 text-white" />
          </motion.div>
          <h2 className="text-2xl font-bold text-mono-900 mb-2 uppercase tracking-tight">
            No workouts yet!
          </h2>
          <p className="text-mono-500 text-sm uppercase tracking-wide">
            Complete your first session to see it here
          </p>
        </motion.div>
      )}

      {/* Sessions List */}
      {sessions.length > 0 && (
        <div className="space-y-3">
          {visibleSessions.map((session, index) => {
          const stats = calculateStats(session);

          // Get muscle groups from exercises
          const muscleGroups = [...new Set(session.exercises.map(ex => ex.category))].filter(Boolean);

          return (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 20 }}
              animate={
                deletingSession === session.id
                  ? {
                      opacity: 0,
                      x: -100,
                      scale: 0.8,
                    }
                  : {
                      opacity: 1,
                      y: 0
                    }
              }
              transition={{ duration: 0.3, delay: index < 5 ? index * 0.1 : 0 }}
              className="bg-white border-2 border-mono-900 overflow-hidden hover:border-mono-700 transition-colors relative cursor-pointer"
              onClick={() => handleOpenSession(session)}
            >
              {/* Black Header Bar */}
              <div className="bg-mono-900 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    {session.templateReference ? (
                      <h4 className="text-white font-bold text-lg uppercase tracking-tight truncate">
                        {session.templateReference.templateName}
                        {session.templateReference.isModified && (
                          <span className="text-mono-400 text-sm ml-2">(Modified)</span>
                        )}
                      </h4>
                    ) : (
                      <h4 className="text-white font-bold text-lg uppercase tracking-tight">
                        {formatDate(session.completedAt || session.createdAt)}
                      </h4>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6">
                {/* Date/Time (if using template) */}
                {session.templateReference && (
                  <p className="text-sm text-mono-600 mb-4">
                    {formatDate(session.completedAt || session.createdAt)}
                  </p>
                )}

                {/* Muscle Groups */}
                {muscleGroups.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {muscleGroups.map(group => (
                      <span
                        key={group}
                        className="px-2 py-1 text-xs font-bold uppercase tracking-wide border-2 border-mono-900 text-mono-900"
                        style={{ borderColor: getMuscleColor(group), color: getMuscleColor(group) }}
                      >
                        {group}
                      </span>
                    ))}
                  </div>
                )}

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-mono-50 border border-mono-200 p-3 text-center">
                    <p className="text-xs text-mono-500 uppercase tracking-wide mb-1">
                      Sets
                    </p>
                    <p className="text-xl font-bold text-mono-900 tabular-nums">
                      {stats.totalSets}
                    </p>
                  </div>
                  <div className="bg-mono-50 border border-mono-200 p-3 text-center">
                    <p className="text-xs text-mono-500 uppercase tracking-wide mb-1">
                      Reps
                    </p>
                    <p className="text-xl font-bold text-mono-900 tabular-nums">
                      {stats.totalReps}
                    </p>
                  </div>
                  <div className="bg-mono-50 border border-mono-200 p-3 text-center">
                    <p className="text-xs text-mono-500 uppercase tracking-wide mb-1">
                      Volume
                    </p>
                    <p className="text-xl font-bold text-mono-900 tabular-nums">
                      {stats.totalWeight.toFixed(0)}
                    </p>
                  </div>
                </div>

                {/* Metadata Row - matches SessionPlanner style */}
                <div className="flex items-center justify-between border-t-2 border-mono-200 pt-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-mono-600" strokeWidth={2} />
                    <span className="font-bold text-base text-mono-900">
                      {new Date(session.completedAt || session.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="w-px h-6 bg-mono-300" />
                  <div className="flex items-center gap-2">
                    <Dumbbell className="w-5 h-5 text-mono-600" strokeWidth={2} />
                    <span className="font-bold text-base text-mono-900">{session.exercises.length} ex</span>
                  </div>
                  <div className="w-px h-6 bg-mono-300" />
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDoItAgain && onDoItAgain(session.exercises);
                    }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-1.5 text-mono-600 hover:text-mono-900 transition-colors text-sm font-medium uppercase tracking-wide"
                    title="Do this workout again"
                  >
                    <Play className="w-4 h-4" fill="currentColor" />
                    Again
                  </motion.button>
                </div>
              </div>

              {/* Delete button in top-right */}
              <div className="absolute top-2 right-2">
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSession(session.id, e);
                  }}
                  whileTap={{ scale: 0.9 }}
                  className="p-1.5 bg-white/80 hover:bg-white text-mono-600 hover:text-red-600 transition-colors"
                  title="Delete session"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </motion.button>
              </div>
            </motion.div>
          );
        })}
      </div>
      )}

      {/* Load More Button */}
      {hasMore && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-center pt-4"
        >
          <motion.button
            onClick={handleLoadMore}
            whileTap={{ scale: 0.98 }}
            className="bg-white border-2 border-mono-900 text-mono-900 px-8 py-3 font-bold text-sm uppercase tracking-wide hover:bg-mono-900 hover:text-white transition-colors"
          >
            Load More Sessions
          </motion.button>
        </motion.div>
      )}

      {/* Make Template Modal */}
      <AnimatePresence>
        {makingTemplate && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMakingTemplate(null)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-4 sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 bg-white border-2 border-mono-900 z-50 w-auto sm:w-full sm:max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <form onSubmit={handleSaveTemplate}>
                <div className="bg-mono-900 h-2" />
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className={headingStyles.h2}>
                      Create Workout Template
                    </h2>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setMakingTemplate(null)}
                      className="text-mono-400 hover:text-mono-900"
                    >
                      <X className="w-6 h-6" />
                    </motion.button>
                  </div>

                  <div>
                    <label className={`block ${headingStyles.label} mb-2`}>
                      Workout Name *
                    </label>
                    <input
                      type="text"
                      value={templateForm.name}
                      onChange={(e) =>
                        setTemplateForm({ ...templateForm, name: e.target.value })
                      }
                      className="w-full px-4 py-3 border-2 border-mono-900 focus:outline-none transition-colors"
                      placeholder="My Awesome Workout"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-mono-700 mb-2 uppercase tracking-widest">
                      Description *
                    </label>
                    <textarea
                      value={templateForm.description}
                      onChange={(e) =>
                        setTemplateForm({ ...templateForm, description: e.target.value })
                      }
                      className="w-full px-4 py-3 border-2 border-mono-900 focus:outline-none transition-colors resize-none"
                      placeholder="Describe what this workout focuses on..."
                      rows={3}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-mono-700 mb-2 uppercase tracking-widest">
                        Difficulty
                      </label>
                      <select
                        value={templateForm.difficulty}
                        onChange={(e) =>
                          setTemplateForm({ ...templateForm, difficulty: e.target.value })
                        }
                        className="w-full px-4 py-3 border-2 border-mono-900 focus:outline-none transition-colors"
                      >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-mono-700 mb-2 uppercase tracking-widest">
                        Duration
                      </label>
                      <input
                        type="text"
                        value={templateForm.duration}
                        onChange={(e) =>
                          setTemplateForm({ ...templateForm, duration: e.target.value })
                        }
                        className="w-full px-4 py-3 border-2 border-mono-900 focus:outline-none transition-colors"
                        placeholder="60-75 min"
                        required
                      />
                    </div>
                  </div>

                  <div className="bg-mono-50 border-2 border-mono-200 p-4">
                    <p className="text-sm text-mono-900">
                      <span className="font-bold uppercase">Exercises:</span> This template will
                      include {makingTemplate.exercises.length} exercises from your workout
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setMakingTemplate(null)}
                      className="flex-1 bg-white border-2 border-mono-900 text-mono-900 py-3 font-bold uppercase tracking-wide hover:bg-mono-50 transition-colors"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      type="submit"
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 bg-mono-900 text-white py-3 font-bold uppercase tracking-wide transition-colors"
                    >
                      Create Template
                    </motion.button>
                  </div>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Session Detail Bottom Sheet */}
      <SessionDetailSheet
        session={selectedSession}
        isOpen={selectedSession !== null}
        onClose={handleCloseSheet}
        onDoItAgain={onDoItAgain}
        onDelete={handleDeleteSession}
        onSaveAsTemplate={handleMakeTemplate}
        editingSet={editingSet}
        onStartEditSet={handleStartEditSet}
        onSaveEditSet={handleSaveEditSet}
        onCancelEditSet={handleCancelEditSet}
        onSetFieldChange={handleSetFieldChange}
        onKeyDown={handleKeyDown}
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {sessionToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={() => setSessionToDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white border-2 border-mono-900 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-red-600 text-white p-4 flex items-center justify-between">
                <h3 className="text-lg font-bold uppercase tracking-wide">
                  Delete Workout?
                </h3>
                <button
                  onClick={() => setSessionToDelete(null)}
                  className="hover:opacity-70 transition-opacity"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                <p className="text-mono-700">
                  This action cannot be undone.
                </p>
              </div>

              {/* Actions */}
              <div className="p-4 border-t border-mono-200 flex gap-3">
                <motion.button
                  onClick={() => setSessionToDelete(null)}
                  className="flex-1 h-12 bg-mono-200 text-mono-900 font-bold uppercase tracking-wide text-sm hover:bg-mono-300 transition-colors"
                  whileTap={{ scale: 0.98 }}
                >
                  CANCEL
                </motion.button>
                <motion.button
                  onClick={confirmDeleteSession}
                  className="flex-1 h-12 bg-red-600 text-white font-bold uppercase tracking-wide text-sm hover:opacity-90 transition-opacity"
                  whileTap={{ scale: 0.98 }}
                >
                  DELETE
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
