/**
 * SyncStatusIndicator - Shows cloud sync status
 *
 * Displays:
 * - Online/Offline status
 * - Last sync time
 * - Sync in progress
 * - Manual sync button
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, CloudOff, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { useSyncStatus } from '../hooks/useStateManager';

export default function SyncStatusIndicator() {
  const { isOnline, lastSync, forceSync } = useSyncStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const handleForceSync = async () => {
    setIsSyncing(true);
    setSyncError(null);

    try {
      await forceSync();
      setShowDetails(true);
      setTimeout(() => setShowDetails(false), 3000);
    } catch (error) {
      setSyncError(error.message);
      setTimeout(() => setSyncError(null), 5000);
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusColor = () => {
    if (syncError) return 'text-red-500';
    if (!isOnline) return 'text-orange-500';
    return 'text-green-500';
  };

  const getStatusIcon = () => {
    if (syncError) return <AlertCircle className="w-4 h-4" />;
    if (isSyncing) return <RefreshCw className="w-4 h-4 animate-spin" />;
    if (!isOnline) return <CloudOff className="w-4 h-4" />;
    return <Cloud className="w-4 h-4" />;
  };

  const getStatusText = () => {
    if (syncError) return 'Sync Failed';
    if (isSyncing) return 'Syncing...';
    if (!isOnline) return 'Offline';
    return 'Synced';
  };

  const formatLastSync = () => {
    if (!lastSync) return 'Never';

    const now = new Date();
    const diff = now - lastSync;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 10) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return lastSync.toLocaleDateString();
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      <motion.button
        onClick={() => setShowDetails(!showDetails)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg
          bg-white border-2 border-mono-900
          hover:shadow-lg transition-shadow
          ${getStatusColor()}
        `}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {getStatusIcon()}
        <span className="text-sm font-semibold text-mono-900 uppercase tracking-tight">
          {getStatusText()}
        </span>
      </motion.button>

      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-full right-0 mt-2 w-64 bg-white border-2 border-mono-900 rounded-lg shadow-xl overflow-hidden"
          >
            <div className="bg-mono-900 text-white px-4 py-2">
              <h3 className="text-sm font-bold uppercase tracking-tight">Sync Status</h3>
            </div>

            <div className="p-4 space-y-3">
              {/* Connection Status */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-mono-500 uppercase">Connection</span>
                <div className="flex items-center gap-2">
                  {isOnline ? (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className="text-sm font-semibold text-green-600">Online</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-orange-500 rounded-full" />
                      <span className="text-sm font-semibold text-orange-600">Offline</span>
                    </>
                  )}
                </div>
              </div>

              {/* Last Sync */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-mono-500 uppercase">Last Sync</span>
                <span className="text-sm font-semibold text-mono-900">
                  {formatLastSync()}
                </span>
              </div>

              {/* Error Message */}
              {syncError && (
                <div className="bg-red-50 border border-red-200 rounded p-2">
                  <p className="text-xs text-red-700">{syncError}</p>
                </div>
              )}

              {/* Manual Sync Button */}
              <button
                onClick={handleForceSync}
                disabled={isSyncing || !isOnline}
                className={`
                  w-full flex items-center justify-center gap-2 px-4 py-2
                  bg-mono-900 text-white rounded
                  font-semibold text-sm uppercase tracking-tight
                  hover:bg-mono-800 transition-colors
                  disabled:bg-mono-300 disabled:cursor-not-allowed
                `}
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </button>

              {/* Info */}
              <div className="pt-2 border-t border-mono-200">
                <p className="text-xs text-mono-500">
                  Changes are automatically synced to the cloud every 2 seconds.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
