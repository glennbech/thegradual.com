import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Sparkles, ChevronDown } from 'lucide-react'
import { getMuscleColor } from '../utils/design-system'
import { headingStyles } from '../utils/typography'

export default function CreateExerciseCard({ searchTerm, onCreateExercise }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [category, setCategory] = useState('chest')
  const [muscleGroup, setMuscleGroup] = useState('chest')

  const categories = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core']
  const muscleGroups = [
    { value: 'chest', label: 'Chest' },
    { value: 'back', label: 'Back' },
    { value: 'legs', label: 'Legs' },
    { value: 'shoulders', label: 'Shoulders' },
    { value: 'arms', label: 'Arms' },
    { value: 'core', label: 'Core' },
  ]

  const handleCreate = async () => {
    if (!searchTerm.trim() || isCreating) return

    setIsCreating(true)
    try {
      const newExercise = {
        name: searchTerm.trim(),
        category,
        muscleGroup,
        isCustom: true,
      }
      await onCreateExercise(newExercise)
      // Reset state
      setIsExpanded(false)
      setCategory('chest')
      setMuscleGroup('chest')
    } catch (error) {
      console.error('Failed to create exercise:', error)
      alert('Failed to create exercise. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  const muscleColor = getMuscleColor(category.toLowerCase())

  return (
    <motion.div
      layout
      className="border-2 border-dashed border-mono-300 bg-mono-50 overflow-hidden"
      style={{
        borderLeftWidth: '8px',
        borderLeftColor: isExpanded ? muscleColor : '#D1D5DB'
      }}
    >
      <motion.div
        layout="position"
        className="p-4"
      >
        {/* Header - Always visible */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 mb-2"
            >
              <Sparkles className="w-5 h-5 text-mono-400" strokeWidth={2} />
              <p className="text-sm text-mono-600 font-medium">
                No results for <span className="font-bold text-mono-900">"{searchTerm}"</span>
              </p>
            </motion.div>

            <motion.h3
              layout="position"
              className={`${headingStyles.h3} text-mono-900`}
            >
              {searchTerm}
            </motion.h3>
          </div>

          {!isExpanded && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsExpanded(true)}
              className="bg-mono-900 text-white px-4 py-2 text-sm font-medium hover:bg-mono-800 transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              Create Exercise
            </motion.button>
          )}
        </div>

        {/* Color bar */}
        <motion.div
          layout="position"
          className="w-full h-1 mb-4"
          style={{ backgroundColor: muscleColor }}
          animate={{ backgroundColor: muscleColor }}
          transition={{ duration: 0.3 }}
        />

        {/* Expanded form */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="space-y-4"
            >
              {/* Category Selection */}
              <div>
                <label className={`block ${headingStyles.label} mb-2`}>
                  Category *
                </label>
                <div className="relative">
                  <select
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value)
                      setMuscleGroup(e.target.value.toLowerCase())
                    }}
                    className="w-full px-4 py-3 pr-10 border border-mono-200 bg-white text-mono-900 focus:border-mono-900 focus:outline-none transition-colors appearance-none"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-mono-400 pointer-events-none" />
                </div>
              </div>

              {/* Muscle Group Grid */}
              <div>
                <label className={`block ${headingStyles.label} mb-3`}>
                  Muscle Group *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {muscleGroups.map((group) => {
                    const groupColor = getMuscleColor(group.value)
                    const isSelected = muscleGroup === group.value
                    return (
                      <motion.button
                        key={group.value}
                        type="button"
                        onClick={() => setMuscleGroup(group.value)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`p-3 border-2 border-l-4 transition-all text-sm font-medium ${
                          isSelected
                            ? 'bg-mono-900 text-white border-mono-900'
                            : 'bg-white text-mono-700 border-mono-200 hover:border-mono-400'
                        }`}
                        style={{
                          borderLeftColor: groupColor
                        }}
                      >
                        {group.label}
                      </motion.button>
                    )
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCreate}
                  disabled={isCreating}
                  className="flex-1 bg-mono-900 text-white py-3 font-bold text-sm hover:bg-mono-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <Sparkles className="w-4 h-4" />
                      </motion.div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" strokeWidth={2.5} />
                      Create & Add to Library
                    </>
                  )}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsExpanded(false)}
                  disabled={isCreating}
                  className="px-6 py-3 border border-mono-300 text-mono-700 font-medium text-sm hover:bg-mono-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
