import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Fragment } from "react";
import { ChevronDown, ChevronRight, Download, Calendar, Plus, Trash2, Edit2, AlertTriangle } from "lucide-react";
import { TopNav } from "./dashboard/TopNav";
import { SidebarAudit } from "./dashboard/SidebarAudit";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend } from "chart.js";
import { SecurityService } from "../api/services/security.service";
import { toast } from "sonner";

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend);

interface AuditLog {
  logId: string;
  action: "add_admin" | "remove_admin" | "modify_admin" | "failed_totp" | string;
  performedBy: string;
  affectedAccount: string;
  fieldChanged: string | null;
  details: string;
  performedAt: string;
}

const actionLabels: Record<string, string> = {
  add_admin: "Add Admin",
  remove_admin: "Remove Admin",
  modify_admin: "Modify Admin",
  failed_totp: "Failed TOTP",
};

const actionColors: Record<string, any> = {
  add_admin: { bg: "bg-green-100", text: "text-green-700", border: "border-green-200", icon: Plus },
  remove_admin: { bg: "bg-red-100", text: "text-red-700", border: "border-red-200", icon: Trash2 },
  modify_admin: { bg: "bg-nexus-brand-light", text: "text-blue-700", border: "border-blue-200", icon: Edit2 },
  failed_totp: { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200", icon: AlertTriangle },
  default: { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-200", icon: FileTextIcon },
};

function FileTextIcon(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>;
}

export function AuditLogsPage() {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage] = useState(50);
  const [totalRecords, setTotalRecords] = useState(0);

  // Filters
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  });
  const [toDate, setToDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [selectedActions, setSelectedActions] = useState<string[]>([
    "add_admin",
    "remove_admin",
    "modify_admin",
    "failed_totp",
  ]);
  const [showActionDropdown, setShowActionDropdown] = useState(false);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(() => fetchLogs(true), 30000);
    return () => clearInterval(interval);
  }, [fromDate, toDate, selectedActions, currentPage]);

  const fetchLogs = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await SecurityService.getSuperAdminLogs({
        fromDate,
        toDate,
        action: selectedActions.length === 4 ? undefined : selectedActions.join(','),
        page: currentPage,
        limit: perPage
      });

      setLogs(response.logs);
      setTotalRecords(response.total);
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
      if (!silent) toast.error("Failed to fetch audit logs");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Render timeline chart
  useEffect(() => {
    if (!chartRef.current || logs.length === 0) return;

    // Aggregate logs by date and action
    const dateMap: Record<string, Record<string, number>> = {};
    logs.forEach((log) => {
      const date = new Date(log.performedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (!dateMap[date]) {
        dateMap[date] = { add_admin: 0, remove_admin: 0, modify_admin: 0, failed_totp: 0 };
      }
      if (log.action in dateMap[date]) {
        dateMap[date][log.action]++;
      }
    });

    const dates = Object.keys(dateMap).sort((a, b) => {
      return new Date(a).getTime() - new Date(b).getTime();
    });

    const datasets = [
      {
        label: "Add Admin",
        data: dates.map((date) => dateMap[date].add_admin || 0),
        borderColor: "#10B981",
        backgroundColor: "#10B98120",
        tension: 0.4,
      },
      {
        label: "Remove Admin",
        data: dates.map((date) => dateMap[date].remove_admin || 0),
        borderColor: "#EF4444",
        backgroundColor: "#EF444420",
        tension: 0.4,
      },
      {
        label: "Modify Admin",
        data: dates.map((date) => dateMap[date].modify_admin || 0),
        borderColor: "#3B82F6",
        backgroundColor: "#3B82F620",
        tension: 0.4,
      },
      {
        label: "Failed TOTP",
        data: dates.map((date) => dateMap[date].failed_totp || 0),
        borderColor: "#F97316",
        backgroundColor: "#F9731620",
        tension: 0.4,
      },
    ];

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    chartInstanceRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: dates,
        datasets: datasets.filter((ds) => ds.data.some((val) => val > 0)),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: "top",
            labels: {
              usePointStyle: true,
              padding: 15,
              font: { size: 12 },
            },
          },
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            beginAtZero: true,
            ticks: { precision: 0 },
            grid: { color: "#E5E7EB" },
          },
        },
      },
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [logs]);

  const toggleRow = (logId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  const handleActionToggle = (action: string) => {
    setSelectedActions((prev) =>
      prev.includes(action) ? prev.filter((a) => a !== action) : [...prev, action]
    );
  };

  const handleSelectAllActions = () => {
    if (selectedActions.length === 4) {
      setSelectedActions([]);
    } else {
      setSelectedActions(["add_admin", "remove_admin", "modify_admin", "failed_totp"]);
    }
  };

  const handleExportPdf = () => {
    if (logs.length === 0) {
      toast.error("No logs to export");
      return;
    }

    const actionLabel = (action: string) =>
      ({ add_admin: "Add Admin", remove_admin: "Remove Admin", modify_admin: "Modify Admin", failed_totp: "Failed TOTP" }[action] ?? action);

    const rows = logs.map((log) => `
      <tr>
        <td>${formatTimestamp(log.performedAt)}</td>
        <td><span class="badge badge-${log.action}">${actionLabel(log.action)}</span></td>
        <td>${escapeHtml(log.performedBy)}</td>
        <td>${escapeHtml(log.affectedAccount)}</td>
        <td>${log.fieldChanged ? escapeHtml(log.fieldChanged) : "—"}</td>
      </tr>`).join("");

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>NEXUS — Audit Logs Export</title>
  <style>
    @page { size: A4; margin: 18mm 14mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #111; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #1E5FCC; }
    .header h1 { font-size: 20px; font-weight: 800; color: #1E5FCC; letter-spacing: -0.5px; }
    .header .meta { text-align: right; font-size: 10px; color: #555; line-height: 1.6; }
    .meta strong { color: #111; }
    table { width: 100%; border-collapse: collapse; margin-top: 4px; }
    thead tr { background: #1E5FCC; color: #fff; }
    thead th { padding: 8px 10px; text-align: left; font-size: 10px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }
    tbody tr { border-bottom: 1px solid #E5E7EB; }
    tbody tr:nth-child(even) { background: #F8FAFF; }
    tbody td { padding: 7px 10px; vertical-align: top; color: #222; line-height: 1.4; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
    .badge-add_admin    { background: #D1FAE5; color: #065F46; }
    .badge-remove_admin { background: #FEE2E2; color: #991B1B; }
    .badge-modify_admin { background: #DBEAFE; color: #1E40AF; }
    .badge-failed_totp  { background: #FFEDD5; color: #9A3412; }
    .footer { margin-top: 16px; font-size: 9px; color: #999; text-align: right; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>NEXUS — Audit Logs</h1>
      <div style="margin-top:4px;font-size:10px;color:#555;">Super Admin Security Log</div>
    </div>
    <div class="meta">
      <div><strong>Period:</strong> ${formatDateRange()}</div>
      <div><strong>Records exported:</strong> ${logs.length}</div>
      <div><strong>Generated:</strong> ${new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Timestamp</th>
        <th>Action</th>
        <th>Performed By</th>
        <th>Affected Account</th>
        <th>Field Changed</th>
      </tr>
    </thead>
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

  const escapeHtml = (str: string) =>
    str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const formatTimestamp = (dateString: string) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(dateString));
  };

  const formatDateRange = () => {
    const from = new Date(fromDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const to = new Date(toDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return `${from} – ${to}`;
  };

  const totalPages = Math.ceil(totalRecords / perPage) || 1;

  return (
    <div className="min-h-screen w-full bg-nexus-page-bg pt-16">
      <TopNav />
      <div className="flex">
        <SidebarAudit collapsed={sidebarCollapsed} onToggle={setSidebarCollapsed} />
        <main
          className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? "lg:pl-20" : "lg:pl-60"
            }`}
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 lg:p-8"
          >
            <div className="mb-6">
              <h1 className="text-3xl font-semibold text-nexus-text-primary">Audit Logs</h1>
              <p className="mt-1 text-base text-nexus-text-secondary">{formatDateRange()}</p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 rounded-xl border border-nexus-border bg-gradient-to-br from-[#0B1A2E] via-[#1E3A5F] to-[#0B1A2E] p-6 shadow-sm"
            >
              <div className="mb-4 flex items-center gap-3">
                <h2 className="text-lg font-semibold text-white">Audit Activity Timeline</h2>
                <span className="flex items-center gap-1.5 rounded-full bg-green-500/20 px-2.5 py-0.5 text-xs font-medium text-green-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
                  Live · 30s
                </span>
              </div>
              <div className="h-[200px]">
                <canvas ref={chartRef} />
              </div>
            </motion.div>

            <div className="mb-6 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-nexus-text-hint" />
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="h-10 border-nexus-border-strong pl-10 shadow-sm"
                  />
                </div>
                <span className="text-nexus-text-secondary">to</span>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-nexus-text-hint" />
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="h-10 border-nexus-border-strong pl-10 shadow-sm"
                  />
                </div>
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowActionDropdown(!showActionDropdown)}
                  className="flex h-10 items-center gap-2 rounded-lg border border-nexus-border-strong bg-nexus-surface px-4 text-sm font-medium text-nexus-text-label shadow-sm transition-colors hover:bg-nexus-surface-hover"
                >
                  Actions ({selectedActions.length})
                  <ChevronDown className="h-4 w-4" />
                </button>

                {showActionDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowActionDropdown(false)} />
                    <div className="absolute left-0 top-12 z-20 w-64 rounded-lg border border-nexus-border bg-nexus-surface p-2 shadow-xl">
                      <div className="border-b border-nexus-border pb-2">
                        <button
                          onClick={handleSelectAllActions}
                          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-nexus-text-label hover:bg-nexus-surface-hover"
                        >
                          <Checkbox checked={selectedActions.length === 4} />
                          {selectedActions.length === 4 ? "Clear All" : "Select All"}
                        </button>
                      </div>
                      <div className="mt-2 space-y-1">
                        {Object.entries(actionLabels).map(([action, label]) => (
                          <button
                            key={action}
                            onClick={() => handleActionToggle(action)}
                            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-nexus-text-label hover:bg-nexus-surface-hover"
                          >
                            <Checkbox checked={selectedActions.includes(action)} />
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={handleExportPdf}
                disabled={logs.length === 0}
                className="ml-auto flex h-10 items-center gap-2 rounded-lg border border-nexus-border-strong bg-nexus-surface px-4 text-sm font-medium text-nexus-text-label shadow-sm transition-colors hover:bg-nexus-surface-hover disabled:opacity-40"
              >
                <Download className="h-4 w-4" />
                Export PDF
              </button>
            </div>

            <div className="rounded-xl border border-nexus-border bg-nexus-surface shadow-sm">
              {loading ? (
                <div className="flex h-96 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-nexus-border-strong border-t-nexus-brand" />
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-nexus-surface-hover">
                        <tr>
                          <th className="w-12 px-6 py-3 text-left" />
                          <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">Timestamp</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">Action</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">Performed By</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">Affected</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">Field</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-nexus-border">
                        {logs.map((log) => {
                          const isExpanded = expandedRows.has(log.logId);
                          const colors = actionColors[log.action] || actionColors.default;
                          const Icon = colors.icon;

                          return (
                            <Fragment key={log.logId}>
                              <tr
                                onClick={() => toggleRow(log.logId)}
                                className="cursor-pointer transition-colors hover:bg-nexus-surface-hover"
                              >
                                <td className="px-6 py-4">
                                  {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                                </td>
                                <td className="px-6 py-4 text-sm text-nexus-text-primary">{formatTimestamp(log.performedAt)}</td>
                                <td className="px-6 py-4">
                                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${colors.bg} ${colors.text} ${colors.border}`}>
                                    <Icon className="h-3.5 w-3.5" />
                                    {actionLabels[log.action] || log.action}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-nexus-text-primary">{log.performedBy}</td>
                                <td className="px-6 py-4 text-sm text-nexus-text-primary">{log.affectedAccount}</td>
                                <td className="px-6 py-4 text-sm text-nexus-text-secondary">{log.fieldChanged || "—"}</td>
                              </tr>
                              {isExpanded && (
                                <tr>
                                  <td colSpan={6} className="bg-[#1a1f2e] px-6 py-4">
                                    <div className="rounded-lg border border-gray-700 bg-[#0f1419] p-4">
                                      <p className="mb-2 text-xs font-semibold uppercase text-nexus-text-hint">Details</p>
                                      <pre className="overflow-x-auto font-mono text-sm text-green-400">{log.details}</pre>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between border-t border-nexus-border px-6 py-4">
                    <p className="text-sm text-nexus-text-secondary">
                      Showing {(currentPage - 1) * perPage + 1} to {Math.min(currentPage * perPage, totalRecords)} of {totalRecords} logs
                    </p>
                    <div className="flex items-center gap-2">
                      <Button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} variant="outline" className="h-9">Previous</Button>
                      <span className="text-sm">Page {currentPage} of {totalPages}</span>
                      <Button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} variant="outline" className="h-9">Next</Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}