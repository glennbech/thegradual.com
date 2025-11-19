import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Dumbbell } from 'lucide-react';
import { headingStyles } from '../utils/typography';

export default function WorkoutCalendar({ sessions }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Get the first day of the month and total days in month
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday

  // Create a map of dates with workouts
  const workoutDates = new Set();
  sessions.forEach((session) => {
    const sessionDate = new Date(session.completedAt || session.createdAt);
    const dateKey = `${sessionDate.getFullYear()}-${sessionDate.getMonth()}-${sessionDate.getDate()}`;
    workoutDates.add(dateKey);
  });

  // Navigate to previous month
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  // Navigate to next month
  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Check if a date has workouts
  const hasWorkout = (day) => {
    const dateKey = `${year}-${month}-${day}`;
    return workoutDates.has(dateKey);
  };

  // Check if date is today
  const isToday = (day) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  // Format month and year for header
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const monthYearDisplay = `${monthNames[month]} ${year}`;

  // Generate calendar days array
  const calendarDays = [];

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }

  // Add all days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white border-2 border-mono-900 overflow-hidden">
      {/* Header with month navigation */}
      <div className="bg-mono-900 px-4 py-3 flex items-center justify-between">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={goToPreviousMonth}
          className="text-white hover:text-mono-300 p-1 transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5" />
        </motion.button>

        <h3 className="text-white font-bold text-sm uppercase tracking-wide">
          {monthYearDisplay}
        </h3>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={goToNextMonth}
          className="text-white hover:text-mono-300 p-1 transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Calendar grid */}
      <div className="p-4">
        {/* Day labels */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayLabels.map((label) => (
            <div
              key={label}
              className="text-center text-xs font-bold text-mono-500 uppercase tracking-wide py-2"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="aspect-square" />;
            }

            const today = isToday(day);
            const workout = hasWorkout(day);

            return (
              <motion.div
                key={day}
                whileHover={workout ? { scale: 1.05 } : {}}
                className={`
                  aspect-square flex flex-col items-center justify-center
                  border-2 relative
                  ${today ? 'border-mono-900' : 'border-mono-200'}
                  ${workout ? 'bg-mono-900' : 'bg-white'}
                  transition-colors
                `}
              >
                <span
                  className={`
                    text-sm font-bold
                    ${workout ? 'text-white' : 'text-mono-900'}
                    ${today && !workout ? 'text-mono-900' : ''}
                  `}
                >
                  {day}
                </span>

                {/* Workout indicator */}
                {workout && (
                  <Dumbbell className="w-3 h-3 text-white mt-0.5" />
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-mono-200 flex items-center justify-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-mono-900 flex items-center justify-center">
              <Dumbbell className="w-2.5 h-2.5 text-white" />
            </div>
            <span className="text-mono-700 font-medium uppercase tracking-wide">
              Workout Day
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-mono-900 bg-white" />
            <span className="text-mono-700 font-medium uppercase tracking-wide">
              Today
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
