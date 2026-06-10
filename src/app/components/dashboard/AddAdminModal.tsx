import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Eye, EyeOff, Copy, Check } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { PasswordStrengthMeter } from "../PasswordStrengthMeter";
import { TOTPInput } from "../TOTPInput";
import QRCode from "qrcode";
import { generateSecret, keyuri, check } from "../../utils/totp";
import { toast } from "sonner";

interface AddAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

type Step = 1 | 2 | 3;

export function AddAdminModal({ isOpen, onClose, onSubmit }: AddAdminModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phoneCountryCode: "+91",
    phoneNumber: "",
    companyEmail: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [totpSecret, setTotpSecret] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validatePassword = (password: string) => {
    if (password.length < 12) return false;
    if ((password.match(/[A-Z]/g) || []).length < 2) return false;
    if ((password.match(/[0-9]/g) || []).length < 2) return false;
    if ((password.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g) || []).length < 2) return false;
    return true;
  };

  const isStep1Valid = () => {
    return (
      formData.name.length > 0 &&
      formData.name.length <= 32 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) &&
      formData.phoneNumber.length === 10 &&
      /^\d{10}$/.test(formData.phoneNumber) &&
      (!formData.companyEmail || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.companyEmail)) &&
      validatePassword(formData.password) &&
      formData.password === formData.confirmPassword
    );
  };

  const handleStep1Continue = async () => {
    if (!isStep1Valid()) return;

    try {
      // Generate TOTP secret
      const secret = generateSecret();
      setTotpSecret(secret);

      // Generate QR code
      const otpauthUrl = keyuri(formData.email, "NEXUS", secret);
      const qrUrl = await QRCode.toDataURL(otpauthUrl);
      setQrCodeUrl(qrUrl);

      setStep(2);
    } catch (error: any) {
      console.error("AddAdminModal: Error in step 1 transition:", error);
      toast.error(`Transition failed: ${error.message || "Unknown error"}. Check console for details.`);
    }
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(totpSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStep2Continue = () => {
    setStep(3);
  };

  const handleFinalSubmit = async () => {
    if (totpCode.length !== 6) return;

    setIsSubmitting(true);

    // Verify TOTP code
    const isValid = await check(totpCode, totpSecret);

    if (!isValid) {
      alert("Invalid TOTP code. Please try again.");
      setIsSubmitting(false);
      setTotpCode("");
      return;
    }

    // Submit to backend
    // POST http://localhost:8000/api/v1/users/admins
    const adminData = {
      name: formData.name,
      email: formData.email,
      phoneCountryCode: formData.phoneCountryCode,
      phoneNumber: formData.phoneNumber,
      companyEmail: formData.companyEmail || undefined,
      password: formData.password,
      totpSecret,
      totpCode,
    };

    onSubmit(adminData);
    handleClose();
  };

  const handleClose = () => {
    setStep(1);
    setFormData({
      name: "",
      email: "",
      phoneCountryCode: "+91",
      phoneNumber: "",
      companyEmail: "",
      password: "",
      confirmPassword: "",
    });
    setTotpSecret("");
    setQrCodeUrl("");
    setTotpCode("");
    setIsSubmitting(false);
    onClose();
  };

  const capitalizeFirstLetter = (value: string) => {
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl rounded-2xl border border-nexus-border bg-nexus-surface shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-nexus-border px-6 py-4">
          <div>
            <h2 className="text-2xl font-semibold text-nexus-text-primary">Add New Admin</h2>
            <p className="mt-1 text-sm text-nexus-text-secondary">
              Step {step} of 3 - {step === 1 ? "Fill Details" : step === 2 ? "TOTP Setup" : "Confirm Code"}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-nexus-text-hint transition-colors hover:bg-nexus-surface-muted hover:text-nexus-text-secondary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 border-b border-nexus-border px-6 py-4">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 w-16 rounded-full transition-colors ${s === step ? "bg-nexus-brand" : s < step ? "bg-green-500" : "bg-gray-200"
                }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="max-h-[calc(100vh-16rem)] overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {/* Step 1: Fill Details */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="grid gap-6 sm:grid-cols-2">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value.length <= 32) {
                          setFormData((prev) => ({
                            ...prev,
                            name: capitalizeFirstLetter(value),
                          }));
                        }
                      }}
                      placeholder="John Doe"
                      className="h-11"
                    />
                    <p className="text-xs text-nexus-text-muted">{formData.name.length}/32 characters</p>
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email">
                      Email (Username) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="john@nexus.com"
                      className="h-11"
                    />
                  </div>

                  {/* Country Code */}
                  <div className="space-y-2">
                    <Label htmlFor="countryCode">
                      Country Code <span className="text-red-500">*</span>
                    </Label>
                    <select
                      id="countryCode"
                      value={formData.phoneCountryCode}
                      onChange={(e) => setFormData((prev) => ({ ...prev, phoneCountryCode: e.target.value }))}
                      className="h-11 w-full rounded-lg border border-nexus-border-strong bg-nexus-surface px-3 text-sm shadow-sm"
                    >
                      <option value="+91">🇮🇳 +91 (India)</option>
                      <option value="+1">🇺🇸 +1 (USA)</option>
                      <option value="+44">🇬🇧 +44 (UK)</option>
                      <option value="+971">🇦🇪 +971 (UAE)</option>
                    </select>
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <Label htmlFor="phone">
                      Phone Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "");
                        if (value.length <= 10) {
                          setFormData((prev) => ({ ...prev, phoneNumber: value }));
                        }
                      }}
                      placeholder="9876543210"
                      className="h-11 font-mono"
                    />
                    <p className="text-xs text-nexus-text-muted">Exactly 10 digits</p>
                  </div>

                  {/* Company Email */}
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="companyEmail">Company Email (Optional)</Label>
                    <Input
                      id="companyEmail"
                      type="email"
                      value={formData.companyEmail}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, companyEmail: e.target.value }))
                      }
                      placeholder="john@blueberit.com"
                      className="h-11"
                    />
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <Label htmlFor="password">
                      Password <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, password: e.target.value }))
                        }
                        placeholder="Enter password"
                        className="h-11 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-nexus-text-hint"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">
                      Confirm Password <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                        }
                        placeholder="Re-enter password"
                        className="h-11 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-nexus-text-hint"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Password Strength Meter */}
                <PasswordStrengthMeter
                  password={formData.password}
                  confirmPassword={formData.confirmPassword}
                />
              </motion.div>
            )}

            {/* Step 2: TOTP QR Setup */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 text-center"
              >
                <div>
                  <h3 className="text-lg font-semibold text-nexus-text-primary">
                    Scan QR Code with Authenticator App
                  </h3>
                  <p className="mt-2 text-sm text-nexus-text-secondary">
                    Use Google Authenticator, Microsoft Authenticator, or any compatible TOTP app
                  </p>
                </div>

                {/* QR Code */}
                <div className="flex justify-center">
                  <div className="rounded-xl border-2 border-nexus-border bg-nexus-surface p-6 shadow-sm">
                    {qrCodeUrl ? (
                      <img src={qrCodeUrl} alt="TOTP QR Code" className="h-64 w-64" />
                    ) : (
                      <div className="flex h-64 w-64 items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-nexus-border-strong border-t-nexus-brand" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Manual Entry */}
                <div className="rounded-lg border border-nexus-border bg-nexus-surface-hover p-4">
                  <p className="mb-2 text-sm font-medium text-nexus-text-label">
                    Or enter this secret key manually:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded bg-nexus-surface px-3 py-2 font-mono text-sm text-nexus-text-primary">
                      {totpSecret}
                    </code>
                    <Button
                      type="button"
                      onClick={handleCopySecret}
                      variant="outline"
                      className="h-10 px-3"
                    >
                      {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Confirm TOTP */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-nexus-text-primary">Enter Verification Code</h3>
                  <p className="mt-2 text-sm text-nexus-text-secondary">
                    Enter the 6-digit code from your authenticator app to complete setup
                  </p>
                </div>

                <div className="flex justify-center rounded-lg border border-blue-200 bg-blue-50/50 p-6">
                  <TOTPInput
                    value={totpCode}
                    onChange={setTotpCode}
                    onComplete={handleFinalSubmit}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-nexus-border px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={step === 1 ? handleClose : () => setStep((step - 1) as Step)}
            className="h-10"
          >
            {step === 1 ? "Cancel" : "Back"}
          </Button>

          {step === 1 && (
            <Button
              type="button"
              onClick={handleStep1Continue}
              disabled={!isStep1Valid()}
              className="h-10 bg-nexus-brand hover:bg-nexus-brand-hover"
            >
              Continue
            </Button>
          )}

          {step === 2 && (
            <Button
              type="button"
              onClick={handleStep2Continue}
              className="h-10 bg-nexus-brand hover:bg-nexus-brand-hover"
            >
              I've Scanned the QR Code
            </Button>
          )}

          {step === 3 && (
            <Button
              type="button"
              onClick={handleFinalSubmit}
              disabled={totpCode.length !== 6 || isSubmitting}
              className="h-10 bg-nexus-brand hover:bg-nexus-brand-hover"
            >
              {isSubmitting ? "Creating..." : "Create Admin"}
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}