import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Dumbbell,
  Trophy,
  ChevronDown,
  Repeat2,
  BarChart3,
  Trash2,
  Edit2,
  Check,
  Sparkles,
  X,
  Play,
  Clock,
  MoreHorizontal,
} from 'lucide-react';
import { staggerContainer, staggerItem, scaleIn } from '../utils/animations';
import { sessionService, templateService } from '../services/stateService';
import { headingStyles, iconSizes } from '../utils/typography';
import SessionTimeline from './SessionTimeline';
import { getMuscleColor } from '../utils/design-system';
import WorkoutCalendar from './WorkoutCalendar';

export default function SessionHistory({ onDoItAgain, initialExpandedSessionId, onClearExpandedSession }) {
  const [sessions, setSessions] = useState([]);
  const [expandedSession, setExpandedSession] = useState(null);
  const [deletingSession, setDeletingSession] = useState(null);
  const [sessionToDelete, setSessionToDelete] = useState(null); // For confirmation
  const [editingName, setEditingName] = useState(null);
  const [editedName, setEditedName] = useState('');
  const [makingTemplate, setMakingTemplate] = useState(null);
  const [visibleCount, setVisibleCount] = useState(5);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    difficulty: 'intermediate',
    duration: '',
    frequency: '',
  });

  useEffect(() => {
    loadSessions();
  }, []);

  // Auto-expand the just-completed session
  useEffect(() => {
    if (initialExpandedSessionId && sessions.length > 0) {
      setExpandedSession(initialExpandedSessionId);
      // Clear the flag after expanding
      if (onClearExpandedSession) {
        onClearExpandedSession();
      }
    }
  }, [initialExpandedSessionId, sessions.length, onClearExpandedSession]);

  const loadSessions = async () => {
    const data = await sessionService.getAll();
    setSessions(data);
  };

  const handleDeleteSession = (sessionId, e) => {
    e.stopPropagation();
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
      await sessionService.delete(sessionId);
      setSessions(sessions.filter((s) => s.id !== sessionId));
      setDeletingSession(null);
      if (expandedSession === sessionId) {
        setExpandedSession(null);
      }
    }, 300);
  };

  const handleEditName = (session, e) => {
    e.stopPropagation();
    setEditingName(session.id);
    setEditedName(session.name || '');
  };

  const handleSaveName = async (sessionId, e) => {
    e.stopPropagation();
    await sessionService.update(sessionId, { name: editedName });
    setSessions(sessions.map((s) => (s.id === sessionId ? { ...s, name: editedName } : s)));
    setEditingName(null);
  };

  const handleMakeTemplate = (session, e) => {
    e.stopPropagation();
    setMakingTemplate(session);
    setTemplateForm({
      name: session.name || 'My Workout',
      description: `Custom template with ${session.exercises.length} exercises`,
      difficulty: 'intermediate',
      duration: '60-75 min',
      frequency: '2-3x per week',
    });
  };

  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    if (!makingTemplate || !templateForm.name) return;

    const exerciseIds = makingTemplate.exercises.map((ex) => ex.id);

    await templateService.create({
      name: templateForm.name,
      description: templateForm.description,
      difficulty: templateForm.difficulty,
      duration: templateForm.duration,
      frequency: templateForm.frequency,
      exerciseIds,
    });

    setMakingTemplate(null);
    setTemplateForm({
      name: '',
      description: '',
      difficulty: 'intermediate',
      duration: '',
      frequency: '',
    });
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

  const toggleExpand = (sessionId) => {
    setExpandedSession(expandedSession === sessionId ? null : sessionId);
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
        <WorkoutCalendar sessions={sessions} />
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
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="space-y-3"
        >
          {visibleSessions.map((session) => {
          const stats = calculateStats(session);
          const isExpanded = expandedSession === session.id;

          // Get muscle groups from exercises
          const muscleGroups = [...new Set(session.exercises.map(ex => ex.category))].filter(Boolean);

          return (
            <motion.div
              key={session.id}
              variants={staggerItem}
              layout
              animate={
                deletingSession === session.id
                  ? {
                      opacity: 0,
                      x: -100,
                      scale: 0.8,
                    }
                  : {}
              }
              className="bg-white border-2 border-mono-900 overflow-hidden hover:border-mono-700 transition-colors relative cursor-pointer"
              onClick={() => toggleExpand(session.id)}
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

                  {/* Subtle expansion indicator */}
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="text-white/60"
                  >
                    <ChevronDown className="w-5 h-5" strokeWidth={2} />
                  </motion.div>
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

              {/* Expanded Details */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="border-t-2 border-mono-900 bg-mono-50"
                  >
                    <div className="p-4 space-y-4">
                      {/* Session Timeline Visualization */}
                      <SessionTimeline session={session} />

                      {/* Exercise Details */}
                      <div className="space-y-6">
                        {session.exercises.map((exercise, index) => {
                          const exerciseStats = exercise.sets
                            ? {
                                totalSets: exercise.sets.length,
                                totalReps: exercise.sets.reduce((sum, set) => sum + set.reps, 0),
                                totalWeight: exercise.sets.reduce(
                                  (sum, set) => sum + set.weight * set.reps,
                                  0
                                ),
                                maxWeight: Math.max(...exercise.sets.map((s) => s.weight)),
                              }
                            : null;

                          return (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="bg-white border-2 border-mono-300 overflow-hidden shadow-md"
                            >
                              <div
                                className="h-2"
                                style={{ backgroundColor: getMuscleColor(exercise.muscleGroup) }}
                              />
                              <div className="p-4">
                                <div className="flex items-center gap-3 mb-3">
                                  <div
                                    className="p-2"
                                    style={{
                                      backgroundColor: getMuscleColor(exercise.muscleGroup),
                                    }}
                                  >
                                    <Dumbbell className="w-4 h-4 text-white" />
                                  </div>
                                  <div className="flex-1">
                                    <h4 className={headingStyles.h4}>
                                      {exercise.name}
                                    </h4>
                                    <p className={headingStyles.label}>
                                      {exercise.category}
                                    </p>
                                  </div>
                                  {exerciseStats && (
                                    <div className="text-right">
                                      <p className={headingStyles.label}>
                                        Max Weight
                                      </p>
                                      <p className="text-lg font-bold text-mono-900 tabular-nums">
                                        {exerciseStats.maxWeight}kg
                                      </p>
                                    </div>
                                  )}
                                </div>

                                {exerciseStats && (
                                  <div className="grid grid-cols-3 gap-2 mb-3">
                                    <div className="bg-mono-50 border border-mono-200 p-2 text-center">
                                      <p className={headingStyles.label}>
                                        Sets
                                      </p>
                                      <p className="text-base font-bold text-mono-900 tabular-nums">
                                        {exerciseStats.totalSets}
                                      </p>
                                    </div>
                                    <div className="bg-mono-50 border border-mono-200 p-2 text-center">
                                      <p className={headingStyles.label}>
                                        Reps
                                      </p>
                                      <p className="text-base font-bold text-mono-900 tabular-nums">
                                        {exerciseStats.totalReps}
                                      </p>
                                    </div>
                                    <div className="bg-mono-50 border border-mono-200 p-2 text-center">
                                      <p className={headingStyles.label}>
                                        Volume
                                      </p>
                                      <p className="text-base font-bold text-mono-900 tabular-nums">
                                        {exerciseStats.totalWeight.toFixed(0)}kg
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {exercise.sets && exercise.sets.length > 0 && (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2 mb-2">
                                      <BarChart3 className="w-4 h-4 text-mono-500" />
                                      <span className="text-xs font-semibold text-mono-500 uppercase tracking-wide">
                                        Set Details
                                      </span>
                                    </div>
                                    {exercise.sets.map((set, setIndex) => (
                                      <motion.div
                                        key={setIndex}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: setIndex * 0.05 }}
                                        className="flex items-center justify-between bg-mono-50 border border-mono-200 p-3"
                                      >
                                        <div className="flex items-center gap-3">
                                          <div className="bg-mono-900 text-white w-6 h-6 flex items-center justify-center text-xs font-bold">
                                            {setIndex + 1}
                                          </div>
                                          <span className="text-sm font-semibold text-mono-900">
                                            {set.reps} reps
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm text-mono-500">×</span>
                                          <span className="text-lg font-bold text-mono-900 tabular-nums">
                                            {set.weight}kg
                                          </span>
                                        </div>
                                      </motion.div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </motion.div>
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
                      Create Workout
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

                  <div>
                    <label className="block text-xs font-bold text-mono-700 mb-2 uppercase tracking-widest">
                      Frequency
                    </label>
                    <input
                      type="text"
                      value={templateForm.frequency}
                      onChange={(e) =>
                        setTemplateForm({ ...templateForm, frequency: e.target.value })
                      }
                      className="w-full px-4 py-3 border-2 border-mono-900 focus:outline-none transition-colors"
                      placeholder="2-3x per week"
                      required
                    />
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
