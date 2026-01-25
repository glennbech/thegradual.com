import { useState, useEffect } from 'react';
import { X, Save, Scale } from 'lucide-react';
import { motion } from 'framer-motion';
import useWorkoutStore from '../stores/workoutStore';
import confetti from 'canvas-confetti';

// NumberInput component - defined outside to prevent keyboard closing on mobile
const NumberInput = ({ label, field, value, onChange, unit, placeholder }) => (
  <div>
    <label className="block text-sm font-semibold text-mono-700 mb-2">
      {label}
    </label>
    <div className="relative">
      <input
        type="text"
        inputMode="decimal"
        pattern="[0-9]*[.,]?[0-9]*"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-4 py-3 bg-mono-50 border border-mono-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A855F7] text-mono-900 select-text"
      />
      {unit && (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-mono-500 text-sm">
          {unit}
        </span>
      )}
    </div>
  </div>
);

export default function AddMeasurementModal({ measurement, onClose }) {
  const isEditing = !!measurement;

  // Initialize form state
  const [formData, setFormData] = useState({
    date: measurement?.date ? new Date(measurement.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    weight: measurement?.weight || '',
    bodyFatPercentage: measurement?.bodyFatPercentage || '',
    waist: measurement?.waist || '',
    chest: measurement?.chest || '',
    hips: measurement?.hips || '',
    arms: measurement?.arms || '',
    thighs: measurement?.thighs || '',
    calves: measurement?.calves || '',
    notes: measurement?.notes || '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const addBodyMeasurement = useWorkoutStore((state) => state.addBodyMeasurement);
  const updateBodyMeasurement = useWorkoutStore((state) => state.updateBodyMeasurement);

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Blur active element to prevent keyboard from showing on mobile
    if (document.activeElement) {
      document.activeElement.blur();
    }

    setError(null);

    // Validate: at least one measurement field must be filled
    const hasMeasurement =
      formData.weight ||
      formData.bodyFatPercentage ||
      formData.waist ||
      formData.chest ||
      formData.hips ||
      formData.arms ||
      formData.thighs ||
      formData.calves;

    if (!hasMeasurement) {
      setError('Please enter at least one measurement');
      return;
    }

    setIsSaving(true);

    try {
      // Convert date to ISO string
      const measurementData = {
        ...formData,
        date: new Date(formData.date).toISOString(),
        // Convert numeric fields (only include non-empty values)
        // Normalize comma to period for European decimal separators
        weight: formData.weight ? parseFloat(String(formData.weight).replace(',', '.')) : undefined,
        bodyFatPercentage: formData.bodyFatPercentage ? parseFloat(String(formData.bodyFatPercentage).replace(',', '.')) : undefined,
        waist: formData.waist ? parseFloat(String(formData.waist).replace(',', '.')) : undefined,
        chest: formData.chest ? parseFloat(String(formData.chest).replace(',', '.')) : undefined,
        hips: formData.hips ? parseFloat(String(formData.hips).replace(',', '.')) : undefined,
        arms: formData.arms ? parseFloat(String(formData.arms).replace(',', '.')) : undefined,
        thighs: formData.thighs ? parseFloat(String(formData.thighs).replace(',', '.')) : undefined,
        calves: formData.calves ? parseFloat(String(formData.calves).replace(',', '.')) : undefined,
      };

      // Remove undefined fields
      Object.keys(measurementData).forEach((key) => {
        if (measurementData[key] === undefined) {
          delete measurementData[key];
        }
      });

      if (isEditing) {
        await updateBodyMeasurement(measurement.id, measurementData);
      } else {
        await addBodyMeasurement(measurementData);

        // Celebration confetti
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
        });
      }

      onClose();
    } catch (error) {
      console.error('Failed to save measurement:', error);
      setError(error.message || 'Failed to save measurement');
      setIsSaving(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 sm:left-1/2 sm:-translate-x-1/2 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-2xl z-50 max-h-[85vh] overflow-y-auto shadow-2xl"
      >
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-mono-200 px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between rounded-t-3xl">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#A855F7]/10 flex items-center justify-center">
              <Scale className="w-4 h-4 sm:w-5 sm:h-5 text-[#A855F7]" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-mono-900">
                {isEditing ? 'Edit Measurement' : 'New Measurement'}
              </h2>
              <p className="text-xs text-mono-500 hidden sm:block">
                {isEditing ? 'Update your body measurements' : 'Track your progress'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-mono-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-mono-600" strokeWidth={2} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
          {/* Date */}
          <div>
              <label className="block text-sm font-semibold text-mono-700 mb-2">
                Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                required
                className="w-full px-4 py-3 bg-mono-50 border border-mono-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A855F7] text-mono-900 select-text"
              />
            </div>

          {/* Core Measurements */}
          <div>
            <h3 className="text-sm font-bold text-mono-900 uppercase tracking-wide mb-4">
              Core Measurements
            </h3>
              <div className="grid grid-cols-2 gap-4">
                <NumberInput
                  label="Weight"
                  field="weight"
                  value={formData.weight}
                  onChange={(e) => handleChange('weight', e.target.value)}
                  unit="kg"
                  placeholder="75.5"
                />
                <NumberInput
                  label="Body Fat"
                  field="bodyFatPercentage"
                  value={formData.bodyFatPercentage}
                  onChange={(e) => handleChange('bodyFatPercentage', e.target.value)}
                  unit="%"
                  placeholder="18.0"
                />
                <NumberInput
                  label="Waist"
                  field="waist"
                  value={formData.waist}
                  onChange={(e) => handleChange('waist', e.target.value)}
                  unit="cm"
                  placeholder="80"
                />
                <NumberInput
                  label="Chest"
                  field="chest"
                  value={formData.chest}
                  onChange={(e) => handleChange('chest', e.target.value)}
                  unit="cm"
                  placeholder="100"
                />
            </div>
          </div>

          {/* Additional Measurements */}
          <div>
            <h3 className="text-sm font-bold text-mono-900 uppercase tracking-wide mb-4">
              Additional Measurements
            </h3>
              <div className="grid grid-cols-2 gap-4">
                <NumberInput
                  label="Hips"
                  field="hips"
                  value={formData.hips}
                  onChange={(e) => handleChange('hips', e.target.value)}
                  unit="cm"
                  placeholder="95"
                />
                <NumberInput
                  label="Arms (Biceps)"
                  field="arms"
                  value={formData.arms}
                  onChange={(e) => handleChange('arms', e.target.value)}
                  unit="cm"
                  placeholder="35"
                />
                <NumberInput
                  label="Thighs"
                  field="thighs"
                  value={formData.thighs}
                  onChange={(e) => handleChange('thighs', e.target.value)}
                  unit="cm"
                  placeholder="58"
                />
                <NumberInput
                  label="Calves"
                  field="calves"
                  value={formData.calves}
                  onChange={(e) => handleChange('calves', e.target.value)}
                  unit="cm"
                  placeholder="38"
                />
            </div>
          </div>

          {/* Notes */}
          <div>
              <label className="block text-sm font-semibold text-mono-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="e.g., Morning measurement, fasted"
                rows={3}
                className="w-full px-4 py-3 bg-mono-50 border border-mono-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A855F7] text-mono-900 resize-none select-text"
              />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 sm:gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 sm:px-6 bg-mono-100 text-mono-700 rounded-lg hover:bg-mono-200 transition-colors font-semibold text-sm sm:text-base"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 px-4 py-3 sm:px-6 bg-[#A855F7] text-white rounded-lg hover:bg-[#9333EA] transition-colors font-semibold flex items-center justify-center gap-2 disabled:opacity-50 text-sm sm:text-base"
            >
              <Save className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2} />
              {isSaving ? 'Saving...' : isEditing ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </motion.div>
    </>
  );
}
