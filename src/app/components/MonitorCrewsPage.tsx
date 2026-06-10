import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Users, TrendingUp, Clock, AlertCircle, ChevronDown, ChevronRight, RefreshCw, Pause, Play } from "lucide-react";
import { TopNav } from "./dashboard/TopNav";
import { AdminSidebar } from "./dashboard/AdminSidebar";
import { Chart, BarController, BarElement, DoughnutController, ArcElement, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";
import { AuditService, CrewMember, CrewLog } from "../api/services/audit.service";

Chart.register(BarController, BarElement, DoughnutController, ArcElement, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend);

const crewTypeColors: Record<string, string> = {
  master: "#1E40AF",
  visitors: "#3B82F6",
  vips: "#8B5CF6",
  foreign_delegates: "#EC4899",
  exhibitors: "#F59E0B",
  organisers: "#10B981",
  speakers: "#EF4444",
  delegates: "#06B6D4",
  sponsors: "#F97316",
};

const POLL_INTERVAL = 15000; // 15 seconds

export function MonitorCrewsPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<CrewMember[]>([]);
  const [crewTypeFilter, setCrewTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedCrew, setExpandedCrew] = useState<string | null>(null);
  const [recentSubmissions, setRecentSubmissions] = useState<CrewLog[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [countdown, setCountdown] = useState(15);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // KPI Stats
  const [activeCrew, setActiveCrew] = useState(0);
  const [totalSubmissions, setTotalSubmissions] = useState(0);
  const [avgRate, setAvgRate] = useState(0);
  const [idleCrew, setIdleCrew] = useState(0);

  const barChartRef = useRef<HTMLCanvasElement>(null);
  const donutChartRef = useRef<HTMLCanvasElement>(null);
  const lineChartRef = useRef<HTMLCanvasElement>(null);
  const barChartInstanceRef = useRef<Chart | null>(null);
  const donutChartInstanceRef = useRef<Chart | null>(null);
  const lineChartInstanceRef = useRef<Chart | null>(null);
  const pollTimerRef = useRef<number | null>(null);

  // Fetch crew data
  const fetchCrewLive = async () => {
    setIsRefreshing(true);
    try {
      const response = await AuditService.getCrewLive();
      const crew = response.activeCrew ?? [];
      setCrewMembers(crew);
      setActiveCrew(crew.length);
      setTotalSubmissions(response.totalSubmissionsToday ?? 0);
      const avgPerCrew = crew.length > 0
        ? Math.round(crew.reduce((sum, c) => sum + c.submissionCount, 0) / crew.length)
        : 0;
      setAvgRate(avgPerCrew);
      const idle = crew.filter((c) => getIdleMinutes(c.lastActivityAt) > 10).length;
      setIdleCrew(idle);
    } catch (error) {
      console.error("Failed to fetch crew live data:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Start polling
  useEffect(() => {
    fetchCrewLive();
    startPolling();
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  const startPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
    }
    pollTimerRef.current = setInterval(() => {
      if (!isPaused) {
        fetchCrewLive();
        setCountdown(15);
      }
    }, POLL_INTERVAL);
  };

  // Countdown timer
  useEffect(() => {
    if (!isPaused) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) return 15;
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isPaused]);

  const togglePause = () => {
    setIsPaused(!isPaused);
    if (isPaused) {
      startPolling();
      setCountdown(15);
    } else {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    }
  };

  const getIdleMinutes = (lastActivityAt: string | null) => {
    if (!lastActivityAt) return 0;
    const t = new Date(lastActivityAt).getTime();
    if (isNaN(t)) return 0;
    return Math.floor((Date.now() - t) / 60000);
  };

  const getStatusDot = (lastActivityAt: string) => {
    const idleMinutes = getIdleMinutes(lastActivityAt);
    if (idleMinutes < 10) return { color: "#22C55E", label: "Active" }; // Green
    if (idleMinutes < 30) return { color: "#F59E0B", label: "Idle" }; // Amber
    return { color: "#EF4444", label: "Inactive" }; // Red
  };

  const getIdleDuration = (lastActivityAt: string) => {
    const idleMinutes = getIdleMinutes(lastActivityAt);
    if (idleMinutes < 2) return "—";
    if (idleMinutes < 60) return `${idleMinutes}m`;
    return `${Math.floor(idleMinutes / 60)}h ${idleMinutes % 60}m`;
  };

  const formatTimeAgo = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    if (minutes === 0) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  };

  const formatTime = (dateString: string) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString));
  };

  // Filter crew members
  useEffect(() => {
    let filtered = crewMembers;

    if (crewTypeFilter !== "all") {
      filtered = filtered.filter((crew) => crew.crewType === crewTypeFilter);
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((crew) => {
        const idleMinutes = getIdleMinutes(crew.lastActivityAt);
        if (statusFilter === "active") return idleMinutes < 10;
        if (statusFilter === "idle") return idleMinutes >= 10;
        return true;
      });
    }

    // Sort by submission count descending
    filtered.sort((a, b) => b.submissionCount - a.submissionCount);

    setFilteredMembers(filtered);
  }, [crewMembers, crewTypeFilter, statusFilter]);

  // Bar Chart - Submissions per Crew
  useEffect(() => {
    if (!barChartRef.current || filteredMembers.length === 0) return;

    if (barChartInstanceRef.current) {
      barChartInstanceRef.current.destroy();
    }

    const ctx = barChartRef.current.getContext("2d");
    if (!ctx) return;

    const topCrew = filteredMembers.slice(0, 15); // Max 15 bars

    barChartInstanceRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: topCrew.map((crew) => crew.username),
        datasets: [
          {
            label: "Submissions",
            data: topCrew.map((crew) => crew.submissionCount),
            backgroundColor: "rgba(59, 130, 246, 0.8)",
            borderRadius: 6,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: { beginAtZero: true, grid: { color: "#E5E7EB" } },
          y: { grid: { display: false } },
        },
        animation: {
          duration: 800,
        },
      },
    });

    return () => {
      if (barChartInstanceRef.current) {
        barChartInstanceRef.current.destroy();
      }
    };
  }, [filteredMembers]);

  // Donut Chart - By Crew Type
  useEffect(() => {
    if (!donutChartRef.current || crewMembers.length === 0) return;

    if (donutChartInstanceRef.current) {
      donutChartInstanceRef.current.destroy();
    }

    const ctx = donutChartRef.current.getContext("2d");
    if (!ctx) return;

    // Aggregate by crew type
    const typeMap: Record<string, number> = {};
    crewMembers.forEach((crew) => {
      if (!typeMap[crew.crewType]) typeMap[crew.crewType] = 0;
      typeMap[crew.crewType] += crew.submissionCount;
    });

    const types = Object.keys(typeMap);
    const counts = types.map((type) => typeMap[type]);
    const colors = types.map((type) => crewTypeColors[type] || "#6B7280");

    donutChartInstanceRef.current = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: types.map((type) => type.replace(/_/g, " ").toUpperCase()),
        datasets: [
          {
            data: counts,
            backgroundColor: colors,
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
        },
        animation: {
          duration: 800,
        },
      },
    });

    return () => {
      if (donutChartInstanceRef.current) {
        donutChartInstanceRef.current.destroy();
      }
    };
  }, [crewMembers]);

  // Handle expand crew
  const handleExpandCrew = (crewId: string) => {
    if (expandedCrew === crewId) {
      setExpandedCrew(null);
    } else {
      setExpandedCrew(crewId);
      fetchCrewActivity(crewId);
    }
  };

  const fetchCrewActivity = async (crewId: string) => {
    try {
      const response = await AuditService.getCrewActivity(crewId, { limit: 20 });
      setRecentSubmissions(response.logs ?? []);
    } catch (error) {
      console.error(`Failed to fetch activity for crew ${crewId}:`, error);
    }
  };

  // Mini line chart for expanded crew
  useEffect(() => {
    if (!lineChartRef.current || expandedCrew === null) return;

    if (lineChartInstanceRef.current) {
      lineChartInstanceRef.current.destroy();
    }

    const ctx = lineChartRef.current.getContext("2d");
    if (!ctx) return;

    // Group recentSubmissions into 30-min slots for the last 4 hours (8 slots)
    const hours = Array.from({ length: 8 }, (_, i) => {
      const slotEnd = new Date(Date.now() - i * 1800000);
      const slotStart = new Date(slotEnd.getTime() - 1800000);
      return {
        label: slotEnd.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        count: recentSubmissions.filter((s) => {
          const t = new Date(s.performedAt).getTime();
          return t >= slotStart.getTime() && t < slotEnd.getTime();
        }).length,
      };
    }).reverse();

    lineChartInstanceRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: hours.map((h) => h.label),
        datasets: [
          {
            label: "Submissions",
            data: hours.map((h) => h.count),
            borderColor: "#3B82F6",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
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
          x: { grid: { display: false } },
          y: { beginAtZero: true, grid: { color: "#E5E7EB" } },
        },
      },
    });

    return () => {
      if (lineChartInstanceRef.current) {
        lineChartInstanceRef.current.destroy();
      }
    };
  }, [expandedCrew, recentSubmissions]);

  return (
    <div className="min-h-screen w-full bg-nexus-page-bg pt-16">
      <TopNav role="admin" />

      <div className="flex">
        <AdminSidebar collapsed={sidebarCollapsed} onToggle={setSidebarCollapsed} />

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
            {/* Page Header */}
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-semibold text-nexus-text-primary">Monitor Crews</h1>
                <p className="mt-1 text-base text-nexus-text-secondary">
                  Real-time monitoring of active crew members and their submission activity
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-full bg-red-600 px-3 py-1.5 text-sm font-semibold text-white">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-white" />
                  LIVE
                </div>
                <button
                  onClick={togglePause}
                  className="flex items-center gap-2 rounded-lg border border-nexus-border-strong bg-nexus-surface px-3 py-1.5 text-sm font-medium text-nexus-text-label transition-colors hover:bg-nexus-surface-hover"
                >
                  {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  {isPaused ? "Resume" : `Auto-refresh: ${countdown}s`}
                  {!isPaused && (
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                  )}
                </button>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-nexus-text-secondary">Active Crew</p>
                      <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                    </div>
                    <p className="mt-2 text-4xl font-bold text-nexus-text-primary">{activeCrew}</p>
                  </div>
                  <div className="rounded-lg bg-green-100 p-2">
                    <Users className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-nexus-text-secondary">Submissions Today</p>
                    <p className="mt-2 text-4xl font-bold text-nexus-text-primary">
                      {totalSubmissions.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg bg-nexus-brand-light p-2">
                    <TrendingUp className="h-6 w-6 text-nexus-brand" />
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-nexus-text-secondary">Avg Rate</p>
                    <p className="mt-2 text-4xl font-bold text-nexus-text-primary">{avgRate}/hr</p>
                  </div>
                  <div className="rounded-lg bg-purple-100 p-2">
                    <Clock className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-nexus-text-secondary">Idle Crew</p>
                      <div className="h-2 w-2 rounded-full bg-amber-500" />
                    </div>
                    <p className="mt-2 text-4xl font-bold text-nexus-text-primary">{idleCrew}</p>
                  </div>
                  <div className="rounded-lg bg-amber-100 p-2">
                    <AlertCircle className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Charts */}
            <div className="mb-6 grid gap-6 lg:grid-cols-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm"
              >
                <h3 className="mb-4 text-lg font-semibold text-nexus-text-primary">Submissions per Crew</h3>
                <div className="h-[250px]">
                  <canvas ref={barChartRef} />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm"
              >
                <h3 className="mb-4 text-lg font-semibold text-nexus-text-primary">By Crew Type</h3>
                <div className="h-[250px]">
                  <canvas ref={donutChartRef} />
                </div>
              </motion.div>
            </div>

            {/* Filters */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="mb-6 flex flex-wrap items-center gap-4"
            >
              <select
                value={crewTypeFilter}
                onChange={(e) => setCrewTypeFilter(e.target.value)}
                className="h-10 rounded-lg border border-nexus-border-strong bg-nexus-surface px-3 text-sm font-medium text-nexus-text-label shadow-sm"
              >
                <option value="all">All Crew Types</option>
                <option value="master">Master</option>
                <option value="visitors">Visitors</option>
                <option value="vips">VIPs</option>
                <option value="foreign_delegates">Foreign Delegates</option>
                <option value="exhibitors">Exhibitors</option>
                <option value="organisers">Organisers</option>
                <option value="speakers">Speakers</option>
                <option value="delegates">Delegates</option>
                <option value="sponsors">Sponsors</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 rounded-lg border border-nexus-border-strong bg-nexus-surface px-3 text-sm font-medium text-nexus-text-label shadow-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active (submitting)</option>
                <option value="idle">Idle (&gt;10min)</option>
              </select>
            </motion.div>

            {/* Active Crew Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="rounded-xl border border-nexus-border bg-nexus-surface shadow-sm"
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-nexus-surface-hover">
                    <tr>
                      <th className="w-12 px-6 py-3" />
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                        Username
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                        Type
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                        Submissions
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                        Last Activity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                        Login Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                        Idle
                      </th>
                      <th className="w-12 px-6 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-nexus-border">
                    {filteredMembers.map((crew) => {
                      const status = getStatusDot(crew.lastActivityAt);
                      const idleMinutes = getIdleMinutes(crew.lastActivityAt);
                      const rowBg =
                        idleMinutes >= 30
                          ? "bg-red-50/50"
                          : idleMinutes >= 10
                            ? "bg-amber-50/50"
                            : "";

                      return (
                        <>
                          <tr key={crew.crewId} className={`transition-colors hover:bg-nexus-surface-hover ${rowBg}`}>
                            <td className="px-6 py-4">
                              <div
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: status.color }}
                                title={status.label}
                              />
                            </td>
                            <td className="px-6 py-4 font-mono text-sm font-medium text-nexus-text-primary">
                              {crew.username}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className="inline-block rounded px-2 py-1 font-mono text-xs font-semibold text-white"
                                style={{
                                  backgroundColor: crewTypeColors[crew.crewType] || "#6B7280",
                                }}
                              >
                                {crew.crewType.replace(/_/g, " ").toUpperCase()}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="text-2xl font-bold text-nexus-text-primary">
                                {crew.submissionCount}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-nexus-text-secondary">
                              {formatTimeAgo(crew.lastActivityAt)}
                            </td>
                            <td className="px-6 py-4 font-mono text-sm text-nexus-text-secondary">
                              {formatTime(crew.loggedInAt)}
                            </td>
                            <td className="px-6 py-4 text-sm text-nexus-text-secondary">
                              {getIdleDuration(crew.lastActivityAt)}
                            </td>
                            <td className="px-6 py-4">
                              <button
                                onClick={() => handleExpandCrew(crew.crewId)}
                                className="text-nexus-text-secondary hover:text-nexus-text-primary"
                              >
                                {expandedCrew === crew.crewId ? (
                                  <ChevronDown className="h-5 w-5" />
                                ) : (
                                  <ChevronRight className="h-5 w-5" />
                                )}
                              </button>
                            </td>
                          </tr>

                          {/* Drill-down panel */}
                          <AnimatePresence>
                            {expandedCrew === crew.crewId && (
                              <tr>
                                <td colSpan={8} className="bg-nexus-surface-hover p-0">
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="p-6">
                                      <h4 className="mb-4 text-lg font-semibold text-nexus-text-primary">
                                        Activity for {crew.username}
                                      </h4>

                                      {/* Mini timeline chart */}
                                      <div className="mb-6 rounded-lg border border-nexus-border bg-nexus-surface p-4">
                                        <p className="mb-2 text-sm font-medium text-nexus-text-label">
                                          Registration Timeline (Last 4 hours)
                                        </p>
                                        <div className="h-[150px]">
                                          <canvas ref={lineChartRef} />
                                        </div>
                                      </div>

                                      {/* Recent submissions table */}
                                      <div className="rounded-lg border border-nexus-border bg-nexus-surface">
                                        <div className="border-b border-nexus-border px-4 py-3">
                                          <p className="text-sm font-medium text-nexus-text-label">
                                            Recent Submissions
                                          </p>
                                        </div>
                                        <div className="overflow-x-auto">
                                          <table className="w-full">
                                            <thead className="bg-nexus-surface-hover">
                                              <tr>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-nexus-text-secondary">
                                                  Name
                                                </th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-nexus-text-secondary">
                                                  Prefix
                                                </th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-nexus-text-secondary">
                                                  Email
                                                </th>
                                                <th className="px-4 py-2 text-center text-xs font-medium text-nexus-text-secondary">
                                                  Prints
                                                </th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-nexus-text-secondary">
                                                  Time
                                                </th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-nexus-border">
                                              {recentSubmissions.map((submission) => (
                                                <tr key={submission.logId} className="text-sm">
                                                  <td className="px-4 py-2 text-nexus-text-primary">
                                                    {submission.attendeeName}
                                                  </td>
                                                  <td className="px-4 py-2">
                                                    <span className="rounded bg-nexus-brand-light px-2 py-0.5 font-mono text-xs font-semibold text-blue-700">
                                                      {submission.prefix}
                                                    </span>
                                                  </td>
                                                  <td className="px-4 py-2 text-nexus-text-secondary">
                                                    {submission.attendeeEmail}
                                                  </td>
                                                  <td className="px-4 py-2 text-center text-nexus-text-primary">
                                                    {submission.printCount}
                                                  </td>
                                                  <td className="px-4 py-2 text-nexus-text-secondary">
                                                    {formatTimeAgo(submission.performedAt)}
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    </div>
                                  </motion.div>
                                </td>
                              </tr>
                            )}
                          </AnimatePresence>
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
