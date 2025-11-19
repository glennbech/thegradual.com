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

    // Group by week
    const weeks = [];
    let currentWeek = [];
    let currentWeekNumber = data[0].weekNumber;

    data.forEach(day => {
      if (day.weekNumber !== currentWeekNumber) {
        weeks.push(currentWeek);
        currentWeek = [];
        currentWeekNumber = day.weekNumber;
      }
      currentWeek.push(day);
    });

    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    return {
      weeks,
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
    if (volume === 0) return 'bg-mono-800';

    const intensity = volume / heatmapData.maxVolume;

    if (intensity >= 0.8) return 'bg-emerald-500';
    if (intensity >= 0.6) return 'bg-emerald-600';
    if (intensity >= 0.4) return 'bg-emerald-700';
    if (intensity >= 0.2) return 'bg-emerald-800';
    return 'bg-emerald-900';
  };

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex items-center justify-between text-xs text-mono-500">
        <div>Last {data.length} days</div>
        <div className="flex items-center gap-2">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 bg-mono-800 rounded"></div>
            <div className="w-3 h-3 bg-emerald-900 rounded"></div>
            <div className="w-3 h-3 bg-emerald-700 rounded"></div>
            <div className="w-3 h-3 bg-emerald-600 rounded"></div>
            <div className="w-3 h-3 bg-emerald-500 rounded"></div>
          </div>
          <span>More</span>
        </div>
      </div>

      {/* Heatmap grid */}
      <div className="overflow-x-auto">
        <div className="inline-flex gap-1">
          {/* Day labels column */}
          <div className="flex flex-col gap-1 pr-2">
            <div className="h-3"></div> {/* Spacer for alignment */}
            {dayLabels.map((day, i) => (
              <div
                key={i}
                className="h-3 flex items-center justify-end text-xs text-mono-500"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Weeks */}
          {heatmapData.weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-1">
              {/* Week number or month label */}
              <div className="h-3 text-xs text-mono-500 text-center">
                {weekIndex % 4 === 0 && week[0] ? (
                  new Date(week[0].date).toLocaleDateString('en-US', { month: 'short' })
                ) : ''}
              </div>

              {/* Days in week */}
              {[0, 1, 2, 3, 4, 5, 6].map(dayOfWeek => {
                const day = week.find(d => d.dayOfWeek === dayOfWeek);

                if (!day) {
                  return <div key={dayOfWeek} className="w-3 h-3"></div>;
                }

                return (
                  <motion.div
                    key={dayOfWeek}
                    className={`w-3 h-3 rounded ${getColor(day.volume)} group relative cursor-pointer`}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: weekIndex * 0.02 + dayOfWeek * 0.01 }}
                    whileHover={{ scale: 1.5, zIndex: 10 }}
                  >
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-20">
                      <div className="bg-mono-900 border border-mono-700 rounded px-2 py-1 text-xs whitespace-nowrap">
                        <div className="font-semibold text-emerald-500">
                          {day.volume > 0 ? `${day.volume.toLocaleString()}kg` : 'Rest day'}
                        </div>
                        <div className="text-mono-500">
                          {new Date(day.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-mono-700">
        <div>
          <div className="text-xs text-mono-500 uppercase tracking-wide mb-1">Total Volume</div>
          <div className="text-lg font-bold text-mono-100">
            {data.reduce((sum, d) => sum + d.volume, 0).toLocaleString()}kg
          </div>
        </div>
        <div>
          <div className="text-xs text-mono-500 uppercase tracking-wide mb-1">Training Days</div>
          <div className="text-lg font-bold text-mono-100">
            {data.filter(d => d.volume > 0).length} days
          </div>
        </div>
        <div>
          <div className="text-xs text-mono-500 uppercase tracking-wide mb-1">Avg/Day</div>
          <div className="text-lg font-bold text-mono-100">
            {Math.round(
              data.reduce((sum, d) => sum + d.volume, 0) / data.filter(d => d.volume > 0).length
            ).toLocaleString()}kg
          </div>
        </div>
      </div>
    </div>
  );
}
