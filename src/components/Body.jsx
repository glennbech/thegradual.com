import { useState } from 'react';
import { Scale, TrendingUp, TrendingDown, Minus, Calendar, Plus, Edit2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useWorkoutStore from '../stores/workoutStore';
import AddMeasurementModal from './AddMeasurementModal';
import StrengthChart from './StrengthChart';

export default function Body() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMeasurement, setEditingMeasurement] = useState(null);

  // Get data from store
  const bodyMeasurements = useWorkoutStore((state) => state.bodyMeasurements);
  const getLatestBodyMeasurement = useWorkoutStore((state) => state.getLatestBodyMeasurement);
  const deleteBodyMeasurement = useWorkoutStore((state) => state.deleteBodyMeasurement);
  const isLoading = useWorkoutStore((state) => state.isLoading);

  const latestMeasurement = getLatestBodyMeasurement();

  // Calculate trend vs previous measurement
  const getTrend = (field) => {
    if (bodyMeasurements.length < 2 || !latestMeasurement || !latestMeasurement[field]) {
      return { direction: 'none', change: 0 };
    }

    const previousMeasurement = bodyMeasurements[1];
    if (!previousMeasurement || !previousMeasurement[field]) {
      return { direction: 'none', change: 0 };
    }

    const current = latestMeasurement[field];
    const previous = previousMeasurement[field];
    const change = current - previous;

    if (Math.abs(change) < 0.1) {
      return { direction: 'stable', change: 0 };
    }

    return {
      direction: change > 0 ? 'up' : 'down',
      change: Math.abs(change),
    };
  };

  const handleDelete = async (measurementId) => {
    if (!window.confirm('Delete this measurement? This cannot be undone.')) {
      return;
    }

    try {
      await deleteBodyMeasurement(measurementId);
    } catch (error) {
      alert(`Failed to delete measurement: ${error.message}`);
    }
  };

  const handleEdit = (measurement) => {
    setEditingMeasurement(measurement);
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingMeasurement(null);
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Stat card component
  const StatCard = ({ label, value, unit, trend }) => {
    const getTrendIcon = () => {
      if (trend.direction === 'up') return <TrendingUp className="w-4 h-4 text-green-500" />;
      if (trend.direction === 'down') return <TrendingDown className="w-4 h-4 text-red-500" />;
      return <Minus className="w-4 h-4 text-mono-400" />;
    };

    const getTrendText = () => {
      if (trend.direction === 'stable') return 'No change';
      if (trend.direction === 'none') return '';
      return `${trend.direction === 'up' ? '+' : '-'}${trend.change.toFixed(1)}${unit}`;
    };

    return (
      <div className="bg-mono-50 rounded-lg p-4 border border-mono-200">
        <div className="text-xs text-mono-500 uppercase tracking-wide mb-1">{label}</div>
        <div className="flex items-baseline justify-between">
          <div className="text-2xl font-bold text-mono-900">
            {value ? `${value}${unit}` : '—'}
          </div>
          {value && (
            <div className="flex items-center gap-1 text-xs text-mono-600">
              {getTrendIcon()}
              <span>{getTrendText()}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto pb-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-mono-900 flex items-center gap-2">
              <Scale className="w-7 h-7 text-[#A855F7]" strokeWidth={2} />
              Body
            </h1>
            <p className="text-mono-600 text-sm mt-1">
              Track your body measurements and progress
            </p>
          </div>
        </div>

        {/* Latest Stats Grid */}
        <div className="bg-white rounded-lg p-6 border border-mono-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-mono-900">Latest Stats</h2>
            {latestMeasurement && (
              <div className="flex items-center gap-2 text-xs text-mono-500">
                <Calendar className="w-4 h-4" />
                {formatDate(latestMeasurement.date)}
              </div>
            )}
          </div>

          {latestMeasurement ? (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <StatCard
                label="Weight"
                value={latestMeasurement.weight}
                unit="kg"
                trend={getTrend('weight')}
              />
              <StatCard
                label="Body Fat"
                value={latestMeasurement.bodyFatPercentage}
                unit="%"
                trend={getTrend('bodyFatPercentage')}
              />
              <StatCard
                label="Waist"
                value={latestMeasurement.waist}
                unit="cm"
                trend={getTrend('waist')}
              />
              <StatCard
                label="Chest"
                value={latestMeasurement.chest}
                unit="cm"
                trend={getTrend('chest')}
              />
              <StatCard
                label="Hips"
                value={latestMeasurement.hips}
                unit="cm"
                trend={getTrend('hips')}
              />
              <StatCard
                label="Arms"
                value={latestMeasurement.arms}
                unit="cm"
                trend={getTrend('arms')}
              />
              <StatCard
                label="Thighs"
                value={latestMeasurement.thighs}
                unit="cm"
                trend={getTrend('thighs')}
              />
              <StatCard
                label="Calves"
                value={latestMeasurement.calves}
                unit="cm"
                trend={getTrend('calves')}
              />
            </div>
          ) : (
            <div className="text-center py-8">
              <Scale className="w-12 h-12 text-mono-300 mx-auto mb-3" strokeWidth={2} />
              <p className="text-mono-600 mb-4">No measurements yet</p>
            </div>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            disabled={isLoading}
            className="w-full bg-[#A855F7] text-white rounded-lg py-3 px-4 flex items-center justify-center gap-2 hover:bg-[#9333EA] transition-colors font-semibold disabled:opacity-50"
          >
            <Plus className="w-5 h-5" strokeWidth={2} />
            Log New Measurement
          </button>
        </div>

        {/* Progress Charts */}
        {bodyMeasurements.length >= 2 && (
          <div className="bg-white rounded-lg p-6 border border-mono-200">
            <h2 className="text-lg font-bold text-mono-900 mb-6">Progress Over Time</h2>

            {/* Weight Chart */}
            <div className="mb-8">
              <h3 className="text-sm font-bold text-mono-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                <Scale className="w-4 h-4 text-[#A855F7]" strokeWidth={2} />
                Weight Progression
              </h3>
              <StrengthChart
                data={[...bodyMeasurements].reverse()}
                valueField="weight"
                unit="kg"
                color="#A855F7"
                height={200}
                label="Weight"
              />
            </div>

            {/* Body Fat Chart */}
            {bodyMeasurements.some(m => m.bodyFatPercentage) && (
              <div>
                <h3 className="text-sm font-bold text-mono-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-[#10B981]" strokeWidth={2} />
                  Body Fat Percentage
                </h3>
                <StrengthChart
                  data={[...bodyMeasurements].reverse()}
                  valueField="bodyFatPercentage"
                  unit="%"
                  color="#10B981"
                  height={200}
                  label="Body Fat"
                />
              </div>
            )}
          </div>
        )}

        {/* Measurement History */}
        {bodyMeasurements.length > 0 && (
          <div className="bg-white rounded-lg p-6 border border-mono-200">
            <h2 className="text-lg font-bold text-mono-900 mb-4">History</h2>
            <div className="space-y-3">
              {bodyMeasurements.map((measurement) => (
                <motion.div
                  key={measurement.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-4 bg-mono-50 rounded-lg border border-mono-200 hover:border-[#A855F7] transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-mono-500" />
                      <span className="font-semibold text-mono-900">
                        {formatDate(measurement.date)}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs text-mono-600">
                      {measurement.weight && (
                        <div>
                          <span className="text-mono-500">Weight:</span> {measurement.weight}kg
                        </div>
                      )}
                      {measurement.bodyFatPercentage && (
                        <div>
                          <span className="text-mono-500">BF:</span> {measurement.bodyFatPercentage}%
                        </div>
                      )}
                      {measurement.waist && (
                        <div>
                          <span className="text-mono-500">Waist:</span> {measurement.waist}cm
                        </div>
                      )}
                      {measurement.chest && (
                        <div>
                          <span className="text-mono-500">Chest:</span> {measurement.chest}cm
                        </div>
                      )}
                    </div>
                    {measurement.notes && (
                      <p className="text-xs text-mono-600 mt-2 italic">"{measurement.notes}"</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(measurement)}
                      className="p-2 text-mono-600 hover:text-[#A855F7] hover:bg-white rounded-lg transition-colors"
                      title="Edit measurement"
                    >
                      <Edit2 className="w-4 h-4" strokeWidth={2} />
                    </button>
                    <button
                      onClick={() => handleDelete(measurement.id)}
                      className="p-2 text-mono-600 hover:text-red-500 hover:bg-white rounded-lg transition-colors"
                      title="Delete measurement"
                    >
                      <Trash2 className="w-4 h-4" strokeWidth={2} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Add/Edit Measurement Modal */}
      <AnimatePresence>
        {showAddModal && (
          <AddMeasurementModal
            measurement={editingMeasurement}
            onClose={handleCloseModal}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
