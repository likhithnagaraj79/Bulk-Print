import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle, Printer, Mail, MessageCircle, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { TopNav } from "./dashboard/TopNav";
import { CrewSidebar } from "./dashboard/CrewSidebar";
import { RegistrationService } from "../api/services/registration.service";
import { NotificationService } from "../api/services/notification.service";
import { AuthService } from "../api/services/auth.service";
import { toast } from "sonner";

interface RegistrationData {
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

interface SuccessData {
  registrationId: string;
  name: string;
  email: string;
  designation: string;
  companyName: string;
  prefix: string;
}

const PREFIX_MAP: Record<string, string> = {
  visitors: "VS",
  vips: "VI",
  foreign_delegates: "FDL",
  exhibitors: "EH",
  organisers: "OR",
  speakers: "SPK",
  delegates: "DL",
  sponsors: "SPR",
};

const CREW_TYPE_COLORS: Record<string, string> = {
  visitors: "#1E5FCC",
  vips: "#A07800",
  foreign_delegates: "#0B9E96",
  exhibitors: "#C25A00",
  organisers: "#4B2FA6",
  speakers: "#0E7A4E",
  delegates: "#B01E28",
  sponsors: "#5A6E8C",
  master: "#1E40AF",
};

const CREW_TYPE_LABELS: Record<string, string> = {
  visitors: "Visitors Crew",
  vips: "VIPs Crew",
  foreign_delegates: "Foreign Delegates Crew",
  exhibitors: "Exhibitors Crew",
  organisers: "Organisers Crew",
  speakers: "Speakers Crew",
  delegates: "Delegates Crew",
  sponsors: "Sponsors Crew",
  master: "Master Crew",
};

const OFFLINE_STORAGE_KEY = "nexus_offline_queue";

export function CrewRegistrationPage() {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [crewType, setCrewType] = useState("visitors");
  const crewColor = CREW_TYPE_COLORS[crewType] || "#1E5FCC";
  const crewLabel = CREW_TYPE_LABELS[crewType] || "Crew";
  const assignedPrefix = crewType === "master" ? null : PREFIX_MAP[crewType];

  const [formData, setFormData] = useState<RegistrationData>({
    prefix: assignedPrefix || "VS",
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
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [duplicateMessage, setDuplicateMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState<SuccessData | null>(null);

  useEffect(() => {
    AuthService.getMe()
      .then((me) => { if (me?.crewType) setCrewType(me.crewType); })
      .catch(() => {});
  }, []);

  const handleInputChange = (field: keyof RegistrationData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => { const e = { ...prev }; delete e[field]; return e; });
  };

  const checkDuplicate = async () => {
    if (!formData.email && !formData.phoneNumber) return;
    try {
      const result = await RegistrationService.checkDuplicate({
        email: formData.email || null,
        phoneNumber: formData.phoneNumber || null,
      });
      if (result.emailExists || result.phoneExists) {
        let msg = "This ";
        if (result.emailExists) msg += "email";
        if (result.emailExists && result.phoneExists) msg += " and ";
        if (result.phoneExists) msg += "phone number";
        msg += " is already registered.";
        setDuplicateMessage(msg);
        setShowDuplicateWarning(true);
      }
    } catch {}
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.email && !formData.phoneNumber) {
      newErrors.email = "Email or phone required";
      newErrors.phoneNumber = "Email or phone required";
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = "Invalid email";
    if (formData.phoneNumber && !/^\d{10,15}$/.test(formData.phoneNumber)) newErrors.phoneNumber = "Must be 10–15 digits";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);

    if (!navigator.onLine) {
      const queue = JSON.parse(localStorage.getItem(OFFLINE_STORAGE_KEY) || "[]");
      queue.push({ ...formData, localId: `offline-${Date.now()}`, createdAt: new Date().toISOString() });
      localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(queue));
      toast.warning("Offline: registration queued for sync.");
      setIsSubmitting(false);
      navigate("/crew");
      return;
    }

    try {
      const payload = {
        prefix: formData.prefix,
        name: formData.name,
        email: formData.email || undefined,
        phoneCountryCode: formData.phoneCountryCode,
        phoneNumber: formData.phoneNumber || undefined,
        designation: formData.designation || undefined,
        companyName: formData.companyName || undefined,
        companyEmail: formData.companyEmail || undefined,
        companyPhone: formData.companyPhone || undefined,
        country: formData.country || undefined,
        city: formData.city || undefined,
      };
      const response = await RegistrationService.createRegistration(payload);
      setSuccessData({
        registrationId: response.registrationId,
        name: formData.name,
        email: formData.email,
        designation: formData.designation,
        companyName: formData.companyName,
        prefix: formData.prefix,
      });
      setShowSuccess(true);
    } catch (error: any) {
      if (error?.status === 409 || error?.message?.includes("already registered")) {
        setDuplicateMessage("This attendee is already registered.");
        setShowDuplicateWarning(true);
      } else {
        toast.error(error?.message || "Registration failed.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterAnother = () => {
    setShowSuccess(false);
    setSuccessData(null);
    setFormData({ prefix: assignedPrefix || "VS", name: "", email: "", phoneCountryCode: "+91", phoneNumber: "", designation: "", companyName: "", companyEmail: "", companyPhone: "", country: "India", city: "" });
    setErrors({});
    setShowDuplicateWarning(false);
  };

  return (
    <div className="min-h-screen w-full bg-nexus-page-bg pt-16">
      <TopNav role="crew" crewLabel={crewLabel} crewColor={crewColor} />
      <div className="flex">
        <CrewSidebar collapsed={sidebarCollapsed} onToggle={setSidebarCollapsed} crewColor={crewColor} />

        <main className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? "lg:pl-20" : "lg:pl-60"}`}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="p-6 lg:p-8"
        >
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-nexus-text-primary">New Registration</h1>
            <p className="mt-1 text-sm text-nexus-text-secondary">
              Register a new attendee for{" "}
              <span className="font-semibold" style={{ color: crewColor }}>{formData.prefix}</span>
            </p>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            {/* Personal Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm"
            >
              <h3 className="mb-5 text-base font-semibold text-nexus-text-primary">Personal Information</h3>
              <div className="space-y-4">
                {crewType === "master" && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-nexus-text-label">
                      Registration Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.prefix}
                      onChange={(e) => handleInputChange("prefix", e.target.value)}
                      className="h-10 w-full rounded-lg border border-nexus-border-strong bg-nexus-surface px-3 text-sm"
                    >
                      <option value="VS">VS — Visitors</option>
                      <option value="VI">VI — VIPs</option>
                      <option value="FDL">FDL — Foreign Delegates</option>
                      <option value="EH">EH — Exhibitors</option>
                      <option value="OR">OR — Organisers</option>
                      <option value="SPK">SPK — Speakers</option>
                      <option value="DL">DL — Delegates</option>
                      <option value="SPR">SPR — Sponsors</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-nexus-text-label">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Full name"
                    className={`h-10 ${errors.name ? "border-red-500 focus:ring-red-200" : ""}`}
                  />
                  {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-nexus-text-label">Designation</label>
                  <Input
                    value={formData.designation}
                    onChange={(e) => handleInputChange("designation", e.target.value)}
                    placeholder="Job title"
                    className="h-10"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-nexus-text-label">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    onBlur={checkDuplicate}
                    placeholder="email@example.com"
                    className={`h-10 ${errors.email ? "border-red-500" : ""}`}
                  />
                  {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-nexus-text-label">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={formData.phoneCountryCode}
                      onChange={(e) => handleInputChange("phoneCountryCode", e.target.value)}
                      className="h-10 w-24 rounded-lg border border-nexus-border-strong bg-nexus-surface px-2 text-sm"
                    >
                      <option value="+91">+91</option>
                      <option value="+1">+1</option>
                      <option value="+44">+44</option>
                      <option value="+61">+61</option>
                    </select>
                    <Input
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => handleInputChange("phoneNumber", e.target.value.replace(/\D/g, ""))}
                      onBlur={checkDuplicate}
                      placeholder="9876543210"
                      className={`h-10 flex-1 ${errors.phoneNumber ? "border-red-500" : ""}`}
                      inputMode="numeric"
                    />
                  </div>
                  {errors.phoneNumber && <p className="mt-1 text-xs text-red-600">{errors.phoneNumber}</p>}
                </div>
              </div>
            </motion.div>

            {/* Company Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm"
            >
              <h3 className="mb-5 text-base font-semibold text-nexus-text-primary">Company</h3>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-nexus-text-label">Company Name</label>
                  <Input
                    value={formData.companyName}
                    onChange={(e) => handleInputChange("companyName", e.target.value)}
                    placeholder="Company name"
                    className="h-10"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-nexus-text-label">Company Email</label>
                  <Input
                    type="email"
                    value={formData.companyEmail}
                    onChange={(e) => handleInputChange("companyEmail", e.target.value)}
                    placeholder="company@example.com"
                    className="h-10"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-nexus-text-label">Company Phone</label>
                  <Input
                    type="tel"
                    value={formData.companyPhone}
                    onChange={(e) => handleInputChange("companyPhone", e.target.value.replace(/\D/g, ""))}
                    placeholder="Company contact"
                    className="h-10"
                    inputMode="numeric"
                  />
                </div>
              </div>
            </motion.div>

            {/* Location + Submit */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-6"
            >
              <div className="rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm">
                <h3 className="mb-5 text-base font-semibold text-nexus-text-primary">Location</h3>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-nexus-text-label">Country</label>
                    <select
                      value={formData.country}
                      onChange={(e) => handleInputChange("country", e.target.value)}
                      className="h-10 w-full rounded-lg border border-nexus-border-strong bg-nexus-surface px-3 text-sm"
                    >
                      <option value="India">India</option>
                      <option value="USA">USA</option>
                      <option value="UK">UK</option>
                      <option value="Australia">Australia</option>
                      <option value="UAE">UAE</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-nexus-text-label">City</label>
                    <Input
                      value={formData.city}
                      onChange={(e) => handleInputChange("city", e.target.value)}
                      placeholder="City"
                      className="h-10"
                    />
                  </div>
                </div>
              </div>

              {/* Duplicate Warning */}
              <AnimatePresence>
                {showDuplicateWarning && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4"
                  >
                    <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-900">{duplicateMessage}</p>
                    </div>
                    <button
                      onClick={() => setShowDuplicateWarning(false)}
                      className="rounded-lg bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900 transition-colors hover:bg-amber-200"
                    >
                      Continue
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="h-12 w-full text-sm font-semibold text-white shadow-sm disabled:opacity-50"
                style={{ backgroundColor: crewColor }}
              >
                {isSubmitting ? "Registering..." : "Register Attendee →"}
              </Button>
            </motion.div>
          </div>
        </motion.div>
        </main>
      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccess && successData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 16 }}
              className="w-full max-w-lg rounded-2xl border border-nexus-border bg-nexus-surface p-8 shadow-2xl"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.1, stiffness: 200, damping: 15 }}
                className="mb-6 text-center"
              >
                <CheckCircle className="mx-auto h-14 w-14 text-green-500" />
                <h2 className="mt-4 text-xl font-semibold text-nexus-text-primary">Registration Successful!</h2>
              </motion.div>

              <div className="mb-6 rounded-xl border border-nexus-border bg-nexus-surface-hover p-5">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-base font-semibold text-nexus-text-primary">{successData.name}</h3>
                  <span className="rounded px-2 py-0.5 text-xs font-bold text-white" style={{ backgroundColor: crewColor }}>
                    {successData.prefix}
                  </span>
                </div>
                {(successData.companyName || successData.designation) && (
                  <p className="text-sm text-nexus-text-secondary">
                    {[successData.designation, successData.companyName].filter(Boolean).join(", ")}
                  </p>
                )}
                {successData.email && <p className="mt-1 text-sm text-nexus-text-secondary">{successData.email}</p>}
                <p className="mt-2 font-mono text-xs text-nexus-text-hint">ID: {successData.registrationId}</p>
              </div>

              <div className="mb-6 grid grid-cols-3 gap-3">
                <button
                  onClick={() => navigate(`/badge?id=${successData.registrationId}`)}
                  className="flex flex-col items-center gap-2 rounded-xl border border-nexus-border bg-nexus-surface p-4 transition-all hover:border-nexus-brand hover:shadow-md"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-nexus-brand-light">
                    <Printer className="h-5 w-5 text-nexus-brand" />
                  </div>
                  <span className="text-xs font-semibold text-nexus-text-primary">Print Badge</span>
                </button>
                <button
                  onClick={async () => { try { await NotificationService.sendBadgeEmail(successData.registrationId); toast.success("Email sent"); } catch { toast.error("Failed"); } }}
                  className="flex flex-col items-center gap-2 rounded-xl border border-nexus-border bg-nexus-surface p-4 transition-all hover:border-green-400 hover:shadow-md"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50">
                    <Mail className="h-5 w-5 text-green-600" />
                  </div>
                  <span className="text-xs font-semibold text-nexus-text-primary">Email</span>
                </button>
                <button
                  onClick={async () => { try { await NotificationService.sendBadgeWhatsapp(successData.registrationId); toast.success("WhatsApp sent"); } catch { toast.error("Failed"); } }}
                  className="flex flex-col items-center gap-2 rounded-xl border border-nexus-border bg-nexus-surface p-4 transition-all hover:border-green-400 hover:shadow-md"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50">
                    <MessageCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <span className="text-xs font-semibold text-nexus-text-primary">WhatsApp</span>
                </button>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleRegisterAnother}
                  className="flex-1 h-10 font-semibold text-white"
                  style={{ backgroundColor: crewColor }}
                >
                  Register Another
                </Button>
                <Button onClick={() => navigate("/crew")} variant="outline" className="flex-1 h-10">
                  Back to Dashboard
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
