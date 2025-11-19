import { useState } from 'react';
import { User, LogOut, UserCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function AuthButton() {
  const { user, isAuthenticated, isLoading, signIn, signOut } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  if (isLoading) {
    return (
      <div className="w-8 h-8 rounded-full bg-mono-200 animate-pulse" />
    );
  }

  if (!isAuthenticated) {
    // Anonymous user - show sign in button
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          signIn();
        }}
        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-mono-900 text-white rounded-lg hover:bg-mono-800 transition-colors font-medium uppercase tracking-wide"
      >
        <User className="w-4 h-4" strokeWidth={2} />
        <span className="hidden sm:inline">Sign In</span>
      </button>
    );
  }

  // Helper functions to extract user data
  const getUserDisplayName = () => {
    return user?.name || user?.given_name || user?.email?.split('@')[0] || 'User';
  };

  const getUserEmail = () => {
    return user?.email || 'No email';
  };

  const getUserPlan = () => {
    return user?.['custom:plan'] || user?.plan || 'Free';
  };

  const getUserPicture = () => {
    return user?.picture || null;
  };

  // Authenticated user - show user menu
  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-mono-100 transition-colors border border-mono-200"
      >
        {getUserPicture() ? (
          <img
            src={getUserPicture()}
            alt="Profile"
            className="w-7 h-7 rounded-full border-2 border-[#A855F7]"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-[#A855F7] flex items-center justify-center text-white font-bold text-xs">
            {getUserEmail()?.[0]?.toUpperCase() || 'U'}
          </div>
        )}
        <div className="hidden md:block text-left">
          <div className="text-sm font-semibold text-mono-900">
            {getUserDisplayName()}
          </div>
          <div className="text-xs text-mono-500 uppercase tracking-wide">
            {getUserPlan()}
          </div>
        </div>
      </button>

      <AnimatePresence>
        {showMenu && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />

            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-64 bg-white border-2 border-mono-200 rounded-lg shadow-2xl z-50 overflow-hidden"
            >
              {/* User info */}
              <div className="p-4 border-b border-mono-200 bg-mono-50">
                <div className="flex items-center gap-3">
                  {getUserPicture() ? (
                    <img
                      src={getUserPicture()}
                      alt="Profile"
                      className="w-12 h-12 rounded-full border-2 border-[#A855F7]"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#A855F7] flex items-center justify-center text-white font-bold text-lg">
                      {getUserEmail()?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-mono-900 truncate">
                      {getUserDisplayName()}
                    </div>
                    <div className="text-xs text-mono-500 truncate">
                      {getUserEmail()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Menu items */}
              <div className="p-2">
                <a
                  href="/profile"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-mono-100 transition-colors text-mono-700 hover:text-mono-900"
                  onClick={() => setShowMenu(false)}
                >
                  <UserCircle className="w-5 h-5 text-[#06B6D4]" strokeWidth={2} />
                  <span className="text-sm font-semibold">Profile</span>
                </a>

                <button
                  onClick={() => {
                    setShowMenu(false);
                    signOut();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-mono-100 transition-colors text-mono-700 hover:text-mono-900"
                >
                  <LogOut className="w-5 h-5 text-[#EC4899]" strokeWidth={2} />
                  <span className="text-sm font-semibold">Sign Out</span>
                </button>
              </div>

              {/* Plan info */}
              <div className="p-3 bg-[#10B981]/5 border-t border-mono-200">
                <div className="text-xs text-mono-500 uppercase tracking-wide">
                  Current Plan
                </div>
                <div className="text-sm font-bold text-mono-900 capitalize">
                  {getUserPlan()}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
