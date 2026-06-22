import { useState, memo } from 'react'
import { motion } from 'framer-motion'
import { Dumbbell, Trash2, Plus, Info, ChevronRight } from 'lucide-react'
import { cardHover } from '../utils/animations'
import { getMuscleColor } from '../utils/design-system'
import { headingStyles } from '../utils/typography'
import ExerciseDetailModal from './ExerciseDetailModal'
import type { Exercise } from '../types/exercise'

interface ExerciseCardProps {
  exercise: Exercise;
  onAdd?: (exercise: Exercise) => void;
  onDelete?: (exercise: Exercise) => void;
  showDelete?: boolean;
}

// Memoize to prevent unnecessary re-renders when parent updates
function ExerciseCard({ exercise, onAdd, onDelete, showDelete = false }: ExerciseCardProps) {
  const [showDetail, setShowDetail] = useState(false)
  const muscleGroupConfig = {
    chest: {
      label: 'CHEST',
      code: 'CHT'
    },
    back: {
      label: 'BACK',
      code: 'BCK'
    },
    legs: {
      label: 'LEGS',
      code: 'LEG'
    },
    shoulders: {
      label: 'SHOULDERS',
      code: 'SHD'
    },
    arms: {
      label: 'ARMS',
      code: 'ARM'
    },
    core: {
      label: 'CORE',
      code: 'COR'
    },
  }

  const config = muscleGroupConfig[exercise.muscleGroup] || {
    label: exercise.muscleGroup?.toUpperCase() || 'OTHER',
    code: 'OTH'
  }

  const muscleColor = getMuscleColor(exercise.category)

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={() => onAdd && onAdd(exercise)}
        className="card-flat p-4 hover:border-mono-900 hover:shadow-lg transition-all border-l-8 cursor-pointer relative min-h-[120px] group"
        style={{ borderLeftColor: muscleColor }}
      >
        {/* Info button in top-right corner */}
        <div className="absolute top-4 right-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation()
              setShowDetail(true)
            }}
            className="p-2 bg-mono-100 hover:bg-mono-900 text-mono-700 hover:text-white
                       transition-colors border-2 border-mono-900"
            title="View exercise details"
          >
            <Info size={16} strokeWidth={2.5} />
          </motion.button>
        </div>

        {/* Header with exercise name - clickable with arrow indicator */}
        <div className="mb-3 pr-14">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className={`${headingStyles.h4} flex-1`}>{exercise.name}</h3>
            <ChevronRight
              className="w-5 h-5 text-mono-400 group-hover:text-mono-900 group-hover:translate-x-1 transition-all flex-shrink-0"
              strokeWidth={2.5}
            />
          </div>
          {/* Full-width horizontal color bar */}
          <div
            className="w-full h-1"
            style={{ backgroundColor: muscleColor }}
          />
        </div>

        {/* Category label - smaller, less prominent */}
        <div className="mb-3">
          <p className="text-xs uppercase tracking-wide text-mono-500 font-medium">
            {config.label}
          </p>
        </div>
      </motion.div>

      {/* Exercise Detail Modal */}
      <ExerciseDetailModal
        exercise={exercise}
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        onAdd={onAdd}
      />
    </>
  )
}

// Export memoized version with custom comparison
export default memo(ExerciseCard, (prevProps, nextProps) => {
  // Only re-render if these props actually change
  return (
    prevProps.exercise.id === nextProps.exercise.id &&
    prevProps.showDelete === nextProps.showDelete &&
    prevProps.onAdd === nextProps.onAdd &&
    prevProps.onDelete === nextProps.onDelete
  )
})
