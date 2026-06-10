import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Download, Camera, Eye, Printer, Mail, MessageCircle, RefreshCw, X } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { TopNav } from "./dashboard/TopNav";
import { AdminSidebar } from "./dashboard/AdminSidebar";
import { PreRegistrationService } from "../api/services/preRegistration.service";
import { BadgeService } from "../api/services/badge.service";
import { NotificationService } from "../api/services/notification.service";
import { ReportService } from "../api/services/report.service";
import { toast } from "sonner";

interface PreRegistration {
  preRegistrationId: string;
  name: string;
  email: string;
  // Some fields might be missing in list view but present in detail
  companyName?: string;
  designation?: string;
  badgePrinted: boolean;
  printCount: number;
  createdAt: string;
}

interface DetailData {
  preRegistrationId: string;
  prefix: string;
  name: string;
  email: string;
  phoneCountryCode: string;
  phone: string;
  phoneNumber?: string; // Backend might use phoneNumber
  designation: string;
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  country: string;
  city: string;
  qrCodeUrl?: string;
  badgeQrUrl?: string;
  badgePrinted: boolean;
  printCount: number;
  createdAt: string;
}

const PREFIX_CONFIG: Record<string, { name: string; color: string }> = {
  VS: { name: "Visitors", color: "#1E5FCC" },
  VI: { name: "VIPs", color: "#A07800" },
  FDL: { name: "Foreign Delegates", color: "#0B9E96" },
  EH: { name: "Exhibitors", color: "#C25A00" },
  OR: { name: "Organisers", color: "#4B2FA6" },
  SPK: { name: "Speakers", color: "#0E7A4E" },
  DL: { name: "Delegates", color: "#B01E28" },
  SPR: { name: "Sponsors", color: "#5A6E8C" },
};

const PREFIXES = Object.keys(PREFIX_CONFIG);

export function AdminPreRegistrationPage() {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activePrefix, setActivePrefix] = useState("VS");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [printedFilter, setPrintedFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [preRegistrations, setPreRegistrations] = useState<PreRegistration[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedDetail, setSelectedDetail] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(false);

  const [stats, setStats] = useState({
    total: 0,
    printed: 0,
    pending: 0,
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    loadPreRegistrations();
    loadStats();
  }, [activePrefix, debouncedSearch, printedFilter, currentPage, itemsPerPage]);

  const loadPreRegistrations = async () => {
    setLoading(true);
    try {
      const response = await PreRegistrationService.list({
        page: currentPage,
        limit: itemsPerPage,
        prefix: activePrefix,
        search: debouncedSearch,
        printed: printedFilter === "all" ? undefined : printedFilter === "printed",
      });

      if (response.success) {
        setPreRegistrations(response.data as PreRegistration[]);
        setTotalRecords(response.total || 0);
      }
    } catch (error) {
      console.error("Failed to load pre-registrations:", error);
      toast.error("Failed to load pre-registrations");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const summary = await ReportService.getRegistrationSummary({
        prefix: activePrefix,
        type: 'pre_registered'
      });

      const catStats = summary.byCategory.find(c => c.prefix === activePrefix);
      if (catStats) {
        setStats({
          total: catStats.preRegistered,
          printed: catStats.checkedIn, // Reports checkedIn is used for "printed" here? Or we need a different field.
          // In ReportController, checked_in is sum of checked_in = TRUE. 
          // For pre-reg, maybe we should use badge_printed. 
          // The summary logic seems to focus on Onsite vs Pre-registered.
          pending: catStats.preRegistered - catStats.checkedIn,
        });
      } else {
        setStats({ total: 0, printed: 0, pending: 0 });
      }
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const handlePrefixChange = (prefix: string) => {
    setActivePrefix(prefix);
    setCurrentPage(1);
  };

  const handleViewDetail = async (id: string) => {
    try {
      const data = await PreRegistrationService.getById(id);
      setSelectedDetail(data);
    } catch (error) {
      console.error("Failed to load details:", error);
      toast.error("Failed to load details");
    }
  };

  const handlePrintBadge = async (id: string) => {
    try {
      const response = await BadgeService.logPrint(id);
      if (response.success) {
        toast.success("Badge print logged successfully");
        loadPreRegistrations();
        if (selectedDetail && selectedDetail.preRegistrationId === id) {
          handleViewDetail(id); // Refresh detail view
        }
      }
    } catch (error) {
      console.error("Print error:", error);
      toast.error("Failed to log print");
    }
  };

  const handleResendEmail = async (id: string) => {
    try {
      const response = await NotificationService.sendBadgeEmail(id);
      if (response.success) {
        toast.success("Badge email resent successfully");
      }
    } catch (error) {
      console.error("Email resend error:", error);
      toast.error("Failed to resend email");
    }
  };

  const handleResendWhatsApp = async (id: string) => {
    try {
      const response = await NotificationService.sendBadgeWhatsapp(id);
      if (response.success) {
        toast.success("Badge WhatsApp message resent successfully");
      }
    } catch (error) {
      console.error("WhatsApp resend error:", error);
      toast.error("Failed to resend WhatsApp");
    }
  };

  const handleResendAll = async (id: string) => {
    const emailPromise = NotificationService.sendBadgeEmail(id);
    const whatsappPromise = NotificationService.sendBadgeWhatsapp(id);

    toast.promise(Promise.all([emailPromise, whatsappPromise]), {
      loading: 'Resending all notifications...',
      success: 'All notifications resent successfully',
      error: 'Failed to resend some notifications',
    });
  };

  const handleScanQR = () => {
    navigate('/crew/pre-reg-scan');
  };

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      const url = await ReportService.exportData({
        format,
        prefix: activePrefix,
      });
      window.open(url, '_blank');
      toast.success(`Exporting ${format.toUpperCase()}...`);
    } catch (error) {
      toast.error("Export failed");
    }
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "1d ago";
    return `${diffDays}d ago`;
  };

  const getPrintCountBadgeColor = (count: number) => {
    if (count === 0) return "bg-gray-200 text-nexus-text-secondary";
    if (count === 1) return "bg-nexus-brand-light text-blue-700";
    return "bg-amber-100 text-amber-700";
  };

  const totalPages = Math.ceil(totalRecords / itemsPerPage);

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
        <h1 className="mb-6 text-3xl font-semibold text-nexus-text-primary">Pre-Registrations</h1>

        {/* KPI Cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm"
          >
            <p className="text-sm font-medium text-nexus-text-secondary">Total Pre-Registered</p>
            <p className="mt-2 text-4xl font-bold text-nexus-text-primary">{stats.total}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm"
          >
            <p className="text-sm font-medium text-nexus-text-secondary">Badge Printed</p>
            <p className="mt-2 text-4xl font-bold text-green-600">{stats.printed}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm"
          >
            <p className="text-sm font-medium text-nexus-text-secondary">Pending</p>
            <p className="mt-2 text-4xl font-bold text-amber-600">{stats.pending}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="group cursor-pointer rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm transition-colors hover:bg-nexus-surface-hover"
          >
            <p className="text-sm font-medium text-nexus-text-secondary">Export Category</p>
            <div className="mt-2 flex items-center gap-2">
              <Download className="h-8 w-8 text-nexus-brand" />
              <div className="text-sm">
                <button
                  onClick={() => handleExport("csv")}
                  className="block text-left font-medium text-nexus-brand hover:text-nexus-brand-hover"
                >
                  CSV
                </button>
                <button
                  onClick={() => handleExport("pdf")}
                  className="block text-left font-medium text-nexus-brand hover:text-nexus-brand-hover"
                >
                  PDF
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Prefix Tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto border-b border-nexus-border">
          {PREFIXES.map((prefix) => (
            <button
              key={prefix}
              onClick={() => handlePrefixChange(prefix)}
              className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${activePrefix === prefix
                  ? "text-nexus-text-primary"
                  : "border-transparent text-nexus-text-secondary hover:text-nexus-text-primary"
                }`}
              style={{
                borderBottomColor:
                  activePrefix === prefix ? PREFIX_CONFIG[prefix].color : "transparent",
              }}
            >
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: PREFIX_CONFIG[prefix].color }}
              />
              <span>{prefix}</span>
            </button>
          ))}
        </div>

        {/* Filters & Actions */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-nexus-text-hint" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="h-10 pl-10"
            />
          </div>

          <select
            value={printedFilter}
            onChange={(e) => setPrintedFilter(e.target.value)}
            className="h-10 rounded-lg border border-nexus-border-strong bg-nexus-surface px-4 text-sm shadow-sm"
          >
            <option value="all">All Status</option>
            <option value="printed">Printed</option>
            <option value="not-printed">Not Printed</option>
          </select>

          <Button
            onClick={handleScanQR}
            variant="outline"
            className="h-10"
          >
            <Camera className="mr-2 h-4 w-4" />
            Scan QR
          </Button>
        </div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
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
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                    Email
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                    Badge
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                    Prints
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nexus-border">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-nexus-text-secondary">
                      Loading data...
                    </td>
                  </tr>
                ) : preRegistrations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-nexus-text-secondary">
                      No records found.
                    </td>
                  </tr>
                ) : (
                  preRegistrations.map((record, index) => (
                    <motion.tr
                      key={record.preRegistrationId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-nexus-surface-hover"
                    >
                      <td className="px-6 py-4 text-sm font-medium text-nexus-text-primary">
                        {record.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-nexus-text-secondary">{record.companyName}</td>
                      <td className="px-6 py-4 text-sm text-nexus-text-secondary">{record.email}</td>
                      <td className="px-6 py-4 text-center">
                        {record.badgePrinted ? (
                          <span className="text-green-600" title="Printed">
                            ✅
                          </span>
                        ) : (
                          <span className="text-nexus-text-hint" title="Not Printed">
                            ❌
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-block rounded px-2 py-1 text-xs font-semibold ${getPrintCountBadgeColor(
                            record.printCount
                          )}`}
                        >
                          {record.printCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-nexus-text-secondary">
                        {getRelativeTime(record.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewDetail(record.preRegistrationId)}
                            className="rounded p-1 text-nexus-brand hover:bg-nexus-brand-light"
                            title="View Details"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handlePrintBadge(record.preRegistrationId)}
                            className="rounded p-1 text-purple-600 hover:bg-purple-50"
                            title="Print Badge"
                          >
                            <Printer className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleResendEmail(record.preRegistrationId)}
                            className="rounded p-1 text-green-600 hover:bg-green-50"
                            title="Resend Email"
                          >
                            <Mail className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleResendWhatsApp(record.preRegistrationId)}
                            className="rounded p-1 text-emerald-600 hover:bg-emerald-50"
                            title="Resend WhatsApp"
                          >
                            <MessageCircle className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleResendAll(record.preRegistrationId)}
                            className="rounded p-1 text-amber-600 hover:bg-amber-50"
                            title="Resend All"
                          >
                            <RefreshCw className="h-5 w-5" />
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
            <div className="flex items-center gap-2">
              <span className="text-sm text-nexus-text-secondary">Show</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="h-9 rounded-lg border border-nexus-border-strong px-3 text-sm"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-nexus-text-secondary">per page</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                variant="outline"
                className="h-9 px-3"
              >
                Previous
              </Button>
              <span className="text-sm font-medium text-nexus-text-label">
                Page {currentPage} of {totalPages}
              </span>
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
          </motion.div>
        </main>
      </div>

      {/* Detail Slide-Over */}
      <AnimatePresence>
        {selectedDetail && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDetail(null)}
              className="fixed inset-0 z-50 bg-black/50"
            />

            {/* Slide-Over Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto bg-nexus-surface shadow-2xl"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-nexus-border bg-nexus-surface px-6 py-4">
                <h2 className="text-xl font-semibold text-nexus-text-primary">Pre-Registration Details</h2>
                <button
                  onClick={() => setSelectedDetail(null)}
                  className="rounded-lg p-2 hover:bg-nexus-surface-muted"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6">
                <div className="mb-6 space-y-4">
                  <div>
                    <p className="text-xs font-medium uppercase text-nexus-text-muted">Category</p>
                    <p className="mt-1 font-semibold text-nexus-text-primary">
                      {selectedDetail.prefix} — {PREFIX_CONFIG[selectedDetail.prefix]?.name}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase text-nexus-text-muted">Name</p>
                    <p className="mt-1 font-semibold text-nexus-text-primary">{selectedDetail.name}</p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase text-nexus-text-muted">Email</p>
                    <p className="mt-1 text-nexus-text-primary">{selectedDetail.email}</p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase text-nexus-text-muted">Phone</p>
                    <p className="mt-1 text-nexus-text-primary">
                      {selectedDetail.phoneCountryCode} {selectedDetail.phone || selectedDetail.phoneNumber}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase text-nexus-text-muted">Designation</p>
                    <p className="mt-1 text-nexus-text-primary">{selectedDetail.designation}</p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase text-nexus-text-muted">Company</p>
                    <p className="mt-1 text-nexus-text-primary">{selectedDetail.companyName}</p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase text-nexus-text-muted">Location</p>
                    <p className="mt-1 text-nexus-text-primary">
                      {selectedDetail.city}, {selectedDetail.country}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase text-nexus-text-muted">Badge Status</p>
                    <p className="mt-1">
                      {selectedDetail.badgePrinted ? (
                        <span className="inline-flex items-center gap-2 rounded bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                          ✅ Printed ({selectedDetail.printCount}x)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 rounded bg-nexus-surface-muted px-3 py-1 text-sm font-semibold text-nexus-text-label">
                          ❌ Not Printed
                        </span>
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase text-nexus-text-muted">Registered</p>
                    <p className="mt-1 text-nexus-text-primary">
                      {new Date(selectedDetail.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <Button
                    onClick={() => handlePrintBadge(selectedDetail.preRegistrationId)}
                    className="h-12 w-full bg-purple-600 hover:bg-purple-700"
                  >
                    <Printer className="mr-2 h-5 w-5" />
                    Print Badge
                  </Button>

                  <Button
                    onClick={() => handleResendEmail(selectedDetail.preRegistrationId)}
                    variant="outline"
                    className="h-12 w-full"
                  >
                    <Mail className="mr-2 h-5 w-5" />
                    Resend Email
                  </Button>

                  <Button
                    onClick={() => handleResendWhatsApp(selectedDetail.preRegistrationId)}
                    variant="outline"
                    className="h-12 w-full"
                  >
                    <MessageCircle className="mr-2 h-5 w-5" />
                    Resend WhatsApp
                  </Button>

                  <Button
                    onClick={() => handleResendAll(selectedDetail.preRegistrationId)}
                    variant="outline"
                    className="h-12 w-full"
                  >
                    <RefreshCw className="mr-2 h-5 w-5" />
                    Resend All Notifications
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

