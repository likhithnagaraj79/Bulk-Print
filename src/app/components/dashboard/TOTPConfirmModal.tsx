import { useState } from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { Button } from "../ui/button";
import { TOTPInput } from "../TOTPInput";

interface TOTPConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (totpCode: string) => void;
  title: string;
  description: string;
}

export function TOTPConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
}: TOTPConfirmModalProps) {
  const [totpCode, setTotpCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = () => {
    if (totpCode.length !== 6) return;
    setIsSubmitting(true);
    onConfirm(totpCode);
    setTimeout(() => {
      setIsSubmitting(false);
      setTotpCode("");
    }, 600);
  };

  const handleClose = () => {
    setTotpCode("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md rounded-2xl border border-nexus-border bg-nexus-surface shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-nexus-border px-6 py-4">
          <h2 className="text-xl font-semibold text-nexus-text-primary">{title}</h2>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-nexus-text-hint transition-colors hover:bg-nexus-surface-muted hover:text-nexus-text-secondary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="mb-6 text-sm text-nexus-text-secondary">{description}</p>

          <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-6">
            <p className="mb-4 text-sm font-medium text-nexus-text-primary">
              Enter your 2FA code to confirm:
            </p>
            <TOTPInput value={totpCode} onChange={setTotpCode} onComplete={handleConfirm} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-nexus-border px-6 py-4">
          <Button type="button" variant="outline" onClick={handleClose} className="h-10">
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={totpCode.length !== 6 || isSubmitting}
            className="h-10 bg-red-600 hover:bg-red-700"
          >
            {isSubmitting ? "Confirming..." : "Confirm"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
