import { motion } from 'framer-motion';
import { Clock, Dumbbell, Timer, Flame, TrendingUp, Award } from 'lucide-react';
import { getMuscleColor } from '../utils/design-system';

export default function SessionTimeline({ session }) {
  if (!session || !session.exercises || session.exercises.length === 0) {
    return null;
  }

  // Build timeline events from session data
  const buildTimeline = () => {
    const events = [];
    const startTime = new Date(session.createdAt).getTime();

    session.exercises.forEach((exercise) => {
      if (!exercise.sets || exercise.sets.length === 0) return;

      // Exercise start event
      const firstSetTime = new Date(exercise.sets[0].completedAt).getTime();
      const minutesFromStart = Math.round((firstSetTime - startTime) / 1000 / 60);

      events.push({
        type: 'exercise-start',
        time: firstSetTime,
        minutesFromStart,
        exercise: exercise.name,
        muscleGroup: exercise.muscleGroup,
      });

      // Add each set completion
      exercise.sets.forEach((set, setIndex) => {
        const setTime = new Date(set.completedAt).getTime();
        const minutesFromStart = Math.round((setTime - startTime) / 1000 / 60);

        events.push({
          type: 'set',
          time: setTime,
          minutesFromStart,
          exercise: exercise.name,
          muscleGroup: exercise.muscleGroup,
          setNumber: setIndex + 1,
          totalSets: exercise.sets.length,
          reps: set.reps,
          weight: set.weight,
          setType: set.setType || 'working',
          restDuration: set.restDuration,
        });
      });
    });

    return events.sort((a, b) => a.time - b.time);
  };

  const timeline = buildTimeline();

  if (timeline.length === 0) {
    return null;
  }

  const totalDuration = Math.round(
    (timeline[timeline.length - 1].time - timeline[0].time) / 1000 / 60
  );
  const sessionStart = new Date(session.createdAt);
  const sessionEnd = session.completedAt
    ? new Date(session.completedAt)
    : new Date(timeline[timeline.length - 1].time);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getSetTypeIcon = (setType) => {
    switch (setType) {
      case 'warm-up':
        return '🔥';
      case 'working':
        return '💪';
      case 'drop':
        return '📉';
      case 'failure':
        return '⚡';
      default:
        return '💪';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-mono-200 p-4"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-mono-900" />
          <h3 className="font-bold text-mono-900 uppercase tracking-tight text-sm">
            Session Timeline
          </h3>
        </div>
        <div className="text-xs text-mono-500 font-medium tabular-nums">
          {formatTime(sessionStart)} - {formatTime(sessionEnd)}
        </div>
      </div>

      {/* Duration Bar */}
      <div className="mb-4 bg-mono-50 border border-mono-200 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-mono-500 uppercase tracking-wide">Total Duration</span>
          <span className="text-sm font-bold text-mono-900 tabular-nums">
            {totalDuration} minutes
          </span>
        </div>
        <div className="h-2 bg-mono-200 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full bg-mono-900"
          />
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical Line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-mono-200" />

        {/* Events */}
        <div className="space-y-3">
          {timeline.map((event, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative pl-14"
            >
              {/* Timeline Dot */}
              <div className="absolute left-3 top-2">
                <div
                  className={`w-6 h-6 flex items-center justify-center border-2 border-white`}
                  style={{
                    backgroundColor:
                      event.type === 'exercise-start'
                        ? getMuscleColor(event.muscleGroup)
                        : '#737373',
                  }}
                >
                  {event.type === 'exercise-start' ? (
                    <Dumbbell className="w-3 h-3 text-white" />
                  ) : (
                    <span className="text-xs text-white font-bold">{event.setNumber}</span>
                  )}
                </div>
              </div>

              {/* Event Content */}
              <div className="bg-mono-50 border border-mono-200 p-2.5 hover:border-mono-400 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    {event.type === 'exercise-start' ? (
                      <div>
                        <p className="font-bold text-sm text-mono-900 uppercase tracking-tight">
                          {event.exercise}
                        </p>
                        <p className="text-xs text-mono-500 capitalize uppercase tracking-wide">
                          {event.muscleGroup}
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-base">{getSetTypeIcon(event.setType)}</span>
                        <div>
                          <p className="text-xs text-mono-900">
                            Set {event.setNumber}/{event.totalSets}:{' '}
                            <span className="font-bold">{event.reps} reps</span> ×{' '}
                            <span className="font-bold tabular-nums">{event.weight}kg</span>
                          </p>
                          {event.restDuration && (
                            <p className="text-xs text-mono-500 flex items-center gap-1 mt-0.5">
                              <Timer className="w-3 h-3" />
                              Rest: {Math.floor(event.restDuration / 60)}:
                              {(event.restDuration % 60).toString().padStart(2, '0')}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-mono-500 font-mono tabular-nums">
                    +{event.minutesFromStart}m
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Session Stats */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="bg-mono-50 border border-mono-200 p-2 text-center">
          <Flame className="w-4 h-4 text-mono-900 mx-auto mb-1" />
          <p className="text-xs text-mono-500 uppercase tracking-wide">Total Sets</p>
          <p className="text-sm font-bold text-mono-900 tabular-nums">
            {timeline.filter((e) => e.type === 'set').length}
          </p>
        </div>
        <div className="bg-mono-50 border border-mono-200 p-2 text-center">
          <TrendingUp className="w-4 h-4 text-mono-900 mx-auto mb-1" />
          <p className="text-xs text-mono-500 uppercase tracking-wide">Avg Rest</p>
          <p className="text-sm font-bold text-mono-900 tabular-nums">
            {Math.round(
              timeline
                .filter((e) => e.type === 'set' && e.restDuration)
                .reduce((sum, e) => sum + e.restDuration, 0) /
                timeline.filter((e) => e.type === 'set' && e.restDuration).length || 0
            )}
            s
          </p>
        </div>
        <div className="bg-mono-50 border border-mono-200 p-2 text-center">
          <Award className="w-4 h-4 text-mono-900 mx-auto mb-1" />
          <p className="text-xs text-mono-500 uppercase tracking-wide">Exercises</p>
          <p className="text-sm font-bold text-mono-900 tabular-nums">{session.exercises.length}</p>
        </div>
      </div>
    </motion.div>
  );
}
