import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CheckCircle, ArrowRight, ArrowLeft, Mail,
  Users, Star, Globe, Building2, Mic, UserCheck, Crown, Award,
} from "lucide-react";
import { useParams, useNavigate } from "react-router";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { OnsiteService } from "../api/services/onsiteRegistration.service";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PREFIX_CONFIG: Record<
  string,
  { name: string; color: string; bg: string; icon: React.ReactNode; desc: string }
> = {
  VS:  { name: "Visitor",          color: "#1E5FCC", bg: "#EEF4FF", icon: <Users     className="h-6 w-6 sm:h-7 sm:w-7" />, desc: "General visitors & attendees" },
  VI:  { name: "VIP",              color: "#A07800", bg: "#FFFBEB", icon: <Crown     className="h-6 w-6 sm:h-7 sm:w-7" />, desc: "VIP guests & dignitaries" },
  FDL: { name: "Foreign Delegate", color: "#0B9E96", bg: "#F0FDFC", icon: <Globe     className="h-6 w-6 sm:h-7 sm:w-7" />, desc: "International delegates" },
  EH:  { name: "Exhibitor",        color: "#C25A00", bg: "#FFF7F0", icon: <Building2 className="h-6 w-6 sm:h-7 sm:w-7" />, desc: "Exhibitors & stall operators" },
  OR:  { name: "Organiser",        color: "#4B2FA6", bg: "#F5F3FF", icon: <Star      className="h-6 w-6 sm:h-7 sm:w-7" />, desc: "Event organising team" },
  SPK: { name: "Speaker",          color: "#0E7A4E", bg: "#F0FDF9", icon: <Mic       className="h-6 w-6 sm:h-7 sm:w-7" />, desc: "Conference speakers & panelists" },
  DL:  { name: "Delegate",         color: "#B01E28", bg: "#FFF5F5", icon: <UserCheck className="h-6 w-6 sm:h-7 sm:w-7" />, desc: "Conference delegates" },
  SPR: { name: "Sponsor",          color: "#5A6E8C", bg: "#F8FAFC", icon: <Award     className="h-6 w-6 sm:h-7 sm:w-7" />, desc: "Sponsors & partners" },
};

const VALID_PREFIXES = Object.keys(PREFIX_CONFIG);

const EVENTS = [
  {
    id:    "India Automation & Warehouse Logistics & Material Handling Expo 2026",
    short: "Automation Expo",
    img:   "/badge-images/automation-expo.jpg",
  },
  {
    id:    "India Cable & Wire Expo 2026",
    short: "Cable & Wire Expo",
    img:   "/badge-images/cable-wire-expo.jpg",
  },
  {
    id:    "India Information Technology and India Cyber Security Expo 2026",
    short: "IT & Cyber Security Expo",
    img:   "/badge-images/it-cyber-expo.jpg",
  },
  {
    id:    "Smart Home & Office & Interior and Decor Expo 2026",
    short: "Smart Home Expo",
    img:   "/badge-images/smart-home-expo.jpg",
  },
];

// ---------------------------------------------------------------------------
// Shared label component
// ---------------------------------------------------------------------------
function FieldLabel({ children, required, hint }: { children: React.ReactNode; required?: boolean; hint?: string }) {
  return (
    <label className="mb-1.5 block text-sm font-medium text-nexus-text-label sm:mb-2">
      {children}
      {required && <span className="ml-0.5 text-red-500">*</span>}
      {hint && <span className="ml-1 text-xs font-normal text-nexus-text-muted">{hint}</span>}
    </label>
  );
}

// ---------------------------------------------------------------------------
// Step Indicator
// ---------------------------------------------------------------------------
function StepIndicator({ current }: { current: number }) {
  const labels = ["Details", "Review", "Done"];
  return (
    <div className="mb-5 sm:mb-7">
      <div className="flex items-center justify-center">
        {[1, 2, 3].map((s, i) => (
          <div key={s} className="flex items-center">
            {i > 0 && (
              <div className={`h-0.5 w-8 sm:w-12 md:w-16 transition-colors duration-300
                ${current === 3 ? "bg-green-500" : current >= s ? "bg-nexus-brand" : "bg-gray-200"}`} />
            )}
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 sm:h-9 sm:w-9 sm:text-sm
              ${current > s || (current === 3 && s === 3) ? "bg-green-500 text-white" : current === s ? "bg-nexus-brand text-white ring-4 ring-nexus-brand/20" : "bg-gray-100 text-nexus-text-muted"}`}>
              {current > s || (current === 3 && s === 3) ? <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" /> : s}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-center">
        <span className="text-xs font-semibold uppercase tracking-wider text-nexus-text-muted sm:text-sm">
          {labels[current - 1]}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inner form (needs reCAPTCHA hook — must be inside Provider)
// ---------------------------------------------------------------------------
interface FormData {
  name: string; email: string; phoneCountryCode: string; phoneNumber: string;
  designation: string; companyName: string; companyEmail: string;
  companyPhone: string; country: string; city: string; eventType: string;
}

function OnsiteForm({ prefix }: { prefix: string }) {
  const navigate = useNavigate();
  const cfg = PREFIX_CONFIG[prefix];

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    name: "", email: "", phoneCountryCode: "+91", phoneNumber: "",
    designation: "", companyName: "", companyEmail: "", companyPhone: "",
    country: "India", city: "", eventType: "",
  });
  const [errors, setErrors]           = useState<Record<string, string>>({});
  const [termsAccepted, setTerms]     = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [successData, setSuccess]     = useState<{ email: string; registrationId: string } | null>(null);

  const set = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => { const e = { ...prev }; delete e[field]; return e; });
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!formData.name.trim())                                         e.name  = "Name is required";
    else if (formData.name.length > 100)                               e.name  = "Max 100 characters";
    if (!formData.email)                                               e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))      e.email = "Invalid email format";
    if (formData.phoneNumber && !/^\d{10,15}$/.test(formData.phoneNumber)) e.phoneNumber = "10–15 digits only";
    if (prefix === "VS" && !formData.eventType)                        e.eventType = "Please select an event";
    if (!termsAccepted)                                                e.terms = "You must accept the terms";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleContinue = () => {
    if (validate()) { setStep(2); window.scrollTo({ top: 0, behavior: "smooth" }); }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await OnsiteService.create(prefix, { ...formData, recaptchaToken: "" });
      if (res.success) {
        setSuccess({ email: formData.email, registrationId: res.preRegistrationId || "" });
        setStep(3);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        toast.error(res.message || "Registration failed");
      }
    } catch (err: any) {
      if (err?.response?.status === 409) toast.error("This email is already registered.");
      else toast.error(err?.response?.data?.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: "", email: "", phoneCountryCode: "+91", phoneNumber: "", designation: "", companyName: "", companyEmail: "", companyPhone: "", country: "India", city: "", eventType: "" });
    setErrors({}); setTerms(false); setSuccess(null); setStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Shared select classes
  const selectCls = "h-11 w-full rounded-lg border border-nexus-border-strong bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-nexus-brand/40 sm:h-12";

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Safe-area aware padding: tight on phone, generous on larger screens */}
      <div className="px-3 py-4 sm:px-5 sm:py-6 md:px-6 md:py-8 lg:py-10">
        <div className="mx-auto w-full max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-2xl">

          {/* ── Header ── */}
          <motion.div
            initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
            className="mb-4 overflow-hidden rounded-xl shadow-lg sm:mb-5 sm:rounded-2xl"
            style={{ background: `linear-gradient(135deg, ${cfg.color}dd, ${cfg.color})` }}
          >
            <div className="p-4 text-center text-white sm:p-5 md:p-6">
              <p className="text-[10px] font-semibold uppercase tracking-widest opacity-75 sm:text-xs">
                Onsite Self-Registration
              </p>
              <h1 className="mt-0.5 text-xl font-extrabold sm:text-2xl md:text-3xl">Nexus Event 2026</h1>
              <p className="mt-1 text-xs opacity-80 sm:text-sm">BIEC, Bengaluru &nbsp;&bull;&nbsp; April 2026</p>
            </div>
          </motion.div>

          {/* ── Category pill ── */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="mb-4 flex items-center justify-between rounded-xl px-3 py-2.5 shadow-sm sm:mb-5 sm:px-4 sm:py-3"
            style={{ backgroundColor: cfg.bg, border: `1.5px solid ${cfg.color}40` }}
          >
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3" style={{ color: cfg.color }}>
              <div className="shrink-0">{cfg.icon}</div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold sm:text-base" style={{ color: cfg.color }}>{cfg.name}</p>
                <p className="hidden truncate text-xs text-nexus-text-muted xs:block sm:block">{cfg.desc}</p>
              </div>
            </div>
            <button
              onClick={() => navigate("/onsite")}
              className="ml-2 shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold text-nexus-text-muted transition hover:bg-black/5 hover:text-nexus-text-primary"
            >
              Change
            </button>
          </motion.div>

          {/* ── Step indicator ── */}
          <StepIndicator current={step} />

          <AnimatePresence mode="wait">

            {/* ── Step 1: Form ── */}
            {step === 1 && (
              <motion.div key="step1"
                initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }}
                className="rounded-xl border border-nexus-border bg-nexus-surface p-4 shadow-lg sm:rounded-2xl sm:p-6 md:p-8"
              >
                <h2 className="mb-4 text-lg font-bold text-nexus-text-primary sm:mb-5 sm:text-xl">Your Details</h2>

                <div className="space-y-4 sm:space-y-5">

                  {/* Event selector — VS only */}
                  {prefix === "VS" && (
                    <div>
                      <FieldLabel required>Select Event</FieldLabel>
                      <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        {EVENTS.map(ev => (
                          <button key={ev.id} type="button" onClick={() => set("eventType", ev.id)}
                            className={`relative overflow-hidden rounded-xl border-2 text-left transition-all active:scale-95
                              ${formData.eventType === ev.id
                                ? "border-nexus-brand shadow-md ring-2 ring-nexus-brand/25"
                                : "border-nexus-border hover:border-nexus-brand/50"}`}>
                            <img src={ev.img} alt={ev.short}
                              className="h-16 w-full object-cover sm:h-20"
                              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            <div className="p-1.5 sm:p-2">
                              <p className="text-[11px] font-semibold leading-tight text-nexus-text-primary sm:text-xs">
                                {ev.short}
                              </p>
                            </div>
                            {formData.eventType === ev.id && (
                              <div className="absolute right-1.5 top-1.5 rounded-full bg-nexus-brand p-0.5">
                                <CheckCircle className="h-3.5 w-3.5 text-white sm:h-4 sm:w-4" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                      {errors.eventType && <p className="mt-1 text-xs text-red-600">{errors.eventType}</p>}
                    </div>
                  )}

                  {/* Name */}
                  <div>
                    <FieldLabel required>Full Name</FieldLabel>
                    <Input value={formData.name} onChange={e => set("name", e.target.value)}
                      placeholder="John Doe" autoComplete="name"
                      className={`h-11 sm:h-12 ${errors.name ? "border-red-500" : ""}`} />
                    {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
                  </div>

                  {/* Email */}
                  <div>
                    <FieldLabel required hint="(badge will be sent here)">Email Address</FieldLabel>
                    <Input type="email" value={formData.email} onChange={e => set("email", e.target.value)}
                      placeholder="john@example.com" autoComplete="email" inputMode="email"
                      className={`h-11 sm:h-12 ${errors.email ? "border-red-500" : ""}`} />
                    {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
                  </div>

                  {/* Phone */}
                  <div>
                    <FieldLabel>Phone</FieldLabel>
                    <div className="flex gap-2">
                      <select value={formData.phoneCountryCode} onChange={e => set("phoneCountryCode", e.target.value)}
                        className="h-11 w-[4.5rem] shrink-0 rounded-lg border border-nexus-border-strong bg-white px-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-nexus-brand/40 sm:h-12 sm:w-20 sm:px-2">
                        <option value="+91">+91</option>
                        <option value="+1">+1</option>
                        <option value="+44">+44</option>
                        <option value="+61">+61</option>
                        <option value="+971">+971</option>
                        <option value="+65">+65</option>
                      </select>
                      <Input type="tel" value={formData.phoneNumber}
                        onChange={e => set("phoneNumber", e.target.value.replace(/\D/g, ""))}
                        placeholder="9876543210" inputMode="numeric" autoComplete="tel"
                        className={`h-11 flex-1 sm:h-12 ${errors.phoneNumber ? "border-red-500" : ""}`} />
                    </div>
                    {errors.phoneNumber && <p className="mt-1 text-xs text-red-600">{errors.phoneNumber}</p>}
                  </div>

                  {/* Designation + Company — side by side on tablet+ */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <FieldLabel>Designation</FieldLabel>
                      <Input value={formData.designation} onChange={e => set("designation", e.target.value)}
                        placeholder="Software Engineer" autoComplete="organization-title"
                        className="h-11 sm:h-12" />
                    </div>
                    <div>
                      <FieldLabel>Company Name</FieldLabel>
                      <Input value={formData.companyName} onChange={e => set("companyName", e.target.value)}
                        placeholder="Acme Inc." autoComplete="organization"
                        className="h-11 sm:h-12" />
                    </div>
                  </div>

                  {/* Company Email + Phone — side by side on tablet+ */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <FieldLabel>Company Email</FieldLabel>
                      <Input type="email" value={formData.companyEmail} onChange={e => set("companyEmail", e.target.value)}
                        placeholder="info@company.com" inputMode="email"
                        className="h-11 sm:h-12" />
                    </div>
                    <div>
                      <FieldLabel>Company Phone</FieldLabel>
                      <Input type="tel" value={formData.companyPhone}
                        onChange={e => set("companyPhone", e.target.value.replace(/\D/g, ""))}
                        placeholder="0123456789" inputMode="numeric"
                        className="h-11 sm:h-12" />
                    </div>
                  </div>

                  {/* Country + City */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <FieldLabel>Country</FieldLabel>
                      <select value={formData.country} onChange={e => set("country", e.target.value)}
                        className={selectCls}>
                        <option>India</option>
                        <option>USA</option>
                        <option>UK</option>
                        <option>Australia</option>
                        <option>UAE</option>
                        <option>Singapore</option>
                        <option>Germany</option>
                        <option>Japan</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div>
                      <FieldLabel>City</FieldLabel>
                      <Input value={formData.city} onChange={e => set("city", e.target.value)}
                        placeholder="Bengaluru" className="h-11 sm:h-12" />
                    </div>
                  </div>

                  {/* Terms */}
                  <div className="pt-1">
                    <label className="flex cursor-pointer items-start gap-3">
                      <input type="checkbox" checked={termsAccepted} onChange={e => setTerms(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-nexus-border-strong text-nexus-brand focus:ring-nexus-brand/40" />
                      <span className="text-sm leading-snug text-nexus-text-secondary">
                        I agree to the Terms &amp; Conditions and Privacy Policy
                      </span>
                    </label>
                    {errors.terms && <p className="mt-1 text-xs text-red-600">{errors.terms}</p>}
                  </div>

                </div>

                <Button onClick={handleContinue}
                  className="mt-6 h-12 w-full text-base font-semibold sm:mt-7 sm:h-14 sm:text-lg"
                  style={{ background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}cc)` }}>
                  Continue <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </motion.div>
            )}

            {/* ── Step 2: Review ── */}
            {step === 2 && (
              <motion.div key="step2"
                initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }}
                className="rounded-xl border border-nexus-border bg-nexus-surface p-4 shadow-lg sm:rounded-2xl sm:p-6 md:p-8"
              >
                <h2 className="mb-4 text-lg font-bold text-nexus-text-primary sm:mb-5 sm:text-xl">
                  Review Your Information
                </h2>

                <div className="space-y-0 divide-y divide-nexus-border rounded-xl bg-nexus-surface-hover px-4 py-1 sm:px-5">
                  {([
                    ["Category",    `${prefix} — ${cfg.name}`],
                    prefix === "VS" ? ["Event", EVENTS.find(e => e.id === formData.eventType)?.short ?? formData.eventType] : null,
                    ["Name",        formData.name],
                    ["Email",       formData.email],
                    formData.phoneNumber ? ["Phone", `${formData.phoneCountryCode} ${formData.phoneNumber}`] : null,
                    formData.designation ? ["Designation", formData.designation] : null,
                    formData.companyName ? ["Company",     formData.companyName] : null,
                    (formData.city || formData.country) ? ["Location", [formData.city, formData.country].filter(Boolean).join(", ")] : null,
                  ] as ([string, string] | null)[])
                    .filter((row): row is [string, string] => row !== null)
                    .map(([k, v]) => (
                      <div key={k} className="flex items-start justify-between gap-3 py-3">
                        <span className="shrink-0 text-sm font-medium text-nexus-text-secondary">{k}</span>
                        <span className="break-words text-right text-sm font-semibold text-nexus-text-primary"
                          style={{ maxWidth: "60%" }}>
                          {v}
                        </span>
                      </div>
                    ))}
                </div>

                <div className="mt-4 rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-800 sm:mt-5 sm:px-4 sm:py-3 sm:text-sm">
                  Your badge pass PDF will be emailed to{" "}
                  <strong className="break-all">{formData.email}</strong> upon registration.
                </div>

                <div className="mt-5 flex gap-3 sm:mt-6 sm:gap-4">
                  <Button onClick={() => { setStep(1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    variant="outline"
                    className="h-11 flex-1 text-sm sm:h-14 sm:text-base">
                    <ArrowLeft className="mr-1.5 h-4 w-4 sm:mr-2" /> Edit
                  </Button>
                  <Button onClick={handleSubmit} disabled={isSubmitting}
                    className="h-11 flex-1 text-sm font-semibold sm:h-14 sm:text-base"
                    style={{ background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}cc)` }}>
                    {isSubmitting ? "Submitting…" : "Confirm & Register"}
                    {!isSubmitting && <ArrowRight className="ml-1.5 h-4 w-4 sm:ml-2" />}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ── Step 3: Success ── */}
            {step === 3 && successData && (
              <motion.div key="step3"
                initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl border border-nexus-border bg-nexus-surface p-5 text-center shadow-lg sm:rounded-2xl sm:p-8"
              >
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.15, stiffness: 220, damping: 16 }}>
                  <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-500 sm:mb-5 sm:h-20 sm:w-20" />
                </motion.div>

                <h2 className="mb-2 text-xl font-extrabold text-nexus-text-primary sm:text-2xl md:text-3xl">
                  Registration Complete!
                </h2>
                <p className="mb-4 text-sm text-nexus-text-secondary sm:mb-5 sm:text-base">
                  Your badge pass has been sent to:
                </p>

                <div className="mb-4 flex items-center justify-center gap-2 rounded-xl bg-blue-50 p-3 sm:mb-5 sm:gap-3 sm:p-4">
                  <Mail className="h-4 w-4 shrink-0 text-blue-600 sm:h-5 sm:w-5" />
                  <span className="break-all text-sm font-semibold text-blue-900 sm:text-base">
                    {successData.email}
                  </span>
                </div>

                <div className="mb-4 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-800 sm:mb-5 sm:px-4 sm:py-3 sm:text-sm">
                  Download the PDF from your email and present it at the entrance for check-in.
                </div>

                <div className="mb-5 rounded-xl border border-nexus-border bg-nexus-surface-hover p-3 sm:mb-6 sm:p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-nexus-text-muted sm:text-xs">
                    Registration ID
                  </p>
                  <p className="mt-1 break-all font-mono text-base font-bold text-nexus-text-primary sm:text-lg">
                    {successData.registrationId}
                  </p>
                </div>

                <Button onClick={resetForm}
                  className="h-12 w-full text-base font-semibold sm:h-14 sm:text-lg"
                  style={{ background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}cc)` }}>
                  Register Another Person
                </Button>
              </motion.div>
            )}

          </AnimatePresence>

          <p className="mt-6 text-center text-xs text-nexus-text-muted sm:mt-8">
            Powered by <span className="font-semibold">NEXUS</span>
            {" "}&bull;{" "}
            <span className="font-semibold">BlueberIT</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Prefix Selector Landing  /onsite
// ---------------------------------------------------------------------------
function PrefixSelector() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="px-3 py-5 sm:px-5 sm:py-8 md:px-6 md:py-10 lg:py-12">
        <div className="mx-auto w-full max-w-sm sm:max-w-2xl md:max-w-3xl lg:max-w-4xl">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            className="mb-6 overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 shadow-xl sm:mb-8 sm:rounded-2xl">
            <div className="p-5 text-center text-white sm:p-7 md:p-8">
              <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-white/70 sm:text-xs">
                Welcome to
              </p>
              <h1 className="text-2xl font-extrabold sm:text-3xl md:text-4xl">Nexus Event 2026</h1>
              <p className="mt-1 text-xs text-white/80 sm:text-sm">
                BIEC, Bengaluru &nbsp;&bull;&nbsp; April 2026
              </p>
              <div className="mt-3 inline-block rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold sm:mt-4 sm:text-base">
                Onsite Self-Registration Kiosk
              </div>
            </div>
          </motion.div>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
            className="mb-4 text-center text-sm font-medium text-nexus-text-secondary sm:mb-6 sm:text-base">
            Select your attendee category to get started
          </motion.p>

          {/* Cards grid:
              Mobile   (< 640px)  : 2 columns
              Tablet   (640-1023) : 4 columns
              Desktop  (1024px+)  : 4 columns (wider cards)
          */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 md:gap-5"
          >
            {VALID_PREFIXES.map((pref, i) => {
              const cfg = PREFIX_CONFIG[pref];
              return (
                <motion.button
                  key={pref}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 * i }}
                  whileHover={{ scale: 1.03, transition: { duration: 0.15 } }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => navigate(`/onsite/${pref}`)}
                  className="group flex flex-col items-center gap-2.5 rounded-xl border-2 p-3 text-center shadow-sm transition-shadow hover:shadow-md active:shadow-sm sm:gap-3 sm:rounded-2xl sm:p-4 md:p-5"
                  style={{ backgroundColor: cfg.bg, borderColor: `${cfg.color}40` }}
                >
                  {/* Icon circle */}
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-full transition-transform group-hover:scale-110 sm:h-13 sm:w-13 md:h-14 md:w-14"
                    style={{ backgroundColor: `${cfg.color}18`, color: cfg.color }}>
                    {cfg.icon}
                  </div>

                  {/* Text */}
                  <div className="min-w-0">
                    <p className="text-xs font-bold leading-tight sm:text-sm" style={{ color: cfg.color }}>
                      {cfg.name}
                    </p>
                    {/* Hide desc on very small phones, show from xs/sm up */}
                    <p className="mt-0.5 hidden text-[11px] leading-snug text-nexus-text-muted sm:block">
                      {cfg.desc}
                    </p>
                  </div>

                  {/* Prefix chip */}
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white sm:px-3 sm:text-xs"
                    style={{ backgroundColor: cfg.color }}>
                    {pref}
                  </span>
                </motion.button>
              );
            })}
          </motion.div>

          <p className="mt-8 text-center text-xs text-nexus-text-muted sm:mt-10">
            Powered by <span className="font-semibold">NEXUS</span>
            {" "}&bull;{" "}
            <span className="font-semibold">BlueberIT</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page entry
// ---------------------------------------------------------------------------
export function OnsiteRegistrationPage() {
  const { prefix } = useParams<{ prefix?: string }>();
  const navigate   = useNavigate();

  const upperPrefix = prefix?.toUpperCase();
  const validPrefix = upperPrefix && VALID_PREFIXES.includes(upperPrefix) ? upperPrefix : null;

  useEffect(() => {
    if (prefix && !validPrefix) navigate("/onsite", { replace: true });
  }, [prefix, validPrefix, navigate]);

  if (!validPrefix) return <PrefixSelector />;

  return <OnsiteForm prefix={validPrefix} />;
}
