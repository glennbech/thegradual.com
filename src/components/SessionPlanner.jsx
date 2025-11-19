import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Plus, Play, X, Clock, Target, Sparkles, Trash2, ChevronDown, ChevronUp, Dumbbell, Edit2 } from 'lucide-react'
import { staggerContainer, staggerItem } from '../utils/animations'
import { exerciseService, sessionService, templateService } from '../services/stateService'
import { headingStyles, iconSizes } from '../utils/typography'
import { getMuscleColor } from '../utils/design-system'
import ExerciseCard from './ExerciseCard'
import workoutTemplates from '../data/workoutTemplates.json'

export default function SessionPlanner({ onStartSession }) {
  const [exercises, setExercises] = useState([])
  const [selectedExercises, setSelectedExercises] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState('all')
  const [showTemplates, setShowTemplates] = useState(true)
  const [showSuggestedWorkouts, setShowSuggestedWorkouts] = useState(true) // Keep suggested workouts open by default
  const [showAllTemplates, setShowAllTemplates] = useState(false) // Show only 3 templates initially
  const [showPersonalWorkouts, setShowPersonalWorkouts] = useState(true) // Collapse personal workouts
  const [showExerciseLibrary, setShowExerciseLibrary] = useState(true) // Start with exercise library expanded
  const [customTemplates, setCustomTemplates] = useState([])
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false)
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [currentTemplate, setCurrentTemplate] = useState(null) // NEW: Track current template
  const [originalTemplate, setOriginalTemplate] = useState(null) // NEW: Track original template before modifications
  const longPressTimersRef = useRef(new Map()) // Track multiple timers by button ID (prevents memory leak)
  const [longPressActive, setLongPressActive] = useState(null) // Track which button is being long-pressed
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    difficulty: 'intermediate',
    duration: '',
    frequency: ''
  })

  useEffect(() => {
    loadExercises()
    loadCustomTemplates()
  }, [])

  const loadExercises = async () => {
    const data = await exerciseService.getAll()
    setExercises(data)
  }

  const loadCustomTemplates = async () => {
    const data = await templateService.getAllCustom()
    setCustomTemplates(data)
  }

  const handleDeleteTemplate = async (templateId, e) => {
    e.stopPropagation()

    // Optimistic UI update - remove immediately for instant feedback
    setCustomTemplates(customTemplates.filter(t => t.id !== templateId))

    // Then delete from storage in background
    try {
      await templateService.delete(templateId)
    } catch (error) {
      // If deletion fails, restore the template
      console.error('Failed to delete template:', error)
      loadCustomTemplates()
    }
  }

  const handleAddExercise = (exercise) => {
    if (!selectedExercises.find(e => e.id === exercise.id)) {
      setSelectedExercises([...selectedExercises, exercise])
    }
  }

  const handleRemoveExercise = (id) => {
    setSelectedExercises(selectedExercises.filter(e => e.id !== id))
  }

  const handleMoveExerciseUp = (index) => {
    if (index === 0) return; // Already at top
    const newExercises = [...selectedExercises];
    [newExercises[index - 1], newExercises[index]] = [newExercises[index], newExercises[index - 1]];
    setSelectedExercises(newExercises);
  }

  const handleMoveExerciseDown = (index) => {
    if (index === selectedExercises.length - 1) return; // Already at bottom
    const newExercises = [...selectedExercises];
    [newExercises[index], newExercises[index + 1]] = [newExercises[index + 1], newExercises[index]];
    setSelectedExercises(newExercises);
  }

  const handleMoveToTop = (index) => {
    if (index === 0) return; // Already at top
    const newExercises = [...selectedExercises];
    const [item] = newExercises.splice(index, 1);
    newExercises.unshift(item);
    setSelectedExercises(newExercises);
  }

  const handleMoveToBottom = (index) => {
    if (index === selectedExercises.length - 1) return; // Already at bottom
    const newExercises = [...selectedExercises];
    const [item] = newExercises.splice(index, 1);
    newExercises.push(item);
    setSelectedExercises(newExercises);
  }

  const handleLongPressStart = (index, direction) => {
    const buttonId = `${index}-${direction}`;

    // Clear any existing timer for this specific button (prevents orphaned timers)
    const existingTimer = longPressTimersRef.current.get(buttonId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      setLongPressActive(buttonId);
      if (direction === 'up') {
        handleMoveToTop(index);
      } else {
        handleMoveToBottom(index);
      }

      // Clear visual feedback after animation
      const feedbackTimer = setTimeout(() => {
        setLongPressActive(null);
        longPressTimersRef.current.delete(`${buttonId}-feedback`);
      }, 300);

      longPressTimersRef.current.set(`${buttonId}-feedback`, feedbackTimer);
      longPressTimersRef.current.delete(buttonId); // Clean up main timer
    }, 500); // 500ms long press

    longPressTimersRef.current.set(buttonId, timer);
  }

  const handleLongPressEnd = (index, direction) => {
    const buttonId = `${index}-${direction}`;
    const timer = longPressTimersRef.current.get(buttonId);
    if (timer) {
      clearTimeout(timer);
      longPressTimersRef.current.delete(buttonId);
    }
  }

  // CRITICAL: Cleanup all timers on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      longPressTimersRef.current.forEach(timer => clearTimeout(timer));
      longPressTimersRef.current.clear();
    };
  }, []);

  // Check if the template has been modified from the original (memoized for performance)
  const hasTemplateChanged = useMemo(() => {
    if (!originalTemplate) return true // If no original template, allow saving (it's a new custom workout)
    const currentExerciseIds = selectedExercises.map(ex => ex.id).sort().join(',')
    const originalExerciseIds = (originalTemplate?.exerciseIds || []).sort().join(',')
    return currentExerciseIds !== originalExerciseIds
  }, [selectedExercises, originalTemplate])

  const handleLoadTemplate = (template) => {
    const templateExercises = template.exerciseIds
      .map(id => exercises.find(ex => ex.id === id))
      .filter(Boolean) // Remove any undefined exercises
    setSelectedExercises(templateExercises)
    setCurrentTemplate(template) // NEW: Track current template
    setOriginalTemplate(JSON.parse(JSON.stringify(template))) // NEW: Deep clone for comparison
    setShowTemplates(false)
    // Scroll to selected exercises
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleStartSession = () => {
    if (selectedExercises.length > 0) {
      // Check if exercises were modified from original template
      let templateReference = null
      if (currentTemplate) {
        const currentExerciseIds = selectedExercises.map(ex => ex.id).sort().join(',')
        const originalExerciseIds = (originalTemplate?.exerciseIds || []).sort().join(',')
        const isModified = currentExerciseIds !== originalExerciseIds

        templateReference = {
          templateId: currentTemplate.id,
          templateName: currentTemplate.name,
          templateType: currentTemplate.isCustom ? 'custom' : 'built-in',
          templateVersion: currentTemplate.version || 1,
          isModified
        }
      }

      onStartSession(selectedExercises, templateReference)
    }
  }

  const handleStartWorkoutFromTemplate = (template) => {
    // Get exercises from template
    const templateExercises = template.exerciseIds
      .map(id => exercises.find(ex => ex.id === id))
      .filter(Boolean) // Remove any undefined exercises

    if (templateExercises.length > 0) {
      // Create template reference (not modified since we're starting directly from template)
      const templateReference = {
        templateId: template.id,
        templateName: template.name,
        templateType: template.isCustom ? 'custom' : 'built-in',
        templateVersion: template.version || 1,
        isModified: false // Always false when starting directly from template
      }

      // Start session immediately, bypassing the edit page
      onStartSession(templateExercises, templateReference)
    }
  }

  const handleSaveAsTemplate = () => {
    // Pre-fill with current template data if editing, otherwise use defaults
    setTemplateForm({
      name: currentTemplate?.name || '',
      description: currentTemplate?.description || `Custom workout with ${selectedExercises.length} exercises`,
      difficulty: currentTemplate?.difficulty || 'intermediate',
      duration: currentTemplate?.duration || `${selectedExercises.length * 10}-${selectedExercises.length * 15} min`,
      frequency: currentTemplate?.frequency || '3x per week'
    })
    setShowSaveTemplateModal(true)
  }

  const handleSaveTemplate = async (e) => {
    e.preventDefault()

    if (isSaving) return // Prevent double-submit

    // Check if this name already exists in custom templates
    const existingTemplate = customTemplates.find(t => t.name === templateForm.name)

    // If name matches an existing template AND hasn't changed from original, confirm overwrite
    if (existingTemplate && currentTemplate && templateForm.name === currentTemplate.name) {
      setShowOverwriteConfirm(true)
      return
    }

    // Otherwise, save directly
    await saveTemplateDirectly()
  }

  const saveTemplateDirectly = async () => {
    if (isSaving) return // Prevent double-submit

    setIsSaving(true)

    try {
      const exerciseIds = selectedExercises.map(ex => ex.id)

      // If overwriting an existing template, UPDATE it (preserve ID)
      const existingTemplate = customTemplates.find(t => t.name === templateForm.name)
      if (existingTemplate) {
        await templateService.update(existingTemplate.id, {
          ...templateForm,
          exerciseIds,
        })
      } else {
        // Create new template
        await templateService.create({ ...templateForm, exerciseIds })
      }

      setShowSaveTemplateModal(false)
      setShowOverwriteConfirm(false)
      await loadCustomTemplates()
      setTemplateForm({
        name: '',
        description: '',
        difficulty: 'intermediate',
        duration: '',
        frequency: ''
      })
      // Clear selected exercises and reset state
      setSelectedExercises([])
      setCurrentTemplate(null)
      setOriginalTemplate(null)
      setShowTemplates(true)
      // Scroll to top to show Personal Workouts section
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      console.error('Failed to save template:', error)
      // Don't close modal on error so user can retry
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
            {selectedExercises.length > 0 && (
              <div className="flex justify-end">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowTemplates(false)}
                  className="text-xs text-mono-500 hover:text-mono-900 uppercase tracking-wide font-medium"
                >
                  Hide Workouts
                </motion.button>
              </div>
            )}

            {/* Personal Workouts Section */}
            <div className="space-y-3">
              <button
                onClick={() => setShowPersonalWorkouts(!showPersonalWorkouts)}
                className="w-full flex items-center justify-between group hover:opacity-80 transition-opacity"
              >
                <div className="flex items-center gap-2">
                  <h2 className={headingStyles.h2}>
                    <Sparkles className={`${iconSizes.h2} inline`} strokeWidth={2} />
                    {' '}Personal Workouts
                  </h2>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-mono-900 transition-transform ${showPersonalWorkouts ? 'rotate-180' : ''}`}
                  strokeWidth={2}
                />
              </button>

              <AnimatePresence>
                {showPersonalWorkouts && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    {customTemplates.length === 0 ? (
                      // Empty state
                      <div className="bg-mono-50 border-2 border-dashed border-mono-300 p-6 text-center">
                        <p className="text-mono-600 mb-2">
                          No personal workouts yet
                        </p>
                        <p className="text-sm text-mono-500">
                          Create one by customizing suggested workouts or adding exercises from the library
                        </p>
                      </div>
                    ) : (
                      // Workouts grid
                      <motion.div
                        variants={staggerContainer}
                        initial="initial"
                        animate="animate"
                        className="grid gap-2 md:grid-cols-2 lg:grid-cols-3"
                      >
                        <AnimatePresence mode="popLayout">
                          {customTemplates.map((template) => {
                            // Get muscle groups from exercises
                            const templateExercises = exercises.filter(ex => template.exerciseIds.includes(ex.id))
                            const muscleGroups = [...new Set(templateExercises.map(ex => ex.category))].filter(Boolean)

                            return (
                              <motion.div
                                key={template.id}
                                variants={staggerItem}
                                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                                layout
                                className="card-flat p-6 hover:border-mono-400 transition-colors relative cursor-pointer min-h-[220px] flex flex-col"
                                onClick={() => handleStartWorkoutFromTemplate(template)}
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
                                      handleLoadTemplate(template);
                                    }}
                                    whileTap={{ scale: 0.95 }}
                                    className="flex items-center gap-1.5 text-mono-600 hover:text-mono-900 transition-colors text-sm font-medium uppercase tracking-wide"
                                    title="Edit workout"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                    Edit
                                  </motion.button>
                                </div>

                                {/* Delete button only */}
                                <div className="absolute top-2 right-2">
                                  <motion.button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteTemplate(template.id, e);
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
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Suggested Workouts Section */}
            <div className="space-y-3">
              <button
                onClick={() => setShowSuggestedWorkouts(!showSuggestedWorkouts)}
                className={`w-full flex items-center justify-between ${headingStyles.h2} hover:text-mono-700 transition-colors`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className={iconSizes.h2} strokeWidth={2} />
                  Suggested Workouts
                </div>
                <motion.div
                  animate={{ rotate: showSuggestedWorkouts ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChevronDown className={iconSizes.h2} strokeWidth={2} />
                </motion.div>
              </button>

              <AnimatePresence>
                {showSuggestedWorkouts && (
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
                        {(showAllTemplates ? workoutTemplates : workoutTemplates.slice(0, 3)).map((template) => {
                          // Get muscle groups from exercises
                          const templateExercises = exercises.filter(ex => template.exerciseIds.includes(ex.id))
                          const muscleGroups = [...new Set(templateExercises.map(ex => ex.category))].filter(Boolean)

                          return (
                            <motion.div
                              key={template.id}
                              variants={staggerItem}
                              className="card-flat p-6 hover:border-mono-400 transition-colors cursor-pointer relative min-h-[200px]"
                              onClick={() => handleStartWorkoutFromTemplate(template)}
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
                                    handleLoadTemplate(template);
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

      {!showTemplates && selectedExercises.length === 0 && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowTemplates(true)}
          className="w-full card-flat py-3 text-mono-900 text-sm font-medium hover:border-mono-400 transition-all flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" strokeWidth={2} />
          SHOW WORKOUTS
        </motion.button>
      )}

      {/* Selected Exercises */}
      <AnimatePresence>
        {selectedExercises.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-2 border-mono-900 bg-white"
          >
            {/* Header Bar */}
            <div className="bg-mono-900 px-4 py-3">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-white" strokeWidth={2} />
                <div className="flex-1">
                  <h3 className={`${headingStyles.h4} text-white`}>
                    {currentTemplate?.name || 'Your Personal Workout'}
                  </h3>
                  <p className="text-xs text-mono-300 uppercase tracking-wide">
                    {selectedExercises.length} {selectedExercises.length === 1 ? 'Exercise' : 'Exercises'} Selected
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4">
              {/* Action Buttons */}
              <div className="flex flex-col gap-3 mb-4 pb-4 border-b border-mono-100">
                {/* PRIMARY: WORK OUT! Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleStartSession}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 font-bold text-sm uppercase tracking-wide flex items-center justify-center gap-2 transition-colors shadow-md"
                >
                  <Play className="w-5 h-5" fill="white" strokeWidth={2} />
                  WORK OUT!
                </motion.button>

                {/* SECONDARY: Save & Cancel */}
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setSelectedExercises([])
                      setCurrentTemplate(null)
                      setOriginalTemplate(null)
                      setShowTemplates(true)
                    }}
                    className="bg-mono-200 hover:bg-mono-300 text-mono-900 py-2 px-3 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" strokeWidth={2} />
                    CANCEL
                  </motion.button>
                  {hasTemplateChanged && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleSaveAsTemplate}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex-1 bg-mono-900 hover:bg-mono-800 text-white py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" strokeWidth={2} />
                      SAVE AS TEMPLATE
                    </motion.button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {selectedExercises.map((exercise, index) => (
                  <motion.div
                    key={exercise.id}
                    layout
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{
                      layout: { type: "spring", stiffness: 300, damping: 25 },
                      opacity: { duration: 0.15 },
                      y: { duration: 0.15 }
                    }}
                    className="bg-mono-50 border border-mono-200 p-2 flex items-center gap-2 hover:border-mono-400 transition-colors relative"
                  >
                    {/* Color-coded vertical line */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1"
                      style={{ backgroundColor: getMuscleColor(exercise.muscleGroup) }}
                    />

                    {/* Up/Down arrows for reordering - COMPACT */}
                    <div className="flex flex-col gap-0.5 ml-1">
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleMoveExerciseUp(index)}
                        onTouchStart={() => handleLongPressStart(index, 'up')}
                        onTouchEnd={() => handleLongPressEnd(index, 'up')}
                        onTouchCancel={() => handleLongPressEnd(index, 'up')}
                        onMouseDown={() => handleLongPressStart(index, 'up')}
                        onMouseUp={() => handleLongPressEnd(index, 'up')}
                        onMouseLeave={() => handleLongPressEnd(index, 'up')}
                        disabled={index === 0}
                        className={`p-1 relative ${index === 0 ? 'text-mono-300 cursor-not-allowed' : 'text-mono-600 hover:text-mono-900 active:bg-mono-200'} ${longPressActive === `${index}-up` ? 'bg-cyan-100 scale-110' : ''}`}
                        style={{ transition: 'all 0.2s' }}
                      >
                        <ChevronUp className="w-5 h-5" strokeWidth={2.5} />
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleMoveExerciseDown(index)}
                        onTouchStart={() => handleLongPressStart(index, 'down')}
                        onTouchEnd={() => handleLongPressEnd(index, 'down')}
                        onTouchCancel={() => handleLongPressEnd(index, 'down')}
                        onMouseDown={() => handleLongPressStart(index, 'down')}
                        onMouseUp={() => handleLongPressEnd(index, 'down')}
                        onMouseLeave={() => handleLongPressEnd(index, 'down')}
                        disabled={index === selectedExercises.length - 1}
                        className={`p-1 relative ${index === selectedExercises.length - 1 ? 'text-mono-300 cursor-not-allowed' : 'text-mono-600 hover:text-mono-900 active:bg-mono-200'} ${longPressActive === `${index}-down` ? 'bg-cyan-100 scale-110' : ''}`}
                        style={{ transition: 'all 0.2s' }}
                      >
                        <ChevronDown className="w-5 h-5" strokeWidth={2.5} />
                      </motion.button>
                    </div>

                    {/* Exercise Info - COMPACT */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-mono-900 text-sm truncate">
                        <span className="text-mono-500 text-xs mr-1.5">#{index + 1}</span>
                        {exercise.name}
                      </p>
                      <p className="text-xs text-mono-500 uppercase">{exercise.category}</p>
                    </div>

                    {/* Delete Icon - COMPACT */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleRemoveExercise(exercise.id)}
                      className="text-mono-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors"
                      title="Remove exercise"
                    >
                      <X className="w-4 h-4" strokeWidth={2.5} />
                    </motion.button>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create a Template Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="border-b border-mono-200 pb-4"
      >
        <button
          onClick={() => setShowExerciseLibrary(!showExerciseLibrary)}
          className="w-full flex items-center justify-between group hover:opacity-80 transition-opacity"
        >
          <div>
            <div className="flex items-center gap-2">
              <h2 className={headingStyles.h2}>
                <Dumbbell className={`${iconSizes.h2} inline`} strokeWidth={2} />
                {' '}Exercise Library
              </h2>
            </div>
          </div>
          <ChevronDown
            className={`w-5 h-5 text-mono-900 transition-transform ${showExerciseLibrary ? 'rotate-180' : ''}`}
            strokeWidth={2}
          />
        </button>
      </motion.div>

      <AnimatePresence>
        {showExerciseLibrary && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden space-y-4"
          >
            {/* Search and Filter */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mono-400" strokeWidth={2} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search exercises..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-mono-200 bg-white text-mono-900 placeholder-mono-400 focus:border-mono-900 focus:outline-none transition-colors"
                />
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2">
                {categories.map((category) => {
                  const categoryColor = category === 'all' ? '#6B7280' : getMuscleColor(category)
                  return (
                    <motion.button
                      key={category}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setFilter(category)}
                      className={`px-4 py-2 text-xs font-medium whitespace-nowrap transition-all border border-l-4 ${
                        filter === category
                          ? 'bg-mono-900 text-white border-mono-900'
                          : 'bg-white text-mono-600 border-mono-300 hover:border-mono-900'
                      }`}
                      style={{ borderLeftColor: categoryColor }}
                    >
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </motion.button>
                  )
                })}
              </div>
            </div>

            {/* Exercise Library */}
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="grid gap-2 md:grid-cols-2 lg:grid-cols-3"
            >
              {filteredExercises.map((exercise) => (
                <motion.div key={exercise.id} variants={staggerItem}>
                  <ExerciseCard
                    exercise={exercise}
                    onAdd={handleAddExercise}
                  />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save Template Modal */}
      <AnimatePresence>
        {showSaveTemplateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-mono-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowSaveTemplateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white border-2 border-mono-900 max-w-md w-full"
            >
              <div className="bg-mono-900 h-1" />
              <form onSubmit={handleSaveTemplate} className="p-6 space-y-4">
                <h3 className={headingStyles.h2}>Save as Workout</h3>

                <div>
                  <label className={`block ${headingStyles.label} mb-2`}>
                    Workout Name *
                  </label>
                  <input
                    type="text"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && templateForm.name.trim()) {
                        e.preventDefault()
                        handleSaveTemplate(e)
                      }
                    }}
                    className="w-full px-4 py-3 border border-mono-200 bg-white text-mono-900 placeholder-mono-400 focus:border-mono-900 focus:outline-none transition-colors"
                    placeholder="My Awesome Workout"
                    autoFocus
                    required
                  />
                </div>

                <div>
                  <label className={`block ${headingStyles.label} mb-2`}>
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
                    <label className={`block ${headingStyles.label} mb-2`}>
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
                    <label className={`block ${headingStyles.label} mb-2`}>
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

                <div>
                  <label className={`block ${headingStyles.label} mb-2`}>
                    Frequency
                  </label>
                  <input
                    type="text"
                    value={templateForm.frequency}
                    onChange={(e) => setTemplateForm({ ...templateForm, frequency: e.target.value })}
                    className="w-full px-4 py-3 border border-mono-200 bg-white text-mono-900 placeholder-mono-400 focus:border-mono-900 focus:outline-none transition-colors"
                    placeholder="3x per week"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowSaveTemplateModal(false)}
                    className="flex-1 bg-mono-200 hover:bg-mono-300 text-mono-900 py-3 font-medium transition-colors"
                  >
                    CANCEL
                  </motion.button>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: isSaving ? 1 : 1.02 }}
                    whileTap={{ scale: isSaving ? 1 : 0.98 }}
                    disabled={isSaving}
                    className={`flex-1 py-3 font-medium transition-colors ${
                      isSaving
                        ? 'bg-mono-700 cursor-not-allowed'
                        : 'bg-mono-900 hover:bg-mono-800'
                    } text-white`}
                  >
                    {isSaving ? 'SAVING...' : 'SAVE'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overwrite Confirmation Modal */}
      <AnimatePresence>
        {showOverwriteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-mono-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowOverwriteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white border-2 border-mono-900 max-w-md w-full"
            >
              <div className="bg-orange-500 h-1" />
              <div className="p-6 space-y-4">
                <h3 className={headingStyles.h2}>Update Existing Workout?</h3>
                <p className="text-sm text-mono-700">
                  A workout named <strong>"{templateForm.name}"</strong> already exists.
                  Do you want to update it with the new exercises?
                </p>
                <div className="bg-mono-50 border border-mono-200 p-3 text-xs text-mono-600">
                  <p><strong>This will:</strong></p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Replace the existing workout with {selectedExercises.length} exercises</li>
                    <li>Keep the same name and settings</li>
                    <li>Cannot be undone</li>
                  </ul>
                </div>

                <div className="flex gap-3 pt-2">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowOverwriteConfirm(false)}
                    className="flex-1 bg-mono-200 hover:bg-mono-300 text-mono-900 py-3 font-medium transition-colors"
                  >
                    CANCEL
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ scale: isSaving ? 1 : 1.02 }}
                    whileTap={{ scale: isSaving ? 1 : 0.98 }}
                    onClick={saveTemplateDirectly}
                    disabled={isSaving}
                    className={`flex-1 py-3 font-medium transition-colors ${
                      isSaving
                        ? 'bg-orange-400 cursor-not-allowed'
                        : 'bg-orange-500 hover:bg-orange-600'
                    } text-white`}
                  >
                    {isSaving ? 'UPDATING...' : 'UPDATE WORKOUT'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
