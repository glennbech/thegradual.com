import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

/**
 * Calendar-style heatmap showing training volume by day
 * Follows flat 2D design system
 */
export default function VolumeHeatmap({ data }) {
  const heatmapData = useMemo(() => {
    if (!data || data.length === 0) return null;

    const volumes = data.map(d => d.volume).filter(v => v > 0);
    if (volumes.length === 0) return null;

    const maxVolume = Math.max(...volumes);
    const minVolume = Math.min(...volumes.filter(v => v > 0));

    // Group by month for better organization
    const monthsMap = new Map();

    data.forEach(day => {
      const date = new Date(day.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthsMap.has(monthKey)) {
        monthsMap.set(monthKey, {
          label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          weeks: []
        });
      }

      const monthData = monthsMap.get(monthKey);

      // Find or create week within this month
      const weekIndex = day.weekNumber;
      let week = monthData.weeks.find(w => w.weekNumber === weekIndex);

      if (!week) {
        week = { weekNumber: weekIndex, days: [] };
        monthData.weeks.push(week);
      }

      week.days.push(day);
    });

    // Convert to array and sort by date
    const months = Array.from(monthsMap.values());

    return {
      months,
      maxVolume,
      minVolume
    };
  }, [data]);

  if (!heatmapData) {
    return (
      <div className="flex items-center justify-center text-mono-500 text-sm py-8">
        No training volume data available
      </div>
    );
  }

  // Calculate color intensity based on volume
  const getColor = (volume) => {
    if (volume === 0) return 'bg-mono-200';

    const intensity = volume / heatmapData.maxVolume;

    if (intensity >= 0.8) return 'bg-emerald-500';
    if (intensity >= 0.6) return 'bg-emerald-600';
    if (intensity >= 0.4) return 'bg-emerald-700';
    if (intensity >= 0.2) return 'bg-emerald-800';
    return 'bg-emerald-900';
  };

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="flex items-center justify-between text-xs text-mono-500">
        <div>Last {data.length} days of training</div>
        <div className="flex items-center gap-2">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 bg-mono-200 rounded"></div>
            <div className="w-3 h-3 bg-emerald-900 rounded"></div>
            <div className="w-3 h-3 bg-emerald-700 rounded"></div>
            <div className="w-3 h-3 bg-emerald-600 rounded"></div>
            <div className="w-3 h-3 bg-emerald-500 rounded"></div>
          </div>
          <span>More</span>
        </div>
      </div>

      {/* Heatmap grid - Full width */}
      <div className="w-full space-y-6">
        {heatmapData.months.map((month, monthIndex) => (
          <div key={monthIndex} className="space-y-2">
            {/* Month label */}
            <h3 className="text-sm font-semibold text-mono-900 uppercase tracking-wide">
              {month.label}
            </h3>

            {/* Calendar grid for this month */}
            <div className="w-full">
              <div className="grid grid-cols-7 gap-2">
                {/* Day headers */}
                {dayLabels.map((day, i) => (
                  <div key={i} className="text-center text-xs text-mono-500 font-medium pb-1">
                    {day}
                  </div>
                ))}

                {/* Days grid */}
                {month.weeks.map(week =>
                  week.days.map(day => {
                    const date = new Date(day.date);
                    const dayOfWeek = date.getDay();

                    return (
                      <motion.div
                        key={day.date}
                        style={{ gridColumnStart: dayOfWeek + 1 }}
                        className={`aspect-square rounded ${getColor(day.volume)} group relative cursor-pointer flex items-center justify-center`}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: monthIndex * 0.1 + dayOfWeek * 0.02 }}
                        whileHover={{ scale: 1.05 }}
                      >
                        {/* Day number */}
                        <span className="text-xs text-mono-700 font-medium">
                          {date.getDate()}
                        </span>

                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-20 pointer-events-none">
                          <div className="bg-white border-2 border-emerald-600 rounded px-3 py-2 text-xs whitespace-nowrap shadow-lg">
                            <div className="font-semibold text-mono-900">
                              {day.volume > 0 ? `${day.volume.toLocaleString()}kg` : 'Rest day'}
                            </div>
                            <div className="text-mono-500">
                              {date.toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 pt-6 border-t border-mono-200">
        <div>
          <div className="text-xs text-mono-500 uppercase tracking-wide mb-1">Total Volume</div>
          <div className="text-lg font-bold text-mono-900">
            {data.reduce((sum, d) => sum + d.volume, 0).toLocaleString()}kg
          </div>
        </div>
        <div>
          <div className="text-xs text-mono-500 uppercase tracking-wide mb-1">Training Days</div>
          <div className="text-lg font-bold text-mono-900">
            {data.filter(d => d.volume > 0).length} days
          </div>
        </div>
        <div>
          <div className="text-xs text-mono-500 uppercase tracking-wide mb-1">Avg/Day</div>
          <div className="text-lg font-bold text-mono-900">
            {Math.round(
              data.reduce((sum, d) => sum + d.volume, 0) / data.filter(d => d.volume > 0).length
            ).toLocaleString()}kg
          </div>
        </div>
      </div>
    </div>
  );
}
