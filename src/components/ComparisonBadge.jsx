import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Award, Minus } from 'lucide-react';
import { colors } from '../utils/design-system';

/**
 * ComparisonBadge - Shows improvement/decline compared to previous session
 *
 * Types:
 * - volume: Total volume difference
 * - weight: Max weight difference
 * - reps: Total reps difference
 * - pr: New personal record
 */
const ComparisonBadge = ({
  type = 'volume',
  diff,
  unit = 'kg',
  showIcon = true,
  className = '',
}) => {
  // Don't render if no difference
  if (diff === undefined || diff === null || diff === 0) {
    return null;
  }

  const isPositive = diff > 0;
  const isNegative = diff < 0;
  const isPR = type === 'pr';

  // Determine color
  const getColor = () => {
    if (isPR) return colors.status.success;
    if (isPositive) return colors.status.success;
    if (isNegative) return colors.status.warning;
    return colors.text.secondary;
  };

  // Determine icon
  const getIcon = () => {
    if (isPR) return <Award className="w-3.5 h-3.5" />;
    if (isPositive) return <TrendingUp className="w-3.5 h-3.5" />;
    if (isNegative) return <TrendingDown className="w-3.5 h-3.5" />;
    return <Minus className="w-3.5 h-3.5" />;
  };

  // Format the difference text
  const getDiffText = () => {
    if (isPR) return 'New PR!';

    const absDiff = Math.abs(diff);
    const sign = isPositive ? '+' : '-';

    switch (type) {
      case 'volume':
        return `${sign}${absDiff}${unit}`;
      case 'weight':
        return `${sign}${absDiff}${unit}`;
      case 'reps':
        return `${sign}${absDiff} rep${absDiff !== 1 ? 's' : ''}`;
      case 'percent':
        return `${sign}${absDiff}%`;
      default:
        return `${sign}${absDiff}`;
    }
  };

  const color = getColor();
  const icon = getIcon();
  const text = getDiffText();

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', damping: 15, stiffness: 300 }}
      className={`inline-flex items-center gap-1.5 px-2 py-1 border ${className}`}
      style={{
        borderColor: color,
        backgroundColor: 'white',
        color: color,
      }}
    >
      {showIcon && icon}
      <span className="text-xs font-bold uppercase tracking-wide">
        {text}
      </span>
    </motion.div>
  );
};

/**
 * ComparisonRow - Full row showing multiple comparison metrics
 */
export const ComparisonRow = ({
  volumeDiff,
  weightDiff,
  repsDiff,
  isPR = false,
  className = '',
}) => {
  const hasComparison = volumeDiff || weightDiff || repsDiff || isPR;

  if (!hasComparison) return null;

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      {isPR && (
        <ComparisonBadge type="pr" diff={1} />
      )}

      {volumeDiff && (
        <ComparisonBadge type="volume" diff={volumeDiff} unit="kg" />
      )}

      {weightDiff && (
        <ComparisonBadge type="weight" diff={weightDiff} unit="kg" />
      )}

      {repsDiff && (
        <ComparisonBadge type="reps" diff={repsDiff} />
      )}
    </div>
  );
};

/**
 * ComparisonText - Inline text version without badge styling
 */
export const ComparisonText = ({
  type = 'volume',
  diff,
  unit = 'kg',
  className = '',
}) => {
  if (diff === undefined || diff === null || diff === 0) {
    return null;
  }

  const isPositive = diff > 0;
  const absDiff = Math.abs(diff);
  const sign = isPositive ? '+' : '';

  const getColor = () => {
    if (isPositive) return 'text-emerald-600';
    return 'text-orange-600';
  };

  const getText = () => {
    switch (type) {
      case 'volume':
        return `${sign}${absDiff}${unit}`;
      case 'weight':
        return `${sign}${absDiff}${unit}`;
      case 'reps':
        return `${sign}${absDiff}`;
      case 'percent':
        return `${sign}${absDiff}%`;
      default:
        return `${sign}${absDiff}`;
    }
  };

  return (
    <span className={`font-semibold tabular-nums ${getColor()} ${className}`}>
      {getText()}
    </span>
  );
};

export default ComparisonBadge;
