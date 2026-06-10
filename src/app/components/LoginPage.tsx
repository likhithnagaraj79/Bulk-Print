import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import { BrandingPanel } from "./BrandingPanel";
import { LoginForm } from "./LoginForm";
import { SessionModal } from "./SessionModal";
import { AccountLockedBanner } from "./AccountLockedBanner";

export function LoginPage() {
  const navigate = useNavigate();
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [isAccountLocked, setIsAccountLocked] = useState(false);
  const [lockdownTime, setLockdownTime] = useState(900); // 15 minutes — matches backend ACCOUNT_LOCKOUT_DURATION

  // Account lockdown countdown timer
  useEffect(() => {
    if (!isAccountLocked) return;

    const timer = setInterval(() => {
      setLockdownTime((prev) => {
        if (prev <= 1) {
          setIsAccountLocked(false);
          return 900;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isAccountLocked]);

  const handleAccountLocked = () => {
    setLockdownTime(900);
    setIsAccountLocked(true);
  };

  const handleLoginAttempt = (accountType: string) => {
    // Redirect based on role
    switch (accountType) {
      case "super_admin":
        navigate("/super-admin");
        break;
      case "admin":
        navigate("/admin");
        break;
      case "crew":
        navigate("/crew");
        break;
      default:
        navigate("/");
        break;
    }
  };

  const handleSessionConflict = () => {
    setShowSessionModal(true);
  };

  return (
    <div className="min-h-screen w-full bg-nexus-page-bg">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="grid min-h-screen lg:grid-cols-2"
      >
        {/* Left Branding Panel */}
        <BrandingPanel />

        {/* Right Login Form Panel */}
        <div className="relative flex items-center justify-center px-6 py-12 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="w-full max-w-[440px]"
          >
            <AnimatePresence mode="wait">
              {isAccountLocked ? (
                <AccountLockedBanner
                  key="locked"
                  remainingTime={lockdownTime}
                  onUnlock={() => setIsAccountLocked(false)}
                />
              ) : (
                <LoginForm
                  key="form"
                  onLoginAttempt={handleLoginAttempt}
                  onSessionConflict={handleSessionConflict}
                  onAccountLocked={handleAccountLocked}
                />
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </motion.div>

      {/* Session Modal */}
      <SessionModal
        isOpen={showSessionModal}
        onClose={() => setShowSessionModal(false)}
        onConfirm={() => {
          setShowSessionModal(false);
          // Handle session takeover
        }}
      />
    </div>
  );
}