import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, X } from 'lucide-react';
import { colors, sizes, typography } from '../utils/design-system';

/**
 * NumberInput - Large touch-friendly number input component
 *
 * Features:
 * - Large +/- buttons for quick adjustments
 * - Tap on number to open numpad modal for direct entry
 * - Smooth animations
 * - Customizable increment, min, max
 */
const NumberInput = ({
  value,
  onChange,
  label,
  unit = '',
  increment = 1,
  min = 0,
  max = 999,
  className = '',
}) => {
  const [showNumpad, setShowNumpad] = useState(false);
  const [tempValue, setTempValue] = useState(value.toString());

  const handleIncrement = () => {
    const newValue = Math.min(value + increment, max);
    onChange(newValue);
  };

  const handleDecrement = () => {
    const newValue = Math.max(value - increment, min);
    onChange(newValue);
  };

  const handleNumpadClick = (num) => {
    const newStr = tempValue === '0' ? num.toString() : tempValue + num;
    const newValue = parseInt(newStr);

    if (newValue <= max) {
      setTempValue(newStr);
    }
  };

  const handleNumpadBackspace = () => {
    const newStr = tempValue.slice(0, -1) || '0';
    setTempValue(newStr);
  };

  const handleNumpadConfirm = () => {
    const newValue = parseInt(tempValue);
    const clampedValue = Math.max(min, Math.min(newValue, max));
    onChange(clampedValue);
    setShowNumpad(false);
  };

  const handleNumpadCancel = () => {
    setTempValue(value.toString());
    setShowNumpad(false);
  };

  const openNumpad = () => {
    setTempValue(value.toString());
    setShowNumpad(true);
  };

  return (
    <>
      {/* Main Input */}
      <div className={`flex flex-col gap-2 ${className}`}>
        {label && (
          <label className="text-xs font-medium uppercase tracking-widest text-mono-500">
            {label}
          </label>
        )}

        <div className="flex items-center gap-3">
          {/* Decrement Button */}
          <motion.button
            type="button"
            onClick={handleDecrement}
            disabled={value <= min}
            className="flex items-center justify-center w-12 h-12 border-2 border-mono-200 bg-white disabled:opacity-30 disabled:cursor-not-allowed"
            whileTap={{ scale: value > min ? 0.95 : 1 }}
            whileHover={{ scale: value > min ? 1.05 : 1 }}
          >
            <Minus className="w-5 h-5 text-mono-900" />
          </motion.button>

          {/* Number Display (tappable) */}
          <motion.button
            type="button"
            onClick={openNumpad}
            className="flex-1 h-14 flex items-center justify-center border-2 border-mono-900 bg-white font-bold text-3xl tabular-nums"
            whileTap={{ scale: 0.98 }}
          >
            <span className="text-mono-900">{value}</span>
            {unit && <span className="text-lg text-mono-500 ml-1">{unit}</span>}
          </motion.button>

          {/* Increment Button */}
          <motion.button
            type="button"
            onClick={handleIncrement}
            disabled={value >= max}
            className="flex items-center justify-center w-12 h-12 border-2 border-mono-200 bg-white disabled:opacity-30 disabled:cursor-not-allowed"
            whileTap={{ scale: value < max ? 0.95 : 1 }}
            whileHover={{ scale: value < max ? 1.05 : 1 }}
          >
            <Plus className="w-5 h-5 text-mono-900" />
          </motion.button>
        </div>
      </div>

      {/* Numpad Modal */}
      <AnimatePresence>
        {showNumpad && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleNumpadCancel}
              className="fixed inset-0 bg-black/50 z-40"
            />

            {/* Numpad */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-mono-900 z-50 pb-safe"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-mono-200">
                <div className="flex-1">
                  <p className="text-xs font-medium uppercase tracking-widest text-mono-500">
                    {label || 'Enter Value'}
                  </p>
                </div>
                <button
                  onClick={handleNumpadCancel}
                  className="p-2 -mr-2 text-mono-500 hover:text-mono-900"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Display */}
              <div className="p-6 bg-mono-50">
                <div className="text-5xl font-bold text-center tabular-nums text-mono-900">
                  {tempValue}
                  {unit && <span className="text-2xl text-mono-500 ml-2">{unit}</span>}
                </div>
              </div>

              {/* Numpad Grid */}
              <div className="grid grid-cols-3 gap-px bg-mono-200 p-px">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <motion.button
                    key={num}
                    onClick={() => handleNumpadClick(num)}
                    className="h-16 bg-white text-2xl font-semibold text-mono-900"
                    whileTap={{ scale: 0.95 }}
                  >
                    {num}
                  </motion.button>
                ))}

                {/* Decimal point (disabled for now) */}
                <div className="h-16 bg-mono-50" />

                {/* Zero */}
                <motion.button
                  onClick={() => handleNumpadClick(0)}
                  className="h-16 bg-white text-2xl font-semibold text-mono-900"
                  whileTap={{ scale: 0.95 }}
                >
                  0
                </motion.button>

                {/* Backspace */}
                <motion.button
                  onClick={handleNumpadBackspace}
                  className="h-16 bg-white text-2xl font-semibold text-mono-900 flex items-center justify-center"
                  whileTap={{ scale: 0.95 }}
                >
                  ←
                </motion.button>
              </div>

              {/* Confirm Button */}
              <div className="p-4">
                <motion.button
                  onClick={handleNumpadConfirm}
                  className="w-full h-14 bg-mono-900 text-white text-lg font-bold uppercase tracking-wide"
                  whileTap={{ scale: 0.98 }}
                >
                  Confirm
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default NumberInput;
