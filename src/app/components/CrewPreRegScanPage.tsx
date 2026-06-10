import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Camera, Printer, SkipForward, CheckCircle, ShieldAlert, Search } from "lucide-react";
import { useNavigate } from "react-router";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { PreRegistrationService } from "../api/services/preRegistration.service";
import { RegistrationService } from "../api/services/registration.service";
import { toast } from "sonner";

interface PreRegData {
  preRegistrationId: string;
  name: string;
  designation: string;
  companyName: string;
  email: string;
  phone: string;
  phoneCountryCode: string;
  prefix: string;
  badgeQrUrl: string;
  badgePrinted: boolean;
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

export function CrewPreRegScanPage() {
  const navigate = useNavigate();
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);
  const isProcessingRef = useRef(false);

  const [currentStep, setCurrentStep] = useState<"scan" | "verify">("scan");
  const [cameraError, setCameraError] = useState(false);
  const [manualId, setManualId] = useState("");
  const [preRegData, setPreRegData] = useState<PreRegData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessFlash, setShowSuccessFlash] = useState(false);

  // Session stats
  const [stats, setStats] = useState({ scans: 0, printed: 0, skipped: 0 });

  // Start/stop camera QR scanner when on the scan step
  useEffect(() => {
    if (currentStep !== "scan") return;

    setCameraError(false);
    const qrCode = new Html5Qrcode("prereg-qr-scanner");
    html5QrCodeRef.current = qrCode;

    qrCode
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          if (!isProcessingRef.current) handleScanSuccess(decodedText);
        },
        () => {}
      )
      .catch(() => {
        setCameraError(true);
        manualInputRef.current?.focus();
      });

    manualInputRef.current?.focus();

    return () => {
      html5QrCodeRef.current?.stop().catch(() => {});
      html5QrCodeRef.current = null;
    };
  }, [currentStep]);

  const handleScanSuccess = async (qrData: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsLoading(true);
    try {
      const response = await PreRegistrationService.scan(qrData);
      processResponse(response);
    } catch {
      toast.error("Invalid QR Code or Attendee not found");
      isProcessingRef.current = false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualLookup = async () => {
    if (!manualId.trim()) return;
    setIsLoading(true);
    try {
      const response = await PreRegistrationService.getById(manualId);
      processResponse(response);
    } catch {
      toast.error("Attendee ID not found");
    } finally {
      setIsLoading(false);
    }
  };

  const processResponse = (data: any) => {
    const mapped: PreRegData = {
      preRegistrationId: data.preRegistrationId,
      name: data.name,
      designation: data.designation,
      companyName: data.companyName,
      email: data.email,
      phone: data.phoneNumber || data.phone || "",
      phoneCountryCode: data.phoneCountryCode || "+91",
      prefix: data.prefix,
      badgeQrUrl: data.badgeQrUrl,
      badgePrinted: !!data.badgePrinted,
    };
    setPreRegData(mapped);
    setCurrentStep("verify");
    setStats((s) => ({ ...s, scans: s.scans + 1 }));
  };

  const handleConfirmAndPrint = async () => {
    if (!preRegData) return;
    setIsLoading(true);

    try {
      const payload = {
        prefix: preRegData.prefix,
        name: preRegData.name,
        email: preRegData.email,
        phoneCountryCode: preRegData.phoneCountryCode,
        phoneNumber: preRegData.phone,
        designation: preRegData.designation,
        companyName: preRegData.companyName,
        preRegistrationId: preRegData.preRegistrationId,
      };

      const response = await RegistrationService.createRegistration(payload);

      toast.info("Opening badge preview...");
      navigate(`/badge?id=${response.registrationId}`);

      setShowSuccessFlash(true);
      setStats((s) => ({ ...s, printed: s.printed + 1 }));

      setTimeout(() => {
        setShowSuccessFlash(false);
        resetToScanner();
      }, 2000);
    } catch (error: any) {
      toast.error(error.message || "Failed to process check-in");
    } finally {
      setIsLoading(false);
    }
  };

  const resetToScanner = () => {
    setCurrentStep("scan");
    setPreRegData(null);
    setManualId("");
    isProcessingRef.current = false;
  };

  const prefixConfig = preRegData
    ? PREFIX_CONFIG[preRegData.prefix] || PREFIX_CONFIG["VS"]
    : PREFIX_CONFIG["VS"];

  const attendeeInitials = preRegData?.name
    ? preRegData.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC]">
      {/* Top Nav */}
      <div className="fixed left-0 right-0 top-0 z-50 border-b border-nexus-border bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-black italic tracking-tighter text-nexus-brand">NEXUS</h1>
            <div className="h-6 w-px bg-nexus-border" />
            <span className="rounded-lg bg-slate-900 px-3 py-1 text-[10px] font-black tracking-widest text-white shadow-sm uppercase">
              Pre-Reg Station
            </span>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] font-black uppercase text-nexus-text-hint">Scanned</p>
              <p className="text-sm font-black text-nexus-text-primary">{stats.scans}</p>
            </div>
            <button
              onClick={() => navigate("/crew")}
              className="text-xs font-black uppercase tracking-widest text-nexus-text-hint hover:text-nexus-brand transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-4 pt-24 pb-12 sm:px-6">
        <AnimatePresence mode="wait">
          {currentStep === "scan" ? (
            <motion.div
              key="scan"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center"
            >
              <h2 className="text-3xl font-black tracking-tight text-nexus-text-primary mb-2 uppercase">
                Verify Attendance
              </h2>
              <p className="text-nexus-text-hint font-bold mb-10">
                Scan the pre-registration QR code or enter manual ID.
              </p>

              <div className="w-full max-w-2xl overflow-hidden rounded-[3rem] bg-white p-12 shadow-2xl border border-nexus-border relative">
                <div className="flex flex-col items-center">
                  {/* Camera QR Scanner */}
                  <div className="relative mb-10">
                    <div
                      id="prereg-qr-scanner"
                      className="overflow-hidden rounded-[2rem] border-4 border-nexus-brand/30 bg-black shadow-xl"
                      style={{ width: "280px", height: "280px" }}
                    />
                    {cameraError && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-[2rem] bg-nexus-brand-light border-4 border-dashed border-nexus-brand/30">
                        <div className="text-center">
                          <Camera className="mx-auto h-12 w-12 text-nexus-brand opacity-40" />
                          <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-nexus-brand">
                            Camera unavailable
                          </p>
                          <p className="mt-1 text-[9px] text-nexus-text-hint">Use manual entry below</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="w-full max-w-md space-y-6">
                    <div className="relative">
                      <Search className="absolute left-6 top-1/2 h-5 w-5 -translate-y-1/2 text-nexus-text-hint" />
                      <Input
                        ref={manualInputRef}
                        value={manualId}
                        onChange={(e) => setManualId(e.target.value)}
                        placeholder="Scan QR or enter Participant ID..."
                        className="h-16 rounded-[1.25rem] border-nexus-border-strong bg-nexus-page-bg/50 pl-16 pr-24 font-black uppercase tracking-widest focus:ring-4 focus:ring-nexus-brand/5"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleManualLookup();
                            e.currentTarget.focus();
                          }
                        }}
                      />
                      <button
                        onClick={handleManualLookup}
                        className="absolute right-4 top-1/2 -translate-y-1/2 h-10 px-4 rounded-xl bg-nexus-brand text-[10px] font-black uppercase text-white hover:bg-nexus-brand-hover transition-all"
                      >
                        Lookup
                      </button>
                    </div>
                    <p className="text-center text-[10px] font-bold uppercase tracking-widest text-nexus-text-hint">
                      Hardware scanner ready — or point camera at QR code
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="verify"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <button
                    onClick={resetToScanner}
                    className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-nexus-text-hint hover:text-nexus-brand transition-colors"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    Discard and Scan New
                  </button>
                  <h2 className="text-3xl font-black tracking-tight text-nexus-text-primary uppercase">
                    Identity Verification
                  </h2>
                </div>
              </div>

              <div className="grid gap-8 lg:grid-cols-5">
                {/* Attendee Card */}
                <div className="lg:col-span-3 space-y-8">
                  <div className="rounded-[2.5rem] bg-white p-10 shadow-xl border border-nexus-border">
                    <div className="flex flex-col sm:flex-row gap-8 items-center sm:items-start text-center sm:text-left mb-10">
                      {/* Attendee Avatar (initials) */}
                      <div
                        className="h-24 w-24 flex-shrink-0 rounded-[2rem] flex items-center justify-center text-white text-2xl font-black shadow-md"
                        style={{ backgroundColor: prefixConfig.color }}
                      >
                        {attendeeInitials}
                      </div>

                      <div className="flex-1">
                        <div className="mb-2">
                          <span
                            className="rounded-lg px-2.5 py-1 text-[8px] font-black uppercase tracking-widest text-white shadow-sm"
                            style={{ backgroundColor: prefixConfig.color }}
                          >
                            {prefixConfig.name} / {preRegData?.prefix}
                          </span>
                        </div>
                        <h3 className="text-3xl font-black text-nexus-text-primary tracking-tight uppercase leading-tight mb-2">
                          {preRegData?.name}
                        </h3>
                        <p className="text-sm font-bold text-nexus-text-hint uppercase tracking-wide">
                          {preRegData?.designation} • {preRegData?.companyName}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-y-8 gap-x-12 border-t border-nexus-page-bg pt-10">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-nexus-text-hint">
                          Email Record
                        </p>
                        <p className="mt-1.5 text-sm font-black text-nexus-text-primary">
                          {preRegData?.email || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-nexus-text-hint">
                          Phone Contact
                        </p>
                        <p className="mt-1.5 text-sm font-black text-nexus-text-primary">
                          {preRegData?.phoneCountryCode} {preRegData?.phone}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-nexus-text-hint">
                          System Reference
                        </p>
                        <p className="mt-1.5 text-sm font-black text-nexus-brand tracking-widest font-mono">
                          {preRegData?.preRegistrationId}
                        </p>
                      </div>
                      {preRegData?.badgePrinted && (
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">
                            Print Warning
                          </p>
                          <div className="mt-1.5 flex items-center gap-2 text-amber-700 font-black text-xs uppercase italic">
                            <ShieldAlert className="h-4 w-4" />
                            Already Printed
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button
                      onClick={handleConfirmAndPrint}
                      disabled={isLoading}
                      className="h-20 flex-1 bg-nexus-brand text-sm font-black uppercase tracking-[0.2em] text-white shadow-2xl shadow-nexus-brand/20 hover:bg-nexus-brand-hover hover:-translate-y-1 transition-all"
                    >
                      <Printer className="mr-4 h-6 w-6" />
                      {isLoading ? "Processing..." : "Confirm & Print Badge"}
                    </Button>
                    <Button
                      onClick={handleSkip}
                      variant="outline"
                      className="h-20 w-32 rounded-[2rem] border-2 border-nexus-border-strong text-[10px] font-black uppercase tracking-widest text-nexus-text-hint hover:bg-nexus-page-bg transition-all"
                    >
                      <SkipForward className="h-5 w-5 mb-1 mx-auto" />
                      Skip
                    </Button>
                  </div>
                </div>

                {/* Badge Preview Rail */}
                <div className="lg:col-span-2">
                  <div className="sticky top-24 rounded-[2.5rem] bg-slate-900 p-10 text-white shadow-xl overflow-hidden relative border border-slate-800">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-8">
                      Onsite Badge Preview
                    </h4>

                    <div className="aspect-[3/4] w-full rounded-3xl bg-white p-8 flex flex-col items-center justify-between text-slate-900 shadow-2xl shadow-nexus-brand/10">
                      <div className="text-center w-full">
                        {/* Avatar with initials */}
                        <div
                          className="h-24 w-24 rounded-full mx-auto mb-6 flex items-center justify-center text-white text-2xl font-black shadow-lg"
                          style={{ backgroundColor: prefixConfig.color }}
                        >
                          {attendeeInitials}
                        </div>
                        <h5 className="text-xl font-black uppercase tracking-tight truncate w-full">
                          {preRegData?.name}
                        </h5>
                        <p className="text-[10px] font-black uppercase text-slate-400 mt-1">
                          {preRegData?.companyName}
                        </p>
                      </div>

                      <div className="h-24 w-24 rounded-2xl bg-slate-50 border-2 border-slate-100 flex items-center justify-center">
                        <span className="text-[8px] font-black uppercase opacity-20">Badge QR</span>
                      </div>

                      <div className="w-full text-center">
                        <div
                          className="h-4 w-full rounded-full mb-3"
                          style={{ backgroundColor: prefixConfig.color }}
                        />
                        <p className="text-[9px] font-black uppercase tracking-widest">{prefixConfig.name}</p>
                      </div>
                    </div>

                    <div className="absolute -bottom-10 -right-10 h-40 w-40 bg-nexus-brand/10 blur-[60px] rounded-full" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Success Animation */}
      <AnimatePresence>
        {showSuccessFlash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-green-600"
          >
            <div className="text-center text-white">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 12 }}
              >
                <CheckCircle className="mx-auto mb-6 h-32 w-32" />
              </motion.div>
              <h2 className="text-5xl font-black uppercase tracking-tighter">Verified & Ready</h2>
              <p className="mt-4 text-xl font-bold opacity-80">Attendee successfully checked in onsite.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  function handleSkip() {
    setStats((s) => ({ ...s, skipped: s.skipped + 1 }));
    resetToScanner();
  }
}
