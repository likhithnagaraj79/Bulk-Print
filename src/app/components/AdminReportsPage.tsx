import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Download, Calendar } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { TopNav } from "./dashboard/TopNav";
import { AdminSidebar } from "./dashboard/AdminSidebar";
import { Chart, DoughnutController, ArcElement, BarController, BarElement, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler } from "chart.js";
import { ReportService, CategoryStat, HourlyArrival } from "../api/services/report.service";
import { toast } from "sonner";

Chart.register(DoughnutController, ArcElement, BarController, BarElement, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler);

// Types imported from ReportService

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

export function AdminReportsPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Chart refs
  const breakdownChartRef = useRef<HTMLCanvasElement>(null);
  const onsiteVsPreRegChartRef = useRef<HTMLCanvasElement>(null);
  const checkinRateChartRef = useRef<HTMLCanvasElement>(null);
  const arrivalTimelineChartRef = useRef<HTMLCanvasElement>(null);
  const crewProductivityChartRef = useRef<HTMLCanvasElement>(null);

  // Chart instances
  const breakdownChartInstanceRef = useRef<Chart | null>(null);
  const onsiteVsPreRegChartInstanceRef = useRef<Chart | null>(null);
  const checkinRateChartInstanceRef = useRef<Chart | null>(null);
  const arrivalTimelineChartInstanceRef = useRef<Chart | null>(null);
  const crewProductivityChartInstanceRef = useRef<Chart | null>(null);

  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [typeFilter, setTypeFilter] = useState("all");

  const [kpis, setKpis] = useState({
    total: 0,
    onsite: 0,
    preRegistered: 0,
    checkedIn: 0,
  });

  const [categoryData, setCategoryData] = useState<CategoryStat[]>([]);
  const [arrivalTimeline, setArrivalTimeline] = useState<HourlyArrival[]>([]);
  const [crewData, setCrewData] = useState<any[]>([]);

  useEffect(() => {
    loadReports();
  }, [fromDate, toDate, typeFilter]);

  const loadReports = async () => {
    try {
      const summary = await ReportService.getRegistrationSummary({
        fromDate,
        toDate,
        type: typeFilter as any
      });

      setCategoryData(summary.categories);
      setArrivalTimeline(summary.hourlyData);
      setKpis({
        total: summary.totalRegistrations,
        onsite: summary.categories.reduce((acc, curr) => acc + curr.onsite, 0),
        preRegistered: summary.totalPreRegistered,
        checkedIn: summary.categories.reduce((acc, curr) => acc + curr.checkedIn, 0),
      });

    } catch (error) {
      console.error("Failed to load reports:", error);
      toast.error("Failed to load reports");
    }
  };

  const renderCharts = () => {
    // Breakdown Chart (Doughnut)
    if (breakdownChartRef.current) {
      if (breakdownChartInstanceRef.current) {
        breakdownChartInstanceRef.current.destroy();
      }

      const ctx = breakdownChartRef.current.getContext("2d");
      if (ctx) {
        breakdownChartInstanceRef.current = new Chart(ctx, {
          type: "doughnut",
          data: {
            labels: categoryData.map((c) => `${c.prefix} — ${c.label}`),
            datasets: [
              {
                data: categoryData.map((c) => c.total),
                backgroundColor: categoryData.map((c) => PREFIX_COLORS[c.prefix]),
                borderWidth: 2,
                borderColor: "#fff",
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: "bottom",
                labels: { boxWidth: 12, padding: 8, font: { size: 11 } },
              },
              tooltip: {
                callbacks: {
                  label: (context) => {
                    const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                    const value = context.parsed;
                    const percentage = ((value / total) * 100).toFixed(1);
                    return `${context.label}: ${value} (${percentage}%)`;
                  },
                },
              },
            },
          },
        });
      }
    }

    // Onsite vs Pre-Reg (Stacked Bar)
    if (onsiteVsPreRegChartRef.current) {
      if (onsiteVsPreRegChartInstanceRef.current) {
        onsiteVsPreRegChartInstanceRef.current.destroy();
      }

      const ctx = onsiteVsPreRegChartRef.current.getContext("2d");
      if (ctx) {
        onsiteVsPreRegChartInstanceRef.current = new Chart(ctx, {
          type: "bar",
          data: {
            labels: categoryData.map((c) => c.prefix),
            datasets: [
              {
                label: "Onsite",
                data: categoryData.map((c) => c.onsite),
                backgroundColor: "#3B82F6",
              },
              {
                label: "Pre-Registered",
                data: categoryData.map((c) => c.preRegistered),
                backgroundColor: "#A855F7",
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: "top" },
            },
            scales: {
              x: { stacked: true, grid: { display: false } },
              y: { stacked: true, beginAtZero: true },
            },
          },
        });
      }
    }

    // Check-in Rate (Horizontal Bar)
    if (checkinRateChartRef.current) {
      if (checkinRateChartInstanceRef.current) {
        checkinRateChartInstanceRef.current.destroy();
      }

      const ctx = checkinRateChartRef.current.getContext("2d");
      if (ctx) {
        checkinRateChartInstanceRef.current = new Chart(ctx, {
          type: "bar",
          data: {
            labels: categoryData.map((c) => `${c.prefix} — ${c.label}`),
            datasets: [
              {
                label: "Check-in Rate",
                data: categoryData.map((c) => (c.checkedIn / (c.total || 1)) * 100),
                backgroundColor: categoryData.map((c) => {
                  const percentage = (c.checkedIn / (c.total || 1)) * 100;
                  return percentage >= 60 ? "#22C55E" : percentage >= 40 ? "#F59E0B" : "#EF4444";
                }
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
                  label: (context) => `${(context.parsed.x || 0).toFixed(1)}%`,
                },
              },
            },
            scales: {
              x: { max: 100, grid: { display: false } },
              y: { grid: { display: false } },
            },
          },
        });
      }
    }

    // Arrival Timeline (Line)
    if (arrivalTimelineChartRef.current) {
      if (arrivalTimelineChartInstanceRef.current) {
        arrivalTimelineChartInstanceRef.current.destroy();
      }

      const ctx = arrivalTimelineChartRef.current.getContext("2d");
      if (ctx) {
        arrivalTimelineChartInstanceRef.current = new Chart(ctx, {
          type: "line",
          data: {
            labels: arrivalTimeline.map((d) => d.hour),
            datasets: [
              {
                label: "Check-ins",
                data: arrivalTimeline.map((d) => d.count),
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
              y: { beginAtZero: true },
            },
          },
        });
      }
    }

    // Crew Productivity (Horizontal Bar)
    if (crewProductivityChartRef.current) {
      if (crewProductivityChartInstanceRef.current) {
        crewProductivityChartInstanceRef.current.destroy();
      }

      const ctx = crewProductivityChartRef.current.getContext("2d");
      if (ctx) {
        crewProductivityChartInstanceRef.current = new Chart(ctx, {
          type: "bar",
          data: {
            labels: crewData.map((c) => c.username),
            datasets: [
              {
                label: "Submissions",
                data: crewData.map((c) => c.submissionCount),
                backgroundColor: "#8B5CF6",
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
              x: { beginAtZero: true, grid: { display: false } },
              y: { grid: { display: false } },
            },
          },
        });
      }
    }
  };

  useEffect(() => {
    renderCharts();
    return () => {
      breakdownChartInstanceRef.current?.destroy();
      onsiteVsPreRegChartInstanceRef.current?.destroy();
      checkinRateChartInstanceRef.current?.destroy();
      arrivalTimelineChartInstanceRef.current?.destroy();
      crewProductivityChartInstanceRef.current?.destroy();
    };
  }, [categoryData, arrivalTimeline, crewData]);

  const handleExport = async (format: string) => {
    try {
      const url = await ReportService.exportData({
        format: format as any,
        fromDate,
        toDate
      });
      window.open(url, '_blank');
      toast.success(`Exporting ${format.toUpperCase()}...`);
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Export failed");
    }
  };

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
        <h1 className="mb-6 text-3xl font-semibold text-nexus-text-primary">Reports & Analytics</h1>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-nexus-text-hint" />
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-10 w-40"
            />
          </div>
          <span className="text-sm text-nexus-text-secondary">to</span>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-10 w-40"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-10 rounded-lg border border-nexus-border-strong bg-nexus-surface px-4 text-sm"
          >
            <option value="all">All Types</option>
            <option value="onsite">Onsite Only</option>
            <option value="pre_registered">Pre-Registered Only</option>
          </select>
          <div className="ml-auto">
            <Button
              onClick={() => handleExport("csv")}
              variant="outline"
              className="mr-2 h-10"
            >
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
            <Button onClick={() => handleExport("pdf")} variant="outline" className="h-10">
              <Download className="mr-2 h-4 w-4" />
              PDF
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm"
          >
            <p className="text-sm font-medium text-nexus-text-secondary">Total Registrations</p>
            <p className="mt-2 text-4xl font-bold text-nexus-text-primary">{kpis.total}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm"
          >
            <p className="text-sm font-medium text-nexus-text-secondary">Onsite</p>
            <p className="mt-2 text-4xl font-bold text-nexus-brand">{kpis.onsite}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm"
          >
            <p className="text-sm font-medium text-nexus-text-secondary">Pre-Registered</p>
            <p className="mt-2 text-4xl font-bold text-purple-600">{kpis.preRegistered}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm"
          >
            <p className="text-sm font-medium text-nexus-text-secondary">Checked In</p>
            <p className="mt-2 text-4xl font-bold text-green-600">{kpis.checkedIn}</p>
          </motion.div>
        </div>

        {/* Charts Row 1 */}
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm"
          >
            <h3 className="mb-4 text-lg font-semibold text-nexus-text-primary">Registration Breakdown</h3>
            <div className="h-80">
              <canvas ref={breakdownChartRef} />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm"
          >
            <h3 className="mb-4 text-lg font-semibold text-nexus-text-primary">
              Onsite vs Pre-Reg by Category
            </h3>
            <div className="h-80">
              <canvas ref={onsiteVsPreRegChartRef} />
            </div>
          </motion.div>
        </div>

        {/* Charts Row 2 */}
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm"
          >
            <h3 className="mb-4 text-lg font-semibold text-nexus-text-primary">Check-in Rate by Category</h3>
            <div className="h-80">
              <canvas ref={checkinRateChartRef} />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm"
          >
            <h3 className="mb-4 text-lg font-semibold text-nexus-text-primary">Arrival Timeline</h3>
            <div className="h-80">
              <canvas ref={arrivalTimelineChartRef} />
            </div>
          </motion.div>
        </div>

        {/* Crew Productivity Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mb-6 rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm"
        >
          <h3 className="mb-4 text-lg font-semibold text-nexus-text-primary">Crew Productivity (Today)</h3>
          <div className="h-96">
            <canvas ref={crewProductivityChartRef} />
          </div>
        </motion.div>

        {/* Summary Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="rounded-xl border border-nexus-border bg-nexus-surface shadow-sm"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-nexus-surface-hover">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                    Prefix
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                    Category
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                    Onsite
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                    Pre-Reg
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                    Total
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                    Checked In
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                    Rate %
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nexus-border">
                {categoryData.map((category) => (
                  <tr key={category.prefix} className="hover:bg-nexus-surface-hover">
                    <td className="px-6 py-4">
                      <span
                        className="inline-block rounded px-2 py-1 font-mono text-xs font-semibold text-white"
                        style={{ backgroundColor: PREFIX_COLORS[category.prefix] }}
                      >
                        {category.prefix}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-nexus-text-primary">
                      {category.label}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-nexus-text-primary">
                      {category.onsite}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-nexus-text-primary">
                      {category.preRegistered}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-semibold text-nexus-text-primary">
                      {category.total}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-nexus-text-primary">
                      {category.checkedIn}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-semibold text-nexus-text-primary">
                      {((category.checkedIn / (category.total || 1)) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
                <tr className="bg-nexus-surface-hover font-semibold">
                  <td className="px-6 py-4 text-sm text-nexus-text-primary" colSpan={2}>
                    TOTAL
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-nexus-text-primary">{kpis.onsite}</td>
                  <td className="px-6 py-4 text-right text-sm text-nexus-text-primary">
                    {kpis.preRegistered}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-nexus-text-primary">{kpis.total}</td>
                  <td className="px-6 py-4 text-right text-sm text-nexus-text-primary">{kpis.checkedIn}</td>
                  <td className="px-6 py-4 text-right text-sm text-nexus-text-primary">
                    {((kpis.checkedIn / kpis.total) * 100).toFixed(1)}%
                  </td>
                </tr>
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
