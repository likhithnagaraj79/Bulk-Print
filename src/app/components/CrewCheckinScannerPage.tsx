import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Camera, ShieldCheck, ShieldAlert, History, X } from "lucide-react";
import { useNavigate } from "react-router";
import { Html5Qrcode } from "html5-qrcode";
import { CheckInService, CheckInResponse } from "../api/services/checkin.service";
import { toast } from "sonner";

interface ScanResultUI extends CheckInResponse {
  id: string;
  timestamp: string;
  duplicate: boolean;
}

const PREFIX_COLORS: Record<string, string> = {
  VS: "#1E5FCC",
  VI: "#A07800",
  FDL: "#0B9E96",
  EH: "#C25A00",
  OR: "#4B2FA6",
  SPK: "#0E7A4E",
  DL: "#B01E28",
  SPR: "#5A6E8C",
};

export function CrewCheckinScannerPage() {
  const navigate = useNavigate();
  const [currentResult, setCurrentResult] = useState<ScanResultUI | null>(null);
  const [recentScans, setRecentScans] = useState<ScanResultUI[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    newCheckins: 0,
    duplicates: 0,
    errors: 0,
  });

  const lastQrRef = useRef<string>("");
  const lastTimeRef = useRef<number>(0);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);
  const [cameraError, setCameraError] = useState(false);

  const handleScan = async (qrData: string) => {
    // Debounce: skip same QR within 3s
    const now = Date.now();
    if (lastQrRef.current === qrData && now - lastTimeRef.current < 3000) {
      return;
    }
    lastQrRef.current = qrData;
    lastTimeRef.current = now;

    try {
      const response = await CheckInService.scanQr(qrData);

      const isDuplicate = response.message === 'Already checked in';

      const result: ScanResultUI = {
        ...response,
        id: `scan-${Date.now()}`,
        timestamp: new Date().toISOString(),
        duplicate: isDuplicate
      };

      setCurrentResult(result);
      setRecentScans((prev) => [result, ...prev].slice(0, 20));

      if (isDuplicate) {
        setStats((prev) => ({ ...prev, total: prev.total + 1, duplicates: prev.duplicates + 1 }));
        playFeedback("duplicate");
      } else {
        setStats((prev) => ({ ...prev, total: prev.total + 1, newCheckins: prev.newCheckins + 1 }));
        playFeedback("success");
        toast.success(`Check-in: ${response.attendeeName}`);
      }

      // Auto-dismiss after 3s
      setTimeout(() => setCurrentResult(null), 3000);
    } catch (error: any) {
      const result: ScanResultUI = {
        id: `scan-${Date.now()}`,
        success: false,
        checkedIn: false,
        duplicate: false,
        message: error.message || "Invalid QR or Server Error",
        timestamp: new Date().toISOString(),
      };

      setCurrentResult(result);
      setRecentScans((prev) => [result, ...prev].slice(0, 20));
      setStats((prev) => ({ ...prev, total: prev.total + 1, errors: prev.errors + 1 }));
      playFeedback("error");
      toast.error(error.message || "Check-in failed");

      setTimeout(() => setCurrentResult(null), 3000);
    }
  };

  useEffect(() => {
    const qrCode = new Html5Qrcode("checkin-qr-scanner");
    html5QrCodeRef.current = qrCode;

    qrCode
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => handleScan(decodedText),
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
  }, []);

  const playFeedback = (type: "success" | "duplicate" | "error") => {
    if (navigator.vibrate) {
      const patterns = {
        success: [100],
        duplicate: [100, 50, 100],
        error: [100, 50, 100, 50, 100],
      };
      navigator.vibrate(patterns[type]);
    }
  };

  const getRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    if (diffSecs < 60) return `${diffSecs}s ago`;
    return `${Math.floor(diffSecs / 60)}m ago`;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="min-h-screen w-full bg-[#0F172A] text-white">
      {/* Immersive Header */}
      <div className="fixed left-0 right-0 top-0 z-50 bg-[#1E293B]/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-nexus-brand">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-black uppercase tracking-tighter">Nexus Scan</h1>
              <p className="text-[10px] font-bold text-nexus-text-hint">CREW MODE</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-bold text-nexus-text-hint uppercase">Scanned Today</p>
              <p className="text-sm font-black text-white">{stats.total}</p>
            </div>
            <button
              onClick={() => navigate("/crew")}
              className="rounded-full bg-red-500/10 px-4 py-1.5 text-xs font-bold text-red-500 hover:bg-red-500/20 transition-all border border-red-500/20"
            >
              Exit Scanner
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-lg px-4 pt-24 pb-8">
        {/* Camera QR Scanner */}
        <div className="mb-8 flex flex-col items-center">
          <div className="relative group mb-2">
            <div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-r from-blue-600 to-cyan-500 opacity-20 blur-xl group-hover:opacity-40 transition-opacity" />
            <div
              id="checkin-qr-scanner"
              className="relative overflow-hidden rounded-[2rem] border-4 border-white/10 bg-black shadow-2xl"
              style={{ width: "320px", height: "320px" }}
            />
            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center rounded-[2rem] bg-slate-900/90">
                <div className="text-center">
                  <Camera className="mx-auto mb-3 h-12 w-12 text-gray-500 animate-pulse" />
                  <p className="text-sm font-bold text-gray-400">Camera unavailable</p>
                  <p className="mt-1 text-xs text-gray-600">Use manual entry or hardware scanner below</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex w-full flex-col gap-3">
            <input
              ref={manualInputRef}
              autoFocus
              type="text"
              placeholder="Hardware scanner / manual entry..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleScan(e.currentTarget.value);
                  e.currentTarget.value = "";
                  e.currentTarget.focus();
                }
              }}
              className="w-full rounded-2xl bg-white/5 border border-white/10 p-4 text-center font-mono text-sm focus:border-nexus-brand focus:outline-none transition-all"
            />
            <p className="text-[10px] text-center font-bold text-gray-500 uppercase tracking-widest">Scanner ready — connect hardware scanner or point camera at QR</p>
          </div>
        </div>

        {/* Scan Results Overlay */}
        <AnimatePresence mode="wait">
          {currentResult && (
            <motion.div
              key={currentResult.id}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              className={`mb-8 overflow-hidden rounded-3xl p-8 text-center shadow-2xl ring-4 ring-black/50 ${currentResult.success && !currentResult.duplicate
                  ? "bg-gradient-to-br from-green-500 to-emerald-600"
                  : currentResult.duplicate
                    ? "bg-gradient-to-br from-amber-500 to-orange-600"
                    : "bg-gradient-to-br from-red-500 to-rose-600"
                }`}
            >
              <div className="mb-4 flex justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 backdrop-blur-md">
                  {currentResult.success && !currentResult.duplicate ? (
                    <ShieldCheck className="h-10 w-10 text-white" />
                  ) : currentResult.duplicate ? (
                    <ShieldAlert className="h-10 w-10 text-white" />
                  ) : (
                    <X className="h-10 w-10 text-white" />
                  )}
                </div>
              </div>

              <h2 className="text-3xl font-black tracking-tight text-white mb-1">
                {currentResult.success && !currentResult.duplicate
                  ? "ACCESS GRANTED"
                  : currentResult.duplicate
                    ? "REPEAT SCAN"
                    : "ACCESS DENIED"}
              </h2>
              <p className="text-white/80 font-bold text-sm uppercase tracking-widest mb-6">
                {currentResult.success && !currentResult.duplicate ? "Valid Entry Registered" : currentResult.message}
              </p>

              {currentResult.attendeeName && (
                <div className="rounded-2xl bg-black/10 p-4 backdrop-blur-sm">
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-xl font-black text-white">{currentResult.attendeeName}</span>
                    {currentResult.attendeePrefix && (
                      <span
                        className="rounded-lg px-2.5 py-1 font-black text-xs text-white shadow-lg"
                        style={{ backgroundColor: PREFIX_COLORS[currentResult.attendeePrefix] }}
                      >
                        {currentResult.attendeePrefix}
                      </span>
                    )}
                  </div>
                  {currentResult.checkedInAt && (
                    <p className="mt-2 text-xs font-bold text-white/70">
                      {currentResult.duplicate ? "ALREADY RECORDED AT" : "TIMESTAMP"}: {formatTime(currentResult.checkedInAt)}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Local Quick Stats */}
        <div className="mb-8 grid grid-cols-3 gap-4">
          {[
            { label: 'CHECKINS', value: stats.newCheckins, color: 'text-green-400' },
            { label: 'REPEATS', value: stats.duplicates, color: 'text-amber-400' },
            { label: 'FAILURES', value: stats.errors, color: 'text-red-400' }
          ].map(s => (
            <div key={s.label} className="rounded-2xl bg-white/5 p-4 border border-white/5 text-center">
              <p className="text-[9px] font-black tracking-widest text-gray-500 uppercase">{s.label}</p>
              <p className={`mt-1 text-2xl font-black ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* History List */}
        <div className="rounded-3xl bg-white/5 p-6 border border-white/5">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-gray-400">
              <History className="h-4 w-4" />
              Live Feed
            </h3>
            <span className="text-[10px] font-bold text-gray-600">LATEST 20 SCANS</span>
          </div>

          <div className="space-y-3">
            {recentScans.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center opacity-20">
                <ShieldCheck className="h-12 w-12 mb-4" />
                <p className="text-sm font-bold uppercase tracking-widest">No Activity</p>
              </div>
            ) : (
              recentScans.map((scan) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={scan.id}
                  className={`flex items-center justify-between rounded-2xl bg-white/5 p-4 border-l-4 ${scan.success && !scan.duplicate
                      ? "border-green-500"
                      : scan.duplicate
                        ? "border-amber-500"
                        : "border-red-500"
                    }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gray-900 shadow-inner`}>
                      {scan.success && !scan.duplicate ? (
                        <ShieldCheck className="h-5 w-5 text-green-500" />
                      ) : (
                        <ShieldAlert className={`h-5 w-5 ${scan.duplicate ? 'text-amber-500' : 'text-red-500'}`} />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-white">
                          {scan.attendeeName || "SYSTEM ERROR"}
                        </span>
                        {scan.attendeePrefix && (
                          <span
                            className="rounded px-1.5 py-0.5 font-black text-[10px] text-white"
                            style={{ backgroundColor: PREFIX_COLORS[scan.attendeePrefix] }}
                          >
                            {scan.attendeePrefix}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-bold text-gray-500 mt-0.5">
                        {scan.success && !scan.duplicate
                          ? "SUCCESSFUL ENTRY"
                          : scan.duplicate
                            ? "DUPLICATE ATTEMPT"
                            : scan.message?.toUpperCase() || "ACCESS DENIED"}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-gray-600">{getRelativeTime(scan.timestamp)}</span>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
