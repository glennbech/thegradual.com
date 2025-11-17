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
      className="card-flat p-4 hover:border-mono-400 transition-colors border-l-8"
      style={{ borderLeftColor: muscleColor }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3 border-b border-mono-100 pb-2">
        <div>
          <h3 className={headingStyles.h4}>{exercise.name}</h3>
          <p
            className={`${headingStyles.label} border-b-4 inline-block pb-0.5`}
            style={{ borderBottomColor: muscleColor }}
          >
            {config.label}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <div className="text-xs text-mono-500 border border-mono-200 px-2 py-0.5">
            {config.code}
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation()
              setShowDetail(true)
            }}
            className="text-mono-500 hover:text-mono-900 p-1 transition-colors"
          >
            <Info className="w-3.5 h-3.5" strokeWidth={2} />
          </motion.button>
        </div>
      </div>

      {/* Category */}
      <div className="mb-3">
        <div className={`${headingStyles.label} mb-1`}>CATEGORY</div>
        <div className={headingStyles.body}>{exercise.category}</div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 border-t border-mono-100 pt-3">
        {onAdd && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onAdd(exercise)}
            className="flex-1 bg-mono-900 hover:bg-mono-800 text-white py-2 px-3 text-xs font-medium
                     flex items-center justify-center gap-2 transition-colors"
          >
            <Plus size={14} strokeWidth={2} />
            ADD
          </motion.button>
        )}

        {showDelete && onDelete && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onDelete(exercise.id)}
            className="flex-1 bg-mono-200 hover:bg-mono-300 text-mono-900 py-2 px-3 text-xs font-medium
                     flex items-center justify-center gap-2 transition-colors"
          >
            <Trash2 size={14} strokeWidth={2} />
            REMOVE
          </motion.button>
        )}
      </div>

      {/* Exercise Detail Modal */}
      <ExerciseDetailModal
        exercise={exercise}
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
      />
    </motion.div>
  )
}
