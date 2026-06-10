import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle, ArrowRight, ArrowLeft, Mail, Phone } from "lucide-react";
import { useParams, useNavigate } from "react-router";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { PreRegistrationService } from "../api/services/preRegistration.service";
import { toast } from "sonner";

interface FormData {
  prefix: string;
  name: string;
  email: string;
  phoneCountryCode: string;
  phoneNumber: string;
  designation: string;
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  country: string;
  city: string;
}

const PREFIX_CONFIG: Record<string, { name: string; color: string }> = {
  VS: { name: "Visitors", color: "#1E5FCC" },
  VI: { name: "VIPs", color: "#A07800" },
  FDL: { name: "Foreign Delegates", color: "#0B9E96" },
  EH: { name: "Exhibitors", color: "#C25A00" },
  OR: { name: "Organisers", color: "#4B2FA6" },
  SPK: { name: "Speakers", color: "#0E7A4E" },
  DL: { name: "Delegates", color: "#B01E28" },
  SPR: { name: "Sponsors", color: "#5A6E8C" },
};

const VALID_PREFIXES = Object.keys(PREFIX_CONFIG);

export function PublicRegistrationPage() {
  const { prefix: urlPrefix } = useParams();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [formLoadedAt] = useState(Date.now());
  const [formData, setFormData] = useState<FormData>({
    prefix: "",
    name: "",
    email: "",
    phoneCountryCode: "+91",
    phoneNumber: "",
    designation: "",
    companyName: "",
    companyEmail: "",
    companyPhone: "",
    country: "India",
    city: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{
    email: string;
    phone: string;
    registrationId: string;
  } | null>(null);
  const [honeypot, setHoneypot] = useState("");

  // Set prefix from URL or show dropdown
  useEffect(() => {
    if (urlPrefix && VALID_PREFIXES.includes(urlPrefix.toUpperCase())) {
      setFormData((prev) => ({ ...prev, prefix: urlPrefix.toUpperCase() }));
    } else {
      setFormData((prev) => ({ ...prev, prefix: "VS" }));
    }
  }, [urlPrefix]);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (formData.name.length > 100) {
      newErrors.name = "Name must be less than 100 characters";
    }

    if (!formData.email && !formData.phoneNumber) {
      newErrors.email = "Either email or phone number is required";
      newErrors.phoneNumber = "Either email or phone number is required";
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (formData.phoneNumber && !/^\d{10,15}$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = "Phone number must be 10-15 digits";
    }

    if (!termsAccepted) {
      newErrors.terms = "You must accept the terms and conditions";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (validateStep1()) {
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleEdit = () => {
    setCurrentStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    // Honeypot check
    if (honeypot) {
      console.log("Bot detected");
      return;
    }

    // Time-based spam check
    if (Date.now() - formLoadedAt < 3000) {
      toast.error("Please take your time filling out the form.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await PreRegistrationService.create(formData.prefix, formData);

      if (response.success) {
        setSuccessData({
          email: formData.email,
          phone: `${formData.phoneCountryCode} ${formData.phoneNumber}`,
          registrationId: response.preRegistrationId || "",
        });
        setCurrentStep(3);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        toast.error(response.message || "Registration failed");
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      if (error.response?.status === 409) {
        toast.error("You are already registered with this email or phone number.");
      } else {
        toast.error(error.response?.data?.message || "An error occurred during registration");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterAnother = () => {
    setFormData({
      prefix: urlPrefix?.toUpperCase() || "VS",
      name: "",
      email: "",
      phoneCountryCode: "+91",
      phoneNumber: "",
      designation: "",
      companyName: "",
      companyEmail: "",
      companyPhone: "",
      country: "India",
      city: "",
    });
    setErrors({});
    setTermsAccepted(false);
    setSuccessData(null);
    setCurrentStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const prefixColor = PREFIX_CONFIG[formData.prefix]?.color || "#1E5FCC";
  const prefixName = PREFIX_CONFIG[formData.prefix]?.name || "Visitors";

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
      <div className="mx-auto max-w-2xl">
        {/* Event Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 overflow-hidden rounded-2xl border border-nexus-border bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-center shadow-xl"
        >
          <div className="mb-2 text-5xl">🎯</div>
          <h1 className="mb-2 text-3xl font-bold text-white">TechFest 2026</h1>
          <p className="text-lg text-white/90">Feb 20-22 • Convention Center</p>
        </motion.div>

        {/* Prefix Badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6 flex items-center justify-center gap-3"
        >
          <span className="text-sm font-medium text-nexus-text-secondary">Pre-Register as:</span>
          {urlPrefix && VALID_PREFIXES.includes(urlPrefix.toUpperCase()) ? (
            <span
              className="rounded-full px-4 py-2 font-semibold text-white shadow-lg"
              style={{ backgroundColor: prefixColor }}
            >
              {formData.prefix} — {prefixName}
            </span>
          ) : (
            <select
              value={formData.prefix}
              onChange={(e) => handleInputChange("prefix", e.target.value)}
              className="h-10 rounded-lg border border-nexus-border-strong px-4 text-sm font-semibold shadow-sm"
            >
              {VALID_PREFIXES.map((prefix) => (
                <option key={prefix} value={prefix}>
                  {prefix} — {PREFIX_CONFIG[prefix].name}
                </option>
              ))}
            </select>
          )}
        </motion.div>

        {/* Step Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-8 flex items-center justify-center"
        >
          <div className="flex items-center gap-2">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold ${currentStep >= 1 ? "bg-nexus-brand text-white" : "bg-gray-200 text-nexus-text-muted"
                }`}
            >
              1
            </div>
            <div
              className={`h-1 w-16 ${currentStep >= 2 ? "bg-nexus-brand" : "bg-gray-200"}`}
            />
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold ${currentStep >= 2 ? "bg-nexus-brand text-white" : "bg-gray-200 text-nexus-text-muted"
                }`}
            >
              2
            </div>
            <div
              className={`h-1 w-16 ${currentStep >= 3 ? "bg-nexus-brand" : "bg-gray-200"}`}
            />
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold ${currentStep >= 3 ? "bg-nexus-brand text-white" : "bg-gray-200 text-nexus-text-muted"
                }`}
            >
              3
            </div>
          </div>
        </motion.div>

        <div className="mb-4 text-center">
          <span className="text-sm font-medium text-nexus-text-muted">
            {currentStep === 1 && "Details"}
            {currentStep === 2 && "Review"}
            {currentStep === 3 && "Done"}
          </span>
        </div>

        {/* Honeypot Field (hidden) */}
        <input
          type="text"
          name="website"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          style={{ display: "none" }}
          tabIndex={-1}
          autoComplete="off"
        />

        <AnimatePresence mode="wait">
          {/* Step 1: Details */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="rounded-2xl border border-nexus-border bg-nexus-surface p-8 shadow-xl"
            >
              <h2 className="mb-6 text-2xl font-bold text-nexus-text-primary">Your Details</h2>

              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-nexus-text-label">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="John Doe"
                    className={`h-12 ${errors.name ? "border-red-500" : ""}`}
                  />
                  {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-nexus-text-label">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="john@example.com"
                    className={`h-12 ${errors.email ? "border-red-500" : ""}`}
                  />
                  {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-nexus-text-label">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={formData.phoneCountryCode}
                      onChange={(e) => handleInputChange("phoneCountryCode", e.target.value)}
                      className="h-12 w-24 rounded-lg border border-nexus-border-strong px-2 text-sm"
                    >
                      <option value="+91">+91</option>
                      <option value="+1">+1</option>
                      <option value="+44">+44</option>
                      <option value="+61">+61</option>
                    </select>
                    <div className="flex-1">
                      <Input
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={(e) =>
                          handleInputChange("phoneNumber", e.target.value.replace(/\D/g, ""))
                        }
                        placeholder="9876543210"
                        className={`h-12 ${errors.phoneNumber ? "border-red-500" : ""}`}
                        inputMode="numeric"
                      />
                    </div>
                  </div>
                  {errors.phoneNumber && (
                    <p className="mt-1 text-xs text-red-600">{errors.phoneNumber}</p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-nexus-text-label">
                    Designation
                  </label>
                  <Input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => handleInputChange("designation", e.target.value)}
                    placeholder="Software Engineer"
                    className="h-12"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-nexus-text-label">
                    Company Name
                  </label>
                  <Input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => handleInputChange("companyName", e.target.value)}
                    placeholder="Acme Inc"
                    className="h-12"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-nexus-text-label">
                    Company Email
                  </label>
                  <Input
                    type="email"
                    value={formData.companyEmail}
                    onChange={(e) => handleInputChange("companyEmail", e.target.value)}
                    placeholder="info@company.com"
                    className="h-12"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-nexus-text-label">
                    Company Phone
                  </label>
                  <Input
                    type="tel"
                    value={formData.companyPhone}
                    onChange={(e) =>
                      handleInputChange("companyPhone", e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="0123456789"
                    className="h-12"
                    inputMode="numeric"
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-nexus-text-label">Country</label>
                    <select
                      value={formData.country}
                      onChange={(e) => handleInputChange("country", e.target.value)}
                      className="h-12 w-full rounded-lg border border-nexus-border-strong px-3 text-sm"
                    >
                      <option value="India">India</option>
                      <option value="USA">USA</option>
                      <option value="UK">UK</option>
                      <option value="Australia">Australia</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-nexus-text-label">City</label>
                    <Input
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleInputChange("city", e.target.value)}
                      placeholder="Mumbai"
                      className="h-12"
                    />
                  </div>
                </div>

                <div className="flex items-start gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-1 h-4 w-4 cursor-pointer rounded border-nexus-border-strong text-nexus-brand focus:ring-blue-500"
                  />
                  <label htmlFor="terms" className="cursor-pointer text-sm text-nexus-text-secondary">
                    I agree to the Terms & Conditions and Privacy Policy
                  </label>
                </div>
                {errors.terms && <p className="text-xs text-red-600">{errors.terms}</p>}
              </div>

              <Button
                onClick={handleContinue}
                className="mt-8 h-14 w-full bg-gradient-to-r from-blue-600 to-purple-600 text-lg font-semibold hover:from-blue-700 hover:to-purple-700"
              >
                Continue
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          )}

          {/* Step 2: Review */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="rounded-2xl border border-nexus-border bg-nexus-surface p-8 shadow-xl"
            >
              <h2 className="mb-6 text-2xl font-bold text-nexus-text-primary">Review Your Information</h2>

              <div className="space-y-4 rounded-lg bg-nexus-surface-hover p-6">
                <div className="flex justify-between border-b border-nexus-border pb-3">
                  <span className="font-medium text-nexus-text-secondary">Category</span>
                  <span className="font-semibold text-nexus-text-primary">
                    {formData.prefix} — {prefixName}
                  </span>
                </div>
                <div className="flex justify-between border-b border-nexus-border pb-3">
                  <span className="font-medium text-nexus-text-secondary">Name</span>
                  <span className="font-semibold text-nexus-text-primary">{formData.name}</span>
                </div>
                {formData.email && (
                  <div className="flex justify-between border-b border-nexus-border pb-3">
                    <span className="font-medium text-nexus-text-secondary">Email</span>
                    <span className="text-nexus-text-primary">{formData.email}</span>
                  </div>
                )}
                {formData.phoneNumber && (
                  <div className="flex justify-between border-b border-nexus-border pb-3">
                    <span className="font-medium text-nexus-text-secondary">Phone</span>
                    <span className="text-nexus-text-primary">
                      {formData.phoneCountryCode} {formData.phoneNumber}
                    </span>
                  </div>
                )}
                {formData.designation && (
                  <div className="flex justify-between border-b border-nexus-border pb-3">
                    <span className="font-medium text-nexus-text-secondary">Designation</span>
                    <span className="text-nexus-text-primary">{formData.designation}</span>
                  </div>
                )}
                {formData.companyName && (
                  <div className="flex justify-between border-b border-nexus-border pb-3">
                    <span className="font-medium text-nexus-text-secondary">Company</span>
                    <span className="text-nexus-text-primary">{formData.companyName}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="font-medium text-nexus-text-secondary">Location</span>
                  <span className="text-nexus-text-primary">
                    {formData.city ? `${formData.city}, ` : ""}
                    {formData.country}
                  </span>
                </div>
              </div>

              <div className="mt-8 flex gap-4">
                <Button onClick={handleEdit} variant="outline" className="h-14 flex-1 text-lg">
                  <ArrowLeft className="mr-2 h-5 w-5" />
                  Edit
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="h-14 flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-lg font-semibold hover:from-blue-700 hover:to-purple-700"
                >
                  {isSubmitting ? "Submitting..." : "Submit Registration"}
                  {!isSubmitting && <ArrowRight className="ml-2 h-5 w-5" />}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Success */}
          {currentStep === 3 && successData && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl border border-nexus-border bg-nexus-surface p-8 text-center shadow-xl"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2, stiffness: 200, damping: 15 }}
              >
                <CheckCircle className="mx-auto mb-6 h-20 w-20 text-green-500" />
              </motion.div>

              <h2 className="mb-4 text-3xl font-bold text-nexus-text-primary">Registration Successful!</h2>

              <p className="mb-6 text-lg text-nexus-text-secondary">Your QR code has been sent to:</p>

              <div className="mb-8 space-y-3">
                {successData.email && (
                  <div className="flex items-center justify-center gap-3 rounded-lg bg-nexus-brand-light p-4">
                    <Mail className="h-5 w-5 text-nexus-brand" />
                    <span className="font-medium text-blue-900">{successData.email}</span>
                  </div>
                )}
                {successData.phone && (
                  <div className="flex items-center justify-center gap-3 rounded-lg bg-green-50 p-4">
                    <Phone className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-900">{successData.phone}</span>
                  </div>
                )}
              </div>

              <div className="mb-8 rounded-lg bg-amber-50 p-4">
                <p className="text-sm text-amber-900">
                  Please bring this QR code to the event for badge printing and check-in.
                </p>
              </div>

              <div className="mb-8 rounded-lg border border-nexus-border bg-nexus-surface-hover p-4">
                <p className="text-xs font-medium uppercase text-nexus-text-muted">Registration ID</p>
                <p className="mt-1 font-mono text-lg font-bold text-nexus-text-primary">
                  {successData.registrationId}
                </p>
              </div>

              <Button
                onClick={handleRegisterAnother}
                className="h-14 w-full bg-gradient-to-r from-blue-600 to-purple-600 text-lg font-semibold hover:from-blue-700 hover:to-purple-700"
              >
                Register Another Person
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-nexus-text-muted">
          Powered by <span className="font-semibold">NEXUS</span> •{" "}
          <span className="font-semibold">BlueberIT</span>
        </div>
      </div>
    </div>
  );
}
