import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Play, X, Clock, Target, Sparkles, Trash2, ChevronDown, ChevronUp, Dumbbell, Edit2 } from 'lucide-react'
import { staggerContainer, staggerItem } from '../utils/animations'
import { headingStyles, iconSizes } from '../utils/typography'
import { getMuscleColor } from '../utils/design-system'
import defaultExercises from '../data/exercises.json'
import workoutTemplates from '../data/workoutTemplates.json'
import useWorkoutStore from '../stores/workoutStore'

export default function SessionPlanner({ onStartSession, onEditTemplate }) {
  // Zustand store
  const customTemplatesFromStore = useWorkoutStore((state) => state.getCustomTemplates())
  const deleteCustomTemplate = useWorkoutStore((state) => state.deleteCustomTemplate)

  const [exercises, setExercises] = useState([])
  const [showTemplates, setShowTemplates] = useState(true)
  const [showWorkouts, setShowWorkouts] = useState(true) // Workouts section (custom + built-in)
  const [showAllTemplates, setShowAllTemplates] = useState(false) // Show only 3 templates initially
  const [showWorkoutPreview, setShowWorkoutPreview] = useState(false)
  const [previewTemplate, setPreviewTemplate] = useState(null)
  const [templateToDelete, setTemplateToDelete] = useState(null) // For delete confirmation

  // Use Zustand store data directly (no local state needed)
  const customTemplates = customTemplatesFromStore

  useEffect(() => {
    loadExercises()
  }, [])

  const loadExercises = async () => {
    // Load from Zustand store
    const customExercises = useWorkoutStore.getState().getCustomExercises()
    const data = [...defaultExercises, ...customExercises]
    setExercises(data)
  }

  const handleDeleteTemplate = (template, e) => {
    e.stopPropagation()
    // Show confirmation dialog
    setTemplateToDelete(template)
  }

  const confirmDeleteTemplate = async () => {
    if (!templateToDelete) return

    const templateId = templateToDelete.id
    setTemplateToDelete(null) // Close modal

    // Delete using Zustand (automatically persists to API)
    try {
      await deleteCustomTemplate(templateId)
    } catch (error) {
      console.error('Failed to delete template:', error)
      alert('Failed to delete template. Please try again.')
    }
  }


  const handleShowWorkoutPreview = (template) => {
    setPreviewTemplate(template)
    setShowWorkoutPreview(true)
  }

  const handleStartWorkoutFromPreview = () => {
    if (!previewTemplate) return

    // Get exercises from template
    const templateExercises = previewTemplate.exerciseIds
      .map(id => exercises.find(ex => ex.id === id))
      .filter(Boolean)

    if (templateExercises.length > 0) {
      const templateReference = {
        templateId: previewTemplate.id,
        templateName: previewTemplate.name,
        templateType: previewTemplate.isCustom ? 'custom' : 'built-in',
        templateVersion: previewTemplate.version || 1,
        isModified: false
      }

      setShowWorkoutPreview(false)
      setPreviewTemplate(null)
      onStartSession(templateExercises, templateReference)
    }
  }

  // Hero images - rotated randomly
  const HERO_IMAGES = [
    'https://dixcgxyyjlm7x.cloudfront.net/media/images/hero-1-asian-woman.jpg',
    'https://dixcgxyyjlm7x.cloudfront.net/media/images/hero-2-black-man.jpg',
    'https://dixcgxyyjlm7x.cloudfront.net/media/images/hero-3-latina-woman.jpg',
    'https://dixcgxyyjlm7x.cloudfront.net/media/images/hero-4-white-man.jpg',
    'https://dixcgxyyjlm7x.cloudfront.net/media/images/hero-5-group-training.jpg',
    'https://dixcgxyyjlm7x.cloudfront.net/media/images/hero-6-gym-buddies.jpg'
  ]

  const [heroImage] = useState(() =>
    HERO_IMAGES[Math.floor(Math.random() * HERO_IMAGES.length)]
  )

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative bg-gradient-to-br from-mono-900 to-mono-800 rounded overflow-hidden h-56 md:h-72 shadow-xl"
      >
        {/* Hero Image Background */}
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Athlete ready to train"
            className="w-full h-full object-cover opacity-30"
          />
        </div>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-mono-900/40 via-mono-900/10 to-transparent" />

        {/* Content */}
        <div className="relative z-10 flex items-center justify-center h-full p-6 md:p-8">
          <div className="text-center text-white space-y-2">
            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight"
            >
              Ready to train?
            </motion.h1>
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-base md:text-lg text-mono-200"
            >
              Plan your workout and track your progress
            </motion.p>
          </div>
        </div>
      </motion.div>

      {/* Workout Templates */}
      <AnimatePresence>
        {showTemplates && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            {/* Workouts Section (Custom + Built-in) */}
            <div className="space-y-3">
              <button
                onClick={() => setShowWorkouts(!showWorkouts)}
                className="w-full flex items-center justify-between group hover:opacity-80 transition-opacity"
              >
                <div className="flex items-center gap-2">
                  <h2 className={headingStyles.h2}>
                    <Sparkles className={`${iconSizes.h2} inline`} strokeWidth={2} />
                    {' '}Workouts
                  </h2>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-mono-900 transition-transform ${showWorkouts ? 'rotate-180' : ''}`}
                  strokeWidth={2}
                />
              </button>

              <AnimatePresence>
                {showWorkouts && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <motion.div
                      variants={staggerContainer}
                      initial="initial"
                      animate="animate"
                      className="space-y-3"
                    >
                      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {/* Custom templates first */}
                        <AnimatePresence mode="popLayout">
                          {customTemplates.map((template) => {
                            const templateExercises = exercises.filter(ex => template.exerciseIds.includes(ex.id))
                            const muscleGroups = [...new Set(templateExercises.map(ex => ex.category))].filter(Boolean)

                            return (
                              <motion.div
                                key={template.id}
                                variants={staggerItem}
                                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                                layout
                                className="card-flat p-6 hover:border-mono-400 transition-colors relative cursor-pointer min-h-[220px] flex flex-col"
                                onClick={() => handleShowWorkoutPreview(template)}
                              >
                                <div className="bg-mono-900 px-4 py-3 -m-6 mb-4">
                                  <h4 className="text-white font-bold text-lg uppercase tracking-tight">
                                    {template.name}
                                  </h4>
                                </div>

                                <p className="text-sm text-mono-600 mb-4 line-clamp-2 px-1">
                                  {template.description}
                                </p>

                                {muscleGroups.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mb-4 px-1">
                                    {muscleGroups.map(group => (
                                      <span
                                        key={group}
                                        className="px-2 py-1 text-xs font-bold uppercase tracking-wide border-2 border-mono-900 text-mono-900"
                                        style={{ borderColor: getMuscleColor(group), color: getMuscleColor(group) }}
                                      >
                                        {group}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                <div className="flex items-center justify-between border-t-2 border-mono-200 pt-3 mt-auto">
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-mono-600" strokeWidth={2} />
                                    <span className="font-bold text-base text-mono-900">{template.duration}</span>
                                  </div>
                                  <div className="w-px h-6 bg-mono-300" />
                                  <div className="flex items-center gap-2">
                                    <Dumbbell className="w-5 h-5 text-mono-600" strokeWidth={2} />
                                    <span className="font-bold text-base text-mono-900">{template.exerciseIds.length} ex</span>
                                  </div>
                                  <div className="w-px h-6 bg-mono-300" />
                                  <motion.button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (onEditTemplate) {
                                        onEditTemplate(template);
                                      }
                                    }}
                                    whileTap={{ scale: 0.95 }}
                                    className="flex items-center gap-1.5 text-mono-600 hover:text-mono-900 transition-colors text-sm font-medium uppercase tracking-wide"
                                    title="Edit workout"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                    Edit
                                  </motion.button>
                                </div>

                                <div className="absolute top-2 right-2">
                                  <motion.button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteTemplate(template, e);
                                    }}
                                    whileTap={{ scale: 0.9 }}
                                    className="p-1.5 bg-white/80 hover:bg-white text-mono-600 hover:text-red-600 transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </motion.button>
                                </div>
                              </motion.div>
                            )
                          })}
                        </AnimatePresence>

                        {/* Built-in templates */}
                        {(showAllTemplates ? workoutTemplates : workoutTemplates.slice(0, 3)).map((template) => {
                          // Get muscle groups from exercises
                          const templateExercises = exercises.filter(ex => template.exerciseIds.includes(ex.id))
                          const muscleGroups = [...new Set(templateExercises.map(ex => ex.category))].filter(Boolean)

                          return (
                            <motion.div
                              key={template.id}
                              variants={staggerItem}
                              className="card-flat p-6 hover:border-mono-400 transition-colors cursor-pointer relative min-h-[200px]"
                              onClick={() => handleShowWorkoutPreview(template)}
                            >
                              {/* Prominent Title - Black background, white text */}
                              <div className="bg-mono-900 px-4 py-3 -m-6 mb-4">
                                <h4 className="text-white font-bold text-lg uppercase tracking-tight">
                                  {template.name}
                                </h4>
                              </div>

                              <p className="text-sm text-mono-600 mb-4 line-clamp-2 px-1">
                                {template.description}
                              </p>

                              {/* Muscle Groups */}
                              {muscleGroups.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-4 px-1">
                                  {muscleGroups.map(group => (
                                    <span
                                      key={group}
                                      className="px-2 py-1 text-xs font-bold uppercase tracking-wide border-2 border-mono-900 text-mono-900"
                                      style={{ borderColor: getMuscleColor(group), color: getMuscleColor(group) }}
                                    >
                                      {group}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Metadata - Aligned horizontally */}
                              <div className="flex items-center justify-between border-t-2 border-mono-200 pt-3 mt-auto">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-5 h-5 text-mono-600" strokeWidth={2} />
                                  <span className="font-bold text-base text-mono-900">{template.duration}</span>
                                </div>
                                <div className="w-px h-6 bg-mono-300" />
                                <div className="flex items-center gap-2">
                                  <Dumbbell className="w-5 h-5 text-mono-600" strokeWidth={2} />
                                  <span className="font-bold text-base text-mono-900">{template.exerciseIds.length} ex</span>
                                </div>
                                <div className="w-px h-6 bg-mono-300" />
                                <motion.button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onEditTemplate) {
                                      onEditTemplate(template);
                                    }
                                  }}
                                  whileTap={{ scale: 0.95 }}
                                  className="flex items-center gap-1.5 text-mono-600 hover:text-mono-900 transition-colors text-sm font-medium uppercase tracking-wide"
                                  title="Edit workout"
                                >
                                  <Edit2 className="w-4 h-4" />
                                  Edit
                                </motion.button>
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>

                      {/* Show More Button */}
                      {!showAllTemplates && workoutTemplates.length > 3 && (
                        <motion.button
                          onClick={() => setShowAllTemplates(true)}
                          whileTap={{ scale: 0.98 }}
                          className="w-full py-3 bg-mono-100 hover:bg-mono-200 text-mono-900 font-bold text-sm uppercase tracking-wide transition-colors flex items-center justify-center gap-2"
                        >
                          <ChevronDown className="w-4 h-4" />
                          Show {workoutTemplates.length - 3} More Templates
                        </motion.button>
                      )}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Workout Preview Modal */}
      <AnimatePresence>
        {showWorkoutPreview && previewTemplate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-mono-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowWorkoutPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white border-2 border-mono-900 max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="bg-mono-900 px-6 py-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white uppercase tracking-tight">
                  {previewTemplate.name}
                </h3>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowWorkoutPreview(false)}
                  className="text-white/60 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              {/* Workout Summary - Grouped by Muscle Group */}
              <div className="flex-1 overflow-y-auto p-6">
                {(() => {
                  const templateExercises = previewTemplate.exerciseIds
                    .map(id => exercises.find(ex => ex.id === id))
                    .filter(Boolean)

                  // Group by muscle group
                  const grouped = templateExercises.reduce((acc, ex) => {
                    const category = ex.category || 'Other'
                    if (!acc[category]) {
                      acc[category] = []
                    }
                    acc[category].push(ex)
                    return acc
                  }, {})

                  return (
                    <div className="space-y-4">
                      {Object.entries(grouped).map(([category, exs]) => (
                        <div key={category}>
                          <div
                            className="flex items-center gap-2 mb-2 pb-2 border-b-2"
                            style={{ borderColor: getMuscleColor(category) }}
                          >
                            <Dumbbell
                              className="w-4 h-4"
                              style={{ color: getMuscleColor(category) }}
                            />
                            <h4
                              className="font-bold uppercase tracking-wide text-sm"
                              style={{ color: getMuscleColor(category) }}
                            >
                              {category}
                            </h4>
                            <span className="text-xs text-mono-500">({exs.length})</span>
                          </div>
                          <ul className="space-y-1">
                            {exs.map(ex => (
                              <li key={ex.id} className="text-sm text-mono-700 pl-6">
                                • {ex.name}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}

                      {/* Summary Stats */}
                      <div className="pt-4 mt-4 border-t-2 border-mono-200 grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-mono-500 uppercase tracking-wide mb-1">
                            Total Exercises
                          </div>
                          <div className="text-2xl font-bold text-mono-900">
                            {templateExercises.length}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-mono-500 uppercase tracking-wide mb-1">
                            Muscle Groups
                          </div>
                          <div className="text-2xl font-bold text-mono-900">
                            {Object.keys(grouped).length}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* Footer with Start Button */}
              <div className="border-t-2 border-mono-200 p-4 flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowWorkoutPreview(false)}
                  className="flex-1 bg-mono-200 hover:bg-mono-300 text-mono-900 py-3 font-bold uppercase tracking-wide transition-colors"
                >
                  CANCEL
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleStartWorkoutFromPreview}
                  className="flex-1 bg-mono-900 hover:bg-mono-800 text-white py-3 font-bold uppercase tracking-wide transition-colors flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5" fill="white" />
                  START WORKOUT
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Template Confirmation Modal */}
      <AnimatePresence>
        {templateToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={() => setTemplateToDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white border-2 border-mono-900 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-red-600 text-white p-4 flex items-center justify-between">
                <h3 className="text-lg font-bold uppercase tracking-wide">
                  Delete Workout?
                </h3>
                <button
                  onClick={() => setTemplateToDelete(null)}
                  className="hover:opacity-70 transition-opacity"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                <p className="text-mono-900 font-semibold mb-2">
                  {templateToDelete.name}
                </p>
                <p className="text-mono-700">
                  This action cannot be undone.
                </p>
              </div>

              {/* Actions */}
              <div className="p-4 border-t border-mono-200 flex gap-3">
                <motion.button
                  onClick={() => setTemplateToDelete(null)}
                  className="flex-1 h-12 bg-mono-200 text-mono-900 font-bold uppercase tracking-wide text-sm hover:bg-mono-300 transition-colors"
                  whileTap={{ scale: 0.98 }}
                >
                  CANCEL
                </motion.button>
                <motion.button
                  onClick={confirmDeleteTemplate}
                  className="flex-1 h-12 bg-red-600 text-white font-bold uppercase tracking-wide text-sm hover:opacity-90 transition-opacity"
                  whileTap={{ scale: 0.98 }}
                >
                  DELETE
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
