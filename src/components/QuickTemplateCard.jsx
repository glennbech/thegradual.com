import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import { getTimeAgo } from '../utils/design-system';
import { headingStyles } from '../utils/typography';

/**
 * QuickTemplateCard - Matches Personal Workout card style
 *
 * Features:
 * - Same compact layout as Personal Workout cards
 * - Shows last performed date
 * - Click to start workout
 */
const QuickTemplateCard = ({
  template,
  exercises = [],
  lastPerformed = null,
  onStart,
  className = '',
}) => {
  return (
    <motion.div
      variants={{
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 }
      }}
      className={`card-flat p-4 hover:border-mono-400 transition-colors cursor-pointer ${className}`}
      onClick={onStart}
    >
      <div className="flex items-start justify-between mb-3 border-b border-mono-100 pb-2">
        <div className="flex-1">
          <h4 className={headingStyles.h4}>
            {template.name}
          </h4>
          {lastPerformed && (
            <div className="flex items-center gap-1 mt-1">
              <Calendar className="w-3 h-3 text-mono-400" />
              <span className={headingStyles.label}>
                {getTimeAgo(lastPerformed)}
              </span>
            </div>
          )}
        </div>
        <div className="text-xs text-mono-500 border border-mono-200 px-2 py-0.5 uppercase">
          {template.difficulty?.[0] || 'I'}
        </div>
      </div>

      <p className={`${headingStyles.bodySecondary} mb-3 line-clamp-2`}>
        {template.description}
      </p>

      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className={headingStyles.label}>Duration</span>
          <span className="font-medium text-mono-900">{template.duration}</span>
        </div>
        <div className="flex justify-between">
          <span className={headingStyles.label}>Frequency</span>
          <span className="font-medium text-mono-900">{template.frequency}</span>
        </div>
        <div className="flex justify-between">
          <span className={headingStyles.label}>Exercises</span>
          <span className="font-medium text-mono-900">{exercises.length}</span>
        </div>
      </div>
    </motion.div>
  );
};

export default QuickTemplateCard;
