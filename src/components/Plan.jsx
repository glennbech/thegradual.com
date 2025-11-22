import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ListChecks, Save, ChevronUp, ChevronDown, X, GripVertical } from 'lucide-react'
import { staggerContainer, staggerItem, pageTransition } from '../utils/animations'
import { getMuscleColor } from '../utils/design-system'
import ExerciseCard from './ExerciseCard'
import CreateExerciseCard from './CreateExerciseCard'
import defaultExercises from '../data/exercises.json'
import useWorkoutStore from '../stores/workoutStore'

export default function Plan({ onStartSession, editTemplate, onEditComplete }) {
  const deleteCustomExercise = useWorkoutStore((state) => state.deleteCustomExercise)
  const addCustomTemplate = useWorkoutStore((state) => state.addCustomTemplate)
  const updateCustomTemplate = useWorkoutStore((state) => state.updateCustomTemplate)

  const [exercises, setExercises] = useState([])
  const [selectedExercises, setSelectedExercises] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState('all')
  const [showDeleteExerciseConfirm, setShowDeleteExerciseConfirm] = useState(false)
  const [exerciseToDelete, setExerciseToDelete] = useState(null)
  const [showWorkoutPanel, setShowWorkoutPanel] = useState(false) // Start collapsed
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    difficulty: 'intermediate',
    duration: ''
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false) // Track if we're editing a template

  useEffect(() => {
    loadExercises()
  }, [])

  // Load template for editing when editTemplate prop changes
  useEffect(() => {
    if (editTemplate && exercises.length > 0) {
      // Load exercises from template
      const templateExercises = editTemplate.exerciseIds
        .map(id => exercises.find(ex => ex.id === id))
        .filter(Boolean)

      setSelectedExercises(templateExercises)
      setShowWorkoutPanel(true)
      setIsEditing(true)

      // Pre-populate form with template data
      setTemplateForm({
        name: editTemplate.name || '',
        description: editTemplate.description || '',
        difficulty: editTemplate.difficulty || 'intermediate',
        duration: editTemplate.duration || ''
      })

      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [editTemplate, exercises])

  const loadExercises = async () => {
    const customExercises = useWorkoutStore.getState().getCustomExercises()
    const data = [...defaultExercises, ...customExercises]
    setExercises(data)
  }

  const handleAddExercise = (exercise) => {
    if (!selectedExercises.find(e => e.id === exercise.id)) {
      const newSelectedExercises = [...selectedExercises, exercise]
      setSelectedExercises(newSelectedExercises)

      // Auto-expand panel when adding first exercise
      if (newSelectedExercises.length === 1) {
        setShowWorkoutPanel(true)
      }
    }
  }

  const handleRemoveExercise = (id) => {
    setSelectedExercises(selectedExercises.filter(ex => ex.id !== id))
  }

  const handleRequestDeleteExercise = (exerciseId) => {
    setExerciseToDelete(exerciseId)
    setShowDeleteExerciseConfirm(true)
  }

  const handleConfirmDeleteExercise = async () => {
    if (!exerciseToDelete) return

    try {
      await deleteCustomExercise(exerciseToDelete)
      await loadExercises()
      setShowDeleteExerciseConfirm(false)
      setExerciseToDelete(null)
    } catch (error) {
      console.error('Failed to delete exercise:', error)
      alert('Failed to delete exercise. Please try again.')
    }
  }

  const handleSaveWorkout = () => {
    if (selectedExercises.length > 0) {
      // If not editing, pre-populate form with defaults
      if (!isEditing) {
        setTemplateForm({
          name: '',
          description: `Custom workout with ${selectedExercises.length} exercises`,
          difficulty: 'intermediate',
          duration: `${selectedExercises.length * 10}-${selectedExercises.length * 15} min`
        })
      }
      // If editing, form is already populated from useEffect
      setShowSaveModal(true)
    }
  }

  const handleConfirmSave = async (e) => {
    e.preventDefault()
    if (isSaving || !templateForm.name.trim()) return

    setIsSaving(true)
    try {
      const exerciseIds = selectedExercises.map(ex => ex.id)

      if (isEditing && editTemplate) {
        // Update existing template
        await updateCustomTemplate(editTemplate.id, {
          ...templateForm,
          name: templateForm.name.trim(),
          exerciseIds
        })
      } else {
        // Create new template
        await addCustomTemplate({
          ...templateForm,
          name: templateForm.name.trim(),
          exerciseIds
        })
      }

      // Clear state and close modal
      setShowSaveModal(false)
      setTemplateForm({
        name: '',
        description: '',
        difficulty: 'intermediate',
        duration: ''
      })
      setSelectedExercises([])
      setShowWorkoutPanel(false)
      setIsEditing(false)

      // Call onEditComplete to clear the editTemplate in parent
      if (onEditComplete) {
        onEditComplete()
      }

      // No alert - user can see it saved in the Work Out tab
    } catch (error) {
      console.error('Failed to save workout:', error)
      alert('Failed to save workout. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const filteredExercises = exercises.filter(ex => {
    const matchesSearch = ex.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filter === 'all' || ex.category === filter
    return matchesSearch && matchesFilter
  })

  const categories = ['all', ...new Set(exercises.map(ex => ex.category))]

  return (
    <motion.div
      className="space-y-6 pb-24"
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* Header */}
      <div className="text-center">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-bold text-mono-900 mb-2 uppercase tracking-tight"
        >
          Plan
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-mono-500 text-sm uppercase tracking-wide"
        >
          Browse exercises and build your workout
        </motion.p>
      </div>

      {/* Collapsible Workout Builder Panel */}
      {selectedExercises.length > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-16 left-0 right-0 bg-mono-900 text-white z-30 border-t-2 border-white shadow-2xl"
        >
          {/* Panel Header - Always Visible */}
          <div
            className="p-4 cursor-pointer hover:bg-mono-800 transition-colors"
            onClick={() => setShowWorkoutPanel(!showWorkoutPanel)}
          >
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <ListChecks className="w-5 h-5" strokeWidth={2.5} />
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide">
                      Your Workout
                    </p>
                    <p className="text-xs text-mono-400">
                      {selectedExercises.length} exercise{selectedExercises.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSaveWorkout()
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-white text-mono-900 px-4 py-2 font-bold uppercase tracking-wide hover:bg-mono-100 transition-colors flex items-center gap-2 whitespace-nowrap text-sm"
                  >
                    <Save className="w-4 h-4" strokeWidth={2.5} />
                    Save
                  </motion.button>
                  {showWorkoutPanel ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronUp className="w-5 h-5" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Expandable Exercise List */}
          <AnimatePresence>
            {showWorkoutPanel && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="border-t border-mono-700 overflow-hidden"
              >
                <div className="container mx-auto px-4 py-4 max-h-64 overflow-y-auto">
                  <div className="space-y-2">
                    {selectedExercises.map((ex, index) => (
                      <motion.div
                        key={ex.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-mono-800 p-3 flex items-center justify-between gap-3 hover:bg-mono-700 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <GripVertical className="w-4 h-4 text-mono-500 flex-shrink-0" />
                          <div
                            className="w-1 h-8 flex-shrink-0"
                            style={{ backgroundColor: getMuscleColor(ex.muscleGroup) }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{ex.name}</p>
                            <p className="text-xs text-mono-400 uppercase">{ex.category}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveExercise(ex.id)}
                          className="text-mono-400 hover:text-red-500 transition-colors p-1"
                        >
                          <X className="w-5 h-5" strokeWidth={2.5} />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Exercise Library */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-mono-900 p-2">
            <Search className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-mono-900 uppercase tracking-tight">
              Exercise Library
            </h2>
            <p className="text-xs text-mono-500 uppercase">
              {exercises.length} exercises available
            </p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="space-y-3 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-mono-400" strokeWidth={2} />
            <input
              type="text"
              placeholder="Search exercises..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 border-2 border-mono-900 bg-white text-mono-900 placeholder-mono-400 focus:outline-none focus:ring-2 focus:ring-mono-900 font-medium uppercase text-sm tracking-wide"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {categories.map((cat) => (
              <motion.button
                key={cat}
                onClick={() => setFilter(cat)}
                whileTap={{ scale: 0.95 }}
                className={`px-4 py-2 font-semibold uppercase text-xs tracking-wide whitespace-nowrap transition-all border-2 ${
                  filter === cat
                    ? 'bg-mono-900 text-white border-mono-900'
                    : 'bg-white text-mono-900 border-mono-900 hover:bg-mono-50'
                }`}
              >
                {cat}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Exercise Grid - Seamless Search-to-Create */}
        {exercises.length === 0 ? (
          /* Loading state */
          <div className="text-center py-16 bg-white border-2 border-mono-200">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 border-4 border-mono-900 border-t-transparent rounded-full mx-auto mb-4"
            />
            <p className="text-mono-500 font-semibold">Loading exercises...</p>
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {/* Seamless Search-to-Create: Only show when no matches found AND user is searching */}
            {filteredExercises.length === 0 && searchTerm.length > 0 && (
              <motion.div variants={staggerItem}>
                <CreateExerciseCard
                  searchTerm={searchTerm}
                  onCreateExercise={async (newExercise) => {
                    const addCustomExercise = useWorkoutStore.getState().addCustomExercise
                    await addCustomExercise(newExercise)
                    await loadExercises()
                    setSearchTerm('') // Clear search after creation
                  }}
                />
              </motion.div>
            )}

            {/* Exercise Cards */}
            {filteredExercises.map((exercise) => {
              const isSelected = selectedExercises.some(ex => ex.id === exercise.id)
              const isCustom = !defaultExercises.find(ex => ex.id === exercise.id)

              return (
                <motion.div key={exercise.id} variants={staggerItem}>
                  <ExerciseCard
                    exercise={exercise}
                    onAdd={() => handleAddExercise(exercise)}
                    isAdded={isSelected}
                    isCustom={isCustom}
                    onRequestDelete={() => handleRequestDeleteExercise(exercise.id)}
                  />
                </motion.div>
              )
            })}

            {/* Empty state when no search term */}
            {filteredExercises.length === 0 && searchTerm.length === 0 && (
              <motion.div
                variants={staggerItem}
                className="col-span-full text-center py-16 bg-white border-2 border-mono-200"
              >
                <Search className="w-16 h-16 text-mono-300 mx-auto mb-4" />
                <p className="text-mono-500 font-semibold">Start typing to search exercises</p>
                <p className="text-xs text-mono-400 mt-1">Or use the category filters above</p>
              </motion.div>
            )}
          </motion.div>
        )}
      </div>

      {/* Save Workout Modal - Full Detail Form */}
      {showSaveModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-mono-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => !isSaving && setShowSaveModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white border-2 border-mono-900 max-w-md w-full"
          >
            <div className="bg-mono-900 h-1" />
            <form onSubmit={handleConfirmSave} className="p-6 space-y-4">
              <h3 className="text-2xl font-bold text-mono-900 uppercase tracking-tight">
                {isEditing ? 'Update Workout' : 'Save as Workout'}
              </h3>

              <div>
                <label className="block text-xs font-bold text-mono-900 uppercase tracking-wide mb-2">
                  Workout Name *
                </label>
                <input
                  type="text"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && templateForm.name.trim()) {
                      e.preventDefault()
                      handleConfirmSave(e)
                    }
                  }}
                  className="w-full px-4 py-3 border border-mono-200 bg-white text-mono-900 placeholder-mono-400 focus:border-mono-900 focus:outline-none transition-colors"
                  placeholder="My Awesome Workout"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-mono-900 uppercase tracking-wide mb-2">
                  Description
                </label>
                <textarea
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                  className="w-full px-4 py-3 border border-mono-200 bg-white text-mono-900 placeholder-mono-400 focus:border-mono-900 focus:outline-none transition-colors resize-none"
                  placeholder="Describe this workout..."
                  rows="3"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-mono-900 uppercase tracking-wide mb-2">
                    Difficulty
                  </label>
                  <select
                    value={templateForm.difficulty}
                    onChange={(e) => setTemplateForm({ ...templateForm, difficulty: e.target.value })}
                    className="w-full px-4 py-3 border border-mono-200 bg-white text-mono-900 focus:border-mono-900 focus:outline-none transition-colors"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-mono-900 uppercase tracking-wide mb-2">
                    Duration
                  </label>
                  <input
                    type="text"
                    value={templateForm.duration}
                    onChange={(e) => setTemplateForm({ ...templateForm, duration: e.target.value })}
                    className="w-full px-4 py-3 border border-mono-200 bg-white text-mono-900 placeholder-mono-400 focus:border-mono-900 focus:outline-none transition-colors"
                    placeholder="45-60 min"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowSaveModal(false)}
                  className="flex-1 bg-mono-200 hover:bg-mono-300 text-mono-900 py-3 font-medium transition-colors uppercase tracking-wide"
                >
                  Cancel
                </motion.button>
                <motion.button
                  type="submit"
                  whileHover={{ scale: isSaving ? 1 : 1.02 }}
                  whileTap={{ scale: isSaving ? 1 : 0.98 }}
                  disabled={isSaving}
                  className={`flex-1 py-3 font-medium transition-colors uppercase tracking-wide ${
                    isSaving
                      ? 'bg-mono-700 cursor-not-allowed'
                      : 'bg-mono-900 hover:bg-mono-800'
                  } text-white`}
                >
                  {isSaving ? (isEditing ? 'Updating...' : 'Saving...') : (isEditing ? 'Update' : 'Save')}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      {/* Delete Exercise Confirmation Modal */}
      {showDeleteExerciseConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowDeleteExerciseConfirm(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white border-4 border-mono-900 p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-mono-900 mb-2 uppercase tracking-tight">
              Delete Exercise?
            </h3>
            <p className="text-mono-600 mb-6">
              This will permanently delete this custom exercise. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteExerciseConfirm(false)}
                className="flex-1 px-4 py-2 bg-white border-2 border-mono-900 text-mono-900 font-semibold uppercase tracking-wide hover:bg-mono-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteExercise}
                className="flex-1 px-4 py-2 bg-red-600 text-white font-semibold uppercase tracking-wide hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  )
}
