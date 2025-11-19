import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

export default function WelcomeOnboardingModal() {
  const { isAuthenticated, signIn } = useAuth();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show modal to unauthenticated users
    if (isAuthenticated) {
      return;
    }

    // Check when user last dismissed the onboarding
    const lastDismissedTimestamp = localStorage.getItem('onboardingLastDismissed');

    if (lastDismissedTimestamp) {
      const lastDismissedDate = new Date(parseInt(lastDismissedTimestamp, 10));
      const now = new Date();
      const daysSinceLastDismissal = (now - lastDismissedDate) / (1000 * 60 * 60 * 24);

      // Only show again if it's been more than 3 days
      if (daysSinceLastDismissal < 3) {
        return;
      }
    }

    // Show after a brief delay for better UX
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, [isAuthenticated]);

  const handleDismiss = () => {
    setIsVisible(false);
    // Store timestamp of when user dismissed the onboarding
    localStorage.setItem('onboardingLastDismissed', Date.now().toString());
  };

  const handleSignIn = () => {
    setIsVisible(false);
    // Also store timestamp when user clicks sign in (in case they close the login window)
    localStorage.setItem('onboardingLastDismissed', Date.now().toString());
    signIn();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={handleDismiss}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white border-2 border-mono-900 max-w-md w-full">
              {/* Close button */}
              <button
                onClick={handleDismiss}
                className="absolute top-4 right-4 p-2 hover:bg-mono-100 transition-colors text-mono-500 hover:text-mono-900"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header */}
              <div className="bg-mono-900 px-6 py-4">
                <h2 className="text-xl font-bold text-white uppercase tracking-tight">
                  Sign In?
                </h2>
              </div>

              {/* Content */}
              <div className="px-6 py-6 space-y-4">
                <p className="text-mono-900 text-sm leading-relaxed">
                  Your data is stored in your browser. Sign in to sync across devices.
                </p>

                {/* CTA Buttons */}
                <div className="space-y-3 pt-2">
                  {/* Primary CTA - Sign In */}
                  <button
                    onClick={handleSignIn}
                    className="w-full py-4 px-6 bg-mono-900 hover:bg-mono-800 text-white font-bold uppercase text-sm tracking-wide transition-colors"
                  >
                    Sign In
                  </button>

                  {/* Secondary CTA - Continue as Guest */}
                  <button
                    onClick={handleDismiss}
                    className="w-full py-3 px-6 bg-white border-2 border-mono-900 hover:bg-mono-50 text-mono-900 font-bold uppercase text-sm tracking-wide transition-colors"
                  >
                    Continue as Guest
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
