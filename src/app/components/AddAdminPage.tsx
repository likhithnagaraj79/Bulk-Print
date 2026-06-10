import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Copy, Check, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { UserService } from "../api/services/user.service";
import { TopNav } from "./dashboard/TopNav";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { PasswordStrengthMeter } from "./PasswordStrengthMeter";
import { TOTPInput } from "./TOTPInput";
import QRCode from "qrcode";
import { generateSecret, keyuri, check } from "../utils/totp";

type Step = 1 | 2 | 3;

export function AddAdminPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>(1);
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
  const [secretRevealed, setSecretRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrTimer, setQrTimer] = useState(300); // 5 minutes
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
      /^[A-Z]/.test(formData.name) &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) &&
      formData.phoneNumber.length === 10 &&
      /^\d{10}$/.test(formData.phoneNumber) &&
      (!formData.companyEmail || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.companyEmail)) &&
      validatePassword(formData.password) &&
      formData.password === formData.confirmPassword
    );
  };

  const generateQRCode = async () => {
    try {
      // Generate TOTP secret
      const secret = generateSecret();
      setTotpSecret(secret);

      // Generate QR code
      const otpauthUrl = keyuri(formData.email, "NEXUS", secret);
      const qrUrl = await QRCode.toDataURL(otpauthUrl);
      setQrCodeUrl(qrUrl);
      setQrTimer(300); // Reset timer
    } catch (error: any) {
      console.error("AddAdminPage: Error in generateQRCode:", error);
      throw error;
    }
  };

  const handleStep1Next = async () => {
    if (!isStep1Valid()) return;
    try {
      await generateQRCode();
      setCurrentStep(2);
    } catch (error: any) {
      console.error("AddAdminPage: Error in step 1 transition:", error);
      toast.error(`Transition failed: ${error.message || "Unknown error"}`);
    }
  };

  const handleStep2Next = () => {
    setCurrentStep(3);
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(totpSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerateQR = async () => {
    await generateQRCode();
    toast.success("New QR code generated");
  };

  const handleFinish = async () => {
    if (totpCode.length !== 6) return;

    setIsSubmitting(true);

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

    try {
      const response = await UserService.addAdmin(adminData);
      if (response.success) {
        toast.success("Admin created successfully!");
        navigate("/super-admin");
      } else {
        toast.error("Failed to create admin");
        setIsSubmitting(false);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to create admin");
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
    } else {
      navigate("/super-admin");
    }
  };

  const capitalizeFirstLetter = (value: string) => {
    if (value.length === 0) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  const getMaskedSecret = () => {
    if (!totpSecret) return "";
    return `${totpSecret.slice(0, 4)}${"•".repeat(totpSecret.length - 8)}${totpSecret.slice(-4)}`;
  };

  return (
    <div className="min-h-screen w-full bg-nexus-page-bg pt-16">
      {/* Top Navigation */}
      <TopNav />

      {/* Main Content */}
      <div className="mx-auto max-w-4xl px-6 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 text-center"
        >
          <h1 className="text-3xl font-semibold text-nexus-text-primary">Add New Admin</h1>
          <p className="mt-2 text-base text-nexus-text-secondary">
            Create a new administrator account with 2FA authentication
          </p>
        </motion.div>

        {/* Step Indicator */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-12"
        >
          <div className="flex items-center justify-center">
            {[1, 2, 3].map((step, index) => (
              <div key={step} className="flex items-center">
                {/* Step Circle */}
                <button
                  onClick={() => {
                    if (step < currentStep) setCurrentStep(step as Step);
                  }}
                  disabled={step >= currentStep}
                  className={`relative flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all ${step < currentStep
                    ? "border-nexus-brand bg-nexus-brand text-white hover:bg-nexus-brand-hover"
                    : step === currentStep
                      ? "border-nexus-brand bg-nexus-brand text-white shadow-lg ring-4 ring-blue-100"
                      : "border-nexus-border-strong bg-nexus-surface text-nexus-text-hint"
                    }`}
                >
                  {step < currentStep ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : (
                    <span className="text-lg font-semibold">{step}</span>
                  )}
                </button>

                {/* Step Label */}
                <div className="absolute mt-20 w-32 text-center">
                  <p
                    className={`text-sm font-medium ${step <= currentStep ? "text-nexus-text-primary" : "text-nexus-text-muted"
                      }`}
                  >
                    {step === 1 ? "Fill Details" : step === 2 ? "Scan QR" : "Confirm Code"}
                  </p>
                </div>

                {/* Connector Line */}
                {index < 2 && (
                  <div
                    className={`mx-4 h-0.5 w-24 transition-colors sm:w-32 ${step < currentStep ? "bg-nexus-brand" : "bg-gray-300"
                      }`}
                  />
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Step Content Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="rounded-2xl border border-nexus-border bg-nexus-surface p-8 shadow-sm sm:p-10"
        >
          <AnimatePresence mode="wait">
            {/* Step 1: Fill Details */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-semibold text-nexus-text-primary">Admin Details</h2>
                  <p className="mt-1 text-sm text-nexus-text-secondary">
                    Enter the basic information for the new administrator
                  </p>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Full Name <span className="text-red-500">*</span>
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
                    <p className="text-xs text-nexus-text-muted">This will be the username for login</p>
                  </div>

                  {/* Country Code */}
                  <div className="space-y-2">
                    <Label htmlFor="countryCode">
                      Country Code <span className="text-red-500">*</span>
                    </Label>
                    <select
                      id="countryCode"
                      value={formData.phoneCountryCode}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, phoneCountryCode: e.target.value }))
                      }
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
                      inputMode="numeric"
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

            {/* Step 2: Scan QR */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <div className="text-center">
                  <h2 className="text-2xl font-semibold text-nexus-text-primary">
                    Set Up 2-Factor Authentication
                  </h2>
                  <p className="mt-2 text-sm text-nexus-text-secondary">
                    Scan the QR code with Google Authenticator or any compatible TOTP app
                  </p>
                </div>

                {/* QR Code */}
                <div className="flex justify-center">
                  <div className="rounded-2xl border-2 border-nexus-border bg-nexus-surface p-8 shadow-lg">
                    {qrCodeUrl ? (
                      <img src={qrCodeUrl} alt="TOTP QR Code" className="h-[280px] w-[280px]" />
                    ) : (
                      <div className="flex h-[280px] w-[280px] items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-nexus-border-strong border-t-nexus-brand" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Timer */}
                <div className="flex justify-center">
                  <div
                    className={`rounded-full px-4 py-2 text-sm font-medium ${qrTimer < 30
                      ? "animate-pulse bg-red-100 text-red-700"
                      : qrTimer < 60
                        ? "bg-amber-100 text-amber-700"
                        : "bg-nexus-brand-light text-blue-700"
                      }`}
                  >
                    QR valid for {formatTimer(qrTimer)}
                  </div>
                </div>

                {/* Instructions */}
                <div className="rounded-xl border border-blue-200 bg-nexus-brand-light p-6">
                  <h3 className="mb-3 font-semibold text-nexus-text-primary">How to scan:</h3>
                  <ol className="space-y-2 text-sm text-nexus-text-label">
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-nexus-brand">1.</span>
                      <span>Open Google Authenticator, Microsoft Authenticator, or any TOTP app</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-nexus-brand">2.</span>
                      <span>Tap the + button to add a new account</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-nexus-brand">3.</span>
                      <span>Select "Scan QR Code" and point your camera at the code above</span>
                    </li>
                  </ol>
                </div>

                {/* Manual Entry */}
                <div className="rounded-xl border border-nexus-border bg-nexus-surface-hover p-6">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="font-semibold text-nexus-text-primary">Or enter manually:</p>
                    <button
                      onClick={() => setSecretRevealed(!secretRevealed)}
                      className="text-sm font-medium text-nexus-brand hover:underline"
                    >
                      {secretRevealed ? "Hide" : "Reveal"}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-lg bg-nexus-surface px-4 py-3 font-mono text-sm text-nexus-text-primary">
                      {secretRevealed ? totpSecret : getMaskedSecret()}
                    </code>
                    <Button
                      type="button"
                      onClick={handleCopySecret}
                      variant="outline"
                      className="h-11 px-4"
                    >
                      {copied ? (
                        <Check className="h-5 w-5 text-green-600" />
                      ) : (
                        <Copy className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                  <button
                    onClick={handleRegenerateQR}
                    className="mt-4 text-sm font-medium text-nexus-brand hover:underline"
                  >
                    Generate new QR code
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Confirm Code */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <div className="text-center">
                  <h2 className="text-2xl font-semibold text-nexus-text-primary">Verify Authentication</h2>
                  <p className="mt-2 text-sm text-nexus-text-secondary">
                    Enter the 6-digit code from your authenticator app to complete the setup
                  </p>
                </div>

                {/* TOTP Input */}
                <div className="flex justify-center rounded-xl border border-blue-200 bg-blue-50/50 p-8">
                  <TOTPInput
                    value={totpCode}
                    onChange={setTotpCode}
                    onComplete={handleFinish}
                  />
                </div>

                {/* Info */}
                <div className="rounded-xl border border-nexus-border bg-nexus-surface-hover p-6 text-center">
                  <p className="text-sm text-nexus-text-secondary">
                    The code changes every 30 seconds. Make sure to enter it before it expires.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="mt-10 flex items-center justify-between border-t border-nexus-border pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              className="h-11 px-6"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {currentStep === 1 ? "Cancel" : "Back"}
            </Button>

            {currentStep === 1 && (
              <Button
                type="button"
                onClick={handleStep1Next}
                disabled={!isStep1Valid()}
                className="h-11 bg-nexus-brand px-6 hover:bg-nexus-brand-hover"
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}

            {currentStep === 2 && (
              <Button
                type="button"
                onClick={handleStep2Next}
                className="h-11 bg-nexus-brand px-6 hover:bg-nexus-brand-hover"
              >
                I've Scanned the QR Code
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}

            {currentStep === 3 && (
              <Button
                type="button"
                onClick={handleFinish}
                disabled={totpCode.length !== 6 || isSubmitting}
                className="h-11 bg-green-600 px-6 hover:bg-green-700"
              >
                {isSubmitting ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Finish & Create
                  </>
                )}
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
