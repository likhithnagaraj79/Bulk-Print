import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Calendar, Eye, Printer, Mail, MessageCircle, RefreshCw, ChevronDown, X, AlertCircle, CheckSquare, Square } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Chart, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler } from "chart.js";
import { RegistrationService, Registration, FailedSync } from "../api/services/registration.service";
import { AuthService } from "../api/services/auth.service";
import { NotificationService } from "../api/services/notification.service";
import { toast } from "sonner";
import { TopNav } from "./dashboard/TopNav";
import { CrewSidebar } from "./dashboard/CrewSidebar";

Chart.register(LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler);

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

export function CrewSubmissionsPage() {
  const navigate = useNavigate();
  // We can get crewType from local storage or auth context if needed.
  // For now keeping it default or based on first registration.
  const [crewType, setCrewType] = useState("visitors");
  const crewColor = CREW_TYPE_COLORS[crewType] || "#1E5FCC";

  const [submissions, setSubmissions] = useState<Registration[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedPrefix, setSelectedPrefix] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [failedSyncs, setFailedSyncs] = useState<FailedSync[]>([]);
  const [showFailedSection, setShowFailedSection] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<Registration | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [crewLabel, setCrewLabel] = useState("Crew");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showPrintQueue, setShowPrintQueue] = useState(false);

  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  useEffect(() => {
    AuthService.getMe()
      .then((me) => {
        if (me?.crewType) setCrewType(me.crewType);
        if (me?.fullName) setCrewLabel(me.fullName);
      })
      .catch(() => {});
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch data on mount and when filters change
  useEffect(() => {
    fetchSubmissions();
    fetchFailedSyncs();
  }, [debouncedSearch, fromDate, toDate, selectedPrefix, currentPage]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const response = await RegistrationService.getRegistrations({
        page: currentPage,
        limit: perPage,
        search: debouncedSearch,
        prefix: selectedPrefix === "all" ? undefined : selectedPrefix,
        fromDate,
        toDate,
      });

      if (response.success) {
        setSubmissions(response.data);
        setTotalCount(response.total);

        // Calculate today count from full data if possible, or just use slice for now
        // Backend doesn't return today total separately, so we might need a separate call or just estimate.
        // For now, let's filter the current page data as an indicator, or just 0.
        const today = new Date().toDateString();
        const todayItems = response.data.filter((s) => new Date(s.createdAt).toDateString() === today);
        setTodayCount(todayItems.length); // This is only for current page, ideally should be from backend
      }
    } catch (error) {
      console.error("Failed to fetch registrations:", error);
      toast.error("Failed to load submissions");
    } finally {
      setLoading(false);
    }
  };

  const fetchFailedSyncs = async () => {
    try {
      const response = await RegistrationService.getFailedSyncs();
      setFailedSyncs(response.failedRecords);
      setFailedCount(response.failedRecords.length);
    } catch (error) {
      console.error("Failed to fetch failed syncs:", error);
    }
  };

  // Generate timeline data from current registrations
  useEffect(() => {
    if (submissions.length === 0) return;

    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split("T")[0];
      const count = submissions.filter(
        (s) => s.createdAt.split("T")[0] === dateString
      ).length;
      days.push({
        date: dateString,
        label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        count,
      });
    }
    setTimelineData(days);
  }, [submissions]);

  // Timeline Chart
  useEffect(() => {
    if (!chartRef.current || timelineData.length === 0) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    chartInstanceRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: timelineData.map((d) => d.label),
        datasets: [
          {
            label: "Submissions",
            data: timelineData.map((d) => d.count),
            borderColor: crewColor,
            backgroundColor: `${crewColor}33`,
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
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [timelineData, crewColor]);

  const handleViewRecord = (submission: Registration) => {
    setSelectedSubmission(submission);
    setShowDetailModal(true);
  };

  const handlePrint = (submission: Registration) => {
    navigate(`/badge?id=${submission.registrationId}`);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const allOnPageSelected = submissions.length > 0 && submissions.every(s => selectedIds.includes(s.registrationId));

  const handleSelectAll = () => {
    if (allOnPageSelected) {
      setSelectedIds(prev => prev.filter(id => !submissions.map(s => s.registrationId).includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...submissions.map(s => s.registrationId)])]);
    }
  };

  const handleBulkPrint = () => {
    if (selectedIds.length === 0) return;
    if (selectedIds.length === 1) {
      navigate(`/badge?id=${selectedIds[0]}`);
    } else {
      setShowPrintQueue(true);
    }
  };

  const handleSendEmail = async (submission: Registration) => {
    try {
      const response = await NotificationService.sendBadgeEmail(submission.registrationId);
      if (response.success) {
        toast.success(`Badge email sent to ${submission.email}`);
        fetchSubmissions();
      }
    } catch (error) {
      console.error("Email error:", error);
      toast.error("Failed to send email");
    }
  };

  const handleSendWhatsApp = async (submission: Registration) => {
    try {
      const response = await NotificationService.sendBadgeWhatsapp(submission.registrationId);
      if (response.success) {
        toast.success(`Badge WhatsApp sent to ${submission.phoneNumber}`);
        fetchSubmissions();
      }
    } catch (error) {
      console.error("WhatsApp error:", error);
      toast.error("Failed to send WhatsApp");
    }
  };

  const handleRetrySync = async (failedSync: FailedSync) => {
    try {
      // Create a single record sync
      const response = await RegistrationService.syncOfflineRecords([{
        localId: failedSync.localId,
        name: failedSync.name,
        email: failedSync.email,
        // ... need other fields if possible, but failedSync interface is limited
      }]);

      if (response.success && response.synced > 0) {
        toast.success(`Synced ${failedSync.name} successfully`);
        fetchFailedSyncs();
        fetchSubmissions();
      } else {
        toast.error(`Sync failed: ${response.errors?.[0]?.reason || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("An error occurred during sync");
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

  const getPrintCountColor = (count: number) => {
    if (count === 0) return "bg-gray-500";
    if (count === 1) return "bg-nexus-brand";
    return "bg-amber-500";
  };

  const totalPages = Math.ceil(totalCount / perPage);

  return (
    <div className="min-h-screen w-full bg-nexus-page-bg pt-16">
      <TopNav role="crew" crewLabel={crewLabel} crewColor={crewColor} />
      <div className="flex">
        <CrewSidebar collapsed={collapsed} onToggle={setCollapsed} crewColor={crewColor} />
        <main className={`flex-1 transition-all duration-300 ${collapsed ? "lg:pl-20" : "lg:pl-60"}`}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="p-6 lg:p-8">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-nexus-text-primary">My Submissions</h1>
        </div>

        {/* KPI Cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm"
          >
            <p className="text-sm font-medium text-nexus-text-secondary">Total Submissions</p>
            <p className="mt-2 text-4xl font-bold text-nexus-text-primary">{totalCount}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm"
          >
            <p className="text-sm font-medium text-nexus-text-secondary">Today (This Page)</p>
            <p className="mt-2 text-4xl font-bold text-nexus-text-primary">{todayCount}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`cursor-pointer rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm transition-colors ${failedCount > 0 ? "hover:bg-amber-50" : ""
              }`}
            onClick={() => failedCount > 0 && setShowFailedSection(!showFailedSection)}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-nexus-text-secondary">Failed Syncs</p>
                <p className="mt-2 text-4xl font-bold text-nexus-text-primary">{failedCount}</p>
              </div>
              {failedCount > 0 && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700">
                  {failedCount}
                </span>
              )}
            </div>
          </motion.div>
        </div>

        {/* Timeline Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-6 rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm"
        >
          <h3 className="mb-4 text-lg font-semibold text-nexus-text-primary">My Submissions Timeline</h3>
          <div className="h-[180px]">
            <canvas ref={chartRef} />
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-6 flex flex-wrap items-center gap-4"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-nexus-text-hint" />
            <Input
              type="text"
              placeholder="Search by name, email, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 border-nexus-border-strong pl-10 shadow-sm"
            />
          </div>

          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-nexus-text-hint" />
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-10 border-nexus-border-strong pl-10 shadow-sm"
              placeholder="From"
            />
          </div>

          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-nexus-text-hint" />
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-10 border-nexus-border-strong pl-10 shadow-sm"
              placeholder="To"
            />
          </div>

          <select
            value={selectedPrefix}
            onChange={(e) => setSelectedPrefix(e.target.value)}
            className="h-10 rounded-lg border border-nexus-border-strong bg-nexus-surface px-4 text-sm font-medium text-nexus-text-label shadow-sm"
          >
            <option value="all">All Prefixes</option>
            <option value="VS">VS — Visitors</option>
            <option value="VI">VI — VIPs</option>
            <option value="EH">EH — Exhibitors</option>
          </select>
        </motion.div>

        {/* Bulk Actions Toolbar */}
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex items-center gap-4 rounded-xl border border-nexus-brand/30 bg-nexus-brand-light px-5 py-3"
          >
            <span className="text-sm font-semibold text-nexus-brand">
              {selectedIds.length} selected
            </span>
            <Button
              onClick={handleBulkPrint}
              size="sm"
              className="bg-nexus-brand text-white hover:bg-nexus-brand-hover"
            >
              <Printer className="mr-2 h-4 w-4" />
              Print Selected ({selectedIds.length})
            </Button>
            <button
              onClick={() => setSelectedIds([])}
              className="ml-auto text-sm text-nexus-text-secondary hover:text-nexus-text-primary"
            >
              Clear
            </button>
          </motion.div>
        )}

        {/* Submissions Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="rounded-xl border border-nexus-border bg-nexus-surface shadow-sm"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-nexus-surface-hover">
                <tr>
                  <th className="px-4 py-3">
                    <button onClick={handleSelectAll}>
                      {allOnPageSelected
                        ? <CheckSquare className="h-4 w-4 text-nexus-brand" />
                        : <Square className="h-4 w-4 text-nexus-text-secondary" />
                      }
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                    #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                    Prefix
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                    Prints
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nexus-border">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-nexus-text-secondary">
                      Loading registrations...
                    </td>
                  </tr>
                ) : submissions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-nexus-text-secondary">
                      No submissions found.
                    </td>
                  </tr>
                ) : (
                  submissions.map((submission, index) => (
                    <motion.tr
                      key={submission.registrationId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="hover:bg-nexus-surface-hover"
                    >
                      <td className="px-4 py-4">
                        <button onClick={() => handleToggleSelect(submission.registrationId)}>
                          {selectedIds.includes(submission.registrationId)
                            ? <CheckSquare className="h-4 w-4 text-nexus-brand" />
                            : <Square className="h-4 w-4 text-nexus-text-secondary" />
                          }
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-nexus-text-primary">
                        {(currentPage - 1) * perPage + index + 1}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-nexus-text-primary">
                        {submission.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-nexus-text-secondary">{submission.companyName}</td>
                      <td className="px-6 py-4">
                        <span
                          className="inline-block rounded px-2 py-1 font-mono text-xs font-semibold text-white"
                          style={{ backgroundColor: PREFIX_COLORS[submission.prefix] }}
                        >
                          {submission.prefix}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold text-white ${getPrintCountColor(
                            submission.printCount
                          )}`}
                        >
                          {submission.printCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-nexus-text-secondary">
                        {formatTimeAgo(submission.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {submission.emailStatus && (
                            <span
                              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${submission.emailStatus === "sent"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-nexus-surface-muted text-nexus-text-secondary"
                                }`}
                            >
                              <Mail className="h-3 w-3" />
                              {submission.emailStatus}
                            </span>
                          )}
                          {submission.whatsappStatus && (
                            <span
                              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${submission.whatsappStatus === "sent"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-nexus-surface-muted text-nexus-text-secondary"
                                }`}
                            >
                              <MessageCircle className="h-3 w-3" />
                              {submission.whatsappStatus}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewRecord(submission)}
                            className="rounded p-1.5 text-nexus-text-secondary transition-colors hover:bg-gray-200 hover:text-nexus-text-primary"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handlePrint(submission)}
                            className="rounded p-1.5 text-nexus-text-secondary transition-colors hover:bg-gray-200 hover:text-nexus-text-primary"
                            title="Print Badge"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleSendEmail(submission)}
                            className="rounded p-1.5 text-nexus-text-secondary transition-colors hover:bg-gray-200 hover:text-nexus-text-primary"
                            title="Send Email"
                          >
                            <Mail className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleSendWhatsApp(submission)}
                            className="rounded p-1.5 text-nexus-text-secondary transition-colors hover:bg-gray-200 hover:text-nexus-text-primary"
                            title="Send WhatsApp"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-nexus-border px-6 py-4">
            <p className="text-sm text-nexus-text-secondary">
              Showing {(currentPage - 1) * perPage + 1} to{" "}
              {Math.min(currentPage * perPage, totalCount)} of{" "}
              {totalCount} submissions
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
                    className={`h-9 w-9 px-0 ${currentPage === page ? "bg-nexus-brand" : ""}`}
                  >
                    {page}
                  </Button>
                );
              })}
              <Button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                variant="outline"
                className="h-9 px-3"
              >
                Next
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Failed Syncs Section */}
        {failedSyncs.length > 0 && (
          <AnimatePresence>
            {showFailedSection && (
              <motion.div
                initial={{ opacity: 0, y: 20, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: 20, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-6 overflow-hidden rounded-xl border-l-4 border-amber-500 bg-nexus-surface shadow-sm"
              >
                <div className="border-b border-nexus-border bg-amber-50 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-amber-600" />
                      <h3 className="text-lg font-semibold text-nexus-text-primary">Failed Syncs</h3>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        {failedSyncs.length}
                      </span>
                    </div>
                    <button
                      onClick={() => setShowFailedSection(false)}
                      className="text-nexus-text-muted hover:text-nexus-text-label"
                    >
                      <ChevronDown className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-nexus-border">
                  {failedSyncs.map((failed) => (
                    <div key={failed.localId} className="px-6 py-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-nexus-text-primary">
                            {failed.name || "Unknown"}
                          </p>
                          <p className="mt-1 text-sm text-nexus-text-secondary">{failed.email}</p>
                          <div className="mt-2 flex items-center gap-4">
                            <span className="rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                              {failed.reason}
                            </span>
                            <span className="text-xs text-nexus-text-muted">
                              {formatTimeAgo(failed.failedAt)}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRetrySync(failed)}
                          className="flex items-center gap-2 rounded-lg border border-nexus-border-strong bg-nexus-surface px-3 py-2 text-sm font-medium text-nexus-text-label transition-colors hover:bg-nexus-surface-hover"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Retry
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
        </motion.div>
        </main>
      </div>

      {/* Print Queue Modal */}
      <AnimatePresence>
        {showPrintQueue && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50"
              onClick={() => setShowPrintQueue(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl bg-nexus-surface p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-nexus-text-primary">
                  Print Queue — {selectedIds.length} Badges
                </h3>
                <button onClick={() => setShowPrintQueue(false)} className="text-nexus-text-muted hover:text-nexus-text-label">
                  <X className="h-6 w-6" />
                </button>
              </div>
              <p className="mb-4 text-sm text-nexus-text-secondary">
                Click "Print" on each badge to open the badge preview in a new tab.
              </p>
              <div className="max-h-96 space-y-2 overflow-y-auto">
                {submissions
                  .filter(s => selectedIds.includes(s.registrationId))
                  .map((s, i) => (
                    <div key={s.registrationId} className="flex items-center justify-between rounded-lg border border-nexus-border bg-nexus-surface-hover p-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded text-xs font-bold text-white" style={{ backgroundColor: PREFIX_COLORS[s.prefix] }}>
                          {i + 1}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-nexus-text-primary">{s.name}</p>
                          <p className="text-xs text-nexus-text-secondary">{s.prefix} · {s.companyName}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => window.open(`/badge?id=${s.registrationId}`, '_blank')}
                        className="flex items-center gap-1.5 rounded-lg bg-nexus-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-nexus-brand-hover"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        Print
                      </button>
                    </div>
                  ))}
              </div>
              <div className="mt-4 flex gap-3">
                <Button
                  onClick={() => {
                    selectedIds.forEach(id => window.open(`/badge?id=${id}`, '_blank'));
                  }}
                  className="flex-1 bg-nexus-brand hover:bg-nexus-brand-hover"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Open All in New Tabs
                </Button>
                <Button onClick={() => { setShowPrintQueue(false); setSelectedIds([]); }} variant="outline">
                  Done
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedSubmission && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50"
              onClick={() => setShowDetailModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl bg-nexus-surface p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-nexus-text-primary">Registration Details</h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-nexus-text-muted hover:text-nexus-text-label"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="rounded-lg border border-nexus-border bg-nexus-surface-hover p-4">
                  <p className="text-xs font-medium uppercase text-nexus-text-muted">Registration ID</p>
                  <p className="mt-1 font-mono text-xl font-bold text-nexus-text-primary">
                    {selectedSubmission.registrationId}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium uppercase text-nexus-text-muted">Name</p>
                    <p className="mt-1 text-sm font-semibold text-nexus-text-primary">
                      {selectedSubmission.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-nexus-text-muted">Email</p>
                    <p className="mt-1 text-sm text-nexus-text-primary">{selectedSubmission.email}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-nexus-text-muted">Phone</p>
                    <p className="mt-1 font-mono text-sm text-nexus-text-primary">
                      {selectedSubmission.phoneNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-nexus-text-muted">Designation</p>
                    <p className="mt-1 text-sm text-nexus-text-primary">
                      {selectedSubmission.designation}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-nexus-text-muted">Company</p>
                    <p className="mt-1 text-sm text-nexus-text-primary">
                      {selectedSubmission.companyName}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-nexus-text-muted">City</p>
                    <p className="mt-1 text-sm text-nexus-text-primary">{selectedSubmission.city}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-nexus-border bg-nexus-surface-hover p-3">
                  <p className="text-xs font-medium uppercase text-nexus-text-muted">Print Count</p>
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white ${getPrintCountColor(
                      selectedSubmission.printCount
                    )}`}
                  >
                    {selectedSubmission.printCount}
                  </span>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <Button
                  onClick={() => handlePrint(selectedSubmission)}
                  className="flex-1 bg-nexus-brand hover:bg-nexus-brand-hover"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Print Badge
                </Button>
                <Button
                  onClick={() => setShowDetailModal(false)}
                  variant="outline"
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
