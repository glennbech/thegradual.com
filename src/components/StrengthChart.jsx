import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

/**
 * Minimal line chart for e1RM progression
 * Follows flat 2D design system - no gradients or 3D effects
 */
export default function StrengthChart({ data, color = '#6366F1', height = 200 }) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    const values = data.map(d => d.e1rm);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue;
    const padding = range * 0.1; // 10% padding

    const yMin = minValue - padding;
    const yMax = maxValue + padding;
    const yRange = yMax - yMin;

    return {
      points: data.map((d, i) => ({
        x: (i / (data.length - 1)) * 100,
        y: 100 - ((d.e1rm - yMin) / yRange) * 100,
        value: d.e1rm,
        date: d.date
      })),
      yMin,
      yMax,
      minValue,
      maxValue
    };
  }, [data]);

  if (!chartData || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-mono-500 text-sm"
        style={{ height }}
      >
        No progression data available
      </div>
    );
  }

  // Generate SVG path from points
  const linePath = chartData.points
    .map((point, i) => `${i === 0 ? 'M' : 'L'} ${point.x},${point.y}`)
    .join(' ');

  return (
    <div className="relative" style={{ height }}>
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-mono-500 pr-2">
        <div className="text-right">{Math.round(chartData.yMax)}kg</div>
        <div className="text-right">{Math.round((chartData.yMax + chartData.yMin) / 2)}kg</div>
        <div className="text-right">{Math.round(chartData.yMin)}kg</div>
      </div>

      {/* Chart area */}
      <div className="ml-12 h-full relative bg-mono-800 rounded border border-mono-700">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          {/* Grid lines */}
          <line x1="0" y1="0" x2="100" y2="0" stroke="#374151" strokeWidth="0.5" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="#374151" strokeWidth="0.5" strokeDasharray="2,2" />
          <line x1="0" y1="100" x2="100" y2="100" stroke="#374151" strokeWidth="0.5" />

          {/* Line */}
          <motion.path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            vectorEffect="non-scaling-stroke"
          />

          {/* Data points */}
          {chartData.points.map((point, i) => (
            <motion.circle
              key={i}
              cx={point.x}
              cy={point.y}
              r="1.5"
              fill={color}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5 + i * 0.05, duration: 0.3 }}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        {/* Hover tooltip area */}
        <div className="absolute inset-0 flex">
          {chartData.points.map((point, i) => (
            <div
              key={i}
              className="flex-1 group relative"
              style={{ flex: `0 0 ${100 / chartData.points.length}%` }}
            >
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block">
                <div className="bg-mono-900 border border-mono-700 rounded px-2 py-1 text-xs whitespace-nowrap">
                  <div className="font-semibold" style={{ color }}>{point.value}kg</div>
                  <div className="text-mono-500">{new Date(point.date).toLocaleDateString()}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats below chart */}
      <div className="mt-2 flex justify-between text-xs text-mono-500">
        <div>
          <span className="text-mono-400">First: </span>
          <span className="font-semibold">{chartData.minValue}kg</span>
        </div>
        <div>
          <span className="text-mono-400">Latest: </span>
          <span className="font-semibold">{chartData.maxValue}kg</span>
        </div>
        <div>
          <span className="text-mono-400">Gain: </span>
          <span className="font-semibold text-emerald-500">
            +{Math.round((chartData.maxValue - chartData.minValue) * 10) / 10}kg
          </span>
        </div>
      </div>
    </div>
  );
}
