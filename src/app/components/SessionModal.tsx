import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "./ui/button";

interface SessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function SessionModal({ isOpen, onClose, onConfirm }: SessionModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl bg-nexus-surface shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute right-4 top-4 rounded-lg p-2 text-nexus-text-hint transition-colors hover:bg-nexus-surface-muted hover:text-nexus-text-secondary"
              >
                <X className="h-5 w-5" strokeWidth={2} />
              </button>

              {/* Content */}
              <div className="p-8">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-50"
                >
                  <AlertTriangle className="h-8 w-8 text-amber-600" strokeWidth={2} />
                </motion.div>

                <h3 className="mb-3 text-2xl font-semibold tracking-tight text-nexus-text-primary">
                  Active Session Detected
                </h3>

                <p className="mb-8 leading-relaxed text-nexus-text-secondary">
                  There is an active session on another device. Continuing here will end the
                  previous session and sign you out from that device.
                </p>

                {/* Buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={onClose}
                    variant="outline"
                    className="h-11 flex-1 border-nexus-border-strong bg-nexus-surface font-medium text-nexus-text-label shadow-sm hover:bg-nexus-surface-hover"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={onConfirm}
                    className="h-11 flex-1 bg-red-600 font-medium text-white shadow-sm hover:bg-red-700"
                  >
                    End Session & Continue
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
