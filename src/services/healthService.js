const STORAGE_KEY = 'gymbot_health_metrics'

export const healthService = {
  // Get all health metrics entries
  getAll: async () => {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  },

  // Add a new health metrics entry
  add: async (entry) => {
    const metrics = await healthService.getAll()
    const newEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      ...entry
    }
    const updated = [...metrics, newEntry].sort((a, b) =>
      new Date(a.date) - new Date(b.date)
    )
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    return newEntry
  },

  // Update an existing entry
  update: async (id, updates) => {
    const metrics = await healthService.getAll()
    const updated = metrics.map(entry =>
      entry.id === id ? { ...entry, ...updates } : entry
    )
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    return updated.find(e => e.id === id)
  },

  // Delete an entry
  delete: async (id) => {
    const metrics = await healthService.getAll()
    const updated = metrics.filter(entry => entry.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    return true
  },

  // Get latest entry
  getLatest: async () => {
    const metrics = await healthService.getAll()
    return metrics.length > 0 ? metrics[metrics.length - 1] : null
  },

  // Calculate lean mass from weight and body fat percentage
  calculateLeanMass: (weight, bodyFatPercentage) => {
    if (!weight || bodyFatPercentage === undefined) return null
    return weight * (1 - bodyFatPercentage / 100)
  },

  // Calculate body fat mass
  calculateFatMass: (weight, bodyFatPercentage) => {
    if (!weight || bodyFatPercentage === undefined) return null
    return weight * (bodyFatPercentage / 100)
  }
}
