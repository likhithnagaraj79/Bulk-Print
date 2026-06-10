import { motion } from "motion/react";
import { ShieldAlert } from "lucide-react";

interface AccountLockedBannerProps {
  remainingTime: number;
  onUnlock: () => void;
}

export function AccountLockedBanner({ remainingTime }: AccountLockedBannerProps) {
  const minutes = Math.floor(remainingTime / 60);
  const seconds = remainingTime % 60;
  const formattedTime = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border border-red-200 bg-nexus-surface p-12 text-center shadow-sm"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-red-50"
      >
        <ShieldAlert className="h-10 w-10 text-red-600" strokeWidth={1.5} />
      </motion.div>

      <h3 className="mb-3 text-3xl font-semibold tracking-tight text-nexus-text-primary">
        Account Locked
      </h3>
      
      <p className="mb-8 text-base text-nexus-text-secondary">
        Too many failed login attempts.<br />
        Please wait before trying again.
      </p>

      <motion.div
        className="inline-flex items-center justify-center rounded-xl bg-nexus-surface-hover px-10 py-5 shadow-inner"
        animate={{ opacity: [1, 0.7, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <span
          className="text-4xl font-semibold tabular-nums tracking-tight text-nexus-text-primary"
          style={{ 
            fontFamily: "ui-monospace, 'SF Mono', 'Cascadia Code', 'Roboto Mono', monospace",
            fontVariantNumeric: "tabular-nums"
          }}
        >
          {formattedTime}
        </span>
      </motion.div>

      <p className="mt-8 text-sm text-nexus-text-muted">
        Your account will automatically unlock when the timer reaches zero.
      </p>
    </motion.div>
  );
}
