import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * BubbleCalendar - Monthly calendar heatmap with bubble visualization
 * Bubbles vary in size (workout intensity) and color (workout frequency)
 * Strava-inspired design with monthly sections
 */
export default function BubbleCalendar({ sessions, selectedMonth }) {

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
        const volume = completedSessions
          .filter(session => {
            const sessionDate = new Date(session.completedAt || session.createdAt);
            sessionDate.setHours(0, 0, 0, 0);
            return sessionDate.getTime() === date.getTime();
          })
          .reduce((totalVolume, session) => {
            const sessionVolume = (session.exercises || []).reduce((exTotal, exercise) => {
              const exerciseVolume = (exercise.sets || [])
                .filter(set => set.setType !== 'warm-up')
                .reduce((setTotal, set) => setTotal + ((set.reps || 0) * (set.weight || 0)), 0);
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

  // Show only the selected month
  const displayedMonths = useMemo(() => {
    if (!selectedMonth) return monthlyData.slice(-1); // Default to current month
    return monthlyData.filter(m =>
      m.month === selectedMonth.month && m.year === selectedMonth.year
    );
  }, [monthlyData, selectedMonth]);

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
    // Maps to 0.375rem (6px) to 1.125rem (18px) range - more compact
    const minSize = 0.375;   // rem
    const maxSize = 1.125;   // rem
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

  return (
    <div className="bg-white border-2 border-mono-200 p-3">
      {/* Compact Header */}
      <div className="mb-2">
        <h3 className="text-sm font-bold text-mono-900 uppercase tracking-tight mb-2">
          {displayedMonths.length > 0 ? displayedMonths[0].label : 'Activity'}
        </h3>
        {/* Vertical compact stats */}
        <div className="flex gap-4 text-[10px] mb-2">
          <div>
            <div className="text-mono-500 uppercase">Vol</div>
            <div className="font-bold text-mono-900">{Math.round(stats.totalVolume / 1000)}k</div>
          </div>
          <div>
            <div className="text-mono-500 uppercase">Days</div>
            <div className="font-bold text-mono-900">{stats.daysWithWorkouts}</div>
          </div>
          <div>
            <div className="text-mono-500 uppercase">Streak</div>
            <div className="font-bold text-mono-900">{stats.currentStreak}</div>
          </div>
        </div>
      </div>

      {/* Compact Monthly Bubble Calendars */}
      <div className="space-y-3">
        {displayedMonths.map((month, monthIndex) => (
          <motion.div
            key={`${month.year}-${month.month}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: monthIndex * 0.1 }}
          >
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {/* Day Labels */}
              {dayLabels.map((label, i) => (
                <div
                  key={i}
                  className="text-center text-[10px] text-mono-400 font-medium pb-0.5"
                >
                  {label}
                </div>
              ))}

              {/* Empty cells before first day */}
              {Array.from({ length: month.firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}

              {/* Day cells with bubbles */}
              {month.days.map((day, dayIndex) => (
                <div
                  key={day.day}
                  className="aspect-square flex flex-col items-center justify-center relative group"
                >
                  {/* Day Number */}
                  <div className="text-[10px] font-medium text-mono-600 mb-0.5">
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
                    transition={{ delay: monthIndex * 0.1 + dayIndex * 0.01 }}
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
        ))}
      </div>
    </div>
  );
}
