import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * BubbleCalendar - Monthly calendar heatmap with bubble visualization
 * Bubbles vary in size (workout intensity) and color (workout frequency)
 * Strava-inspired design with monthly sections
 */
export default function BubbleCalendar({ sessions }) {
  // State for selected month (default to current month)
  // ALWAYS call hooks - never conditionally!
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(null);

  // Calculate daily volume organized by month
  const monthlyData = useMemo(() => {
    if (!sessions || sessions.length === 0) return [];

    // Get completed sessions only
    const completedSessions = sessions.filter(s => s.status === 'completed');

    // Calculate date 12 months ago
    const now = new Date();
    const startDate = new Date(now);
    startDate.setMonth(now.getMonth() - 11); // 12 months ago
    startDate.setDate(1); // First day of that month
    startDate.setHours(0, 0, 0, 0);

    // Group days by month
    const months = [];
    let currentDate = new Date(startDate);

    while (currentDate <= now) {
      const month = currentDate.getMonth();
      const year = currentDate.getFullYear();
      const monthLabel = currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase();

      // Get all days in this month
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sunday

      const days = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        date.setHours(0, 0, 0, 0);

        // Calculate total volume for this day (reps × weight, excluding warm-ups)
        // Only count volume for weight+reps exercises to avoid false zeros
        const volume = completedSessions
          .filter(session => {
            const sessionDate = new Date(session.completedAt || session.createdAt);
            sessionDate.setHours(0, 0, 0, 0);
            return sessionDate.getTime() === date.getTime();
          })
          .reduce((totalVolume, session) => {
            const sessionVolume = (session.exercises || []).reduce((exTotal, exercise) => {
              const exerciseType = exercise.exerciseType || 'weight+reps';
              const exerciseVolume = (exercise.sets || [])
                .filter(set => set.setType !== 'warm-up')
                .reduce((setTotal, set) => {
                  // Only calculate volume for weight+reps exercises
                  if (exerciseType === 'weight+reps') {
                    return setTotal + ((set.reps || 0) * (set.weight || 0));
                  }
                  // For other types, count sets as units of work
                  return setTotal + 1;
                }, 0);
              return exTotal + exerciseVolume;
            }, 0);
            return totalVolume + sessionVolume;
          }, 0);

        days.push({
          date: new Date(date),
          dayOfWeek: date.getDay(), // 0 = Sunday
          day,
          volume: Math.round(volume),
          isToday: date.getTime() === new Date().setHours(0, 0, 0, 0)
        });
      }

      months.push({
        label: monthLabel,
        month,
        year,
        days,
        firstDayOfWeek
      });

      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return months;
  }, [sessions]);

  // Initialize selectedMonthIndex to last month (current)
  const currentMonthIndex = selectedMonthIndex !== null
    ? selectedMonthIndex
    : monthlyData.length - 1;

  // Show only the selected month
  const displayedMonth = monthlyData[currentMonthIndex];

  // Navigation handlers
  const handlePrevMonth = () => {
    if (currentMonthIndex > 0) {
      setSelectedMonthIndex(currentMonthIndex - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonthIndex < monthlyData.length - 1) {
      setSelectedMonthIndex(currentMonthIndex + 1);
    }
  };

  // Calculate stats and max volume for relative sizing
  const stats = useMemo(() => {
    const allDays = monthlyData.flatMap(m => m.days);
    const totalVolume = allDays.reduce((sum, day) => sum + day.volume, 0);
    const daysWithWorkouts = allDays.filter(d => d.volume > 0).length;
    const maxVolume = Math.max(...allDays.map(d => d.volume), 0);

    // Calculate current streak
    let streak = 0;
    for (let i = allDays.length - 1; i >= 0; i--) {
      if (allDays[i].volume > 0) {
        streak++;
      } else {
        break;
      }
    }

    return {
      totalVolume,
      daysWithWorkouts,
      maxVolume,
      currentStreak: streak,
    };
  }, [monthlyData]);

  // Get bubble size based on volume (LOG SCALE for better visual distribution)
  const getBubbleSize = (volume, maxVolume) => {
    if (volume === 0) return '0.25rem';  // 4px - rest day

    // Use log scale: log(volume + 1) / log(maxVolume + 1)
    // Maps to 0.35rem (5.6px) to 0.875rem (14px) range - compact but readable
    const minSize = 0.35;    // rem
    const maxSize = 0.875;   // rem
    const normalizedVolume = maxVolume > 0
      ? Math.log(volume + 1) / Math.log(maxVolume + 1)
      : 0;

    const size = minSize + (normalizedVolume * (maxSize - minSize));
    return `${size}rem`;
  };

  // Get color intensity based on volume (emerald scale)
  const getColor = (volume, maxVolume) => {
    if (volume === 0) return '#E5E7EB'; // mono-200 (gray)

    const intensity = maxVolume > 0 ? volume / maxVolume : 0;

    if (intensity >= 0.8) return '#10B981'; // emerald-500 - peak
    if (intensity >= 0.6) return '#34D399'; // emerald-400 - high
    if (intensity >= 0.4) return '#6EE7B7'; // emerald-300 - medium
    if (intensity >= 0.2) return '#A7F3D0'; // emerald-200 - low
    return '#D1FAE5';                       // emerald-100 - very low
  };

  // Format date for tooltip
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (monthlyData.length === 0) {
    return (
      <div className="bg-white border-2 border-mono-200 p-4 text-center">
        <Calendar className="w-8 h-8 text-mono-300 mx-auto mb-2" />
        <p className="text-sm text-mono-500 font-semibold">No workout data yet</p>
      </div>
    );
  }

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  // After all hooks are called, check if we have data to display
  if (!displayedMonth || monthlyData.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border-2 border-mono-200 p-2">
      {/* Header with Month Navigation */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrevMonth}
            disabled={currentMonthIndex === 0}
            className="p-0.5 hover:bg-mono-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-mono-900" strokeWidth={2.5} />
          </button>
          <h3 className="text-xs font-bold text-mono-900 uppercase tracking-tight min-w-[90px] text-center">
            {displayedMonth.label}
          </h3>
          <button
            onClick={handleNextMonth}
            disabled={currentMonthIndex === monthlyData.length - 1}
            className="p-0.5 hover:bg-mono-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5 text-mono-900" strokeWidth={2.5} />
          </button>
        </div>

        {/* Compact Inline Stats */}
        <div className="flex gap-2 text-[9px]">
          <div className="text-right">
            <div className="text-mono-500 uppercase leading-none">Vol</div>
            <div className="font-bold text-mono-900 leading-none mt-0.5">{Math.round(stats.totalVolume / 1000)}k</div>
          </div>
          <div className="text-right">
            <div className="text-mono-500 uppercase leading-none">Days</div>
            <div className="font-bold text-mono-900 leading-none mt-0.5">{stats.daysWithWorkouts}</div>
          </div>
          <div className="text-right">
            <div className="text-mono-500 uppercase leading-none">Str</div>
            <div className="font-bold text-mono-900 leading-none mt-0.5">{stats.currentStreak}</div>
          </div>
        </div>
      </div>

      {/* Compact Monthly Bubble Calendar */}
      <motion.div
        key={`${displayedMonth.year}-${displayedMonth.month}`}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2 }}
      >
        {/* Calendar Grid - Compact with slightly more breathing room */}
        <div className="grid grid-cols-7 gap-1.5">
          {/* Day Labels */}
          {dayLabels.map((label, i) => (
            <div
              key={i}
              className="text-center text-[9px] text-mono-400 font-medium h-3 leading-none"
            >
              {label}
            </div>
          ))}

          {/* Empty cells before first day */}
          {Array.from({ length: displayedMonth.firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="h-8" />
          ))}

          {/* Day cells with bubbles - Fixed height with 20% more space */}
          {displayedMonth.days.map((day, dayIndex) => (
                <div
                  key={day.day}
                  className="h-8 flex flex-col items-center justify-center relative group"
                >
                  {/* Day Number */}
                  <div className="text-[9px] font-medium text-mono-600 leading-none mb-0.5">
                    {day.day}
                  </div>

                  {/* Bubble */}
                  <motion.div
                    className="rounded-full border transition-all cursor-pointer"
                    style={{
                      width: getBubbleSize(day.volume, stats.maxVolume),
                      height: getBubbleSize(day.volume, stats.maxVolume),
                      backgroundColor: getColor(day.volume, stats.maxVolume),
                      borderColor: day.isToday ? '#1F2937' : '#D1D5DB',
                      borderWidth: day.isToday ? '2px' : '1px'
                    }}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: dayIndex * 0.005 }}
                    whileHover={{ scale: 1.25 }}
                  />

                  {/* Tooltip */}
                  {day.volume > 0 && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 pointer-events-none">
                      <div className="bg-mono-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap">
                        <div className="font-bold">{formatDate(day.date)}</div>
                        <div className="text-emerald-300">{day.volume.toLocaleString()}kg total</div>
                      </div>
                    </div>
                  )}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
