import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SkipForward, Volume2, VolumeX } from 'lucide-react';
import { formatDuration, colors } from '../utils/design-system';

/**
 * RestTimer - Non-blocking rest timer component
 *
 * Features:
 * - Countdown timer with progress bar
 * - Skip button
 * - Audio/vibration alerts
 * - Warning colors as timer approaches zero
 * - Auto-completes when time is up
 */
const RestTimer = ({
  duration = 90, // Duration in seconds
  onComplete,
  onSkip,
  isActive = true,
  className = '',
}) => {
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [isPlaying, setIsPlaying] = useState(isActive);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Reset when duration changes
  useEffect(() => {
    setTimeRemaining(duration);
    setIsPlaying(isActive);
  }, [duration, isActive]);

  // Audio feedback - MUST be defined BEFORE the countdown useEffect
  const playAlert = useCallback(() => {
    // Vibration (if supported)
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }

    // Beep sound (simple tone)
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800; // Hz
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      console.log('Audio not supported');
    }
  }, []);

  const playWarning = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(100);
    }
  }, []);

  // Countdown logic
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        // Time's up!
        if (prev <= 1) {
          setIsPlaying(false);

          // Play sound/vibrate
          if (soundEnabled) {
            playAlert();
          }

          // Call completion callback
          if (onComplete) {
            onComplete();
          }

          return 0;
        }

        const newTime = prev - 1;

        // Warning alert at 10 seconds
        if (newTime === 10 && soundEnabled) {
          playWarning();
        }

        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, soundEnabled, playAlert, playWarning, onComplete]);

  const handleSkip = () => {
    setIsPlaying(false);
    setTimeRemaining(0);
    if (onSkip) {
      onSkip();
    }
  };

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
  };

  // Calculate progress percentage
  const progress = ((duration - timeRemaining) / duration) * 100;

  // Determine color based on time remaining
  const getTimerColor = () => {
    if (timeRemaining <= 10) return colors.status.danger; // Red
    if (timeRemaining <= 30) return colors.status.warning; // Orange
    return colors.text.primary; // Black
  };

  // Determine background color for progress bar
  const getProgressColor = () => {
    if (timeRemaining <= 10) return colors.status.danger;
    if (timeRemaining <= 30) return colors.status.warning;
    return colors.text.primary;
  };

  if (!isActive && timeRemaining === duration) return null;

  return (
    <AnimatePresence>
      {timeRemaining > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={`fixed bottom-20 left-0 right-0 bg-white border-t-2 border-mono-900 shadow-xl z-30 ${className}`}
        >
          {/* Progress Bar */}
          <div className="h-1 bg-mono-100 relative overflow-hidden">
            <motion.div
              className="h-full absolute left-0 top-0"
              style={{ backgroundColor: getProgressColor() }}
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Timer Content */}
          <div className="flex items-center justify-between px-4 py-3">
            {/* Left: Timer Label & Sound Toggle */}
            <div className="flex items-center gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-mono-500">
                  Rest Time
                </p>
                <p
                  className="text-2xl font-bold tabular-nums"
                  style={{ color: getTimerColor() }}
                >
                  {formatDuration(timeRemaining)}
                </p>
              </div>

              {/* Sound Toggle */}
              <motion.button
                onClick={toggleSound}
                className="p-2 text-mono-400 hover:text-mono-900"
                whileTap={{ scale: 0.95 }}
              >
                {soundEnabled ? (
                  <Volume2 className="w-5 h-5" />
                ) : (
                  <VolumeX className="w-5 h-5" />
                )}
              </motion.button>
            </div>

            {/* Right: Skip Button */}
            <motion.button
              onClick={handleSkip}
              className="flex items-center gap-2 px-4 py-2 border-2 border-mono-900 bg-white font-semibold uppercase tracking-wide text-sm"
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
            >
              <SkipForward className="w-4 h-4" />
              Skip
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Completion Animation */}
      <AnimatePresence>
        {timeRemaining === 0 && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 15, stiffness: 300 }}
            className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 pointer-events-none"
          >
            <motion.div
              initial={{ rotate: -10 }}
              animate={{ rotate: 0 }}
              className="bg-white border-4 border-mono-900 px-8 py-6 shadow-2xl"
            >
              <p className="text-4xl font-bold uppercase tracking-wide text-mono-900">
                Rest Complete!
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
};

export default RestTimer;
