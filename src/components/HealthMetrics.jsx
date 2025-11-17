import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Scale, TrendingUp, TrendingDown, Plus, Activity, Target, Trash2, List } from 'lucide-react'
import { staggerContainer, staggerItem } from '../utils/animations'
import { healthService } from '../services/healthService'

export default function HealthMetrics() {
  const [metrics, setMetrics] = useState([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [showAllData, setShowAllData] = useState(false)
  const [formData, setFormData] = useState({
    weight: '',
    bodyFat: '',
  })

  useEffect(() => {
    loadMetrics()
  }, [])

  const loadMetrics = async () => {
    const data = await healthService.getAll()
    setMetrics(data)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.weight) return

    await healthService.add({
      weight: parseFloat(formData.weight),
      bodyFat: formData.bodyFat ? parseFloat(formData.bodyFat) : null,
    })

    setFormData({ weight: '', bodyFat: '' })
    setShowAddForm(false)
    loadMetrics()
  }

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this measurement?')) {
      await healthService.delete(id)
      loadMetrics()
    }
  }

  const latestMetrics = metrics.length > 0 ? metrics[metrics.length - 1] : null
  const previousMetrics = metrics.length > 1 ? metrics[metrics.length - 2] : null

  // Calculate changes
  const weightChange = latestMetrics && previousMetrics
    ? latestMetrics.weight - previousMetrics.weight
    : 0

  const bodyFatChange = latestMetrics?.bodyFat && previousMetrics?.bodyFat
    ? latestMetrics.bodyFat - previousMetrics.bodyFat
    : 0

  // Prepare chart data
  const chartData = metrics.map(entry => ({
    date: new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    weight: entry.weight,
    bodyFat: entry.bodyFat,
    leanMass: entry.bodyFat
      ? healthService.calculateLeanMass(entry.weight, entry.bodyFat)
      : null,
  }))

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-xl border-2 border-flame-200">
          <p className="font-bold text-gray-900 mb-2">{payload[0].payload.date}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm font-semibold">
              {entry.name}: {entry.value?.toFixed(1)} {entry.name === 'Body Fat' ? '%' : 'kg'}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-flame-500 bg-clip-text text-transparent mb-2">
          Health Metrics
        </h1>
        <p className="text-gray-600">Track your body composition over time</p>
      </motion.div>

      {/* Current Stats Cards */}
      {latestMetrics && (
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-2 md:grid-cols-3 gap-4"
        >
          {/* Weight Card */}
          <motion.div variants={staggerItem} className="bg-white rounded-2xl overflow-hidden border-2 border-flame-200">
            <div className="bg-gradient-to-r from-slate-800 to-flame-500 h-1.5" />
            <div className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <Scale className="w-5 h-5 text-flame-500" />
                <span className="text-sm font-semibold text-gray-600">Weight</span>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold text-gray-900">{latestMetrics.weight.toFixed(1)}</p>
                  <p className="text-xs text-gray-500">kg</p>
                </div>
                {weightChange !== 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`flex items-center gap-1 ${
                      weightChange > 0 ? 'text-orange-500' : 'text-green-500'
                    }`}
                  >
                    {weightChange > 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    <span className="text-sm font-bold">{Math.abs(weightChange).toFixed(1)}</span>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Body Fat Card */}
          {latestMetrics.bodyFat && (
            <motion.div variants={staggerItem} className="bg-white rounded-2xl overflow-hidden border-2 border-flame-200">
              <div className="bg-gradient-to-r from-slate-800 to-flame-500 h-1.5" />
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-semibold text-gray-600">Body Fat</span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-3xl font-bold text-gray-900">{latestMetrics.bodyFat.toFixed(1)}</p>
                    <p className="text-xs text-gray-500">%</p>
                  </div>
                  {bodyFatChange !== 0 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={`flex items-center gap-1 ${
                        bodyFatChange > 0 ? 'text-orange-500' : 'text-green-500'
                      }`}
                    >
                      {bodyFatChange > 0 ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      <span className="text-sm font-bold">{Math.abs(bodyFatChange).toFixed(1)}</span>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Lean Mass Card */}
          {latestMetrics.bodyFat && (
            <motion.div variants={staggerItem} className="bg-white rounded-2xl overflow-hidden border-2 border-green-200">
              <div className="bg-gradient-to-r from-slate-800 to-flame-500 h-1.5" />
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-semibold text-gray-600">Lean Mass</span>
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">
                    {healthService.calculateLeanMass(latestMetrics.weight, latestMetrics.bodyFat).toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-500">kg</p>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Add Metrics Button/Form */}
      <AnimatePresence mode="wait">
        {!showAddForm ? (
          <motion.button
            key="add-button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAddForm(true)}
            className="w-full bg-gradient-to-r from-slate-50 to-flame-50 border-2 border-flame-200 text-flame-600 py-4 rounded-xl font-semibold hover:border-flame-500 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add New Measurement
          </motion.button>
        ) : (
          <motion.form
            key="add-form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl overflow-hidden border-2 border-flame-500"
          >
            <div className="bg-gradient-to-r from-slate-800 to-flame-500 h-2" />
            <div className="p-6 space-y-4">
              <h3 className="text-xl font-bold text-gray-900">New Measurement</h3>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Weight (kg) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-flame-500 focus:outline-none transition-colors"
                  placeholder="75.5"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Body Fat % (optional)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.bodyFat}
                  onChange={(e) => setFormData({ ...formData, bodyFat: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-flame-500 focus:outline-none transition-colors"
                  placeholder="15.0"
                />
              </div>

              <div className="flex gap-3">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </motion.button>
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex-1 bg-flame-500 text-white py-3 rounded-xl font-semibold hover:bg-flame-600 transition-colors"
                >
                  Save
                </motion.button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Charts */}
      {chartData.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl overflow-hidden border-2 border-gray-100"
        >
          <div className="bg-gradient-to-r from-slate-800 to-flame-500 h-2" />
          <div className="p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Progress Over Time</h3>

            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '14px', fontWeight: 600 }}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#FF1B8D"
                  strokeWidth={3}
                  name="Weight (kg)"
                  dot={{ fill: '#FF1B8D', r: 5 }}
                  activeDot={{ r: 7 }}
                />
                {chartData.some(d => d.bodyFat !== null) && (
                  <Line
                    type="monotone"
                    dataKey="bodyFat"
                    stroke="#9333ea"
                    strokeWidth={3}
                    name="Body Fat (%)"
                    dot={{ fill: '#9333ea', r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                )}
                {chartData.some(d => d.leanMass !== null) && (
                  <Line
                    type="monotone"
                    dataKey="leanMass"
                    stroke="#10b981"
                    strokeWidth={3}
                    name="Lean Mass (kg)"
                    dot={{ fill: '#10b981', r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {metrics.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-12"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="bg-flame-500 rounded-full p-6 mb-4 inline-block"
          >
            <Scale className="w-16 h-16 text-white" />
          </motion.div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No measurements yet!</h2>
          <p className="text-gray-600">Add your first measurement to start tracking your progress</p>
        </motion.div>
      )}

      {/* All Data Points */}
      {metrics.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl overflow-hidden border-2 border-gray-100"
        >
          <div className="bg-gradient-to-r from-slate-800 to-flame-500 h-2" />
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <List className="w-5 h-5 text-flame-500" />
                <h3 className="text-xl font-bold text-gray-900">All Measurements</h3>
                <span className="text-sm text-gray-500">({metrics.length} total)</span>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowAllData(!showAllData)}
                className="text-flame-500 font-semibold text-sm hover:text-flame-600"
              >
                {showAllData ? 'Hide' : 'Show All'}
              </motion.button>
            </div>

            <AnimatePresence>
              {showAllData && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-gray-200">
                          <th className="text-left py-3 px-2 text-sm font-bold text-gray-700">Date</th>
                          <th className="text-right py-3 px-2 text-sm font-bold text-gray-700">Weight</th>
                          <th className="text-right py-3 px-2 text-sm font-bold text-gray-700">Body Fat</th>
                          <th className="text-right py-3 px-2 text-sm font-bold text-gray-700">Lean Mass</th>
                          <th className="text-right py-3 px-2 text-sm font-bold text-gray-700"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...metrics].reverse().map((entry, index) => (
                          <motion.tr
                            key={entry.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="border-b border-gray-100 hover:bg-flame-50 transition-colors"
                          >
                            <td className="py-3 px-2 text-sm text-gray-900">
                              {new Date(entry.date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td className="py-3 px-2 text-sm text-right font-semibold text-gray-900">
                              {entry.weight.toFixed(1)} kg
                            </td>
                            <td className="py-3 px-2 text-sm text-right font-semibold text-gray-900">
                              {entry.bodyFat ? `${entry.bodyFat.toFixed(1)}%` : '-'}
                            </td>
                            <td className="py-3 px-2 text-sm text-right font-semibold text-gray-900">
                              {entry.bodyFat
                                ? `${healthService.calculateLeanMass(entry.weight, entry.bodyFat).toFixed(1)} kg`
                                : '-'}
                            </td>
                            <td className="py-3 px-2 text-right">
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleDelete(entry.id)}
                                className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50"
                                title="Delete measurement"
                              >
                                <Trash2 className="w-4 h-4" />
                              </motion.button>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </div>
  )
}
