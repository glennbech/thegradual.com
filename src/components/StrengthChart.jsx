import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

/**
 * Minimal line chart for progression tracking (e1RM, weight, body fat, etc.)
 * Follows flat 2D design system - no gradients or 3D effects
 *
 * @param {Array} data - Array of data points with date and value fields
 * @param {string} valueField - Field name to plot (default: 'e1rm')
 * @param {string} unit - Unit suffix for values (default: 'kg')
 * @param {string} color - Line color (default: '#6366F1')
 * @param {number} height - Chart height in pixels (default: 200)
 * @param {string} label - Label for the metric (default: 'Value')
 */
export default function StrengthChart({
  data,
  valueField = 'e1rm',
  unit = 'kg',
  color = '#6366F1',
  height = 200,
  label = 'Value'
}) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    // Filter out data points that don't have the specified field
    const validData = data.filter(d => d[valueField] != null);
    if (validData.length === 0) return null;

    const values = validData.map(d => d[valueField]);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue;
    const padding = range > 0 ? range * 0.1 : 1; // 10% padding, or 1 if no range

    const yMin = minValue - padding;
    const yMax = maxValue + padding;
    const yRange = yMax - yMin || 1; // Avoid division by zero

    return {
      points: validData.map((d, i) => ({
        x: (i / (validData.length - 1 || 1)) * 100,
        y: 100 - ((d[valueField] - yMin) / yRange) * 100,
        value: d[valueField],
        date: d.date
      })),
      yMin,
      yMax,
      minValue,
      maxValue
    };
  }, [data, valueField]);

  if (!chartData || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-mono-500 text-sm bg-mono-50 rounded border border-mono-200"
        style={{ height }}
      >
        No {label.toLowerCase()} data available
      </div>
    );
  }

  // Generate SVG path from points
  const linePath = chartData.points
    .map((point, i) => `${i === 0 ? 'M' : 'L'} ${point.x},${point.y}`)
    .join(' ');

  // Format value with unit
  const formatValue = (value) => {
    return `${Math.round(value * 10) / 10}${unit}`;
  };

  return (
    <div className="relative" style={{ height }}>
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-mono-500 pr-2">
        <div className="text-right">{formatValue(chartData.yMax)}</div>
        <div className="text-right">{formatValue((chartData.yMax + chartData.yMin) / 2)}</div>
        <div className="text-right">{formatValue(chartData.yMin)}</div>
      </div>

      {/* Chart area */}
      <div className="ml-12 h-full relative bg-white rounded border border-mono-200">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          {/* Grid lines */}
          <line x1="0" y1="0" x2="100" y2="0" stroke="#e5e5e5" strokeWidth="0.5" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="#e5e5e5" strokeWidth="0.5" strokeDasharray="2,2" />
          <line x1="0" y1="100" x2="100" y2="100" stroke="#e5e5e5" strokeWidth="0.5" />

          {/* Line */}
          <motion.path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth="3"
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
              r="2"
              fill="white"
              stroke={color}
              strokeWidth="2"
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
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                <div className="bg-white border-2 rounded px-2 py-1 text-xs whitespace-nowrap shadow-md" style={{ borderColor: color }}>
                  <div className="font-semibold text-mono-900">{formatValue(point.value)}</div>
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
          <span className="font-semibold text-mono-900">{formatValue(chartData.minValue)}</span>
        </div>
        <div>
          <span className="text-mono-400">Latest: </span>
          <span className="font-semibold text-mono-900">{formatValue(chartData.maxValue)}</span>
        </div>
        <div>
          <span className="text-mono-400">Change: </span>
          <span className="font-semibold" style={{ color }}>
            {chartData.maxValue >= chartData.minValue ? '+' : ''}{formatValue(chartData.maxValue - chartData.minValue)}
          </span>
        </div>
      </div>
    </div>
  );
}
