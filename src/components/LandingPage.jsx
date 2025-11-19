import { motion } from 'framer-motion';
import { Dumbbell, TrendingUp, Calendar, Cloud, Shield, Database } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LandingPage() {
  const { signIn } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-mono-50 via-white to-mono-100">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center"
        >
          {/* Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex items-center justify-center gap-4 mb-8"
          >
            <Dumbbell size={64} className="text-[#A855F7]" strokeWidth={2} />
            <h1 className="text-6xl font-bold text-mono-900 tracking-tight">
              TheGradual.com
            </h1>
          </motion.div>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-2xl text-mono-600 mb-12 max-w-2xl mx-auto"
          >
            Your step-by-step gym tracker. Track workouts, analyze progress, and achieve your fitness goals with science-backed precision.
          </motion.p>

          {/* CTA Button */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={signIn}
            className="px-12 py-5 bg-[#A855F7] hover:bg-[#9333EA] text-white text-xl font-bold rounded-lg shadow-lg hover:shadow-xl transition-all uppercase tracking-wide"
          >
            Sign In to Start
          </motion.button>

          {/* Features Grid */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20"
          >
            {/* Feature 1: Cloud Sync */}
            <div className="bg-white rounded-lg p-6 border-2 border-mono-200 hover:border-[#10B981] transition-colors">
              <div className="flex items-center justify-center w-16 h-16 bg-[#10B981]/10 rounded-full mx-auto mb-4">
                <Cloud className="w-8 h-8 text-[#10B981]" strokeWidth={2} />
              </div>
              <h3 className="text-xl font-bold text-mono-900 mb-2">Cloud Sync</h3>
              <p className="text-mono-600 text-sm">
                Access your workouts on any device. Your data is automatically synced to the cloud.
              </p>
            </div>

            {/* Feature 2: Progress Tracking */}
            <div className="bg-white rounded-lg p-6 border-2 border-mono-200 hover:border-[#06B6D4] transition-colors">
              <div className="flex items-center justify-center w-16 h-16 bg-[#06B6D4]/10 rounded-full mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-[#06B6D4]" strokeWidth={2} />
              </div>
              <h3 className="text-xl font-bold text-mono-900 mb-2">Track Progress</h3>
              <p className="text-mono-600 text-sm">
                Visualize your strength gains with detailed charts and progressive overload tracking.
              </p>
            </div>

            {/* Feature 3: Workout History */}
            <div className="bg-white rounded-lg p-6 border-2 border-mono-200 hover:border-[#EC4899] transition-colors">
              <div className="flex items-center justify-center w-16 h-16 bg-[#EC4899]/10 rounded-full mx-auto mb-4">
                <Calendar className="w-8 h-8 text-[#EC4899]" strokeWidth={2} />
              </div>
              <h3 className="text-xl font-bold text-mono-900 mb-2">Session History</h3>
              <p className="text-mono-600 text-sm">
                Review every workout with detailed logs of sets, reps, and weights.
              </p>
            </div>
          </motion.div>

          {/* Security Badge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0, duration: 0.5 }}
            className="mt-16 flex items-center justify-center gap-2 text-mono-500 text-sm"
          >
            <Shield className="w-5 h-5" strokeWidth={2} />
            <span>Secure authentication powered by AWS Cognito</span>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
