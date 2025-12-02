import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'warning' | 'success';
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default'
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const variants = {
    default: {
      bg: 'bg-mono-900',
      text: 'text-white',
      border: 'border-mono-900'
    },
    warning: {
      bg: 'bg-orange-500',
      text: 'text-white',
      border: 'border-orange-500'
    },
    success: {
      bg: 'bg-cyan-500',
      text: 'text-white',
      border: 'border-cyan-500'
    }
  };

  const style = variants[variant] || variants.default;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white border-2 border-mono-900 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`${style.bg} ${style.text} p-4 flex items-center justify-between`}>
              <h3 className="text-lg font-bold uppercase tracking-wide">
                {title}
              </h3>
              <button
                onClick={onClose}
                className="hover:opacity-70 transition-opacity"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {variant === 'warning' && (
                <div className="flex items-start gap-3 mb-4">
                  <AlertTriangle className="w-6 h-6 text-orange-500 flex-shrink-0 mt-1" />
                  <div className="text-sm text-mono-700 whitespace-pre-line">
                    {message}
                  </div>
                </div>
              )}
              {variant !== 'warning' && (
                <p className="text-mono-700 whitespace-pre-line">
                  {message}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-mono-200 flex gap-3">
              <motion.button
                onClick={onClose}
                className="flex-1 h-12 bg-mono-200 text-mono-900 font-bold uppercase tracking-wide text-sm hover:bg-mono-300 transition-colors"
                whileTap={{ scale: 0.98 }}
              >
                {cancelText}
              </motion.button>
              <motion.button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`flex-1 h-12 ${style.bg} ${style.text} font-bold uppercase tracking-wide text-sm hover:opacity-90 transition-opacity`}
                whileTap={{ scale: 0.98 }}
              >
                {confirmText}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
