import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * WeeklyHeatmap - GitHub-style contribution graph
 * Shows workout activity in a 7-day × N-week grid (newest on right)
 * Default: Last 12 weeks (mobile: 8 weeks) with expand to 52 weeks
 */
export default function WeeklyHeatmap({ sessions }) {
  const [showAll, setShowAll] = useState(false);
  const scrollContainerRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate daily workout counts for the last 52 weeks (366 days)
  const dailyData = useMemo(() => {
    if (!sessions || sessions.length === 0) return [];

    // Get completed sessions only
    const completedSessions = sessions.filter(s => s.status === 'completed');

    // Calculate date 52 weeks ago (364 days to align with weeks)
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - (52 * 7));
    startDate.setHours(0, 0, 0, 0);

    // Get day of week for start date (0 = Sunday, 1 = Monday, etc.)
    const startDayOfWeek = startDate.getDay();

    // Adjust to start on Monday (if start is Wednesday, go back 2 days)
    const daysToMonday = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
    startDate.setDate(startDate.getDate() - daysToMonday);

    // Create array of days organized by week
    const weeks = [];
    let currentWeek = [];

    for (let dayOffset = 0; dayOffset < 52 * 7; dayOffset++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + dayOffset);

      const dayOfWeek = currentDate.getDay();
      const adjustedDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0, Sunday = 6

      // Count sessions on this day
      const count = completedSessions.filter(session => {
        const sessionDate = new Date(session.completedAt || session.createdAt);
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate.getTime() === currentDate.getTime();
      }).length;

      currentWeek[adjustedDayOfWeek] = {
        date: new Date(currentDate),
        count,
        dayOfWeek: adjustedDayOfWeek,
      };

      // Complete week (Sunday reached)
      if (adjustedDayOfWeek === 6) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // Add incomplete final week if exists
    if (currentWeek.length > 0) {
      // Fill missing days with nulls
      for (let i = currentWeek.length; i < 7; i++) {
        currentWeek[i] = null;
      }
      weeks.push(currentWeek);
    }

    return weeks;
  }, [sessions]);

  // Determine how many weeks to show
  const weeksToShow = useMemo(() => {
    if (showAll) return 52;
    return isMobile ? 8 : 12;
  }, [showAll, isMobile]);

  // Get the most recent N weeks
  const displayedWeeks = useMemo(() => {
    return dailyData.slice(-weeksToShow);
  }, [dailyData, weeksToShow]);

  // Calculate stats
  const stats = useMemo(() => {
    const allDays = dailyData.flat().filter(d => d !== null);
    const totalWorkouts = allDays.reduce((sum, day) => sum + day.count, 0);
    const daysWithWorkouts = allDays.filter(d => d.count > 0).length;
    const maxDailyWorkouts = Math.max(...allDays.map(d => d.count), 0);
    const currentStreak = getCurrentStreak(dailyData);

    return {
      totalWorkouts,
      daysWithWorkouts,
      maxDailyWorkouts,
      currentStreak,
    };
  }, [dailyData]);

  // Auto-scroll to show current week on mobile
  useEffect(() => {
    if (isMobile && scrollContainerRef.current && !showAll) {
      // Scroll to the right (current week)
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, [isMobile, showAll, displayedWeeks]);

  // Get color intensity based on workout count
  const getColor = (count) => {
    if (count === 0) return '#E5E7EB'; // mono-200
    if (count === 1) return '#93C5FD'; // blue-300
    if (count === 2) return '#60A5FA'; // blue-400
    if (count === 3) return '#3B82F6'; // blue-500
    if (count >= 4) return '#1D4ED8'; // blue-700
    return '#E5E7EB';
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

  // Generate month labels
  const monthLabels = useMemo(() => {
    const labels = [];
    let lastMonth = null;

    displayedWeeks.forEach((week, weekIndex) => {
      // Check the first day of the week (Monday)
      const firstDay = week.find(d => d !== null);
      if (firstDay) {
        const month = firstDay.date.toLocaleDateString('en-US', { month: 'short' });
        if (month !== lastMonth) {
          labels.push({ weekIndex, month });
          lastMonth = month;
        }
      }
    });

    return labels;
  }, [displayedWeeks]);

  if (dailyData.length === 0) {
    return (
      <div className="bg-white border-2 border-mono-200 p-8 text-center">
        <Calendar className="w-12 h-12 text-mono-300 mx-auto mb-3" />
        <p className="text-mono-500 font-semibold">No workout data yet</p>
        <p className="text-xs text-mono-400 mt-1">Start working out to see your weekly activity</p>
      </div>
    );
  }

  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="bg-white border-2 border-mono-200 p-4 md:p-6">
      {/* Header */}
      <div className="mb-4 md:mb-6">
        <div className="flex items-center justify-between mb-3 md:mb-4 flex-wrap gap-2">
          <div>
            <h3 className="text-base md:text-lg font-bold text-mono-900 uppercase tracking-tight">
              Weekly Activity
            </h3>
            <p className="text-xs text-mono-500 uppercase">
              {showAll ? '52 week' : `Last ${weeksToShow} weeks`} workout frequency
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-mono-500">
            <span>Less</span>
            {[0, 1, 2, 3, 4].map(level => (
              <div
                key={level}
                className="w-2.5 h-2.5 md:w-3 md:h-3 border border-mono-300"
                style={{ backgroundColor: getColor(level) }}
              />
            ))}
            <span>More</span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          <div className="bg-mono-50 border border-mono-200 p-2 md:p-3">
            <div className="text-xs text-mono-500 uppercase tracking-wide mb-1">
              Total Workouts
            </div>
            <div className="text-lg md:text-xl font-bold text-mono-900">
              {stats.totalWorkouts}
            </div>
          </div>
          <div className="bg-mono-50 border border-mono-200 p-2 md:p-3">
            <div className="text-xs text-mono-500 uppercase tracking-wide mb-1">
              Active Days
            </div>
            <div className="text-lg md:text-xl font-bold text-mono-900">
              {stats.daysWithWorkouts}
            </div>
          </div>
          <div className="bg-mono-50 border border-mono-200 p-2 md:p-3">
            <div className="text-xs text-mono-500 uppercase tracking-wide mb-1">
              Best Day
            </div>
            <div className="text-lg md:text-xl font-bold text-mono-900">
              {stats.maxDailyWorkouts}
            </div>
          </div>
          <div className="bg-mono-50 border border-mono-200 p-2 md:p-3">
            <div className="text-xs text-mono-500 uppercase tracking-wide mb-1">
              Day Streak
            </div>
            <div className="text-lg md:text-xl font-bold text-mono-900">
              {stats.currentStreak}
            </div>
          </div>
        </div>
      </div>

      {/* Heatmap Grid - GitHub Style */}
      <div className="overflow-x-auto" ref={scrollContainerRef}>
        <div className="inline-flex gap-1">
          {/* Day labels column */}
          <div className="flex flex-col gap-1 pr-2">
            <div className="h-4" /> {/* Spacer for month labels */}
            {dayLabels.map((label, i) => (
              <div
                key={i}
                className="h-3 md:h-3.5 flex items-center justify-end text-[10px] text-mono-500 font-medium"
              >
                {label}
              </div>
            ))}
          </div>

          {/* Weeks columns */}
          <div className="flex gap-1">
            {displayedWeeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-1">
                {/* Month label */}
                <div className="h-4 text-[10px] text-mono-500 font-medium">
                  {monthLabels.find(l => l.weekIndex === weekIndex)?.month || ''}
                </div>

                {/* Days in week */}
                {week.map((day, dayIndex) => (
                  <motion.div
                    key={dayIndex}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2, delay: (weekIndex * 7 + dayIndex) * 0.002 }}
                    className="group relative"
                  >
                    {day ? (
                      <>
                        <div
                          className="w-3 h-3 md:w-3.5 md:h-3.5 border border-mono-300 cursor-pointer transition-transform hover:scale-125"
                          style={{ backgroundColor: getColor(day.count) }}
                        />
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 pointer-events-none">
                          <div className="bg-mono-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                            <div className="font-semibold">
                              {formatDate(day.date)}
                            </div>
                            <div className="text-mono-300">
                              {day.count} workout{day.count !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="w-3 h-3 md:w-3.5 md:h-3.5" /> // Empty space for future days
                    )}
                  </motion.div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Expand/Collapse Toggle */}
      <motion.div className="mt-4 flex justify-center">
        <motion.button
          onClick={() => setShowAll(!showAll)}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-mono-600 hover:text-mono-900 hover:bg-mono-100 rounded transition-colors uppercase tracking-wide"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {showAll ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Show Recent
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Show Full Year (52 Weeks)
            </>
          )}
        </motion.button>
      </motion.div>
    </div>
  );
}

/**
 * Calculate current streak of consecutive days with at least 1 workout
 */
function getCurrentStreak(dailyData) {
  let streak = 0;

  // Flatten all weeks into single array of days
  const allDays = dailyData.flat().filter(d => d !== null);

  // Start from the most recent day and count backwards
  for (let i = allDays.length - 1; i >= 0; i--) {
    if (allDays[i].count > 0) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
