import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, TrendingUp, Calendar, Activity, BarChart3, Target, Zap, Shield, CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LandingPage() {
  const { signIn, isLoading } = useAuth();

  const features = [
    {
      icon: Dumbbell,
      title: '70+ Exercise Library',
      description: 'Comprehensive database covering all major muscle groups with detailed exercise tracking',
      color: '#EC4899'
    },
    {
      icon: Activity,
      title: 'Scientific Analysis',
      description: 'Compare your lifts to strength standards and track performance metrics scientifically',
      color: '#6366F1'
    },
    {
      icon: TrendingUp,
      title: 'Progress Visualization',
      description: 'Beautiful charts showing volume, frequency, and strength gains over time',
      color: '#10B981'
    },
    {
      icon: Calendar,
      title: 'Session History',
      description: 'Complete workout logs with set-by-set details and performance comparisons',
      color: '#06B6D4'
    },
    {
      icon: Target,
      title: 'Smart Templates',
      description: '12+ workout templates that remember your previous performance',
      color: '#F97316'
    },
    {
      icon: Zap,
      title: 'Live Timers',
      description: 'Exercise and rest timers that keep you focused and on track',
      color: '#A855F7'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Authentication Loading Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-mono-900 z-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-center"
            >
              {/* Animated Logo */}
              <motion.div
                animate={{
                  rotate: [0, 360],
                  scale: [1, 1.1, 1]
                }}
                transition={{
                  rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                  scale: { duration: 1, repeat: Infinity, ease: "easeInOut" }
                }}
                className="w-20 h-20 bg-emerald-500 flex items-center justify-center mx-auto mb-6"
              >
                <Dumbbell className="w-12 h-12 text-white" strokeWidth={2.5} />
              </motion.div>

              {/* Loading Text */}
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-2xl font-black text-white mb-2 uppercase tracking-tight"
              >
                Signing You In
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-white/60 text-sm uppercase tracking-wide"
              >
                Loading your workout data...
              </motion.p>

              {/* Progress Dots */}
              <div className="flex gap-2 justify-center mt-6">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.3, 1, 0.3]
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: i * 0.2
                    }}
                    className="w-2 h-2 bg-emerald-400 rounded-full"
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Hero Section with Background Image */}
      <div className="relative h-[600px] bg-mono-900 overflow-hidden">
        {/* Hero Image - Using Unsplash gym/fitness photo */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070)',
            opacity: 0.4
          }}
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-mono-900/90 to-mono-900/70" />

        {/* Hero Content */}
        <div className="relative container mx-auto px-4 h-full flex items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-2xl"
          >
            {/* Logo Badge */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="inline-flex items-center gap-3 mb-6 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full"
            >
              <div className="w-8 h-8 bg-white flex items-center justify-center">
                <Dumbbell className="w-5 h-5 text-mono-900" strokeWidth={2.5} />
              </div>
              <span className="text-white font-bold text-sm uppercase tracking-wider">TheGradual</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight"
            >
              Track Every Rep.<br/>
              <span className="text-emerald-400">Master Every Goal.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="text-xl text-white/80 mb-8 leading-relaxed"
            >
              Your scientifically-backed gym tracker. Log workouts, analyze strength standards, visualize progress, and achieve peak performance.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.6 }}
              className="text-lg text-white/70 mb-8 leading-relaxed"
            >
              Select from any of the workouts below, or create your own from the exercise library.
            </motion.p>

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              whileHover={{ scale: isLoading ? 1 : 1.05 }}
              whileTap={{ scale: isLoading ? 1 : 0.95 }}
              onClick={signIn}
              disabled={isLoading}
              className="px-10 py-4 bg-white hover:bg-gray-100 text-mono-900 text-lg font-bold uppercase tracking-wide shadow-2xl transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  <Shield className="w-6 h-6" />
                  Sign In with Google
                </>
              )}
            </motion.button>
          </motion.div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-black text-mono-900 mb-4 uppercase tracking-tight">
            Everything You Need
          </h2>
          <p className="text-xl text-mono-600 max-w-2xl mx-auto">
            Professional-grade features designed for serious lifters
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 + index * 0.1, duration: 0.5 }}
              whileHover={{ y: -5 }}
              className="bg-white border-2 border-mono-200 p-6 hover:border-mono-900 transition-all"
            >
              <div
                className="w-14 h-14 flex items-center justify-center mb-4"
                style={{ backgroundColor: feature.color }}
              >
                <feature.icon className="w-8 h-8 text-white" strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-black text-mono-900 mb-3 uppercase tracking-tight">
                {feature.title}
              </h3>
              <p className="text-mono-600 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Analysis Highlight Section */}
      <div className="bg-mono-900 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.8, duration: 0.6 }}
            >
              <BarChart3 className="w-20 h-20 text-emerald-400 mx-auto mb-6" strokeWidth={2} />
              <h2 className="text-4xl md:text-5xl font-black text-white mb-6 uppercase tracking-tight">
                Scientific Analysis
              </h2>
              <p className="text-xl text-white/80 mb-8 leading-relaxed">
                Compare your lifts to validated strength standards. Track relative strength ratios.
                Identify weak points. Make data-driven decisions about your training.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                <div className="text-center">
                  <div className="text-4xl font-black text-emerald-400 mb-2">70+</div>
                  <div className="text-sm text-white/60 uppercase tracking-wide">Exercises</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-black text-emerald-400 mb-2">12+</div>
                  <div className="text-sm text-white/60 uppercase tracking-wide">Templates</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-black text-emerald-400 mb-2">100%</div>
                  <div className="text-sm text-white/60 uppercase tracking-wide">Cloud Synced</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Final CTA Section */}
      <div className="bg-white py-20">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.0, duration: 0.6 }}
            className="max-w-3xl mx-auto"
          >
            <h2 className="text-4xl md:text-5xl font-black text-mono-900 mb-6 uppercase tracking-tight">
              Ready to Transform Your Training?
            </h2>
            <p className="text-xl text-mono-600 mb-10">
              Join TheGradual and start tracking your progress with precision.
            </p>
            <button
              onClick={signIn}
              disabled={isLoading}
              className="px-12 py-5 bg-mono-900 hover:bg-mono-800 text-white text-xl font-bold uppercase tracking-wide transition-all inline-flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  <Shield className="w-6 h-6" />
                  Sign In Securely
                </>
              )}
            </button>
            <p className="text-sm text-mono-500 mt-6">
              Powered by AWS Cognito • Your data is encrypted and secure
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
