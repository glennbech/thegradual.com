import { useState } from 'react'
import { motion } from 'framer-motion'
import { Dumbbell, Trash2, Plus, Info } from 'lucide-react'
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

export default function ExerciseCard({ exercise, onAdd, onDelete, showDelete = false }: ExerciseCardProps) {
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
        className="card-flat p-4 hover:border-mono-400 transition-colors border-l-8 cursor-pointer relative min-h-[120px]"
        style={{ borderLeftColor: muscleColor }}
      >
        {/* Info button in top-right corner - at title level */}
        <div className="absolute top-4 right-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation()
              setShowDetail(true)
            }}
            className="p-3 bg-mono-100 hover:bg-mono-900 text-mono-700 hover:text-white
                       transition-colors border-2 border-mono-900"
            title="View exercise details"
          >
            <Info size={20} strokeWidth={2.5} />
          </motion.button>
        </div>

        {/* Header with exercise name */}
        <div className="mb-3 pr-14">
          <h3 className={`${headingStyles.h4} mb-2`}>{exercise.name}</h3>
          {/* Full-width horizontal color bar */}
          <div
            className="w-full h-1"
            style={{ backgroundColor: muscleColor }}
          />
        </div>

        {/* Category label */}
        <div className="mb-3">
          <p className={`${headingStyles.label} text-mono-600`}>
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
