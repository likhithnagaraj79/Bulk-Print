import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Download, Calendar, Eye, Printer, X, ChevronDown, Trash2 } from "lucide-react";
import { useParams, useNavigate } from "react-router";
import { TopNav } from "./dashboard/TopNav";
import { AdminSidebar } from "./dashboard/AdminSidebar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Chart, LineController, LineElement, PointElement, DoughnutController, ArcElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";
import { ReportService } from "../api/services/report.service";
import { RegistrationService, Registration } from "../api/services/registration.service";
import { toast } from "sonner";

Chart.register(LineController, LineElement, PointElement, DoughnutController, ArcElement, CategoryScale, LinearScale, Tooltip, Legend);

interface PrefixConfig {
  name: string;
  color: string;
}

// Registration interface is imported from service

const prefixConfig: Record<string, PrefixConfig> = {
  vs: { name: "Visitors", color: "#1E5FCC" },
  vi: { name: "VIPs", color: "#A07800" },
  fdl: { name: "Foreign Delegates", color: "#0B9E96" },
  eh: { name: "Exhibitors", color: "#C25A00" },
  or: { name: "Organisers", color: "#4B2FA6" },
  spk: { name: "Speakers", color: "#0E7A4E" },
  dl: { name: "Delegates", color: "#B01E28" },
  spr: { name: "Sponsors", color: "#5A6E8C" },
};

export function RegistrationTabsPage() {
  const { prefix } = useParams<{ prefix: string }>();
  const navigate = useNavigate();
  const config = prefix ? prefixConfig[prefix.toLowerCase()] : null;

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage] = useState(20);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState<Registration[]>([]);
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);
  const [showSlideOver, setShowSlideOver] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // KPI Stats
  const [totalRegistered, setTotalRegistered] = useState(0);
  const [preRegistered, setPreRegistered] = useState(0);
  const [badgesPrinted, setBadgesPrinted] = useState(0);
  const [checkedIn, setCheckedIn] = useState(0);

  // Chart data
  const [hourlyData, setHourlyData] = useState<{ hour: string; count: number }[]>([]);

  const lineChartRef = useRef<HTMLCanvasElement>(null);
  const donutChartRef = useRef<HTMLCanvasElement>(null);
  const lineChartInstanceRef = useRef<Chart | null>(null);
  const donutChartInstanceRef = useRef<Chart | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch data on mount and when prefix changes
  useEffect(() => {
    if (prefix) {
      fetchRegistrations();
      fetchHourlyData();
    }
  }, [prefix]);

  // Filter registrations
  useEffect(() => {
    let filtered = registrations;

    // Filter by search
    if (debouncedSearch) {
      const search = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(search) ||
          r.email.toLowerCase().includes(search) ||
          r.registrationId.toLowerCase().includes(search)
      );
    }

    // Filter by date range
    if (fromDate) {
      filtered = filtered.filter((r) => new Date(r.createdAt) >= new Date(fromDate));
    }
    if (toDate) {
      filtered = filtered.filter((r) => new Date(r.createdAt) <= new Date(toDate));
    }

    setFilteredRegistrations(filtered);
    setCurrentPage(1);
  }, [registrations, debouncedSearch, fromDate, toDate]);

  const fetchRegistrations = async () => {
    try {
      const response = await RegistrationService.getRegistrations({
        prefix,
        search: debouncedSearch,
        fromDate,
        toDate,
        page: currentPage,
        limit: perPage
      });

      setRegistrations(response.data);
      // Stats should ideally come from ReportService or aggregated
    } catch (error) {
      console.error("Failed to fetch registrations:", error);
      toast.error("Failed to fetch registrations");
    }
  };

  const fetchHourlyData = async () => {
    if (!prefix) return;
    try {
      const stats = await ReportService.getRegistrationSummary({
        prefix,
        fromDate,
        toDate
      });

      setHourlyData(stats.hourlyData);

      // Update KPIs from summary
      const categoryStats = stats.byCategory.find(c => c.prefix.toLowerCase() === prefix.toLowerCase());
      if (categoryStats) {
        animateValue(0, categoryStats.total, 800, setTotalRegistered);
        animateValue(0, categoryStats.preRegistered, 800, setPreRegistered);
        animateValue(0, categoryStats.checkedIn, 800, setCheckedIn);
        // Note: badgesPrinted might need a separate stat if not in summary
      }
    } catch (error) {
      console.error("Failed to fetch registration summary:", error);
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

  // Line Chart - Registration Timeline
  useEffect(() => {
    if (!lineChartRef.current || !hourlyData.length || !config) return;

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
            borderColor: config.color,
            backgroundColor: `${config.color}33`,
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
  }, [hourlyData, config]);

  // Donut Chart - Print Status
  useEffect(() => {
    if (!donutChartRef.current || !filteredRegistrations.length) return;

    if (donutChartInstanceRef.current) {
      donutChartInstanceRef.current.destroy();
    }

    const ctx = donutChartRef.current.getContext("2d");
    if (!ctx) return;

    const notPrinted = filteredRegistrations.filter((r) => r.printCount === 0).length;
    const printedOnce = filteredRegistrations.filter((r) => r.printCount === 1).length;
    const multiplePrints = filteredRegistrations.filter((r) => r.printCount > 1).length;

    donutChartInstanceRef.current = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Not Printed", "Printed Once", "Multiple Prints"],
        datasets: [
          {
            data: [notPrinted, printedOnce, multiplePrints],
            backgroundColor: ["#6B7280", "#1E5FCC", "#F59E0B"],
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
      },
    });

    return () => {
      if (donutChartInstanceRef.current) {
        donutChartInstanceRef.current.destroy();
      }
    };
  }, [filteredRegistrations]);

  const handleViewRecord = (registration: Registration) => {
    setSelectedRegistration(registration);
    setShowSlideOver(true);
  };

  const handlePrintBadge = (registration: Registration) => {
    navigate(`/badge?id=${registration.registrationId}`);
  };

  const handleExport = async (format: "csv" | "pdf") => {
    try {
      const url = await ReportService.exportData({
        format,
        prefix: prefix!,
        fromDate,
        toDate
      });
      window.open(url, '_blank');
      toast.success(`Exporting as ${format.toUpperCase()}...`);
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Export failed");
    }
    setShowExportDropdown(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const allOnPage = paginatedRegistrations.map(r => r.registrationId);
    const allSelected = allOnPage.every(id => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        allOnPage.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        allOnPage.forEach(id => next.add(id));
        return next;
      });
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    setIsDeleting(true);
    try {
      await RegistrationService.deleteRegistrations(Array.from(selectedIds));
      const count = selectedIds.size;
      setSelectedIds(new Set());
      setShowDeleteModal(false);
      toast.success(`${count} registration${count > 1 ? "s" : ""} deleted`);
      fetchRegistrations();
      fetchHourlyData();
    } catch {
      toast.error("Failed to delete registrations");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString));
  };

  const getPrintCountColor = (count: number) => {
    if (count === 0) return "bg-gray-500";
    if (count === 1) return "bg-nexus-brand";
    return "bg-orange-500";
  };

  if (!config || !prefix) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-nexus-text-secondary">Invalid prefix</p>
      </div>
    );
  }

  // Pagination
  const totalPages = Math.ceil(filteredRegistrations.length / perPage);
  const paginatedRegistrations = filteredRegistrations.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );

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
            {/* Prefix Banner */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6 rounded-xl p-6 text-white shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${config.color} 0%, ${config.color}CC 100%)`,
              }}
            >
              <div className="flex items-center gap-4">
                <div className="text-5xl font-bold">{prefix.toUpperCase()}</div>
                <div className="h-12 w-px bg-white/30" />
                <div>
                  <h1 className="text-3xl font-bold">{config.name}</h1>
                  <p className="mt-1 text-sm opacity-90">Registration Management</p>
                </div>
              </div>
            </motion.div>

            {/* KPI Stat Cards */}
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="rounded-xl border border-nexus-border bg-nexus-surface shadow-sm"
                style={{ borderTopColor: config.color, borderTopWidth: "3px" }}
              >
                <div className="p-6">
                  <p className="text-sm font-medium text-nexus-text-secondary">Total Registered</p>
                  <p className="mt-2 text-4xl font-bold text-nexus-text-primary">
                    {totalRegistered.toLocaleString()}
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="rounded-xl border border-nexus-border bg-nexus-surface shadow-sm"
                style={{ borderTopColor: config.color, borderTopWidth: "3px" }}
              >
                <div className="p-6">
                  <p className="text-sm font-medium text-nexus-text-secondary">Pre-Registered</p>
                  <p className="mt-2 text-4xl font-bold text-nexus-text-primary">
                    {preRegistered.toLocaleString()}
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="rounded-xl border border-nexus-border bg-nexus-surface shadow-sm"
                style={{ borderTopColor: config.color, borderTopWidth: "3px" }}
              >
                <div className="p-6">
                  <p className="text-sm font-medium text-nexus-text-secondary">Badges Printed Today</p>
                  <p className="mt-2 text-4xl font-bold text-nexus-text-primary">
                    {badgesPrinted.toLocaleString()}
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="rounded-xl border border-nexus-border bg-nexus-surface shadow-sm"
                style={{ borderTopColor: config.color, borderTopWidth: "3px" }}
              >
                <div className="p-6">
                  <p className="text-sm font-medium text-nexus-text-secondary">Checked-In</p>
                  <p className="mt-2 text-4xl font-bold text-nexus-text-primary">
                    {checkedIn.toLocaleString()}
                  </p>
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
                <h3 className="mb-4 text-lg font-semibold text-nexus-text-primary">Registration Timeline</h3>
                <div className="h-[250px]">
                  <canvas ref={lineChartRef} />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm"
              >
                <h3 className="mb-4 text-lg font-semibold text-nexus-text-primary">Print Status</h3>
                <div className="h-[250px] relative">
                  <canvas ref={donutChartRef} />
                  {filteredRegistrations.length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-nexus-text-muted">
                      <svg className="h-10 w-10 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                      <p className="text-sm">No registrations yet</p>
                    </div>
                  )}
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

              {selectedIds.size > 0 && (
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="flex h-10 items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 text-sm font-medium text-red-600 shadow-sm transition-colors hover:bg-red-100"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete {selectedIds.size} selected
                </button>
              )}

              <div className="relative">
                <button
                  onClick={() => setShowExportDropdown(!showExportDropdown)}
                  className="flex h-10 items-center gap-2 rounded-lg border border-nexus-border-strong bg-nexus-surface px-4 text-sm font-medium text-nexus-text-label shadow-sm transition-colors hover:bg-nexus-surface-hover"
                >
                  <Download className="h-4 w-4" />
                  Export
                  <ChevronDown className="h-4 w-4" />
                </button>

                {showExportDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowExportDropdown(false)}
                    />
                    <div className="absolute right-0 top-12 z-20 w-40 rounded-lg border border-nexus-border bg-nexus-surface p-2 shadow-xl">
                      <button
                        onClick={() => handleExport("csv")}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-nexus-text-label hover:bg-nexus-surface-hover"
                      >
                        Export as CSV
                      </button>
                      <button
                        onClick={() => handleExport("pdf")}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-nexus-text-label hover:bg-nexus-surface-hover"
                      >
                        Export as PDF
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>

            {/* Registrations Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="rounded-xl border border-nexus-border bg-nexus-surface shadow-sm"
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead
                    className="bg-nexus-surface-hover"
                    style={{
                      borderBottom: `2px solid ${config.color}`,
                    }}
                  >
                    <tr>
                      <th className="w-10 px-4 py-3">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-nexus-border cursor-pointer"
                          checked={
                            paginatedRegistrations.length > 0 &&
                            paginatedRegistrations.every(r => selectedIds.has(r.registrationId))
                          }
                          ref={el => {
                            if (el) {
                              const someSelected = paginatedRegistrations.some(r => selectedIds.has(r.registrationId));
                              const allSelected = paginatedRegistrations.every(r => selectedIds.has(r.registrationId));
                              el.indeterminate = someSelected && !allSelected;
                            }
                          }}
                          onChange={toggleSelectAll}
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                        Reg ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                        Company
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                        Designation
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                        Registered By
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                        Prints
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                        Time
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-nexus-border">
                    {paginatedRegistrations.map((reg, index) => (
                      <motion.tr
                        key={reg.registrationId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className={`transition-colors hover:bg-nexus-surface-hover ${selectedIds.has(reg.registrationId) ? "bg-red-50" : ""}`}
                      >
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-nexus-border cursor-pointer"
                            checked={selectedIds.has(reg.registrationId)}
                            onChange={() => toggleSelect(reg.registrationId)}
                          />
                        </td>
                        <td className="px-6 py-4 font-mono text-sm font-medium text-nexus-text-primary">
                          {reg.registrationId}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-nexus-text-primary">{reg.name}</td>
                        <td className="px-6 py-4 text-sm text-nexus-text-secondary">{reg.companyName}</td>
                        <td className="px-6 py-4 text-sm text-nexus-text-secondary">{reg.designation}</td>
                        <td className="px-6 py-4 text-sm text-nexus-text-secondary">
                          {reg.registeredBy}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold text-white ${getPrintCountColor(
                              reg.printCount
                            )}`}
                          >
                            {reg.printCount}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-nexus-text-secondary">
                          {formatDate(reg.createdAt)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleViewRecord(reg)}
                              className="rounded p-1.5 text-nexus-text-secondary transition-colors hover:bg-nexus-surface-muted hover:text-nexus-text-primary"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handlePrintBadge(reg)}
                              className="rounded p-1.5 text-nexus-text-secondary transition-colors hover:bg-nexus-surface-muted hover:text-nexus-text-primary"
                              title="Print Badge"
                            >
                              <Printer className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedIds(new Set([reg.registrationId]));
                                setShowDeleteModal(true);
                              }}
                              className="rounded p-1.5 text-nexus-text-secondary transition-colors hover:bg-red-50 hover:text-red-600"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between border-t border-nexus-border px-6 py-4">
                <p className="text-sm text-nexus-text-secondary">
                  Showing {(currentPage - 1) * perPage + 1} to{" "}
                  {Math.min(currentPage * perPage, filteredRegistrations.length)} of{" "}
                  {filteredRegistrations.length} registrations
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
            </motion.div>
          </motion.div>
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50"
              onClick={() => !isDeleting && setShowDeleteModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-xl"
            >
              <div className="mb-5 flex items-start gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-nexus-text-primary">
                    Delete {selectedIds.size} Registration{selectedIds.size > 1 ? "s" : ""}?
                  </h3>
                  <p className="mt-1 text-sm text-nexus-text-secondary">
                    This action cannot be undone. All associated photos and QR codes will be permanently deleted.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  className="flex-1 h-11"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteSelected}
                  disabled={isDeleting}
                  className="flex-1 h-11 bg-red-600 hover:bg-red-700 text-white"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {isDeleting ? "Deleting..." : `Delete ${selectedIds.size}`}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Attendee Detail Slide-Over */}
      <AnimatePresence>
        {showSlideOver && selectedRegistration && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50"
              onClick={() => setShowSlideOver(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto bg-gradient-to-br from-[#0B1A2E] via-[#1E3A5F] to-[#0B1A2E] shadow-2xl"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-700 bg-[#0B1A2E] p-6">
                <h3 className="text-lg font-semibold text-white">Registration Details</h3>
                <button
                  onClick={() => setShowSlideOver(false)}
                  className="text-nexus-text-hint hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Photo */}
                {selectedRegistration.photoUrl && (
                  <div className="flex justify-center">
                    <img
                      src={selectedRegistration.photoUrl}
                      alt={selectedRegistration.name}
                      className="h-32 w-32 rounded-full border-4 border-white/20 object-cover"
                    />
                  </div>
                )}

                {/* Registration ID */}
                <div className="rounded-lg border border-gray-700 bg-white/5 p-4 backdrop-blur-sm">
                  <p className="text-xs font-medium uppercase tracking-wider text-nexus-text-hint">
                    Registration ID
                  </p>
                  <p className="mt-1 font-mono text-2xl font-bold text-white">
                    {selectedRegistration.registrationId}
                  </p>
                </div>

                {/* Basic Info */}
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-nexus-text-hint">
                      Name
                    </p>
                    <p className="mt-1 text-lg font-semibold text-white">
                      {selectedRegistration.name}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-nexus-text-hint">
                        Company
                      </p>
                      <p className="mt-1 text-sm text-white">{selectedRegistration.companyName}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-nexus-text-hint">
                        Designation
                      </p>
                      <p className="mt-1 text-sm text-white">
                        {selectedRegistration.designation}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-nexus-text-hint">
                      Email
                    </p>
                    <p className="mt-1 text-sm text-white">{selectedRegistration.email}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-nexus-text-hint">
                        Phone
                      </p>
                      <p className="mt-1 font-mono text-sm text-white">
                        {selectedRegistration.phoneNumber}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-nexus-text-hint">
                        City
                      </p>
                      <p className="mt-1 text-sm text-white">{selectedRegistration.city}</p>
                    </div>
                  </div>
                </div>

                {/* Status Info */}
                <div className="space-y-4 rounded-lg border border-gray-700 bg-white/5 p-4 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium uppercase tracking-wider text-nexus-text-hint">
                      Check-In Status
                    </p>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${selectedRegistration.checkedIn
                        ? "bg-green-500/20 text-green-400"
                        : "bg-red-500/20 text-red-400"
                        }`}
                    >
                      {selectedRegistration.checkedIn ? "Checked In" : "Not Checked In"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium uppercase tracking-wider text-nexus-text-hint">
                      Print Count
                    </p>
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white ${getPrintCountColor(
                        selectedRegistration.printCount
                      )}`}
                    >
                      {selectedRegistration.printCount}
                    </span>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-nexus-text-hint">
                      Registered By
                    </p>
                    <p className="mt-1 text-sm text-white">
                      {selectedRegistration.registeredBy}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-nexus-text-hint">
                      Registration Time
                    </p>
                    <p className="mt-1 text-sm text-white">
                      {new Intl.DateTimeFormat("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(selectedRegistration.createdAt))}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <Button
                    onClick={() => handlePrintBadge(selectedRegistration)}
                    className="w-full bg-nexus-brand hover:bg-nexus-brand-hover"
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    Print Badge
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
