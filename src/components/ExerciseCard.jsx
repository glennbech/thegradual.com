import { useState } from 'react'
import { motion } from 'framer-motion'
import { Dumbbell, Trash2, Plus, Info } from 'lucide-react'
import { cardHover } from '../utils/animations'
import { getMuscleColor } from '../utils/design-system'
import { headingStyles } from '../utils/typography'
import ExerciseDetailModal from './ExerciseDetailModal'

export default function ExerciseCard({ exercise, onAdd, onDelete, showDelete = false }) {
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={() => setShowDetail(true)}
      className="card-flat p-2.5 hover:border-mono-400 transition-colors border-l-8 cursor-pointer relative"
      style={{ borderLeftColor: muscleColor }}
    >
      {/* Header with exercise name */}
      <div className="mb-2">
        <h3 className={`${headingStyles.h4} mb-1`}>{exercise.name}</h3>
        {/* Full-width horizontal color bar */}
        <div
          className="w-full h-1"
          style={{ backgroundColor: muscleColor }}
        />
      </div>

      {/* Category label */}
      <div className="mb-2">
        <p className={`${headingStyles.label} text-mono-600`}>
          {config.label}
        </p>
      </div>

      {/* Action buttons in top-right corner */}
      <div className="absolute top-2 right-2 flex gap-1">
        {/* Add button - small and subtle */}
        {onAdd && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation()
              onAdd(exercise)
            }}
            className="p-1.5 bg-mono-100 hover:bg-mono-200 text-mono-700 hover:text-mono-900
                       transition-colors rounded text-xs"
            title="Add to workout"
          >
            <Plus size={14} strokeWidth={2} />
          </motion.button>
        )}

        {/* Delete button - only shown when showDelete is true */}
        {showDelete && onDelete && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation()
              onDelete(exercise.id)
            }}
            className="p-1.5 bg-mono-200 hover:bg-mono-300 text-mono-900
                       transition-colors rounded"
            title="Remove from workout"
          >
            <Trash2 size={14} strokeWidth={2} />
          </motion.button>
        )}
      </div>

      {/* Exercise Detail Modal */}
      <ExerciseDetailModal
        exercise={exercise}
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        onAdd={onAdd}
      />
    </motion.div>
  )
}
