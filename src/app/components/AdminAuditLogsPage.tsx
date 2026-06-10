import { useState, useEffect, useRef, Fragment } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Calendar, Download, ChevronDown, ChevronRight, Filter } from "lucide-react";
import { TopNav } from "./dashboard/TopNav";
import { AdminSidebar } from "./dashboard/AdminSidebar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Chart, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";
import { AuditService, AdminLog, CrewLog } from "../api/services/audit.service";
import { toast } from "sonner";

Chart.register(LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend);


const actionColors: Record<string, string> = {
  add_crew: "#10B981",
  remove_crew: "#EF4444",
  modify_crew: "#3B82F6",
  update_status: "#F59E0B",
};

const actionBadgePdf: Record<string, { bg: string; text: string }> = {
  add_crew:      { bg: "#D1FAE5", text: "#065F46" },
  remove_crew:   { bg: "#FEE2E2", text: "#991B1B" },
  modify_crew:   { bg: "#DBEAFE", text: "#1E40AF" },
  update_status: { bg: "#FEF3C7", text: "#92400E" },
};

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

const prefixColors: Record<string, string> = {
  VS: "#1E5FCC",
  VI: "#A07800",
  FDL: "#0B9E96",
  EH: "#C25A00",
  OR: "#4B2FA6",
  SPK: "#0E7A4E",
  DL: "#B01E28",
  SPR: "#5A6E8C",
};

export function AdminAuditLogsPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<"admin" | "crew">("admin");
  const [adminLogs, setAdminLogs] = useState<AdminLog[]>([]);
  const [crewLogs, setCrewLogs] = useState<CrewLog[]>([]);
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  });
  const [toDate, setToDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [selectedCrewType, setSelectedCrewType] = useState("all");
  const [selectedPrefix, setSelectedPrefix] = useState("all");
  const [showActionDropdown, setShowActionDropdown] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage] = useState(50);
  const [adminTotal, setAdminTotal] = useState(0);
  const [crewTotal, setCrewTotal] = useState(0);
  const [timelineData, setTimelineData] = useState<any[]>([]);

  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  const adminActionOptions = [
    { value: "add_crew", label: "Add Crew" },
    { value: "remove_crew", label: "Remove Crew" },
    { value: "modify_crew", label: "Modify Crew" },
    { value: "update_status", label: "Update Status" },
  ];

  const crewTypeOptions = [
    { value: "all", label: "All Crew Types" },
    { value: "master", label: "Master" },
    { value: "visitors", label: "Visitors" },
    { value: "vips", label: "VIPs" },
    { value: "foreign_delegates", label: "Foreign Delegates" },
    { value: "exhibitors", label: "Exhibitors" },
    { value: "organisers", label: "Organisers" },
    { value: "speakers", label: "Speakers" },
    { value: "delegates", label: "Delegates" },
    { value: "sponsors", label: "Sponsors" },
  ];

  const prefixOptions = [
    { value: "all", label: "All Prefixes" },
    { value: "VS", label: "VS — Visitors" },
    { value: "VI", label: "VI — VIPs" },
    { value: "FDL", label: "FDL — Foreign Delegates" },
    { value: "EH", label: "EH — Exhibitors" },
    { value: "OR", label: "OR — Organisers" },
    { value: "SPK", label: "SPK — Speakers" },
    { value: "DL", label: "DL — Delegates" },
    { value: "SPR", label: "SPR — Sponsors" },
  ];

  // Fetch data on mount and when filters change
  useEffect(() => {
    if (activeTab === "admin") {
      fetchAdminLogs();
    } else {
      fetchCrewLogs();
    }
  }, [activeTab, fromDate, toDate, selectedActions, selectedCrewType, selectedPrefix, currentPage]);

  const buildTimelineFromLogs = (logs: AdminLog[] | CrewLog[]) => {
    const days: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      days[key] = 0;
    }
    logs.forEach((log) => {
      const d = new Date(log.performedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (key in days) days[key]++;
    });
    return Object.entries(days).map(([date, count]) => ({
      date,
      label: new Date(date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count,
    }));
  };

  const fetchAdminLogs = async () => {
    try {
      const params: any = { fromDate, toDate, page: currentPage, limit: perPage };
      if (selectedActions.length > 0) params.action = selectedActions.join(",");
      const response = await AuditService.adminLogs(params);
      const logs = response.logs ?? [];
      setAdminLogs(logs);
      setAdminTotal(response.total ?? 0);
      setTimelineData(buildTimelineFromLogs(logs));
    } catch {
      toast.error("Failed to load admin logs");
    }
  };

  const fetchCrewLogs = async () => {
    try {
      const params: any = { fromDate, toDate, page: currentPage, limit: perPage };
      if (selectedCrewType !== "all") params.crewType = selectedCrewType;
      if (selectedPrefix !== "all") params.prefix = selectedPrefix;
      const response = await AuditService.crewLogs(params);
      const logs = response.logs ?? [];
      setCrewLogs(logs);
      setCrewTotal(response.total ?? 0);
      setTimelineData(buildTimelineFromLogs(logs));
    } catch {
      toast.error("Failed to load crew logs");
    }
  };

  // Timeline Chart
  useEffect(() => {
    if (!chartRef.current || timelineData.length === 0) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    const color = activeTab === "admin" ? "#3B82F6" : "#10B981";

    chartInstanceRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: timelineData.map((d) => d.label),
        datasets: [
          {
            label: activeTab === "admin" ? "Admin Actions" : "Crew Submissions",
            data: timelineData.map((d) => d.count),
            borderColor: color,
            backgroundColor: color + "33",
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              usePointStyle: true,
              padding: 15,
            },
          },
        },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, grid: { color: "#E5E7EB" } },
        },
      },
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [timelineData, activeTab]);

  const handleTabChange = (tab: "admin" | "crew") => {
    setActiveTab(tab);
    setCurrentPage(1);
    setExpandedRow(null);
    setSelectedActions([]);
    setSelectedCrewType("all");
    setSelectedPrefix("all");
  };

  const toggleAction = (action: string) => {
    setCurrentPage(1);
    setSelectedActions((prev) =>
      prev.includes(action) ? prev.filter((a) => a !== action) : [...prev, action]
    );
  };

  const escapeHtml = (str: string) =>
    (str || "—").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const formatTimestamp = (dateString: string) =>
    new Intl.DateTimeFormat("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).format(new Date(dateString));

  const formatDateRange = () => {
    const from = new Date(fromDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const to = new Date(toDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return `${from} – ${to}`;
  };

  const handleExportPdf = () => {
    const logsToExport = activeTab === "admin" ? (paginatedLogs as AdminLog[]) : (paginatedLogs as CrewLog[]);
    if (logsToExport.length === 0) {
      toast.error("No logs to export");
      return;
    }

    let title = "";
    let subtitle = "";
    let thead = "";
    let rows = "";

    if (activeTab === "admin") {
      title = "NEXUS — Admin Audit Logs";
      subtitle = "Admin Activity Log";
      thead = `<tr>
        <th>Timestamp</th><th>Action</th><th>Performed By</th>
        <th>Affected Record</th><th>Field Changed</th>
      </tr>`;
      rows = (paginatedLogs as AdminLog[]).map((log) => {
        const c = actionBadgePdf[log.action] || { bg: "#F3F4F6", text: "#374151" };
        return `<tr>
          <td>${formatTimestamp(log.performedAt)}</td>
          <td><span class="badge" style="background:${c.bg};color:${c.text}">${escapeHtml(getActionLabel(log.action))}</span></td>
          <td>${escapeHtml(log.performedBy.split("@")[0])}</td>
          <td><code>${escapeHtml(log.affectedRecord ?? "—")}</code></td>
          <td>${escapeHtml(log.fieldChanged ?? "—")}</td>
        </tr>`;
      }).join("");
    } else {
      title = "NEXUS — Crew Activity Logs";
      subtitle = "Crew Submission & Registration Log";
      thead = `<tr>
        <th>Timestamp</th><th>Crew</th><th>Crew Type</th>
        <th>Attendee</th><th>Prefix</th><th>Email</th><th style="text-align:center">Prints</th>
      </tr>`;
      rows = (paginatedLogs as CrewLog[]).map((log) => {
        const crewColor = crewTypeColors[log.crewType] || "#6B7280";
        const prefColor = prefixColors[log.prefix] || "#6B7280";
        return `<tr>
          <td>${formatTimestamp(log.performedAt)}</td>
          <td><code>${escapeHtml(log.crewUsername)}</code></td>
          <td><span class="badge" style="background:${crewColor};color:#fff">${escapeHtml(log.crewType.replace(/_/g, " ").toUpperCase())}</span></td>
          <td>${escapeHtml(log.attendeeName)}</td>
          <td><span class="badge" style="background:${prefColor};color:#fff">${escapeHtml(log.prefix)}</span></td>
          <td>${escapeHtml(log.attendeeEmail)}</td>
          <td style="text-align:center">${log.printCount}</td>
        </tr>`;
      }).join("");
    }

    let filtersHtml = `<div><strong>Date Range:</strong> ${formatDateRange()}</div>`;
    if (activeTab === "admin" && selectedActions.length > 0) {
      filtersHtml += `<div><strong>Actions:</strong> ${selectedActions.map(getActionLabel).join(", ")}</div>`;
    }
    if (activeTab === "crew") {
      if (selectedCrewType !== "all") filtersHtml += `<div><strong>Crew Type:</strong> ${selectedCrewType}</div>`;
      if (selectedPrefix !== "all") filtersHtml += `<div><strong>Prefix:</strong> ${selectedPrefix}</div>`;
    }

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    @page { size: A4 landscape; margin: 15mm 14mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10px; color: #111; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #1E5FCC; }
    .header h1 { font-size: 18px; font-weight: 800; color: #1E5FCC; letter-spacing: -0.5px; }
    .header .sub { margin-top: 3px; font-size: 10px; color: #555; }
    .meta { text-align: right; font-size: 10px; color: #555; line-height: 1.7; }
    .meta strong { color: #111; }
    table { width: 100%; border-collapse: collapse; margin-top: 4px; }
    thead tr { background: #1E5FCC; color: #fff; }
    thead th { padding: 7px 9px; text-align: left; font-size: 9px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }
    tbody tr { border-bottom: 1px solid #E5E7EB; }
    tbody tr:nth-child(even) { background: #F8FAFF; }
    tbody td { padding: 6px 9px; vertical-align: top; color: #222; line-height: 1.4; }
    .badge { display: inline-block; padding: 2px 7px; border-radius: 99px; font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
    code { font-family: 'Courier New', monospace; font-size: 9px; background: #F3F4F6; padding: 1px 4px; border-radius: 3px; }
    .footer { margin-top: 14px; font-size: 9px; color: #999; text-align: right; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>${title}</h1>
      <div class="sub">${subtitle}</div>
    </div>
    <div class="meta">
      ${filtersHtml}
      <div><strong>Records exported:</strong> ${logsToExport.length}</div>
      <div><strong>Generated:</strong> ${new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</div>
    </div>
  </div>
  <table>
    <thead>${thead}</thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">NEXUS Event Management System &nbsp;·&nbsp; Confidential</div>
  <script>window.onload = () => { window.print(); };<\/script>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
    } else {
      toast.error("Popup blocked. Please allow popups for this site.");
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString));
  };

  const getActionLabel = (action: string) => {
    return action
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Pagination — data is already paginated from the server
  const currentLogs = activeTab === "admin" ? adminLogs : crewLogs;
  const serverTotal = activeTab === "admin" ? adminTotal : crewTotal;
  const totalPages = Math.ceil(serverTotal / perPage) || 1;
  const paginatedLogs = currentLogs;

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
            <div className="mb-6">
              <h1 className="text-3xl font-semibold text-nexus-text-primary">Audit Logs</h1>
              <p className="mt-1 text-base text-nexus-text-secondary">
                Complete audit trail of administrative and crew activity
              </p>
            </div>

            {/* Timeline Chart */}
            <div className="mb-6 rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-nexus-text-primary">Activity Timeline</h3>
              <div className="h-[250px]">
                <canvas ref={chartRef} />
              </div>
            </div>

            {/* Tabs */}
            <div className="mb-6">
              <div className="border-b border-nexus-border">
                <div className="flex gap-8">
                  <button
                    onClick={() => handleTabChange("admin")}
                    className={`relative pb-4 text-base font-medium transition-colors ${activeTab === "admin"
                        ? "text-nexus-brand"
                        : "text-nexus-text-secondary hover:text-nexus-text-primary"
                      }`}
                  >
                    Admin Actions
                    {activeTab === "admin" && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-nexus-brand"
                      />
                    )}
                  </button>
                  <button
                    onClick={() => handleTabChange("crew")}
                    className={`relative pb-4 text-base font-medium transition-colors ${activeTab === "crew"
                        ? "text-nexus-brand"
                        : "text-nexus-text-secondary hover:text-nexus-text-primary"
                      }`}
                  >
                    Crew Activity
                    {activeTab === "crew" && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-nexus-brand"
                      />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="mb-6 flex flex-wrap items-center gap-4">
              {/* Date Range */}
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-nexus-text-hint" />
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => { setFromDate(e.target.value); setCurrentPage(1); }}
                  className="h-10 border-nexus-border-strong pl-10 shadow-sm"
                />
              </div>

              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-nexus-text-hint" />
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => { setToDate(e.target.value); setCurrentPage(1); }}
                  className="h-10 border-nexus-border-strong pl-10 shadow-sm"
                />
              </div>

              {/* Admin Tab Filters */}
              {activeTab === "admin" && (
                <div className="relative">
                  <button
                    onClick={() => setShowActionDropdown(!showActionDropdown)}
                    className="flex h-10 items-center gap-2 rounded-lg border border-nexus-border-strong bg-nexus-surface px-4 text-sm font-medium text-nexus-text-label shadow-sm transition-colors hover:bg-nexus-surface-hover"
                  >
                    <Filter className="h-4 w-4" />
                    Actions {selectedActions.length > 0 && `(${selectedActions.length})`}
                    <ChevronDown className="h-4 w-4" />
                  </button>

                  {showActionDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowActionDropdown(false)}
                      />
                      <div className="absolute left-0 top-12 z-20 w-56 rounded-lg border border-nexus-border bg-nexus-surface p-2 shadow-xl">
                        {adminActionOptions.map((option) => (
                          <label
                            key={option.value}
                            className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 hover:bg-nexus-surface-hover"
                          >
                            <input
                              type="checkbox"
                              checked={selectedActions.includes(option.value)}
                              onChange={() => toggleAction(option.value)}
                              className="h-4 w-4 rounded border-nexus-border-strong text-nexus-brand"
                            />
                            <span className="text-sm text-nexus-text-label">{option.label}</span>
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Crew Tab Filters */}
              {activeTab === "crew" && (
                <>
                  <select
                    value={selectedCrewType}
                    onChange={(e) => { setSelectedCrewType(e.target.value); setCurrentPage(1); }}
                    className="h-10 rounded-lg border border-nexus-border-strong bg-nexus-surface px-4 text-sm font-medium text-nexus-text-label shadow-sm"
                  >
                    {crewTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedPrefix}
                    onChange={(e) => { setSelectedPrefix(e.target.value); setCurrentPage(1); }}
                    className="h-10 rounded-lg border border-nexus-border-strong bg-nexus-surface px-4 text-sm font-medium text-nexus-text-label shadow-sm"
                  >
                    {prefixOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </>
              )}

              {/* Export PDF */}
              <button
                onClick={handleExportPdf}
                disabled={paginatedLogs.length === 0}
                className="ml-auto flex h-10 items-center gap-2 rounded-lg border border-nexus-border-strong bg-nexus-surface px-4 text-sm font-medium text-nexus-text-label shadow-sm transition-colors hover:bg-nexus-surface-hover disabled:opacity-40"
              >
                <Download className="h-4 w-4" />
                Export PDF
              </button>
            </div>

            {/* Logs Table */}
            <div className="rounded-xl border border-nexus-border bg-nexus-surface shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-nexus-surface-hover">
                    <tr>
                      <th className="w-12 px-6 py-3" />
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                        Timestamp
                      </th>
                      {activeTab === "admin" ? (
                        <>
                          <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                            Action
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                            Performed By
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                            Affected Record
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                            Field Changed
                          </th>
                        </>
                      ) : (
                        <>
                          <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                            Crew
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                            Crew Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                            Attendee
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                            Prefix
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                            Email
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                            Prints
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-nexus-border">
                    <AnimatePresence mode="wait">
                      {activeTab === "admin"
                        ? (paginatedLogs as AdminLog[]).map((log, index) => (
                          <Fragment key={log.logId}>
                            <motion.tr
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ delay: index * 0.02 }}
                              className="hover:bg-nexus-surface-hover"
                            >
                              <td className="px-6 py-4">
                                <button
                                  onClick={() =>
                                    setExpandedRow(expandedRow === log.logId ? null : log.logId)
                                  }
                                  className="text-nexus-text-secondary hover:text-nexus-text-primary"
                                >
                                  {expandedRow === log.logId ? (
                                    <ChevronDown className="h-5 w-5" />
                                  ) : (
                                    <ChevronRight className="h-5 w-5" />
                                  )}
                                </button>
                              </td>
                              <td className="px-6 py-4 text-sm text-nexus-text-secondary">
                                {formatDateTime(log.performedAt)}
                              </td>
                              <td className="px-6 py-4">
                                <span
                                  className="inline-block rounded px-2 py-1 text-xs font-semibold text-white"
                                  style={{ backgroundColor: actionColors[log.action] ?? "#6B7280" }}
                                >
                                  {getActionLabel(log.action)}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-nexus-text-primary">
                                {log.performedBy.split("@")[0]}
                              </td>
                              <td className="px-6 py-4 font-mono text-sm text-nexus-text-primary">
                                {log.affectedRecord}
                              </td>
                              <td className="px-6 py-4 text-sm text-nexus-text-secondary">
                                {log.fieldChanged || "—"}
                              </td>
                            </motion.tr>
                            {expandedRow === log.logId && (
                              <tr>
                                <td colSpan={6} className="bg-[#1a1f2e] px-6 py-4">
                                  <div className="rounded-lg border border-gray-700 bg-[#0f1419] p-4">
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-nexus-text-hint">Details</p>
                                    <p className="font-mono text-sm text-green-400">
                                      {log.details || "—"}
                                    </p>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        ))
                        : (paginatedLogs as CrewLog[]).map((log, index) => (
                          <motion.tr
                            key={log.logId}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ delay: index * 0.02 }}
                            className="hover:bg-nexus-surface-hover"
                          >
                            <td className="px-6 py-4">
                              <button
                                onClick={() =>
                                  setExpandedRow(expandedRow === log.logId ? null : log.logId)
                                }
                                className="text-nexus-text-secondary hover:text-nexus-text-primary"
                              >
                                {expandedRow === log.logId ? (
                                  <ChevronDown className="h-5 w-5" />
                                ) : (
                                  <ChevronRight className="h-5 w-5" />
                                )}
                              </button>
                            </td>
                            <td className="px-6 py-4 text-sm text-nexus-text-secondary">
                              {formatDateTime(log.performedAt)}
                            </td>
                            <td className="px-6 py-4 font-mono text-sm text-nexus-text-primary">
                              {log.crewUsername}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className="inline-block rounded px-2 py-1 text-xs font-semibold text-white"
                                style={{
                                  backgroundColor:
                                    crewTypeColors[log.crewType] || "#6B7280",
                                }}
                              >
                                {log.crewType.replace(/_/g, " ").toUpperCase()}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-nexus-text-primary">{log.attendeeName}</td>
                            <td className="px-6 py-4">
                              <span
                                className="inline-block rounded px-2 py-1 font-mono text-xs font-semibold text-white"
                                style={{ backgroundColor: prefixColors[log.prefix] }}
                              >
                                {log.prefix}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-nexus-text-secondary">
                              {log.attendeeEmail}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span
                                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold text-white ${log.printCount === 0
                                    ? "bg-gray-500"
                                    : log.printCount === 1
                                      ? "bg-nexus-brand"
                                      : "bg-orange-500"
                                  }`}
                              >
                                {log.printCount}
                              </span>
                            </td>
                          </motion.tr>
                        ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between border-t border-nexus-border px-6 py-4">
                <p className="text-sm text-nexus-text-secondary">
                  Showing {Math.min((currentPage - 1) * perPage + 1, serverTotal)} to{" "}
                  {Math.min(currentPage * perPage, serverTotal)} of {serverTotal}{" "}
                  logs
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
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let page = i + 1;
                    if (totalPages > 5 && currentPage > 3) {
                      page = currentPage - 2 + i;
                    }
                    if (page > totalPages) return null;
                    return (
                      <Button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        variant={currentPage === page ? "default" : "outline"}
                        className={`h-9 w-9 px-0 ${currentPage === page ? "bg-nexus-brand" : ""
                          }`}
                      >
                        {page}
                      </Button>
                    );
                  })}
                  <Button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    variant="outline"
                    className="h-9 px-3"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
