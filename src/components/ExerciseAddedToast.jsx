import { useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Check, ArrowRight } from 'lucide-react';
import { getMuscleColor } from '../utils/design-system';

export default function ExerciseAddedToast({
  isOpen,
  onClose,
  exerciseName,
  exerciseCategory,
  onViewWorkout
}) {
  const x = useMotionValue(0);
  const opacity = useTransform(x, [0, 150], [1, 0]);

  useEffect(() => {
    if (!isOpen) return;

    // Auto-dismiss after 4 seconds (2025 best practice)
    const timer = setTimeout(() => {
      onClose();
    }, 4000);

    return () => clearTimeout(timer);
  }, [isOpen, onClose]);

  const handleDragEnd = (event, info) => {
    // Swipe right 150px to dismiss
    if (info.offset.x > 150) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          drag="x"
          dragConstraints={{ left: 0, right: 300 }}
          dragElastic={0.1}
          onDragEnd={handleDragEnd}
          style={{ x, opacity }}
          className="fixed top-20 right-4 z-50 w-80 cursor-grab active:cursor-grabbing"
        >
          <div className="bg-white border-2 border-mono-900 overflow-hidden">
            {/* Muscle color accent */}
            <div
              className="absolute left-0 top-0 bottom-0 w-1"
              style={{ backgroundColor: getMuscleColor(exerciseCategory) }}
            />

            {/* Content */}
            <div className="pl-4 pr-4 py-3 flex items-center gap-3">
              {/* Checkmark */}
              <div className="flex-shrink-0 w-8 h-8 bg-mono-900 flex items-center justify-center">
                <Check className="w-5 h-5 text-white" strokeWidth={3} />
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-mono-900 truncate">
                  {exerciseName}
                </p>
                <p className="text-xs text-mono-500">
                  Added to workout
                </p>
              </div>

              {/* View action */}
              {onViewWorkout && (
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewWorkout();
                    onClose();
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex-shrink-0 flex items-center gap-1 text-xs font-bold text-mono-900 hover:text-mono-700 uppercase tracking-wide"
                >
                  <span>Logger</span>
                  <ArrowRight className="w-3 h-3" strokeWidth={3} />
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
