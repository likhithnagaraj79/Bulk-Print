import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Printer, Mail, MessageCircle, Lock, Unlock, AlertCircle } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import { Button } from "./ui/button";
import { BadgeService, BadgeData, BadgeTemplate, TemplateField } from "../api/services/badge.service";
import { NotificationService } from "../api/services/notification.service";
import { toast } from "sonner";

const DEFAULT_TEMPLATE: BadgeTemplate = {
  photo:       { x: "50%", y: "22%", w: "30%", h: "22%", rotation: 0 },
  name:        { x: "50%", y: "46%", w: "80%", h: "8%",  rotation: 0 },
  designation: { x: "50%", y: "56%", w: "80%", h: "7%",  rotation: 0 },
  companyName: { x: "50%", y: "65%", w: "80%", h: "7%",  rotation: 0 },
  qrCode:      { x: "50%", y: "83%", w: "28%", h: "20%", rotation: 0 },
};

const PREFIX_NAMES: Record<string, string> = {
  VS: "Visitors",
  VI: "VIPs",
  FDL: "Foreign Delegates",
  EH: "Exhibitors",
  OR: "Organisers",
  SPK: "Speakers",
  DL: "Delegates",
  SPR: "Sponsors",
};

export function BadgePreviewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const registrationId = searchParams.get("id");

  const [badgeData, setBadgeData] = useState<BadgeData | null>(null);
  const [printLock, setPrintLock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [emailStatus, setEmailStatus] = useState("");
  const [whatsappStatus, setWhatsappStatus] = useState("");
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    if (registrationId) {
      loadData();
    } else {
      setError("Missing Registration ID");
      setLoading(false);
    }
  }, [registrationId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [badgeRes, lockRes] = await Promise.all([
        BadgeService.getBadgeData(registrationId!),
        BadgeService.getPrintLockStatus()
      ]);
      setBadgeData(badgeRes);
      setPrintLock(lockRes.printLock);
    } catch (err: any) {
      console.error("Failed to load badge data:", err);
      setError(err.message || "Failed to load badge data");
      toast.error("Failed to load badge data");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    if (!badgeData) return;

    if (printLock && badgeData.printCount > 0) {
      toast.error("Badge already printed. Print lock is active.");
      return;
    }

    setIsPrinting(true);
    try {
      const response = await BadgeService.logPrint(badgeData.registrationId);
      setBadgeData(prev => prev ? { ...prev, printCount: response.printCount } : null);
      toast.success("Opening print dialog...");
      // Small delay so the toast is visible before print dialog blocks the UI
      setTimeout(() => window.print(), 300);
    } catch (err: any) {
      console.error("Print logging failed:", err);
      toast.error(err.message || "Failed to log print");
    } finally {
      setIsPrinting(false);
    }
  };

  const handleSendEmail = async () => {
    if (!badgeData) return;
    setEmailStatus("sending");
    try {
      await NotificationService.sendBadgeEmail(badgeData.registrationId);
      setEmailStatus("sent");
      toast.success("Badge sent via email");
    } catch (err) {
      setEmailStatus("failed");
      toast.error("Failed to send email");
    }
  };

  const handleSendWhatsApp = async () => {
    if (!badgeData) return;
    setWhatsappStatus("sending");
    try {
      await NotificationService.sendBadgeWhatsapp(badgeData.registrationId);
      setWhatsappStatus("sent");
      toast.success("Badge sent via WhatsApp");
    } catch (err) {
      setWhatsappStatus("failed");
      toast.error("Failed to send WhatsApp message");
    }
  };

  const getFieldStyle = (f: TemplateField, extra: React.CSSProperties = {}): React.CSSProperties => ({
    position: "absolute",
    left: f.x,
    top: f.y,
    width: f.w,
    height: f.h,
    transform: `translate(-50%, -50%) rotate(${f.rotation}deg)`,
    overflow: "hidden",
    ...extra,
  });

  const renderTemplateFields = (tpl: BadgeTemplate, data: BadgeData) => (
    <>
      {/* Photo */}
      <div style={getFieldStyle(tpl.photo, { borderRadius: "50%", backgroundColor: "#F3F4F6", border: "1px solid #E5E7EB" })}>
        {data.photoUrl ? (
          <img src={data.photoUrl} alt="Attendee" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400 text-2xl">👤</div>
        )}
      </div>

      {/* Name */}
      <div style={getFieldStyle(tpl.name, { display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "1.1rem", color: "#000", textAlign: "center" })}>
        {data.name}
      </div>

      {/* Designation */}
      <div style={getFieldStyle(tpl.designation, { display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", color: "#555", textAlign: "center" })}>
        {data.designation}
      </div>

      {/* Company Name */}
      <div style={getFieldStyle(tpl.companyName, { display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", color: "#444", textAlign: "center" })}>
        {data.companyName}
      </div>

      {/* QR Code */}
      <div style={getFieldStyle(tpl.qrCode, { backgroundColor: "white", padding: "4px", border: "1px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "center" })}>
        {data.badgeQrUrl ? (
          <img src={data.badgeQrUrl} alt="QR Code" className="h-full w-full object-contain" />
        ) : (
          <div className="text-gray-400 text-[10px]">QR</div>
        )}
      </div>
    </>
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-nexus-page-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-nexus-border-strong border-t-nexus-brand" />
          <p className="text-nexus-text-secondary font-medium animate-pulse">Loading badge profile...</p>
        </div>
      </div>
    );
  }

  if (error || !badgeData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-nexus-page-bg">
        <div className="text-center max-w-md p-8 rounded-2xl bg-nexus-surface shadow-xl border border-nexus-border">
          <AlertCircle className="mx-auto mb-4 h-16 w-16 text-red-500" />
          <h2 className="text-xl font-bold text-nexus-text-primary mb-2">Error Loading Badge</h2>
          <p className="text-nexus-text-secondary mb-6">{error || "The requested badge could not be found."}</p>
          <Button onClick={() => navigate(-1)} variant="outline" className="w-full">
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const template = badgeData.template || DEFAULT_TEMPLATE;

  return (
    <div className="min-h-screen w-full bg-nexus-page-bg print:bg-white">
      {/* Print Specific CSS */}
      <style>{`
        @page { size: 10cm 15cm; margin: 0; }
        @media print {
          body * { visibility: hidden !important; }
          #badge-render-container, #badge-render-container * { visibility: visible !important; }
          #badge-render-container {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 10cm !important;
            height: 15cm !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            background: white !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Top Nav */}
      <div className="fixed left-0 right-0 top-0 z-50 border-b border-nexus-border bg-nexus-surface print:hidden">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-nexus-text-primary tracking-tight">NEXUS</h1>
            <div className="h-4 w-px bg-nexus-border" />
            <span className="text-sm font-medium text-nexus-text-secondary">Badge Preview</span>
          </div>
          <Button variant="ghost" onClick={() => navigate(-1)} className="text-nexus-text-secondary">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Exit Preview
          </Button>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 pt-24 pb-12 sm:px-6 lg:px-8 print:p-0">
        <div className="grid gap-12 lg:grid-cols-[400px_1fr]">
          {/* Badge Display */}
          <div className="flex flex-col items-center">
            <div
              id="badge-render-container"
              className="relative overflow-hidden rounded-2xl bg-white shadow-2xl transition-all duration-300"
              style={{
                width: "380px",
                height: "540px",
                border: "3px solid #1E5FCC",
              }}
            >
              <div className="absolute inset-0 z-0 bg-white" />
              <div className="relative z-10 w-full h-full">
                {renderTemplateFields(template, badgeData)}
              </div>
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-nexus-text-hint print:hidden">
              Final Print Preview
            </p>
          </div>

          {/* Controls Panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8 print:hidden"
          >
            {/* Summary Card */}
            <div className="overflow-hidden rounded-2xl border border-nexus-border bg-nexus-surface shadow-lg">
              <div className="bg-nexus-brand-light p-6">
                <h2 className="text-2xl font-black text-nexus-brand uppercase">{badgeData.name}</h2>
                <p className="text-sm font-semibold text-nexus-brand/70">{badgeData.designation} @ {badgeData.companyName}</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${badgeData.printCount > 0 ? 'bg-amber-500' : 'bg-green-500'}`} />
                    <span className="text-sm font-medium text-nexus-text-secondary">Print Status</span>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${badgeData.printCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                    }`}>
                    {badgeData.printCount === 0 ? 'Ready to Print' : `${badgeData.printCount} Times Printed`}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${printLock ? 'bg-red-500' : 'bg-blue-500'}`} />
                    <span className="text-sm font-medium text-nexus-text-secondary">System Lock</span>
                  </div>
                  <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase ${printLock ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                    {printLock ? <><Lock className="h-3 w-3" /> Reprints Blocked</> : <><Unlock className="h-3 w-3" /> Reprints Allowed</>}
                  </span>
                </div>

                <div className="pt-4 border-t border-nexus-border">
                  <p className="text-[10px] font-bold uppercase text-nexus-text-hint mb-1">Badge ID</p>
                  <p className="font-mono text-xl font-black text-nexus-text-primary tracking-wider">{badgeData.registrationId}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid gap-4 sm:grid-cols-1">
              <Button
                onClick={handlePrint}
                disabled={isPrinting}
                className="h-16 w-full bg-nexus-brand text-lg font-bold shadow-xl hover:bg-nexus-brand-hover hover:scale-[1.02] transition-all"
              >
                <Printer className="mr-3 h-6 w-6" />
                {isPrinting ? "Processing..." : "Issue Physical Badge"}
              </Button>

              <div className="grid grid-cols-2 gap-4">
                <Button
                  onClick={handleSendEmail}
                  disabled={emailStatus === "sending"}
                  variant="outline"
                  className="h-14 font-bold border-nexus-border-strong hover:bg-nexus-surface-hover"
                >
                  <Mail className={`mr-2 h-5 w-5 ${emailStatus === 'sent' ? 'text-green-550' : ''}`} />
                  {emailStatus === "sending" ? "..." : "Email Digipass"}
                </Button>

                <Button
                  onClick={handleSendWhatsApp}
                  disabled={whatsappStatus === "sending"}
                  variant="outline"
                  className="h-14 font-bold border-nexus-border-strong hover:bg-nexus-surface-hover"
                >
                  <MessageCircle className={`mr-2 h-5 w-5 ${whatsappStatus === 'sent' ? 'text-green-550' : ''}`} />
                  {whatsappStatus === "sending" ? "..." : "WhatsApp Pass"}
                </Button>
              </div>
            </div>

            {/* Warning if printed and locked */}
            {printLock && badgeData.printCount > 0 && (
              <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <AlertCircle className="h-6 w-6 text-amber-600 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-amber-900">Physical Print Restriction</p>
                  <p className="mt-1 text-xs text-amber-800 leading-relaxed">
                    This badge has already been issued <b>{badgeData.printCount}</b> time(s).
                    System security settings currently prevent generating additional physical copies.
                    Please contact a Super Admin to authorize a reprint.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
