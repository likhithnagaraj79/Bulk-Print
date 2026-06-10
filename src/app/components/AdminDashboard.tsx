import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Users,
  UserCheck,
  Clock,
  Lock,
  Unlock,
  Upload,
  CreditCard,
  FileText,
  UserCog,
  TrendingUp,
  X,
  Edit2,
  Save
} from "lucide-react";
import { TopNav } from "./dashboard/TopNav";
import { AdminSidebar } from "./dashboard/AdminSidebar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Chart, BarController, BarElement, DoughnutController, ArcElement, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";
import { useNavigate } from "react-router";
import { ReportService, CategoryStat, HourlyArrival } from "../api/services/report.service";
import { RegistrationService, Registration } from "../api/services/registration.service";
import { AuditService } from "../api/services/audit.service";
import { BadgeService } from "../api/services/badge.service";
import { SettingsService, EventData } from "../api/services/settings.service";
import { toast } from "sonner";

Chart.register(BarController, BarElement, DoughnutController, ArcElement, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend);

const categoryColors: Record<string, string> = {
  VS: "#3B82F6", // Blue
  VI: "#8B5CF6", // Purple
  FDL: "#EC4899", // Pink
  EH: "#F59E0B", // Amber
  OR: "#10B981", // Green
  SPK: "#EF4444", // Red
  DL: "#06B6D4", // Cyan
  SPR: "#F97316", // Orange
};

export function AdminDashboard() {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [totalRegistrations, setTotalRegistrations] = useState(0);
  const [onlineCrew, setOnlineCrew] = useState(0);
  const [preRegistered, setPreRegistered] = useState(0);
  const [printLock, setPrintLock] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);
  const [categoryData, setCategoryData] = useState<CategoryStat[]>([]);
  const [hourlyData, setHourlyData] = useState<HourlyArrival[]>([]);
  const [liveFeed, setLiveFeed] = useState<Registration[]>([]);

  // Event editing state
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [showEditEvent, setShowEditEvent] = useState(false);
  const [editEventName, setEditEventName] = useState("");
  const [isSavingEvent, setIsSavingEvent] = useState(false);

  const barChartRef = useRef<HTMLCanvasElement>(null);
  const donutChartRef = useRef<HTMLCanvasElement>(null);
  const lineChartRef = useRef<HTMLCanvasElement>(null);
  const sparklineRef = useRef<HTMLCanvasElement>(null);

  const barChartInstanceRef = useRef<Chart | null>(null);
  const donutChartInstanceRef = useRef<Chart | null>(null);
  const lineChartInstanceRef = useRef<Chart | null>(null);
  const sparklineInstanceRef = useRef<Chart | null>(null);

  // Fetch initial data
  useEffect(() => {
    fetchDashboardData();
    fetchPrintLock();
    fetchLiveFeed();
    fetchOnlineCrew();
    fetchHourlyData();
    fetchEventData();

    // Polling intervals
    const crewInterval = setInterval(fetchOnlineCrew, 30000); // 30s
    const feedInterval = setInterval(fetchLiveFeed, 30000); // 30s
    const hourlyInterval = setInterval(fetchHourlyData, 60000); // 60s

    return () => {
      clearInterval(crewInterval);
      clearInterval(feedInterval);
      clearInterval(hourlyInterval);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await ReportService.getRegistrationStats();
      if (response.success) {
        setCategoryData(response.categories);

        // Count up animation
        animateValue(0, response.totalRegistrations, 1200, setTotalRegistrations);
        animateValue(0, response.totalPreRegistered, 1200, setPreRegistered);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    }
  };

  const fetchPrintLock = async () => {
    try {
      const response = await BadgeService.getPrintLockStatus();
      setPrintLock(response.printLock);
    } catch (error) {
      console.error("Failed to fetch print lock status:", error);
    }
  };

  const fetchOnlineCrew = async () => {
    try {
      const response = await AuditService.getCrewLive();
      setOnlineCrew(response.activeCrew?.length ?? 0);
    } catch (error) {
      console.error("Failed to fetch online crew:", error);
    }
  };

  const fetchHourlyData = async () => {
    try {
      const response = await ReportService.getHourlyArrivals();
      if (response.success) {
        setHourlyData(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch hourly data:", error);
    }
  };

  const fetchLiveFeed = async () => {
    try {
      const response = await RegistrationService.getRegistrations({ limit: 10 });
      if (response.success) {
        setLiveFeed(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch live feed:", error);
    }
  };

  const fetchEventData = async () => {
    try {
      const response = await SettingsService.getEvents();
      if (response.success && response.events.length > 0) {
        setEventData(response.events[0]);
      }
    } catch (error) {
      console.error("Failed to fetch event data:", error);
    }
  };

  const openEditEvent = () => {
    setEditEventName(eventData?.eventName ?? "");
    setShowEditEvent(true);
  };

  const saveEventName = async () => {
    if (!eventData?.id || !editEventName.trim()) return;
    setIsSavingEvent(true);
    try {
      const response = await SettingsService.updateEvent(eventData.id, { eventName: editEventName.trim() });
      if (response.success) {
        setEventData(prev => prev ? { ...prev, eventName: editEventName.trim() } : prev);
        setShowEditEvent(false);
        toast.success("Event name updated successfully!");
      }
    } catch {
      toast.error("Failed to update event name");
    } finally {
      setIsSavingEvent(false);
    }
  };

  const animateValue = (start: number, end: number, duration: number, setter: (val: number) => void) => {
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
      current += increment;
      if (current >= end) {
        setter(end);
        clearInterval(timer);
      } else {
        setter(Math.floor(current));
      }
    }, 16);
  };

  const handlePrintLockToggle = async () => {
    setShowLockModal(true);
  };

  const confirmPrintLockToggle = async () => {
    try {
      const response = await BadgeService.togglePrintLock(!printLock);
      if (response.success) {
        setPrintLock(!printLock);
        setShowLockModal(false);
        toast.success(`Printing ${!printLock ? "locked" : "unlocked"} successfully`);
      }
    } catch (error) {
      console.error("Failed to toggle print lock:", error);
      toast.error("Failed to update print lock status");
    }
  };

  // Bar Chart - Registrations by Category
  useEffect(() => {
    if (!barChartRef.current || categoryData.length === 0) return;

    if (barChartInstanceRef.current) {
      barChartInstanceRef.current.destroy();
    }

    const ctx = barChartRef.current.getContext("2d");
    if (!ctx) return;

    barChartInstanceRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: categoryData.map((cat) => cat.prefix),
        datasets: [
          {
            label: "Registrations",
            data: categoryData.map((cat) => cat.onsite),
            backgroundColor: categoryData.map((cat) => categoryColors[cat.prefix] ?? "#6B7280"),
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => {
                const total = categoryData.reduce((sum, cat) => sum + cat.onsite, 0);
                const percentage = ((context.parsed.y / (total || 1)) * 100).toFixed(1);
                return `${context.parsed.y} (${percentage}%)`;
              },
            },
          },
        },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, grid: { color: "#E5E7EB" } },
        },
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const index = elements[0].index;
            const prefix = categoryData[index].prefix.toLowerCase();
            navigate(`/admin/registrations/${prefix}`);
          }
        },
      },
    });

    return () => {
      if (barChartInstanceRef.current) {
        barChartInstanceRef.current.destroy();
      }
    };
  }, [categoryData, navigate]);

  // Donut Chart - Category Split
  useEffect(() => {
    if (!donutChartRef.current || categoryData.length === 0) return;

    if (donutChartInstanceRef.current) {
      donutChartInstanceRef.current.destroy();
    }

    const ctx = donutChartRef.current.getContext("2d");
    if (!ctx) return;

    donutChartInstanceRef.current = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: categoryData.map((cat) => cat.label),
        datasets: [
          {
            data: categoryData.map((cat) => cat.onsite),
            backgroundColor: categoryData.map((cat) => categoryColors[cat.prefix] ?? "#6B7280"),
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "65%",
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              usePointStyle: true,
              padding: 15,
              font: { size: 11 },
            },
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const total = categoryData.reduce((sum, cat) => sum + cat.onsite, 0);
                const percentage = ((context.parsed / (total || 1)) * 100).toFixed(1);
                return `${context.label}: ${context.parsed} (${percentage}%)`;
              },
            },
          },
        },
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const index = elements[0].index;
            const prefix = categoryData[index].prefix.toLowerCase();
            navigate(`/admin/registrations/${prefix}`);
          }
        },
      },
    });

    return () => {
      if (donutChartInstanceRef.current) {
        donutChartInstanceRef.current.destroy();
      }
    };
  }, [categoryData, navigate]);

  // Line Chart - Hourly Arrivals
  useEffect(() => {
    if (!lineChartRef.current || hourlyData.length === 0) return;

    if (lineChartInstanceRef.current) {
      lineChartInstanceRef.current.destroy();
    }

    const ctx = lineChartRef.current.getContext("2d");
    if (!ctx) return;

    lineChartInstanceRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: hourlyData.map((h) => h.hour),
        datasets: [
          {
            label: "Registrations",
            data: hourlyData.map((h) => h.count),
            borderColor: "#0066CC",
            backgroundColor: "rgba(0, 102, 204, 0.1)",
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              maxRotation: 45,
              minRotation: 45,
            },
          },
          y: { beginAtZero: true, grid: { color: "#E5E7EB" } },
        },
      },
    });

    return () => {
      if (lineChartInstanceRef.current) {
        lineChartInstanceRef.current.destroy();
      }
    };
  }, [hourlyData]);

  // Sparkline Chart
  useEffect(() => {
    if (!sparklineRef.current || hourlyData.length === 0) return;

    if (sparklineInstanceRef.current) {
      sparklineInstanceRef.current.destroy();
    }

    const ctx = sparklineRef.current.getContext("2d");
    if (!ctx) return;

    sparklineInstanceRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: hourlyData.slice(-24).map((h) => h.hour),
        datasets: [
          {
            data: hourlyData.slice(-24).map((h) => h.count),
            borderColor: "#0066CC",
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
        },
        scales: {
          x: { display: false },
          y: { display: false },
        },
      },
    });

    return () => {
      if (sparklineInstanceRef.current) {
        sparklineInstanceRef.current.destroy();
      }
    };
  }, [hourlyData]);

  return (
    <div className="min-h-screen w-full bg-nexus-page-bg pt-16">
      {/* Top Navigation */}
      <TopNav role="admin" />

      <div className="flex">
        {/* Sidebar */}
        <AdminSidebar collapsed={sidebarCollapsed} onToggle={setSidebarCollapsed} />

        {/* Main Content */}
        <main
          className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? "lg:pl-20" : "lg:pl-60"
            }`}
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="p-6 lg:p-8"
          >
            {/* Event Banner */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6 rounded-xl bg-gradient-to-r from-[#1E5FCC] to-[#0B9E96] p-6 text-white shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">{eventData?.eventName ?? "Loading..."}</h1>
                  <p className="mt-1 text-sm opacity-90">
                    {eventData?.startDate && eventData?.endDate
                      ? `${new Date(eventData.startDate).toLocaleDateString("en-US", { month: "long", day: "numeric" })} – ${new Date(eventData.endDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
                      : ""}
                  </p>
                </div>
                <button
                  onClick={openEditEvent}
                  className="flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium backdrop-blur-sm transition-colors hover:bg-white/30"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit Event
                </button>
              </div>
            </motion.div>

            {/* Edit Event Name Modal */}
            <AnimatePresence>
              {showEditEvent && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
                  onClick={(e) => { if (e.target === e.currentTarget) setShowEditEvent(false); }}
                >
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl"
                  >
                    <div className="mb-6 flex items-center justify-between">
                      <h2 className="text-xl font-bold text-nexus-text-primary">Edit Event Name</h2>
                      <button onClick={() => setShowEditEvent(false)} className="rounded-lg p-1 text-nexus-text-hint hover:bg-gray-100">
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <label className="mb-2 block text-sm font-medium text-nexus-text-label">Event Name</label>
                    <Input
                      type="text"
                      value={editEventName}
                      onChange={(e) => setEditEventName(e.target.value)}
                      className="h-12 w-full"
                      placeholder="Enter event name"
                      onKeyDown={(e) => { if (e.key === "Enter") saveEventName(); }}
                      autoFocus
                    />
                    <p className="mt-2 text-xs text-nexus-text-muted">This name will be visible to all crew members.</p>
                    <div className="mt-6 flex gap-3">
                      <Button variant="outline" onClick={() => setShowEditEvent(false)} className="flex-1 h-11">
                        Cancel
                      </Button>
                      <Button
                        onClick={saveEventName}
                        disabled={!editEventName.trim() || isSavingEvent}
                        className="flex-1 h-11 bg-nexus-brand hover:bg-nexus-brand-hover"
                      >
                        <Save className="mr-2 h-4 w-4" />
                        {isSavingEvent ? "Saving..." : "Save Name"}
                      </Button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* KPI Cards */}
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Total Registrations */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-nexus-text-secondary">Total Registrations</p>
                    <p className="mt-2 text-4xl font-bold text-nexus-text-primary">{totalRegistrations.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg bg-nexus-brand-light p-2">
                    <Users className="h-6 w-6 text-nexus-brand" />
                  </div>
                </div>
                <div className="mt-4 h-10">
                  <canvas ref={sparklineRef} />
                </div>
              </motion.div>

              {/* Online Crew */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-nexus-text-secondary">Online Crew</p>
                      <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                    </div>
                    <p className="mt-2 text-4xl font-bold text-nexus-text-primary">{onlineCrew}</p>
                    <p className="mt-2 text-xs text-nexus-text-muted">Active sessions</p>
                  </div>
                  <div className="rounded-lg bg-green-100 p-2">
                    <UserCheck className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </motion.div>

              {/* Pre-Registered */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-nexus-text-secondary">Pre-Registered</p>
                    <p className="mt-2 text-4xl font-bold text-nexus-text-primary">{preRegistered.toLocaleString()}</p>
                    <p className="mt-2 text-xs text-nexus-text-muted">Pending check-in</p>
                  </div>
                  <div className="rounded-lg bg-amber-100 p-2">
                    <Clock className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
              </motion.div>

              {/* Badge Print Lock */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-nexus-text-secondary">Badge Print Lock</p>
                    <p className={`mt-2 text-2xl font-bold ${printLock ? "text-red-600" : "text-green-600"}`}>
                      {printLock ? "LOCKED" : "UNLOCKED"}
                    </p>
                  </div>
                  <div className={`rounded-lg p-2 ${printLock ? "bg-red-100" : "bg-green-100"}`}>
                    {printLock ? (
                      <Lock className="h-6 w-6 text-red-600" />
                    ) : (
                      <Unlock className="h-6 w-6 text-green-600" />
                    )}
                  </div>
                </div>
                <button
                  onClick={handlePrintLockToggle}
                  className={`mt-4 w-full rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${printLock
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                    }`}
                >
                  {printLock ? "Unlock Printing" : "Lock Printing"}
                </button>
              </motion.div>
            </div>

            {/* Charts Row */}
            <div className="mb-6 grid gap-6 lg:grid-cols-2">
              {/* Bar Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm"
              >
                <h3 className="mb-4 text-lg font-semibold text-nexus-text-primary">Registrations by Category</h3>
                <div className="h-[300px] relative">
                  <canvas ref={barChartRef} />
                  {categoryData.length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-nexus-text-muted">
                      <svg className="h-10 w-10 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                      <p className="text-sm">No registrations yet</p>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Donut Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm"
              >
                <h3 className="mb-4 text-lg font-semibold text-nexus-text-primary">Category Distribution</h3>
                <div className="h-[300px] relative">
                  <canvas ref={donutChartRef} />
                  {categoryData.length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-nexus-text-muted">
                      <svg className="h-10 w-10 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
                      <p className="text-sm">No registrations yet</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Bottom Row */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Line Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.7 }}
                className="rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm lg:col-span-2"
              >
                <h3 className="mb-4 text-lg font-semibold text-nexus-text-primary">Hourly Arrivals</h3>
                <div className="h-[300px]">
                  <canvas ref={lineChartRef} />
                </div>
              </motion.div>

              {/* Live Feed */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
                className="rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-nexus-text-primary">Live Feed</h3>
                  <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                </div>
                <div className="space-y-3 overflow-y-auto" style={{ maxHeight: "300px" }}>
                  {liveFeed.map((item, index) => (
                    <motion.div
                      key={item.registrationId}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-start gap-3 rounded-lg border border-nexus-border bg-nexus-surface-hover p-3"
                    >
                      <div
                        className="h-2 w-2 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: categoryColors[item.prefix], marginTop: "6px" }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-nexus-text-primary truncate">{item.name}</p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-nexus-text-muted">
                          <span
                            className="rounded px-1.5 py-0.5 font-mono font-semibold"
                            style={{
                              backgroundColor: `${categoryColors[item.prefix] || '#9CA3AF'}20`,
                              color: categoryColors[item.prefix] || '#9CA3AF'
                            }}
                          >
                            {item.prefix}
                          </span>
                          <span>by {item.registeredBy}</span>
                        </div>
                        <p className="mt-1 text-xs text-nexus-text-hint">
                          {new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" }).format(new Date(item.createdAt))}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Quick Links */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.9 }}
              className="mt-6"
            >
              <h3 className="mb-4 text-lg font-semibold text-nexus-text-primary">Quick Links</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <button
                  onClick={() => navigate("/admin/bulk-upload")}
                  className="flex items-center gap-4 rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="rounded-lg bg-nexus-brand-light p-3">
                    <Upload className="h-6 w-6 text-nexus-brand" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-nexus-text-primary">Bulk Upload</p>
                    <p className="text-xs text-nexus-text-muted">Import registrations</p>
                  </div>
                </button>

                <button
                  onClick={() => navigate("/admin/badge-control")}
                  className="flex items-center gap-4 rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="rounded-lg bg-green-100 p-3">
                    <CreditCard className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-nexus-text-primary">Badge Control</p>
                    <p className="text-xs text-nexus-text-muted">Manage templates</p>
                  </div>
                </button>

                <button
                  onClick={() => navigate("/admin/audit")}
                  className="flex items-center gap-4 rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="rounded-lg bg-purple-100 p-3">
                    <FileText className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-nexus-text-primary">Audit Logs</p>
                    <p className="text-xs text-nexus-text-muted">View activity</p>
                  </div>
                </button>

                <button
                  onClick={() => navigate("/admin/crew")}
                  className="flex items-center gap-4 rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="rounded-lg bg-amber-100 p-3">
                    <UserCog className="h-6 w-6 text-amber-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-nexus-text-primary">Crew Management</p>
                    <p className="text-xs text-nexus-text-muted">Manage crew</p>
                  </div>
                </button>
              </div>
            </motion.div>
          </motion.div>
        </main>
      </div>

      {/* Print Lock Confirmation Modal */}
      <AnimatePresence>
        {showLockModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50"
              onClick={() => setShowLockModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-xl"
            >
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-nexus-text-primary">
                    {printLock ? "Unlock" : "Lock"} Badge Printing?
                  </h3>
                  <p className="mt-1 text-sm text-nexus-text-secondary">
                    {printLock
                      ? "This will allow crew members to print badges."
                      : "This will prevent all crew members from printing badges."}
                  </p>
                </div>
                <button
                  onClick={() => setShowLockModal(false)}
                  className="text-nexus-text-hint hover:text-nexus-text-secondary"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowLockModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmPrintLockToggle}
                  className={`flex-1 ${printLock
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                    }`}
                >
                  Confirm
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
