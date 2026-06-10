import { useState } from "react";
import { motion } from "motion/react";
import { Check, X } from "lucide-react";

interface PasswordStrengthMeterProps {
  password: string;
  confirmPassword: string;
}

interface Requirement {
  label: string;
  test: (password: string) => boolean;
}

const requirements: Requirement[] = [
  {
    label: "At least 12 characters",
    test: (pwd) => pwd.length >= 12,
  },
  {
    label: "2+ uppercase letters",
    test: (pwd) => (pwd.match(/[A-Z]/g) || []).length >= 2,
  },
  {
    label: "2+ digits",
    test: (pwd) => (pwd.match(/[0-9]/g) || []).length >= 2,
  },
  {
    label: "2+ special characters",
    test: (pwd) => (pwd.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g) || []).length >= 2,
  },
];

export function PasswordStrengthMeter({ password, confirmPassword }: PasswordStrengthMeterProps) {
  const passedRequirements = requirements.filter((req) => req.test(password)).length;
  const totalRequirements = requirements.length;
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  
  // Calculate strength (0-5, including password match)
  const strength = password.length === 0 ? 0 : passedRequirements + (passwordsMatch ? 1 : 0);
  const strengthPercentage = (strength / 5) * 100;

  // Determine color based on strength
  const getStrengthColor = () => {
    if (strength <= 1) return "#EF4444"; // red
    if (strength <= 2) return "#F59E0B"; // orange
    if (strength <= 3) return "#FBBF24"; // yellow
    if (strength <= 4) return "#22C55E"; // light green
    return "#10B981"; // green
  };

  const getStrengthLabel = () => {
    if (password.length === 0) return "";
    if (strength <= 1) return "Weak";
    if (strength <= 2) return "Fair";
    if (strength <= 3) return "Good";
    if (strength <= 4) return "Strong";
    return "Excellent";
  };

  return (
    <div className="space-y-4">
      {/* Strength Bar */}
      {password.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-nexus-text-label">Password Strength</span>
            <span
              className="text-sm font-semibold"
              style={{ color: getStrengthColor() }}
            >
              {getStrengthLabel()}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <motion.div
              className="h-full rounded-full transition-all duration-300"
              style={{ backgroundColor: getStrengthColor() }}
              initial={{ width: 0 }}
              animate={{ width: `${strengthPercentage}%` }}
            />
          </div>
        </motion.div>
      )}

      {/* Requirements Checklist */}
      {password.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="space-y-2 rounded-xl border border-nexus-border bg-gray-50/50 p-4"
        >
          <p className="mb-3 text-sm font-semibold text-nexus-text-primary">Requirements</p>
          <div className="space-y-2">
            {requirements.map((req, index) => {
              const isPassed = req.test(password);
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-2"
                >
                  <div
                    className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full transition-colors ${
                      isPassed ? "bg-green-500" : "bg-gray-300"
                    }`}
                  >
                    {isPassed ? (
                      <Check className="h-3 w-3 text-white" strokeWidth={3} />
                    ) : (
                      <X className="h-3 w-3 text-nexus-text-muted" strokeWidth={3} />
                    )}
                  </div>
                  <span
                    className={`text-sm ${
                      isPassed ? "text-nexus-text-primary font-medium" : "text-nexus-text-secondary"
                    }`}
                  >
                    {req.label}
                  </span>
                </motion.div>
              );
            })}
            
            {/* Password Match Requirement */}
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: requirements.length * 0.05 }}
              className="flex items-center gap-2"
            >
              <div
                className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full transition-colors ${
                  passwordsMatch ? "bg-green-500" : "bg-gray-300"
                }`}
              >
                {passwordsMatch ? (
                  <Check className="h-3 w-3 text-white" strokeWidth={3} />
                ) : (
                  <X className="h-3 w-3 text-nexus-text-muted" strokeWidth={3} />
                )}
              </div>
              <span
                className={`text-sm ${
                  passwordsMatch ? "text-nexus-text-primary font-medium" : "text-nexus-text-secondary"
                }`}
              >
                Passwords match
              </span>
            </motion.div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
