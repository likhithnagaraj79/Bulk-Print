import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { TOTPInput } from "./TOTPInput";
import { AuthService } from "../api/services/auth.service";

type AccountType = "" | "super_admin" | "admin" | "crew";
type CrewType = "" | "master" | "visitors" | "vips" | "foreign_delegates" | "exhibitors" | "organisers" | "speakers" | "delegates" | "sponsors";

interface LoginFormProps {
  onLoginAttempt: (accountType: string) => void;
  onSessionConflict: () => void;
  onAccountLocked: () => void;
}

export function LoginForm({ onLoginAttempt, onSessionConflict, onAccountLocked }: LoginFormProps) {
  const [accountType, setAccountType] = useState<AccountType>("");
  const [crewType, setCrewType] = useState<CrewType>("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showTOTP, setShowTOTP] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingToken, setPendingToken] = useState<string | null>(null);

  // Reset conditional fields when account type changes
  useEffect(() => {
    setCrewType("");
  }, [accountType]);

  const isFormValid = () => {
    if (!accountType || !username || !password) return false;
    if (accountType === "crew" && !crewType) return false;
    if (showTOTP && totpCode.length !== 6) return false;
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return;

    if (showTOTP) {
      await handleTOTPSubmit(totpCode);
      return;
    }

    setIsLoading(true);

    try {
      const payload: Parameters<typeof AuthService.login>[0] = {
        username,
        password,
        accountType,
      };
      if (accountType === "crew" && crewType) {
        payload.crewType = crewType;
      }

      const response = await AuthService.login(payload);

      if (response.success) {
        if (response.otpRequired) {
          setShowTOTP(true);
          setPendingToken(response.pendingToken || null);
          toast.success("Credentials verified. Enter 2FA code.");
        } else {
          toast.success("Login successful");
          onLoginAttempt(accountType);
        }
      } else {
        toast.error(response.message || "Invalid credentials");
      }
    } catch (error: any) {
      const status = error?.status as number | undefined;
      if (status === 423) {
        onAccountLocked();
        return;
      }
      if (status === 409) {
        onSessionConflict();
        return;
      }
      console.error("Login error:", error);
      toast.error(error?.message || "An error occurred during login");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTOTPSubmit = async (code: string) => {
    setTotpCode(code);
    if (code.length !== 6 || !pendingToken) return;

    setIsLoading(true);

    try {
      const response = await AuthService.verifyTotp({
        pendingToken,
        totpCode: code,
      });

      if (response.success) {
        toast.success("Authentication successful");
        onLoginAttempt(response.accountType || accountType);
      } else {
        toast.error(response.message || "Invalid code. Please try again.");
        setTotpCode("");
      }
    } catch (error: any) {
      console.error("TOTP error:", error);
      toast.error(error?.message || "An error occurred during verification");
      setTotpCode("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Header */}
      <div className="mb-10">
        <h2 className="mb-2 text-4xl font-semibold tracking-tight text-nexus-text-primary">
          Sign in
        </h2>
        <p className="text-base text-nexus-text-secondary">
          Access your NEXUS dashboard
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Account Type */}
        <div className="space-y-2">
          <Label htmlFor="accountType" className="text-sm font-medium text-nexus-text-label">
            Account Type
          </Label>
          <Select value={accountType} onValueChange={(value) => setAccountType(value as AccountType)}>
            <SelectTrigger
              id="accountType"
              className="h-12 border-nexus-border-strong bg-nexus-surface shadow-sm transition-all hover:border-nexus-border-strong focus:border-nexus-brand focus:ring-2 focus:ring-nexus-brand/20"
            >
              <SelectValue placeholder="Select account type" />
            </SelectTrigger>
            <SelectContent className="border-nexus-border bg-nexus-surface shadow-lg">
              <SelectItem value="super_admin">Super Admin</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="crew">Crew</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Crew Type - Conditional */}
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
                <Label htmlFor="crewType" className="text-sm font-medium text-nexus-text-label">
                  Crew Type
                </Label>
                <Select value={crewType} onValueChange={(value) => setCrewType(value as CrewType)}>
                  <SelectTrigger
                    id="crewType"
                    className="h-12 border-nexus-border-strong bg-nexus-surface shadow-sm transition-all hover:border-nexus-border-strong focus:border-nexus-brand focus:ring-2 focus:ring-nexus-brand/20"
                  >
                    <SelectValue placeholder="Select crew type" />
                  </SelectTrigger>
                  <SelectContent className="border-nexus-border bg-nexus-surface shadow-lg">
                    <SelectItem value="master">Master</SelectItem>
                    <SelectItem value="visitors">Visitors</SelectItem>
                    <SelectItem value="vips">VIPs</SelectItem>
                    <SelectItem value="foreign_delegates">Foreign Delegates</SelectItem>
                    <SelectItem value="exhibitors">Exhibitors</SelectItem>
                    <SelectItem value="organisers">Organisers</SelectItem>
                    <SelectItem value="speakers">Speakers</SelectItem>
                    <SelectItem value="delegates">Delegates</SelectItem>
                    <SelectItem value="sponsors">Sponsors</SelectItem>
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
            placeholder="Enter username"
            autoComplete="username"
            className="h-12 border-nexus-border-strong bg-nexus-surface shadow-sm transition-all placeholder:text-nexus-text-hint hover:border-nexus-border-strong focus:border-nexus-brand focus:ring-2 focus:ring-nexus-brand/20"
            style={{ fontFamily: "ui-monospace, 'SF Mono', 'Cascadia Code', 'Roboto Mono', monospace" }}
            disabled={showTOTP}
          />
        </div>

        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium text-nexus-text-label">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoComplete="current-password"
              className="h-12 border-nexus-border-strong bg-nexus-surface pr-12 shadow-sm transition-all placeholder:text-nexus-text-hint hover:border-nexus-border-strong focus:border-nexus-brand focus:ring-2 focus:ring-nexus-brand/20"
              disabled={showTOTP}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-nexus-text-hint transition-colors hover:bg-nexus-surface-muted hover:text-nexus-text-secondary"
              disabled={showTOTP}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* TOTP Section */}
        <AnimatePresence>
          {showTOTP && (
            <motion.div
              initial={{ height: 0, opacity: 0, marginTop: 0 }}
              animate={{ height: "auto", opacity: 1, marginTop: 32 }}
              exit={{ height: 0, opacity: 0, marginTop: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden rounded-xl border border-blue-200 bg-blue-50/50 p-6"
            >
              <Label className="mb-1 block text-sm font-semibold text-nexus-text-primary">
                Two-Factor Authentication
              </Label>
              <p className="mb-6 text-sm text-nexus-text-secondary">
                Enter the 6-digit code from your authenticator app
              </p>
              <TOTPInput value={totpCode} onChange={setTotpCode} onComplete={handleTOTPSubmit} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit Button */}
        <Button
          type="submit"
          className="group h-12 w-full bg-nexus-brand text-base font-medium text-white shadow-sm transition-all hover:bg-nexus-brand-hover hover:shadow-md active:scale-[0.98] disabled:opacity-50"
          disabled={!isFormValid() || isLoading}
        >
          <span className="flex items-center justify-center gap-2">
            {isLoading ? (
              <>
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Signing in...
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </span>
        </Button>

        {/* Forgot Password */}
        <div className="pt-2 text-center">
          <Link
            to="/forgot-password"
            className="text-sm font-medium text-nexus-brand transition-colors hover:text-nexus-brand-hover"
          >
            Forgot your password?
          </Link>
        </div>
      </form>

      {/* Footer */}
      <div className="mt-12 border-t border-nexus-border pt-6">
        <p className="text-center text-xs text-nexus-text-muted">
          Protected by enterprise-grade security. By signing in, you agree to our{" "}
          <button className="font-medium text-nexus-text-label hover:text-nexus-text-primary">Terms of Service</button>
        </p>
      </div>
    </motion.div>
  );
}