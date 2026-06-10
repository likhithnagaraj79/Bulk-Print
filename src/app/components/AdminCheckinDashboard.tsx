import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Pause, Play } from "lucide-react";
import { Button } from "./ui/button";
import { TopNav } from "./dashboard/TopNav";
import { AdminSidebar } from "./dashboard/AdminSidebar";
import { Chart, LineController, LineElement, PointElement, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend, Filler, DoughnutController, ArcElement } from "chart.js";
import { CheckInService } from "../api/services/checkin.service";

Chart.register(LineController, LineElement, PointElement, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend, Filler, DoughnutController, ArcElement);

interface CheckInStats {
  totalRegistered: number;
  totalCheckedIn: number;
  checkInRate: number;
  byCategory: CategoryStat[];
  arrivalTimeline: TimelinePoint[];
}

interface CategoryStat {
  prefix: string;
  label: string;
  registered: number;
  checkedIn: number;
  percentage: number;
}

interface TimelinePoint {
  hour: string;
  count: number;
}

interface CheckInRecord {
  id: number;
  name: string;
  prefix: string;
  scannedBy: string;
  checkedInAt: string;
  isNew?: boolean;
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

const POLL_INTERVAL = 30000; // 30 seconds

export function AdminCheckinDashboard() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const timelineChartRef = useRef<HTMLCanvasElement>(null);
  const categoryChartRef = useRef<HTMLCanvasElement>(null);
  const rateChartRef = useRef<HTMLCanvasElement>(null);
  const timelineChartInstanceRef = useRef<Chart | null>(null);
  const categoryChartInstanceRef = useRef<Chart | null>(null);
  const rateChartInstanceRef = useRef<Chart | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastRecordIdsRef = useRef<Set<string>>(new Set());

  const [stats, setStats] = useState<CheckInStats>({
    totalRegistered: 0,
    totalCheckedIn: 0,
    checkInRate: 0,
    byCategory: [],
    arrivalTimeline: [],
  });
  const [records, setRecords] = useState<CheckInRecord[]>([]);
  const [selectedPrefix, setSelectedPrefix] = useState("all");
  const [fromTime, setFromTime] = useState("");
  const [toTime, setToTime] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isPolling, setIsPolling] = useState(true);
  const [secondsUntilPoll, setSecondsUntilPoll] = useState(30);

  // Re-fetch whenever filters or page changes
  useEffect(() => {
    fetchData();
  }, [selectedPrefix, fromTime, toTime, currentPage]);

  useEffect(() => {
    if (isPolling) {
      startPolling();
    }
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [isPolling]);

  useEffect(() => {
    if (isPolling) {
      const countdownTimer = setInterval(() => {
        setSecondsUntilPoll((prev) => (prev > 0 ? prev - 1 : 30));
      }, 1000);
      return () => clearInterval(countdownTimer);
    }
  }, [isPolling]);

  const startPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
    }
    pollTimerRef.current = setInterval(() => {
      fetchData();
      setSecondsUntilPoll(30);
    }, POLL_INTERVAL);
  };

  const togglePolling = () => {
    setIsPolling((prev) => !prev);
    if (!isPolling) {
      setSecondsUntilPoll(30);
    }
  };

  const fetchData = async () => {
    try {
      const [statsRes, recordsRes] = await Promise.all([
        CheckInService.getStats(),
        CheckInService.getRecords({
          prefix: selectedPrefix !== "all" ? selectedPrefix : undefined,
          fromTime: fromTime || undefined,
          toTime: toTime || undefined,
          page: currentPage,
          limit: 50,
        }),
      ]);

      setStats(statsRes);

      const mappedRecords: CheckInRecord[] = (recordsRes.data ?? []).map((r) => ({
        id: r.checkInId,
        name: r.attendeeName,
        prefix: r.attendeePrefix,
        scannedBy: r.scannedBy,
        checkedInAt: r.checkedInAt,
        isNew: !lastRecordIdsRef.current.has(r.checkInId),
      }));

      lastRecordIdsRef.current = new Set(mappedRecords.map((r) => r.id));
      setRecords(mappedRecords);
    } catch (error) {
      console.error("Failed to fetch check-in data:", error);
    }
  };

  // Timeline Chart
  useEffect(() => {
    if (!timelineChartRef.current || stats.arrivalTimeline.length === 0) return;

    if (timelineChartInstanceRef.current) {
      timelineChartInstanceRef.current.destroy();
    }

    const ctx = timelineChartRef.current.getContext("2d");
    if (!ctx) return;

    timelineChartInstanceRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: stats.arrivalTimeline.map((d) => d.hour),
        datasets: [
          {
            label: "Check-ins",
            data: stats.arrivalTimeline.map((d) => d.count),
            borderColor: "#3B82F6",
            backgroundColor: "rgba(59, 130, 246, 0.2)",
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
        animation: {
          duration: 600,
        },
      },
    });

    return () => {
      if (timelineChartInstanceRef.current) {
        timelineChartInstanceRef.current.destroy();
      }
    };
  }, [stats.arrivalTimeline]);

  // Category Chart
  useEffect(() => {
    if (!categoryChartRef.current || stats.byCategory.length === 0) return;

    if (categoryChartInstanceRef.current) {
      categoryChartInstanceRef.current.destroy();
    }

    const ctx = categoryChartRef.current.getContext("2d");
    if (!ctx) return;

    const sortedCategories = [...stats.byCategory].sort((a, b) => b.percentage - a.percentage);

    categoryChartInstanceRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: sortedCategories.map((c) => `${c.prefix} — ${c.label}`),
        datasets: [
          {
            label: "Checked In",
            data: sortedCategories.map((c) => c.checkedIn),
            backgroundColor: sortedCategories.map((c) => PREFIX_COLORS[c.prefix] || "#6B7280"),
          },
          {
            label: "Remaining",
            data: sortedCategories.map((c) => c.registered - c.checkedIn),
            backgroundColor: sortedCategories.map(
              (c) => `${PREFIX_COLORS[c.prefix] || "#6B7280"}33`
            ),
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => {
                const category = sortedCategories[context.dataIndex];
                return `${context.dataset.label}: ${context.parsed.x} (${category.percentage.toFixed(1)}%)`;
              },
            },
          },
        },
        scales: {
          x: { stacked: true, grid: { display: false } },
          y: { stacked: true, grid: { display: false } },
        },
        animation: {
          duration: 800,
        },
      },
    });

    return () => {
      if (categoryChartInstanceRef.current) {
        categoryChartInstanceRef.current.destroy();
      }
    };
  }, [stats.byCategory]);

  // Rate Chart (Doughnut)
  useEffect(() => {
    if (!rateChartRef.current) return;

    if (rateChartInstanceRef.current) {
      rateChartInstanceRef.current.destroy();
    }

    const ctx = rateChartRef.current.getContext("2d");
    if (!ctx) return;

    rateChartInstanceRef.current = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Checked In", "Remaining"],
        datasets: [
          {
            data: [stats.totalCheckedIn, stats.totalRegistered - stats.totalCheckedIn],
            backgroundColor: ["#22C55E", "#E5E7EB"],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "80%",
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
        },
        animation: {
          duration: 1200,
        },
      },
      plugins: [
        {
          id: "centerText",
          beforeDraw: (chart) => {
            const { ctx, chartArea } = chart;
            if (!chartArea) return;
            ctx.save();
            const centerX = (chartArea.left + chartArea.right) / 2;
            const centerY = (chartArea.top + chartArea.bottom) / 2;
            ctx.font = "bold 32px sans-serif";
            ctx.fillStyle = "#111827";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(`${stats.checkInRate.toFixed(1)}%`, centerX, centerY);
            ctx.restore();
          },
        },
      ],
    });

    return () => {
      if (rateChartInstanceRef.current) {
        rateChartInstanceRef.current.destroy();
      }
    };
  }, [stats.totalCheckedIn, stats.totalRegistered, stats.checkInRate]);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const filteredRecords = records.filter((record) => {
    if (selectedPrefix !== "all" && record.prefix !== selectedPrefix) return false;
    // Time filtering would be implemented here
    return true;
  });

  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * 50,
    currentPage * 50
  );

  return (
    <div className="min-h-screen w-full bg-nexus-page-bg pt-16">
      <TopNav role="admin" />

      <div className="flex">
        <AdminSidebar collapsed={sidebarCollapsed} onToggle={setSidebarCollapsed} />

        <main className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? "lg:pl-20" : "lg:pl-60"}`}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="p-6 lg:p-8"
          >
        {/* KPI Cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm"
          >
            <p className="text-sm font-medium text-nexus-text-secondary">Total Registered</p>
            <p className="mt-2 text-4xl font-bold text-nexus-text-primary">{stats.totalRegistered}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm"
          >
            <p className="text-sm font-medium text-nexus-text-secondary">Total Checked In</p>
            <p className="mt-2 text-4xl font-bold text-green-600">{stats.totalCheckedIn}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm"
          >
            <p className="mb-4 text-sm font-medium text-nexus-text-secondary">Check-in Rate</p>
            <div className="flex items-center justify-center">
              <div className="relative h-[120px] w-[120px]">
                <canvas ref={rateChartRef} />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Arrival Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-6 rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm"
        >
          <h3 className="mb-4 text-lg font-semibold text-nexus-text-primary">Arrival Timeline 📈</h3>
          <div className="h-[220px]">
            <canvas ref={timelineChartRef} />
          </div>
        </motion.div>

        {/* Check-in by Category */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-6 rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm"
        >
          <h3 className="mb-4 text-lg font-semibold text-nexus-text-primary">Check-in by Category</h3>
          <div className="h-[400px]">
            <canvas ref={categoryChartRef} />
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-6 flex flex-wrap items-center gap-4"
        >
          <select
            value={selectedPrefix}
            onChange={(e) => setSelectedPrefix(e.target.value)}
            className="h-10 rounded-lg border border-nexus-border-strong bg-nexus-surface px-4 text-sm font-medium text-nexus-text-label shadow-sm"
          >
            <option value="all">All Prefixes</option>
            <option value="VS">VS — Visitors</option>
            <option value="VI">VI — VIPs</option>
            <option value="EH">EH — Exhibitors</option>
            <option value="DL">DL — Delegates</option>
            <option value="SPK">SPK — Speakers</option>
            <option value="FDL">FDL — Foreign Delegates</option>
            <option value="OR">OR — Organisers</option>
            <option value="SPR">SPR — Sponsors</option>
          </select>

          <input
            type="datetime-local"
            value={fromTime}
            onChange={(e) => setFromTime(e.target.value)}
            className="h-10 rounded-lg border border-nexus-border-strong bg-nexus-surface px-3 text-sm shadow-sm"
          />

          <input
            type="datetime-local"
            value={toTime}
            onChange={(e) => setToTime(e.target.value)}
            className="h-10 rounded-lg border border-nexus-border-strong bg-nexus-surface px-3 text-sm shadow-sm"
          />

          <button
            onClick={togglePolling}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-sm ${
              isPolling
                ? "bg-green-100 text-green-700 hover:bg-green-200"
                : "bg-nexus-surface-muted text-nexus-text-label hover:bg-gray-200"
            }`}
          >
            {isPolling ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            <span>{isPolling ? `Auto: ${secondsUntilPoll}s` : "Paused"}</span>
            {isPolling && <span className="animate-spin">🔄</span>}
          </button>
        </motion.div>

        {/* Records Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="rounded-xl border border-nexus-border bg-nexus-surface shadow-sm"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-nexus-surface-hover">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                    Prefix
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                    Scanned By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                    Checked In At
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nexus-border">
                {paginatedRecords.map((record, index) => (
                  <motion.tr
                    key={record.id}
                    initial={{ opacity: record.isNew ? 0 : 1, backgroundColor: record.isNew ? "#D1FAE5" : "transparent" }}
                    animate={{ opacity: 1, backgroundColor: "transparent" }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                    className="hover:bg-nexus-surface-hover"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-nexus-text-primary">
                      {record.name}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="inline-block rounded px-2 py-1 font-mono text-xs font-semibold text-white"
                        style={{ backgroundColor: PREFIX_COLORS[record.prefix] }}
                      >
                        {record.prefix}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-nexus-text-secondary">{record.scannedBy}</td>
                    <td className="px-6 py-4 font-mono text-sm text-nexus-text-secondary">
                      {formatTime(record.checkedInAt)}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-nexus-border px-6 py-4">
            <p className="text-sm text-nexus-text-secondary">
              Showing {(currentPage - 1) * 50 + 1} to{" "}
              {Math.min(currentPage * 50, filteredRecords.length)} of {filteredRecords.length}{" "}
              records
            </p>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                variant="outline"
                className="h-9 px-3"
              >
                Previous
              </Button>
              <span className="text-sm font-medium text-nexus-text-label">{currentPage}</span>
              <Button
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={currentPage * 50 >= filteredRecords.length}
                variant="outline"
                className="h-9 px-3"
              >
                Next
              </Button>
            </div>
          </div>
          </motion.div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
