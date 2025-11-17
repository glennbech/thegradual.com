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
} from 'lucide-react';
import { staggerContainer, staggerItem, scaleIn } from '../utils/animations';
import { sessionService, templateService } from '../services/stateService';
import { headingStyles, iconSizes } from '../utils/typography';
import SessionTimeline from './SessionTimeline';
import { getMuscleColor } from '../utils/design-system';

export default function SessionHistory({ onDoItAgain, initialExpandedSessionId, onClearExpandedSession }) {
  const [sessions, setSessions] = useState([]);
  const [expandedSession, setExpandedSession] = useState(null);
  const [deletingSession, setDeletingSession] = useState(null);
  const [editingName, setEditingName] = useState(null);
  const [editedName, setEditedName] = useState('');
  const [makingTemplate, setMakingTemplate] = useState(null);
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

  const handleDeleteSession = async (sessionId, e) => {
    e.stopPropagation();
    setDeletingSession(sessionId);

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

  if (sessions.length === 0) {
    return (
      <motion.div
        {...scaleIn}
        className="flex flex-col items-center justify-center h-96 text-center"
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
    );
  }

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

      {/* Sessions List */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="space-y-3"
      >
        {sessions.map((session) => {
          const stats = calculateStats(session);
          const isExpanded = expandedSession === session.id;

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
              className="bg-white border-2 border-mono-900 overflow-hidden"
            >
              {/* Session Header */}
              <div className="relative">
                <div
                  onClick={() => toggleExpand(session.id)}
                  className="w-full p-4 text-left hover:bg-mono-50 transition-colors cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleExpand(session.id);
                    }
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="bg-mono-900 p-2">
                          <Calendar className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          {editingName === session.id ? (
                            <div
                              className="flex items-center gap-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="text"
                                value={editedName}
                                onChange={(e) => setEditedName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveName(session.id, e);
                                  if (e.key === 'Escape') setEditingName(null);
                                }}
                                placeholder="Workout name..."
                                className="flex-1 px-2 py-1 text-sm border-2 border-mono-900 focus:outline-none font-bold text-mono-900 bg-white"
                                autoFocus
                              />
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => handleSaveName(session.id, e)}
                                className="text-mono-900 hover:text-mono-700 p-1"
                              >
                                <Check className="w-4 h-4" />
                              </motion.button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 group">
                              <div className="min-w-0 flex-1">
                                {session.name && (
                                  <h3 className={`${headingStyles.h4} truncate`}>
                                    {session.name}
                                  </h3>
                                )}
                                {/* Template Badge */}
                                {session.templateReference && (
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <span
                                      className={`text-xs px-2 py-0.5 border font-semibold uppercase ${
                                        session.templateReference.templateType === 'built-in'
                                          ? 'bg-white text-mono-900 border-mono-900'
                                          : 'bg-mono-900 text-white border-mono-900'
                                      }`}
                                    >
                                      {session.templateReference.templateName}
                                    </span>
                                    {session.templateReference.isModified && (
                                      <span className="text-xs text-mono-500 font-semibold uppercase">
                                        (Modified)
                                      </span>
                                    )}
                                  </div>
                                )}
                                <p className="text-xs text-mono-900 font-medium mt-1">
                                  {formatDate(session.completedAt || session.createdAt)}
                                </p>
                                <p className="text-xs text-mono-500 uppercase">
                                  {session.exercises.length} exercises
                                </p>
                              </div>
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => handleEditName(session, e)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-mono-400 hover:text-mono-900 p-1"
                              >
                                <Edit2 className="w-4 h-4" />
                              </motion.button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Quick Stats */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-mono-50 border border-mono-200 p-2">
                          <p className="text-xs text-mono-500 uppercase tracking-wide mb-1">
                            Sets
                          </p>
                          <p className="text-lg font-bold text-mono-900 tabular-nums">
                            {stats.totalSets}
                          </p>
                        </div>
                        <div className="bg-mono-50 border border-mono-200 p-2">
                          <p className="text-xs text-mono-500 uppercase tracking-wide mb-1">
                            Reps
                          </p>
                          <p className="text-lg font-bold text-mono-900 tabular-nums">
                            {stats.totalReps}
                          </p>
                        </div>
                        <div className="bg-mono-50 border border-mono-200 p-2">
                          <p className="text-xs text-mono-500 uppercase tracking-wide mb-1">
                            Volume
                          </p>
                          <p className="text-lg font-bold text-mono-900 tabular-nums">
                            {stats.totalWeight.toFixed(0)}kg
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-1 ml-3">
                      <motion.button
                        onClick={(e) => handleMakeTemplate(session, e)}
                        whileTap={{ scale: 0.9 }}
                        className="text-mono-500 hover:text-mono-900 p-2 hover:bg-mono-100 transition-colors"
                        title="Make Workout"
                      >
                        <Sparkles className="w-4 h-4" />
                      </motion.button>

                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDoItAgain && onDoItAgain(session.exercises);
                        }}
                        whileTap={{ scale: 0.9 }}
                        className="text-mono-500 hover:text-mono-900 p-2 hover:bg-mono-100 transition-colors"
                        title="Do It Again"
                      >
                        <Repeat2 className="w-4 h-4" />
                      </motion.button>

                      <motion.button
                        onClick={(e) => handleDeleteSession(session.id, e)}
                        whileTap={{ scale: 0.9 }}
                        className="text-mono-500 hover:text-red-500 p-2 hover:bg-mono-100 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>

                      <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <ChevronDown className="w-5 h-5 text-mono-500" />
                      </motion.div>
                    </div>
                  </div>
                </div>
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
    </div>
  );
}
