import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Eye, Printer, Mail, MessageCircle, RefreshCw, UserPlus, History, X, TrendingUp, Users, CheckSquare, WifiOff } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "./ui/button";
import { RegistrationService, Registration } from "../api/services/registration.service";
import { AuthService, UserProfile } from "../api/services/auth.service";
import { SettingsService } from "../api/services/settings.service";
import { TopNav } from "./dashboard/TopNav";
import { CrewSidebar } from "./dashboard/CrewSidebar";
import { NotificationService } from "../api/services/notification.service";
import { toast } from "sonner";

const PREFIX_MAP: Record<string, string> = {
  visitors: "VS",
  vips: "VI",
  foreign_delegates: "FDL",
  exhibitors: "EH",
  organisers: "OR",
  speakers: "SPK",
  delegates: "DL",
  sponsors: "SPR",
  master: "ALL",
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

export function CrewDashboard() {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [crewInfo, setCrewInfo] = useState<UserProfile | null>(null);
  const [eventName, setEventName] = useState<string>("");
  const [stats, setStats] = useState({ todayCount: 0, totalCount: 0, printedCount: 0 });
  const [offlineCount, setOfflineCount] = useState(0);
  const [recentSubmissions, setRecentSubmissions] = useState<Registration[]>([]);
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const assignedPrefix = (crewInfo && PREFIX_MAP[crewInfo.crewType ?? ""]) || "VS";
  const crewColor = (crewInfo && CREW_TYPE_COLORS[crewInfo.crewType ?? ""]) || "#1E5FCC";
  const crewLabel = (crewInfo && CREW_TYPE_LABELS[crewInfo.crewType ?? ""]) || "Crew";

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const today = new Date().toISOString().split("T")[0];
        const res = await RegistrationService.getRegistrations({ fromDate: today, toDate: today, limit: 1 });
        setStats((prev) => ({ ...prev, todayCount: res.total }));
      } catch {}
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const [me, subs, todaySubs, eventsRes] = await Promise.all([
        AuthService.getMe(),
        RegistrationService.getRegistrations({ limit: 8 }),
        RegistrationService.getRegistrations({ fromDate: today, toDate: today, limit: 1 }),
        SettingsService.getEvents().catch(() => ({ success: false, events: [] })),
      ]);
      if (eventsRes.success && eventsRes.events.length > 0) setEventName(eventsRes.events[0].eventName);
      setCrewInfo(me);
      setRecentSubmissions(subs.data);
      setStats({
        todayCount: todaySubs.total,
        totalCount: subs.total,
        printedCount: subs.data.filter((r) => r.printCount > 0).length,
      });
      loadOfflineQueue();
    } catch {
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  const loadOfflineQueue = () => {
    const queue = localStorage.getItem(OFFLINE_STORAGE_KEY);
    if (queue) {
      try {
        const parsed = JSON.parse(queue);
        setOfflineCount(Array.isArray(parsed) ? parsed.length : 0);
      } catch {
        localStorage.removeItem(OFFLINE_STORAGE_KEY);
        setOfflineCount(0);
      }
    }
  };


  const syncOfflineQueue = async () => {
    const queue = JSON.parse(localStorage.getItem(OFFLINE_STORAGE_KEY) || "[]");
    if (!queue.length) return;
    setIsSyncing(true);
    try {
      await RegistrationService.syncOfflineRecords(queue);
      localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify([]));
      setOfflineCount(0);
      toast.success(`Synced ${queue.length} records`);
      loadInitialData();
    } catch {
      toast.error("Sync failed. Retry later.");
    } finally {
      setIsSyncing(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const kpiCards = [
    {
      label: "Today's Registrations",
      value: stats.todayCount,
      icon: TrendingUp,
      color: crewColor,
      bg: `${crewColor}12`,
    },
    {
      label: "Total Entries",
      value: stats.totalCount,
      icon: Users,
      color: "#0E7A4E",
      bg: "#0E7A4E12",
    },
    {
      label: "Badges Printed",
      value: stats.printedCount,
      icon: CheckSquare,
      color: "#7C3AED",
      bg: "#7C3AED12",
    },
    {
      label: "Offline Queue",
      value: offlineCount,
      icon: WifiOff,
      color: offlineCount > 0 ? "#D97706" : "#94A3B8",
      bg: offlineCount > 0 ? "#D9770612" : "#94A3B812",
    },
  ];

  const quickActions = [
    { label: "New Registration", icon: UserPlus, path: "/crew/register", color: crewColor },
  ];

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-nexus-page-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-nexus-brand border-t-transparent" />
          <p className="text-sm font-medium text-nexus-text-secondary">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-nexus-page-bg pt-16">
      <TopNav role="crew" crewLabel={crewLabel} crewColor={crewColor} />
      <CrewSidebar collapsed={sidebarCollapsed} onToggle={setSidebarCollapsed} crewColor={crewColor} />

      <main className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? "lg:pl-20" : "lg:pl-60"}`}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="p-6 lg:p-8"
        >
          {/* Header */}
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-nexus-text-primary">
                Welcome, {crewInfo?.fullName || crewInfo?.username}
              </h1>
              <p className="mt-1 text-sm text-nexus-text-secondary">
                Station <span className="font-semibold" style={{ color: crewColor }}>{assignedPrefix}</span>
                {eventName && <> &mdash; {eventName}</>}
              </p>
            </div>
            {offlineCount > 0 && (
              <button
                onClick={syncOfflineQueue}
                disabled={isSyncing}
                className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
                Sync {offlineCount} queued
              </button>
            )}
          </div>

          {/* KPI Cards */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpiCards.map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="rounded-xl border border-nexus-border bg-nexus-surface p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-nexus-text-secondary">{card.label}</p>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: card.bg }}>
                    <card.icon className="h-5 w-5" style={{ color: card.color }} />
                  </div>
                </div>
                <p className="mt-3 text-3xl font-bold tabular-nums text-nexus-text-primary">{card.value}</p>
              </motion.div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="mb-8 grid gap-3 grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action, i) => (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28 + i * 0.06 }}
                onClick={() => navigate(action.path)}
                className="flex items-center gap-3 rounded-xl border border-nexus-border bg-nexus-surface px-4 py-3.5 text-sm font-medium text-nexus-text-primary shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${action.color}18` }}>
                  <action.icon className="h-4 w-4" style={{ color: action.color }} />
                </div>
                <span className="truncate text-left">{action.label}</span>
              </motion.button>
            ))}
          </div>

          {/* Main Grid */}
          <div className="grid gap-6">
            {/* Recent Submissions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm"
            >
              <div className="mb-5 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-base font-semibold text-nexus-text-primary">
                  <History className="h-5 w-5 text-nexus-text-secondary" />
                  Recent Entries
                </h2>
                <button
                  onClick={loadInitialData}
                  className="rounded-lg p-1.5 text-nexus-text-hint transition-colors hover:bg-nexus-surface-hover hover:text-nexus-text-primary"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2">
                {recentSubmissions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-nexus-text-hint">
                    <Users className="h-10 w-10 opacity-20" />
                    <p className="mt-3 text-sm">No entries yet today</p>
                  </div>
                ) : (
                  recentSubmissions.map((sub) => (
                    <div
                      key={sub.registrationId}
                      className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-nexus-surface-hover"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                          style={{ backgroundColor: crewColor }}
                        >
                          {sub.prefix}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-nexus-text-primary">{sub.name}</p>
                          <p className="truncate text-xs text-nexus-text-hint">{sub.companyName || sub.email || "—"} · {formatTimeAgo(sub.createdAt)}</p>
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-1 ml-2">
                        <button
                          onClick={() => { setSelectedRegistration(sub); setShowDetailModal(true); }}
                          className="rounded-lg p-1.5 text-nexus-text-hint transition-colors hover:bg-nexus-brand-light hover:text-nexus-brand"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => navigate(`/badge?id=${sub.registrationId}`)}
                          className="rounded-lg p-1.5 text-nexus-text-hint transition-colors hover:bg-nexus-brand-light hover:text-nexus-brand"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {recentSubmissions.length > 0 && (
                <div className="mt-4 border-t border-nexus-border pt-4">
                  <button
                    onClick={() => navigate("/crew/submissions")}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium text-nexus-brand transition-colors hover:bg-nexus-brand-light"
                  >
                    View all submissions
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>
      </main>

      {/* Record Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedRegistration && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowDetailModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-nexus-border bg-nexus-surface p-8 shadow-2xl"
            >
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl text-white text-sm font-bold" style={{ backgroundColor: crewColor }}>
                    {selectedRegistration.prefix}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-nexus-text-primary">Record Details</h3>
                    <p className="text-xs text-nexus-text-hint font-mono">{selectedRegistration.registrationId}</p>
                  </div>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="rounded-lg p-1.5 text-nexus-text-hint transition-colors hover:bg-nexus-surface-hover">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 mb-6">
                {[
                  { label: "Name", value: selectedRegistration.name },
                  { label: "Email", value: selectedRegistration.email || "—" },
                  { label: "Phone", value: `${selectedRegistration.phoneCountryCode} ${selectedRegistration.phoneNumber}` },
                  { label: "Registered", value: new Date(selectedRegistration.createdAt).toLocaleString() },
                  { label: "Designation", value: selectedRegistration.designation || "—" },
                  { label: "Organization", value: selectedRegistration.companyName || "—" },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-xs font-medium text-nexus-text-hint">{item.label}</p>
                    <p className="mt-0.5 text-sm font-medium text-nexus-text-primary truncate">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="mb-6 flex items-center justify-between rounded-lg border border-nexus-border bg-nexus-page-bg px-4 py-3">
                <div>
                  <p className="text-xs text-nexus-text-hint">Badge Prints</p>
                  <p className="text-xl font-bold text-nexus-text-primary">{selectedRegistration.printCount}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => { try { await NotificationService.sendBadgeEmail(selectedRegistration.registrationId); toast.success("Email sent"); } catch { toast.error("Failed"); } }}
                    className="rounded-lg border border-nexus-border bg-nexus-surface p-2.5 text-nexus-text-hint transition-colors hover:text-blue-600 hover:border-blue-300"
                  >
                    <Mail className="h-4 w-4" />
                  </button>
                  <button
                    onClick={async () => { try { await NotificationService.sendBadgeWhatsapp(selectedRegistration.registrationId); toast.success("WhatsApp sent"); } catch { toast.error("Failed"); } }}
                    className="rounded-lg border border-nexus-border bg-nexus-surface p-2.5 text-nexus-text-hint transition-colors hover:text-green-600 hover:border-green-300"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => navigate(`/badge?id=${selectedRegistration.registrationId}`)}
                  className="h-10 flex-1 font-semibold text-white"
                  style={{ backgroundColor: crewColor }}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Print Badge
                </Button>
                <Button
                  onClick={() => setShowDetailModal(false)}
                  variant="outline"
                  className="h-10 flex-1"
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
