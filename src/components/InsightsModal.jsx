import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, TrendingUp, AlertTriangle, Info, Lightbulb } from 'lucide-react';

/**
 * InsightsModal - Display AI-powered workout insights
 * Shows insights, recommendations, and summary from AWS Bedrock analysis
 */
export default function InsightsModal({ isOpen, onClose, insights, loading, error }) {
  if (!isOpen) return null;

  // Icon mapping for insight types
  const getInsightIcon = (type) => {
    switch (type) {
      case 'progress':
        return <TrendingUp className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      case 'info':
        return <Info className="w-5 h-5" />;
      default:
        return <Sparkles className="w-5 h-5" />;
    }
  };

  // Color mapping for insight types
  const getInsightColor = (type) => {
    switch (type) {
      case 'progress':
        return 'emerald';
      case 'warning':
        return 'orange';
      case 'info':
        return 'cyan';
      default:
        return 'purple';
    }
  };

  // Priority badge color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'low':
        return 'text-cyan-600 bg-cyan-50 border-cyan-200';
      default:
        return 'text-mono-600 bg-mono-50 border-mono-200';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-4 md:inset-8 lg:inset-16 bg-white rounded-lg shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold uppercase tracking-tight">AI Workout Insights</h2>
                    <p className="text-sm text-white/80 uppercase tracking-wide">
                      Powered by Claude 3.5 Sonnet
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Loading State */}
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-16"
                >
                  <div className="inline-block">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="bg-purple-600 p-4 rounded-full mb-4"
                    >
                      <Sparkles className="w-8 h-8 text-white" />
                    </motion.div>
                  </div>
                  <h3 className="text-xl font-bold text-mono-900 mb-2 uppercase">Analyzing Your Workouts</h3>
                  <p className="text-mono-500 max-w-md mx-auto">
                    AI is reviewing your training history and comparing it with peer-reviewed hypertrophy research...
                  </p>
                  <p className="text-xs text-mono-400 mt-4">This may take 5-10 seconds</p>
                </motion.div>
              )}

              {/* Error State */}
              {error && !loading && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-red-50 border-2 border-red-200 rounded-lg p-6 text-center"
                >
                  <div className="bg-red-600 p-4 rounded-full inline-block mb-4">
                    <AlertTriangle className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-red-900 mb-2 uppercase">Error</h3>
                  <p className="text-red-700">{error}</p>
                  <button
                    onClick={onClose}
                    className="mt-4 px-6 py-2 bg-red-600 text-white font-semibold uppercase tracking-wide rounded hover:bg-red-700 transition-colors"
                  >
                    Close
                  </button>
                </motion.div>
              )}

              {/* Success State - Show Insights */}
              {!loading && !error && insights && (
                <>
                  {/* Summary Section */}
                  {insights.summary && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-lg p-6"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="bg-purple-600 p-2 rounded-lg">
                          <Info className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-mono-900 uppercase tracking-tight">
                          Summary
                        </h3>
                      </div>
                      <p className="text-mono-700 leading-relaxed">{insights.summary}</p>
                    </motion.div>
                  )}

                  {/* Insights Section */}
                  {insights.insights && insights.insights.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold text-mono-900 mb-4 uppercase tracking-tight flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-600" />
                        Key Insights
                      </h3>
                      <div className="space-y-3">
                        {insights.insights.map((insight, index) => {
                          const color = getInsightColor(insight.type);
                          return (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className={`bg-${color}-50 border-l-4 border-${color}-600 rounded-r-lg p-4`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`text-${color}-600 mt-0.5`}>
                                  {getInsightIcon(insight.type)}
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-bold text-mono-900 mb-1">
                                    {insight.title}
                                  </h4>
                                  <p className="text-mono-700 text-sm">{insight.message}</p>
                                  {insight.category && (
                                    <div className={`inline-block mt-2 px-2 py-1 rounded text-xs font-semibold uppercase tracking-wide bg-${color}-100 text-${color}-700`}>
                                      {insight.category}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Recommendations Section */}
                  {insights.recommendations && insights.recommendations.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold text-mono-900 mb-4 uppercase tracking-tight flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-orange-600" />
                        Recommendations
                      </h3>
                      <div className="space-y-3">
                        {insights.recommendations.map((rec, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: (insights.insights?.length || 0) * 0.1 + index * 0.1 }}
                            className="bg-white border-2 border-mono-200 rounded-lg p-4 hover:border-orange-400 transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              {rec.priority && (
                                <div className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide border ${getPriorityColor(rec.priority)}`}>
                                  {rec.priority}
                                </div>
                              )}
                              <div className="flex-1">
                                <h4 className="font-bold text-mono-900 mb-1">
                                  {rec.title}
                                </h4>
                                <p className="text-mono-700 text-sm">{rec.message}</p>
                                {rec.category && (
                                  <div className="inline-block mt-2 px-2 py-1 rounded text-xs font-semibold uppercase tracking-wide bg-orange-100 text-orange-700">
                                    {rec.category}
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty State */}
                  {(!insights.insights || insights.insights.length === 0) &&
                   (!insights.recommendations || insights.recommendations.length === 0) &&
                   !insights.summary && (
                    <div className="text-center py-16">
                      <div className="bg-mono-200 p-6 rounded-full inline-block mb-4">
                        <Sparkles className="w-12 h-12 text-mono-500" />
                      </div>
                      <h3 className="text-xl font-bold text-mono-900 mb-2 uppercase">No Insights Available</h3>
                      <p className="text-mono-500 max-w-md mx-auto">
                        Complete more workouts to receive personalized AI insights about your training.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-mono-200 p-4 bg-mono-50">
              <button
                onClick={onClose}
                className="w-full px-6 py-3 bg-mono-900 text-white font-semibold uppercase tracking-wide rounded hover:bg-mono-800 transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
