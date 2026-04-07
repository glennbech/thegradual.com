import { User, Mail, Shield, Database, Cloud, HardDrive, LogOut, Settings, Download, FileText, Timer, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { awsConfig } from '../config/aws';
import useWorkoutStore from '../stores/workoutStore';
import { exportWorkoutDataToPDF } from '../utils/pdfExport';
import { useState, useEffect } from 'react';

export default function Profile() {
  const { user, identityId, isAuthenticated, signIn, signOut } = useAuth();

  // Get data from Zustand store
  const sessions = useWorkoutStore((state) => state.sessions);
  const customExercises = useWorkoutStore((state) => state.customExercises);
  const customTemplates = useWorkoutStore((state) => state.customTemplates);
  const activeSession = useWorkoutStore((state) => state.activeSession);
  const bodyMeasurements = useWorkoutStore((state) => state.bodyMeasurements);
  const restTimerDuration = useWorkoutStore((state) => state.restTimerDuration);
  const setRestTimerDuration = useWorkoutStore((state) => state.setRestTimerDuration);

  // Deload settings
  const deloadMode = useWorkoutStore((state) => state.deloadMode);
  const deloadRepsOnlyPercentage = useWorkoutStore((state) => state.deloadRepsOnlyPercentage);
  const deloadWeightedRepsPercentage = useWorkoutStore((state) => state.deloadWeightedRepsPercentage);
  const deloadWeightPercentage = useWorkoutStore((state) => state.deloadWeightPercentage);
  const setDeloadSettings = useWorkoutStore((state) => state.setDeloadSettings);

  // Local state for rest timer
  const [localRestTimer, setLocalRestTimer] = useState(restTimerDuration);
  const [isSavingTimer, setIsSavingTimer] = useState(false);

  // Local state for deload
  const [localDeloadMode, setLocalDeloadMode] = useState(deloadMode);
  const [localRepsOnlyPct, setLocalRepsOnlyPct] = useState(deloadRepsOnlyPercentage);
  const [localWeightedRepsPct, setLocalWeightedRepsPct] = useState(deloadWeightedRepsPercentage);
  const [localWeightPct, setLocalWeightPct] = useState(deloadWeightPercentage);
  const [isSavingDeload, setIsSavingDeload] = useState(false);

  // Sync local state with Zustand store (when store updates from API)
  useEffect(() => {
    setLocalRestTimer(restTimerDuration);
  }, [restTimerDuration]);

  useEffect(() => {
    setLocalDeloadMode(deloadMode);
  }, [deloadMode]);

  useEffect(() => {
    setLocalRepsOnlyPct(deloadRepsOnlyPercentage);
  }, [deloadRepsOnlyPercentage]);

  useEffect(() => {
    setLocalWeightedRepsPct(deloadWeightedRepsPercentage);
  }, [deloadWeightedRepsPercentage]);

  useEffect(() => {
    setLocalWeightPct(deloadWeightPercentage);
  }, [deloadWeightPercentage]);

  // Get localStorage stats for debug
  const getLocalStorageStats = () => {
    try {
      return {
        sessionsCount: sessions.length,
        customExercisesCount: customExercises.length,
        customTemplatesCount: customTemplates.length,
        hasActiveSession: !!activeSession,
        totalStorageSize: (new Blob([JSON.stringify(localStorage)]).size / 1024).toFixed(2) + ' KB'
      };
    } catch {
      return { error: 'Failed to read localStorage' };
    }
  };

  // Extract additional user info from JWT token if available
  const getUserDisplayName = () => {
    return user?.name || user?.given_name || user?.email?.split('@')[0] || 'User';
  };

  const getUserEmail = () => {
    return user?.email || 'Not provided';
  };

  const getUserPicture = () => {
    return user?.picture || null;
  };

  const getUserPlan = () => {
    return user?.['custom:plan'] || user?.plan || 'Free';
  };

  const getMemberSince = () => {
    // Try to get auth_time from token
    if (user?.auth_time) {
      return new Date(user.auth_time * 1000).toLocaleDateString();
    }
    // Fallback to current date
    return new Date().toLocaleDateString();
  };

  // Download all user data as JSON
  const handleDownloadAllData = () => {
    const allData = {
      sessions: sessions,
      customExercises: customExercises,
      customTemplates: customTemplates,
      activeSession: activeSession,
      bodyMeasurements: bodyMeasurements,
      exportDate: new Date().toISOString(),
      user: user || null
    };

    const jsonString = JSON.stringify(allData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `thegradual-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export all user data as PDF for AI analysis
  const handleDownloadPDF = () => {
    const allData = {
      sessions: sessions,
      customExercises: customExercises,
      customTemplates: customTemplates,
      activeSession: activeSession,
      bodyMeasurements: bodyMeasurements,
      user: user || null
    };

    exportWorkoutDataToPDF(allData);
  };

  // Format seconds to MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle rest timer duration change
  const handleRestTimerChange = async (value) => {
    const numValue = parseInt(value, 10);
    setLocalRestTimer(numValue);
  };

  // Save rest timer to store
  const handleSaveRestTimer = async () => {
    setIsSavingTimer(true);
    try {
      await setRestTimerDuration(localRestTimer);
    } catch (error) {
      console.error('Failed to save rest timer:', error);
    } finally {
      setIsSavingTimer(false);
    }
  };

  // Handle deload settings save
  const handleSaveDeload = async () => {
    setIsSavingDeload(true);
    try {
      await setDeloadSettings(localDeloadMode, localRepsOnlyPct, localWeightedRepsPct, localWeightPct);
    } catch (error) {
      console.error('Failed to save deload settings:', error);
    } finally {
      setIsSavingDeload(false);
    }
  };

  // Check if deload settings have changed
  const deloadSettingsChanged =
    localDeloadMode !== deloadMode ||
    localRepsOnlyPct !== deloadRepsOnlyPercentage ||
    localWeightedRepsPct !== deloadWeightedRepsPercentage ||
    localWeightPct !== deloadWeightPercentage;

  if (!isAuthenticated) {
    // Anonymous user view
    return (
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Anonymous Header */}
          <div className="bg-white rounded-lg p-6 border border-mono-200">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-20 h-20 rounded-full bg-mono-100 flex items-center justify-center border-2 border-mono-200">
                <User className="w-10 h-10 text-mono-400" strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-mono-900">Anonymous User</h1>
                <p className="text-mono-500 text-sm">Your data is stored locally</p>
              </div>
            </div>

            {/* Sign in prompt */}
            <div className="bg-[#A855F7]/5 border-2 border-[#A855F7]/20 rounded-lg p-6 mb-6">
              <h2 className="text-lg font-bold text-mono-900 mb-3">
                Sign in to unlock cloud features
              </h2>
              <ul className="text-mono-700 space-y-3 mb-6">
                <li className="flex items-center gap-3">
                  <Cloud className="w-5 h-5 text-[#A855F7]" strokeWidth={2} />
                  <span className="text-sm">Access your workouts on any device</span>
                </li>
                <li className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-[#A855F7]" strokeWidth={2} />
                  <span className="text-sm">Never lose your workout history</span>
                </li>
                <li className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-[#A855F7]" strokeWidth={2} />
                  <span className="text-sm">Secure cloud backup</span>
                </li>
              </ul>
              <button
                onClick={signIn}
                className="w-full px-6 py-3 bg-[#A855F7] text-white rounded-lg hover:bg-[#9333EA] transition-colors font-semibold uppercase tracking-wide text-sm"
              >
                Sign In Now
              </button>
            </div>

            {/* Local storage info */}
            <div className="bg-mono-50 rounded-lg p-4 border border-mono-200">
              <div className="flex items-center gap-2 text-mono-700 mb-2">
                <HardDrive className="w-5 h-5" strokeWidth={2} />
                <span className="font-semibold text-sm">Local Storage</span>
              </div>
              <p className="text-xs text-mono-600">
                Your workout data is currently saved only in this browser.
                Sign in to sync across devices and enable cloud backup.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Authenticated user view
  return (
    <div className="max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        {/* Profile Header */}
        <div className="bg-white rounded-lg p-6 border border-mono-200">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              {getUserPicture() ? (
                <img
                  src={getUserPicture()}
                  alt="Profile"
                  className="w-20 h-20 rounded-full border-2 border-[#A855F7]"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-[#A855F7] flex items-center justify-center text-white font-bold text-3xl">
                  {getUserEmail()?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-mono-900">
                  {getUserDisplayName()}
                </h1>
                <p className="text-mono-500 text-sm">Member since {getMemberSince()}</p>
              </div>
            </div>
          </div>

          {/* User Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-4 bg-mono-50 rounded-lg border border-mono-200">
              <Mail className="w-5 h-5 text-[#06B6D4]" strokeWidth={2} />
              <div>
                <div className="text-xs text-mono-500 uppercase tracking-wide">Email</div>
                <div className="text-mono-900 font-medium">{getUserEmail()}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-mono-50 rounded-lg border border-mono-200">
              <Shield className="w-5 h-5 text-[#10B981]" strokeWidth={2} />
              <div>
                <div className="text-xs text-mono-500 uppercase tracking-wide">Plan</div>
                <div className="text-mono-900 font-medium capitalize">{getUserPlan()}</div>
              </div>
            </div>

            {identityId && (
              <div className="flex items-center gap-3 p-4 bg-mono-50 rounded-lg border border-mono-200">
                <Database className="w-5 h-5 text-[#6366F1]" strokeWidth={2} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-mono-500 uppercase tracking-wide">Identity ID</div>
                  <div className="text-mono-900 font-mono text-xs truncate">
                    {identityId}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sync Status */}
        <div className="bg-white rounded-lg p-6 border border-mono-200">
          <h2 className="text-lg font-bold text-mono-900 mb-4 flex items-center gap-2">
            <Cloud className="w-5 h-5 text-[#10B981]" strokeWidth={2} />
            Cloud Sync
          </h2>
          <div className="bg-[#10B981]/5 border-2 border-[#10B981]/20 rounded-lg p-4">
            <div className="flex items-center gap-2 text-[#10B981] font-semibold mb-2 text-sm">
              <div className="w-2 h-2 bg-[#10B981] rounded-full animate-pulse" />
              Connected
            </div>
            <p className="text-xs text-mono-600">
              Your workout data is automatically synced to the cloud. You can access it from any device by signing in.
            </p>
          </div>
        </div>

        {/* Workout Settings */}
        <div className="bg-white rounded-lg p-6 border border-mono-200">
          <h2 className="text-lg font-bold text-mono-900 mb-4 flex items-center gap-2">
            <Timer className="w-5 h-5 text-[#F97316]" strokeWidth={2} />
            Workout Settings
          </h2>

          <div className="space-y-4">
            {/* Rest Timer Setting */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm font-semibold text-mono-900">Rest Timer Duration</div>
                  <div className="text-xs text-mono-600">Time between sets (1-5 minutes)</div>
                </div>
                <div className="text-2xl font-bold text-[#F97316]">
                  {formatTime(localRestTimer)}
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex gap-2 mb-3">
                {[60, 120, 180, 240, 300].map((seconds) => (
                  <button
                    key={seconds}
                    onClick={() => setLocalRestTimer(seconds)}
                    className={`px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wide transition-colors ${
                      localRestTimer === seconds
                        ? 'bg-[#F97316] text-white'
                        : 'bg-mono-100 text-mono-700 hover:bg-mono-200'
                    }`}
                  >
                    {formatTime(seconds)}
                  </button>
                ))}
              </div>

              {/* Slider */}
              <input
                type="range"
                min="60"
                max="300"
                step="15"
                value={localRestTimer}
                onChange={(e) => handleRestTimerChange(e.target.value)}
                className="w-full h-2 bg-mono-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#F97316] [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#F97316] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0"
              />

              {/* Save Button */}
              {localRestTimer !== restTimerDuration && (
                <motion.button
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={handleSaveRestTimer}
                  disabled={isSavingTimer}
                  className="w-full mt-4 px-6 py-3 bg-[#F97316] hover:bg-[#EA580C] text-white rounded-lg transition-colors font-semibold uppercase tracking-wide text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingTimer ? 'Saving...' : 'Save Changes'}
                </motion.button>
              )}
            </div>
          </div>
        </div>

        {/* Deload Settings */}
        <div className="bg-white rounded-lg p-6 border border-mono-200">
          <h2 className="text-lg font-bold text-mono-900 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#0D9488]" strokeWidth={2} />
            Deload Mode
          </h2>

          <div className="space-y-6">
            {/* Deload Mode Toggle */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-sm font-semibold text-mono-900">Enable Deload Mode</div>
                  <div className="text-xs text-mono-600">Reduce workout intensity for recovery</div>
                </div>
                <button
                  onClick={() => setLocalDeloadMode(!localDeloadMode)}
                  className={`relative w-14 h-8 rounded-full transition-colors ${
                    localDeloadMode ? 'bg-[#0D9488]' : 'bg-mono-300'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                      localDeloadMode ? 'transform translate-x-6' : ''
                    }`}
                  />
                </button>
              </div>
              {localDeloadMode && (
                <div className="bg-[#0D9488]/5 border-2 border-[#0D9488]/20 rounded-lg p-3 mt-3">
                  <p className="text-xs text-mono-700">
                    When deload mode is active, reps and weight are reduced by the percentages below.
                    Sessions are tagged as deload workouts in your history.
                  </p>
                </div>
              )}
            </div>

            {/* Bodyweight Reps Percentage */}
            <div className={localDeloadMode ? 'opacity-100' : 'opacity-50 pointer-events-none'}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm font-semibold text-mono-900">Bodyweight Reps %</div>
                  <div className="text-xs text-mono-600">Push-ups, pull-ups (reps only)</div>
                </div>
                <div className="text-2xl font-bold text-[#0D9488]">
                  {localRepsOnlyPct}%
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex gap-2 mb-3">
                {[60, 70, 80, 90, 100].map((pct) => (
                  <button
                    key={`reps-only-${pct}`}
                    onClick={() => setLocalRepsOnlyPct(pct)}
                    className={`px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wide transition-colors ${
                      localRepsOnlyPct === pct
                        ? 'bg-[#0D9488] text-white'
                        : 'bg-mono-100 text-mono-700 hover:bg-mono-200'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>

              {/* Slider */}
              <input
                type="range"
                min="60"
                max="100"
                step="5"
                value={localRepsOnlyPct}
                onChange={(e) => setLocalRepsOnlyPct(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-mono-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#0D9488] [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#0D9488] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0"
              />
            </div>

            {/* Weighted Reps Percentage */}
            <div className={localDeloadMode ? 'opacity-100' : 'opacity-50 pointer-events-none'}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm font-semibold text-mono-900">Weighted Reps %</div>
                  <div className="text-xs text-mono-600">Dumbbells, barbells (reps)</div>
                </div>
                <div className="text-2xl font-bold text-[#0D9488]">
                  {localWeightedRepsPct}%
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex gap-2 mb-3">
                {[60, 70, 80, 90, 100].map((pct) => (
                  <button
                    key={`weighted-reps-${pct}`}
                    onClick={() => setLocalWeightedRepsPct(pct)}
                    className={`px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wide transition-colors ${
                      localWeightedRepsPct === pct
                        ? 'bg-[#0D9488] text-white'
                        : 'bg-mono-100 text-mono-700 hover:bg-mono-200'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>

              {/* Slider */}
              <input
                type="range"
                min="60"
                max="100"
                step="5"
                value={localWeightedRepsPct}
                onChange={(e) => setLocalWeightedRepsPct(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-mono-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#0D9488] [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#0D9488] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0"
              />
            </div>

            {/* Weight Percentage */}
            <div className={localDeloadMode ? 'opacity-100' : 'opacity-50 pointer-events-none'}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm font-semibold text-mono-900">Weight Percentage</div>
                  <div className="text-xs text-mono-600">How much weight during deload</div>
                </div>
                <div className="text-2xl font-bold text-[#0D9488]">
                  {localWeightPct}%
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex gap-2 mb-3">
                {[60, 70, 80, 90, 100].map((pct) => (
                  <button
                    key={`weight-${pct}`}
                    onClick={() => setLocalWeightPct(pct)}
                    className={`px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wide transition-colors ${
                      localWeightPct === pct
                        ? 'bg-[#0D9488] text-white'
                        : 'bg-mono-100 text-mono-700 hover:bg-mono-200'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>

              {/* Slider */}
              <input
                type="range"
                min="60"
                max="100"
                step="5"
                value={localWeightPct}
                onChange={(e) => setLocalWeightPct(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-mono-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#0D9488] [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#0D9488] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0"
              />
            </div>

            {/* Save Button */}
            {deloadSettingsChanged && (
              <motion.button
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={handleSaveDeload}
                disabled={isSavingDeload}
                className="w-full px-6 py-3 bg-[#0D9488] hover:bg-[#0F766E] text-white rounded-lg transition-colors font-semibold uppercase tracking-wide text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingDeload ? 'Saving...' : 'Save Deload Settings'}
              </motion.button>
            )}
          </div>
        </div>

        {/* Debug Info (Development only) */}
        {!import.meta.env.PROD && (
          <>
            {/* LocalStorage Stats */}
            <div className="bg-white rounded-lg p-6 border-2 border-[#06B6D4]/30">
              <h2 className="text-lg font-bold text-mono-900 mb-4 flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-[#06B6D4]" strokeWidth={2} />
                Debug: LocalStorage
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {(() => {
                  const stats = getLocalStorageStats();
                  if (stats.error) {
                    return <p className="text-red-600 text-sm col-span-2">{stats.error}</p>;
                  }
                  return (
                    <>
                      <div className="bg-mono-50 rounded-lg p-3 border border-mono-200">
                        <div className="text-xs text-mono-500 uppercase tracking-wide mb-1">Sessions</div>
                        <div className="text-2xl font-bold text-mono-900">{stats.sessionsCount}</div>
                      </div>
                      <div className="bg-mono-50 rounded-lg p-3 border border-mono-200">
                        <div className="text-xs text-mono-500 uppercase tracking-wide mb-1">Custom Exercises</div>
                        <div className="text-2xl font-bold text-mono-900">{stats.customExercisesCount}</div>
                      </div>
                      <div className="bg-mono-50 rounded-lg p-3 border border-mono-200">
                        <div className="text-xs text-mono-500 uppercase tracking-wide mb-1">Custom Templates</div>
                        <div className="text-2xl font-bold text-mono-900">{stats.customTemplatesCount}</div>
                      </div>
                      <div className="bg-mono-50 rounded-lg p-3 border border-mono-200">
                        <div className="text-xs text-mono-500 uppercase tracking-wide mb-1">Active Session</div>
                        <div className="text-2xl font-bold text-mono-900">{stats.hasActiveSession ? 'Yes' : 'No'}</div>
                      </div>
                      <div className="bg-mono-50 rounded-lg p-3 border border-mono-200 col-span-2">
                        <div className="text-xs text-mono-500 uppercase tracking-wide mb-1">Total Storage</div>
                        <div className="text-lg font-bold text-mono-900">{stats.totalStorageSize}</div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* AWS Config */}
            <div className="bg-white rounded-lg p-6 border-2 border-[#10B981]/30">
              <h2 className="text-lg font-bold text-mono-900 mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#10B981]" strokeWidth={2} />
                Debug: AWS Configuration
              </h2>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between py-2 border-b border-mono-200">
                  <span className="text-mono-500">Region:</span>
                  <span className="text-mono-900 font-bold">{awsConfig.region}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-mono-200">
                  <span className="text-mono-500">User Pool ID:</span>
                  <span className="text-mono-900 font-bold">{awsConfig.userPoolId}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-mono-200">
                  <span className="text-mono-500">Client ID:</span>
                  <span className="text-mono-900 font-bold break-all">{awsConfig.clientId}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-mono-200">
                  <span className="text-mono-500">Identity Pool:</span>
                  <span className="text-mono-900 font-bold break-all">{awsConfig.identityPoolId}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-mono-200">
                  <span className="text-mono-500">Cognito Domain:</span>
                  <span className="text-mono-900 font-bold break-all">{awsConfig.cognitoDomain}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-mono-500">BFF Endpoint:</span>
                  <span className="text-mono-900 font-bold break-all">{awsConfig.bffEndpoint}</span>
                </div>
              </div>
            </div>

            {/* Token Debug Info */}
            {user && (
              <div className="bg-white rounded-lg p-6 border-2 border-[#F97316]/30">
                <h2 className="text-lg font-bold text-mono-900 mb-4 flex items-center gap-2">
                  <span className="text-[#F97316]">🔧</span> Debug: ID Token
                </h2>
                <div className="bg-mono-900 rounded-lg p-4 overflow-auto max-h-96">
                  <pre className="text-xs text-mono-100 font-mono">
                    {JSON.stringify(user, null, 2)}
                  </pre>
                </div>
                <p className="text-xs text-mono-600 mt-2">
                  Raw JWT token claims. Use this to see all available user attributes.
                </p>
              </div>
            )}
          </>
        )}

        {/* Download All Your Data */}
        <div className="bg-white rounded-lg p-6 border border-mono-200">
          <h2 className="text-lg font-bold text-mono-900 mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-[#6366F1]" strokeWidth={2} />
            Your Data
          </h2>
          <p className="text-sm text-mono-600 mb-4">
            Download all your workout data for analysis or backup. Choose PDF for AI analysis or JSON for raw data.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={handleDownloadPDF}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-[#6366F1] hover:bg-[#4F46E5] text-white rounded-lg border-2 border-[#6366F1] transition-colors font-semibold uppercase tracking-wide text-sm"
            >
              <FileText className="w-5 h-5" strokeWidth={2} />
              Export PDF
            </button>
            <button
              onClick={handleDownloadAllData}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-mono-50 text-[#6366F1] rounded-lg border-2 border-[#6366F1] transition-colors font-semibold uppercase tracking-wide text-sm"
            >
              <Download className="w-5 h-5" strokeWidth={2} />
              Download JSON
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-lg p-6 border border-mono-200">
          <h2 className="text-lg font-bold text-mono-900 mb-4">Account Actions</h2>
          <button
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#EC4899]/5 hover:bg-[#EC4899]/10 text-[#DC2626] rounded-lg border-2 border-[#EC4899]/20 transition-colors font-semibold uppercase tracking-wide text-sm"
          >
            <LogOut className="w-5 h-5" strokeWidth={2} />
            Sign Out
          </button>
        </div>
      </motion.div>
    </div>
  );
}
