import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Eye, EyeOff, ArrowLeft, CheckCircle2, Lock } from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { TOTPInput } from "./TOTPInput";
import { PasswordStrengthMeter } from "./PasswordStrengthMeter";
import { AuthService } from "../api/services/auth.service";

type AccountType = "" | "super_admin" | "admin" | "crew";
type CrewType = "" | "master" | "visitors" | "vips" | "foreign_delegates" | "exhibitors" | "organisers" | "speakers" | "delegates" | "sponsors";

export function ForgotPasswordPage() {
  const [step, setStep] = useState<"form" | "success">("form");
  const [accountType, setAccountType] = useState<AccountType>("");
  const [crewType, setCrewType] = useState<CrewType>("");
  const [username, setUsername] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Reset conditional fields when account type changes
  useEffect(() => {
    setCrewType("");
  }, [accountType]);

  // Validate password requirements
  const validatePassword = (password: string) => {
    if (password.length < 12) return false;
    if ((password.match(/[A-Z]/g) || []).length < 2) return false;
    if ((password.match(/[0-9]/g) || []).length < 2) return false;
    if ((password.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g) || []).length < 2) return false;
    return true;
  };

  const isFormValid = () => {
    if (!accountType || !username || totpCode.length !== 6) return false;
    if (accountType === "crew" && !crewType) return false;
    if (!validatePassword(newPassword)) return false;
    if (newPassword !== confirmPassword) return false;
    return true;
  };

  const handleTOTPComplete = (code: string) => {
    setTotpCode(code);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return;

    setIsLoading(true);

    try {
      await AuthService.forgotPassword({
        accountType,
        crewType: accountType === "crew" ? crewType || null : null,
        username,
        totpCode,
        newPassword,
      });

      setStep("success");
      setTimeout(() => {
        window.location.href = "/";
      }, 3000);
    } catch (error: any) {
      toast.error(error?.message || "Invalid TOTP code or username. Please try again.");
      setTotpCode("");
    } finally {
      setIsLoading(false);
    }
  };

  const accountTypes = [
    { value: "super_admin", label: "Super Admin" },
    { value: "admin", label: "Admin" },
    { value: "crew", label: "Crew" },
  ];

  const crewTypes = [
    { value: "master", label: "Master" },
    { value: "visitors", label: "Visitors" },
    { value: "vips", label: "VIPs" },
    { value: "foreign_delegates", label: "Foreign Delegates" },
    { value: "exhibitors", label: "Exhibitors" },
    { value: "organisers", label: "Organisers" },
    { value: "speakers", label: "Speakers" },
    { value: "delegates", label: "Delegates" },
    { value: "sponsors", label: "Sponsors" },
  ];

  if (step === "success") {
    return (
      <div className="min-h-screen w-full bg-nexus-page-bg flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
            className="mb-8 inline-flex h-24 w-24 items-center justify-center rounded-full bg-green-50"
          >
            <CheckCircle2 className="h-12 w-12 text-green-600" strokeWidth={2} />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-4 text-4xl font-semibold tracking-tight text-nexus-text-primary"
          >
            Password Reset Complete
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-base text-nexus-text-secondary"
          >
            Your password has been successfully updated.<br />
            Redirecting you to login...
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8"
          >
            <div className="mx-auto h-1 w-48 overflow-hidden rounded-full bg-gray-200">
              <motion.div
                className="h-full bg-nexus-brand"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 3, ease: "linear" }}
              />
            </div>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-nexus-page-bg">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex min-h-screen items-center justify-center px-6 py-12"
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-[520px]"
        >
          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="rounded-2xl border border-nexus-border bg-nexus-surface p-10 shadow-sm"
          >
            {/* Header */}
            <div className="mb-8 text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.4 }}
                className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-nexus-brand-light"
              >
                <Lock className="h-8 w-8 text-nexus-brand" strokeWidth={2} />
              </motion.div>

              <h2 className="mb-2 text-3xl font-semibold tracking-tight text-nexus-text-primary">
                Reset Your Password
              </h2>
              <p className="text-base text-nexus-text-secondary">
                Verify your identity with your authenticator app
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Account Type Pills */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-nexus-text-label">Account Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  {accountTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setAccountType(type.value as AccountType)}
                      className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                        accountType === type.value
                          ? "border-nexus-brand bg-nexus-brand-light text-nexus-brand"
                          : "border-nexus-border-strong bg-nexus-surface text-nexus-text-label hover:border-nexus-border-strong"
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Crew Type */}
              <AnimatePresence>
                {accountType === "crew" && (
                  <motion.div
                    initial={{ height: 0, opacity: 0, marginTop: 0 }}
                    animate={{ height: "auto", opacity: 1, marginTop: 24 }}
                    exit={{ height: 0, opacity: 0, marginTop: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-nexus-text-label">Crew Type</Label>
                      <Select
                        value={crewType}
                        onValueChange={(value) => setCrewType(value as CrewType)}
                      >
                        <SelectTrigger className="h-12 border-nexus-border-strong bg-nexus-surface shadow-sm transition-all placeholder:text-nexus-text-hint hover:border-nexus-border-strong focus:border-nexus-brand focus:ring-2 focus:ring-nexus-brand/20">
                          <SelectValue placeholder="Select crew type" />
                        </SelectTrigger>
                        <SelectContent className="border-nexus-border bg-nexus-surface shadow-lg">
                          {crewTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium text-nexus-text-label">
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  autoComplete="username"
                  className="h-12 border-nexus-border-strong bg-nexus-surface shadow-sm transition-all placeholder:text-nexus-text-hint hover:border-nexus-border-strong focus:border-nexus-brand focus:ring-2 focus:ring-nexus-brand/20"
                  style={{ fontFamily: "ui-monospace, 'SF Mono', 'Cascadia Code', 'Roboto Mono', monospace" }}
                />
              </div>

              {/* TOTP Input */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-nexus-text-label">
                  Authenticator Code
                </Label>
                <p className="text-sm text-nexus-text-secondary">
                  Enter the 6-digit code from your authenticator app
                </p>
                <div className="pt-2">
                  <TOTPInput
                    value={totpCode}
                    onChange={setTotpCode}
                    onComplete={handleTOTPComplete}
                  />
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-sm font-medium text-nexus-text-label">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    autoComplete="new-password"
                    className="h-12 border-nexus-border-strong bg-nexus-surface pr-12 shadow-sm transition-all placeholder:text-nexus-text-hint hover:border-nexus-border-strong focus:border-nexus-brand focus:ring-2 focus:ring-nexus-brand/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-nexus-text-hint transition-colors hover:bg-nexus-surface-muted hover:text-nexus-text-secondary"
                  >
                    {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-nexus-text-label">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    autoComplete="new-password"
                    className="h-12 border-nexus-border-strong bg-nexus-surface pr-12 shadow-sm transition-all placeholder:text-nexus-text-hint hover:border-nexus-border-strong focus:border-nexus-brand focus:ring-2 focus:ring-nexus-brand/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-nexus-text-hint transition-colors hover:bg-nexus-surface-muted hover:text-nexus-text-secondary"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Password Strength Meter */}
              <PasswordStrengthMeter password={newPassword} confirmPassword={confirmPassword} />

              {/* Submit Button */}
              <Button
                type="submit"
                className="h-12 w-full bg-nexus-brand text-base font-medium text-white shadow-sm transition-all hover:bg-nexus-brand-hover hover:shadow-md active:scale-[0.98] disabled:opacity-50"
                disabled={!isFormValid() || isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Resetting password...
                  </span>
                ) : (
                  "Reset Password"
                )}
              </Button>

              {/* Back to Login */}
              <div className="pt-2 text-center">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 text-sm font-medium text-nexus-brand transition-colors hover:text-nexus-brand-hover"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Sign In
                </Link>
              </div>
            </form>
          </motion.div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-xs text-nexus-text-muted">
              Need help?{" "}
              <button className="font-medium text-nexus-text-label hover:text-nexus-text-primary">
                Contact Support
              </button>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}