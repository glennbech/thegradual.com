import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Dumbbell } from 'lucide-react'
import { slideUp, modalBackdrop } from '../utils/animations'

export default function AddExerciseModal({ isOpen, onClose, onAdd }) {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    muscleGroup: 'chest',
  })

  const categories = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio']
  const muscleGroups = [
    { value: 'chest', label: 'Chest', color: 'hot-pink' },
    { value: 'back', label: 'Back', color: 'cyan' },
    { value: 'legs', label: 'Legs', color: 'purple' },
    { value: 'shoulders', label: 'Shoulders', color: 'orange' },
    { value: 'arms', label: 'Arms', color: 'pink' },
  ]

  const handleSubmit = (e) => {
    e.preventDefault()
    if (formData.name && formData.category) {
      onAdd(formData)
      setFormData({ name: '', category: '', muscleGroup: 'chest' })
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            {...modalBackdrop}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            {...slideUp}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-3xl">
              <div className="flex items-center gap-3">
                <motion.div
                  className="bg-flame-500 rounded-xl p-2"
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  <Dumbbell className="w-6 h-6 text-white" />
                </motion.div>
                <h2 className="text-2xl font-bold text-gray-900">Add Exercise</h2>
              </div>

              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 p-2"
              >
                <X className="w-6 h-6" />
              </motion.button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Exercise Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Exercise Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Barbell Bench Press"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-flame-500 focus:outline-none transition-colors"
                  required
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-flame-500 focus:outline-none transition-colors"
                  required
                >
                  <option value="">Select category...</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Muscle Group */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Muscle Group
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {muscleGroups.map((group) => (
                    <motion.button
                      key={group.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, muscleGroup: group.value })}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        formData.muscleGroup === group.value
                          ? 'border-flame-500 bg-flame-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="font-semibold text-gray-900">{group.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-flame-500 text-white py-4 rounded-xl font-bold text-lg hover:bg-flame-600 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-6 h-6" />
                Add Exercise
              </motion.button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
