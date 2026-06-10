import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Camera, Eye, Printer, Mail, MessageCircle, X, CheckCircle, Users, QrCode } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { PreRegistrationService } from "../api/services/preRegistration.service";
import { AuthService, UserProfile } from "../api/services/auth.service";
import { NotificationService } from "../api/services/notification.service";
import { TopNav } from "./dashboard/TopNav";
import { CrewSidebar } from "./dashboard/CrewSidebar";
import { toast } from "sonner";

interface PreRegistration {
  preRegistrationId: string;
  name: string;
  email: string;
  phoneNumber: string;
  companyName: string;
  designation: string;
  prefix: string;
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

const CREW_TYPE_TO_PREFIX: Record<string, string> = {
  visitors: "VS",
  vips: "VI",
  foreign_delegates: "FDL",
  exhibitors: "EH",
  organisers: "OR",
  speakers: "SPK",
  delegates: "DL",
  sponsors: "SPR",
  master: "VS",
};

export function CrewPreRegListPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [currentPrefix, setCurrentPrefix] = useState("VS");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [preRegistrations, setPreRegistrations] = useState<PreRegistration[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedDetail, setSelectedDetail] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [crewLabel, setCrewLabel] = useState("Crew");

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadPreRegistrations();
    }
  }, [user, currentPrefix, searchQuery, statusFilter, currentPage, itemsPerPage]);

  const fetchUser = async () => {
    try {
      const profile = await AuthService.getMe();
      setUser(profile);
      setCurrentPrefix(CREW_TYPE_TO_PREFIX[profile.crewType || profile.accountType] || "VS");
      if (profile.fullName) setCrewLabel(profile.fullName);
    } catch (error) {
      toast.error("Failed to load user profile");
    }
  };

  const loadPreRegistrations = async () => {
    setIsLoading(true);
    try {
      const response = await PreRegistrationService.list({
        page: currentPage,
        limit: itemsPerPage,
        prefix: currentPrefix,
        search: searchQuery,
        printed: statusFilter === "all" ? undefined : statusFilter === "printed"
      });

      setPreRegistrations(response.data || []);
      setTotalRecords(response.total || 0);
    } catch (error) {
      console.error("Failed to load pre-registrations:", error);
      toast.error("Failed to load pre-registrations");
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetail = async (id: string) => {
    try {
      const detail = await PreRegistrationService.getById(id);
      setSelectedDetail(detail);
    } catch (error) {
      toast.error("Failed to load attendee details");
    }
  };

  const handlePrintBadge = (id: string) => {
    navigate(`/badge?id=${id}`);
  };

  const handleResendEmail = async (id: string) => {
    try {
      await NotificationService.sendBadgeEmail(id);
      toast.success("Email sent successfully");
    } catch (error) {
      toast.error("Failed to send email");
    }
  };

  const handleResendWhatsApp = async (id: string) => {
    try {
      await NotificationService.sendBadgeWhatsapp(id);
      toast.success("WhatsApp message sent");
    } catch (error) {
      toast.error("Failed to send WhatsApp");
    }
  };

  const handleScanQR = () => {
    navigate('/crew/pre-reg-scan'); // Redirect to dedicated scan page
  };

  const totalPages = Math.ceil(totalRecords / itemsPerPage);
  const prefixConfig = PREFIX_CONFIG[currentPrefix] || PREFIX_CONFIG["VS"];
  const crewColor = prefixConfig.color;
  const isMasterCrew = user?.crewType === 'master' || user?.accountType === 'admin' || user?.accountType === 'super_admin';

  return (
    <div className="min-h-screen w-full bg-nexus-page-bg pt-16">
      <TopNav role="crew" crewLabel={crewLabel} crewColor={crewColor} />
      <CrewSidebar collapsed={collapsed} onToggle={setCollapsed} crewColor={crewColor} />

      <div className={`transition-all duration-300 ${collapsed ? "lg:pl-20" : "lg:pl-60"}`}>
      <main className="mx-auto max-w-7xl px-4 pt-24 pb-12 sm:px-6">
        <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-nexus-text-primary">
              Expected Attendees
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {isMasterCrew && (
              <select
                value={currentPrefix}
                onChange={(e) => {
                  setCurrentPrefix(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-12 rounded-2xl border border-nexus-border-strong bg-white px-6 text-xs font-black uppercase tracking-widest shadow-sm focus:ring-2 focus:ring-nexus-brand/20 transition-all"
              >
                {Object.entries(PREFIX_CONFIG).map(([prefix, config]) => (
                  <option key={prefix} value={prefix}>
                    {prefix} — {config.name}
                  </option>
                ))}
              </select>
            )}
            <Button
              onClick={handleScanQR}
              className="h-12 bg-nexus-brand px-6 text-sm font-black uppercase tracking-widest text-white shadow-lg hover:bg-nexus-brand-hover"
            >
              <Camera className="mr-3 h-5 w-5" />
              Scan Pre-Reg
            </Button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="mb-10 grid gap-6 sm:grid-cols-3">
          <div className="rounded-[2rem] bg-white p-8 shadow-sm border border-nexus-border flex flex-col justify-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-nexus-text-hint">Total Expected</p>
            <p className="text-4xl font-black text-nexus-text-primary mt-1">{totalRecords}</p>
          </div>
          {/* Note: Backend doesn't return aggregated print stats in list, so we could just show total for now or calculate from page results (inaccurate) */}
          <div className="rounded-[2rem] bg-white p-8 shadow-sm border border-nexus-border flex flex-col justify-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-nexus-text-hint">Active Prefix</p>
            <p className="text-4xl font-black text-nexus-brand mt-1">{currentPrefix}</p>
          </div>
          <div className="rounded-[2rem] bg-white p-8 shadow-sm border border-nexus-border flex flex-col justify-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-nexus-text-hint">Current View</p>
            <p className="text-4xl font-black text-nexus-text-secondary mt-1">{statusFilter.toUpperCase()}</p>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-nexus-text-hint" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email or ID..."
              className="h-14 rounded-[1.25rem] border-nexus-border-strong bg-white pl-14 font-bold shadow-sm focus:ring-4 focus:ring-nexus-brand/5"
            />
          </div>

          <div className="flex gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-14 rounded-[1.25rem] border border-nexus-border-strong bg-white px-6 text-xs font-black uppercase tracking-widest shadow-sm"
            >
              <option value="all">Filter: All Status</option>
              <option value="printed">Status: Printed Only</option>
              <option value="not-printed">Status: Pending Print</option>
            </select>

            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="h-14 rounded-[1.25rem] border border-nexus-border-strong bg-white px-6 text-xs font-black uppercase tracking-widest shadow-sm"
            >
              <option value={10}>Show 10</option>
              <option value={20}>Show 20</option>
              <option value={50}>Show 50</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-white border border-nexus-border shadow-xl">
          {isLoading ? (
            <div className="flex h-96 items-center justify-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-nexus-brand border-t-transparent" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-nexus-page-bg/30 text-left border-b border-nexus-border">
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-nexus-text-hint">Attendee Identity</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-nexus-text-hint">Company / Organization</th>
                    <th className="px-8 py-5 text-center text-[10px] font-black uppercase tracking-widest text-nexus-text-hint">Badge</th>
                    <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-widest text-nexus-text-hint">Management</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-nexus-page-bg">
                  {preRegistrations.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-32 text-center">
                        <Users className="mx-auto h-12 w-12 text-nexus-text-hint/30 mb-4" />
                        <p className="text-sm font-black uppercase tracking-widest text-nexus-text-hint">No attendees found matching criteria</p>
                      </td>
                    </tr>
                  ) : (
                    preRegistrations.map((record) => (
                      <tr key={record.preRegistrationId} className="hover:bg-nexus-page-bg/10 transition-colors">
                        <td className="px-8 py-6">
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-nexus-text-primary uppercase tracking-tight">{record.name}</span>
                            <span className="text-[10px] font-bold text-nexus-text-hint mt-1">{record.email}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-nexus-text-primary">{record.companyName}</span>
                            <span className="text-[10px] font-bold text-nexus-text-hint mt-1">{record.designation}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-center">
                          {record.badgePrinted ? (
                            <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-green-50 text-green-600 shadow-inner">
                              <CheckCircle className="h-4 w-4" />
                            </div>
                          ) : (
                            <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-nexus-page-bg text-nexus-text-hint">
                              <X className="h-4 w-4" />
                            </div>
                          )}
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleViewDetail(record.preRegistrationId)}
                              className="group p-3 rounded-2xl bg-nexus-page-bg/50 text-nexus-text-hint hover:text-nexus-brand hover:bg-white hover:shadow-lg transition-all"
                              title="View Details"
                            >
                              <Eye className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handlePrintBadge(record.preRegistrationId)}
                              className="group p-3 rounded-2xl bg-nexus-page-bg/50 text-nexus-text-hint hover:text-purple-600 hover:bg-white hover:shadow-lg transition-all"
                              title="Print Badge"
                            >
                              <Printer className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleResendEmail(record.preRegistrationId)}
                              className="group p-3 rounded-2xl bg-nexus-page-bg/50 text-nexus-text-hint hover:text-blue-600 hover:bg-white hover:shadow-lg transition-all"
                              title="Resend Email"
                            >
                              <Mail className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleResendWhatsApp(record.preRegistrationId)}
                              className="group p-3 rounded-2xl bg-nexus-page-bg/50 text-nexus-text-hint hover:text-green-600 hover:bg-white hover:shadow-lg transition-all"
                              title="Resend WhatsApp"
                            >
                              <MessageCircle className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Table Footer / Pagination */}
          <div className="bg-nexus-page-bg/30 px-8 py-6 flex items-center justify-between border-t border-nexus-border">
            <span className="text-[10px] font-black uppercase tracking-widest text-nexus-text-hint">
              Total Records: {totalRecords}
            </span>
            <div className="flex items-center gap-4">
              <Button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1 || isLoading}
                variant="outline"
                className="h-10 rounded-xl px-4 text-xs font-black uppercase border-nexus-border-strong disabled:opacity-30"
              >
                Prev
              </Button>
              <span className="text-xs font-black text-nexus-text-primary tracking-widest">
                {currentPage} / {totalPages || 1}
              </span>
              <Button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || isLoading}
                variant="outline"
                className="h-10 rounded-xl px-4 text-xs font-black uppercase border-nexus-border-strong disabled:opacity-30"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Detail Slide-Over */}
      <AnimatePresence>
        {selectedDetail && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDetail(null)}
              className="fixed inset-0 z-[60] bg-[#0F172A]/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 40, stiffness: 400 }}
              className="fixed right-0 top-0 z-[70] h-full w-full max-w-md bg-white shadow-2xl flex flex-col"
            >
              <div className="px-8 py-10 border-b border-nexus-page-bg">
                <div className="flex items-center justify-between mb-8">
                  <span className="rounded-xl px-3 py-1 bg-nexus-brand text-white font-black text-[10px] uppercase tracking-widest">{selectedDetail.prefix} Attendee</span>
                  <button
                    onClick={() => setSelectedDetail(null)}
                    className="rounded-full bg-nexus-page-bg p-2 text-nexus-text-hint hover:text-nexus-text-primary transition-all"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                <h2 className="text-3xl font-black text-nexus-text-primary tracking-tight uppercase">{selectedDetail.name}</h2>
                <p className="text-sm font-bold text-nexus-text-hint mt-2">{selectedDetail.designation || 'Special Guest'} at {selectedDetail.companyName || 'Organization'}</p>
              </div>

              <div className="flex-1 overflow-y-auto px-8 py-10 space-y-8">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-nexus-text-hint">Email Identity</p>
                    <p className="mt-1.5 text-sm font-bold text-nexus-text-primary break-all">{selectedDetail.email || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-nexus-text-hint">Phone Contact</p>
                    <p className="mt-1.5 text-sm font-black text-nexus-text-primary">{selectedDetail.phoneCountryCode} {selectedDetail.phoneNumber}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-nexus-text-hint">Location</p>
                    <p className="mt-1.5 text-sm font-bold text-nexus-text-primary uppercase">{selectedDetail.city}, {selectedDetail.country}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-nexus-text-hint">Badge Prints</p>
                    <p className="mt-1.5 text-sm font-black text-nexus-brand">{selectedDetail.printCount} Records</p>
                  </div>
                </div>

                <div className="rounded-3xl bg-nexus-page-bg/50 p-6 border border-nexus-border">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
                      <QrCode className="h-5 w-5 text-nexus-brand" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-nexus-text-hint">System Verification QR</p>
                  </div>
                  {selectedDetail.qrCodeUrl ? (
                    <img src={selectedDetail.qrCodeUrl} alt="QR Code" className="w-[180px] h-[180px] mx-auto rounded-2xl bg-white p-2 shadow-inner" />
                  ) : (
                    <div className="aspect-square w-[180px] mx-auto flex items-center justify-center bg-white rounded-2xl dashed-border border-2 border-nexus-border opacity-30">
                      <X className="h-8 w-8" />
                    </div>
                  )}
                </div>
              </div>

              <div className="px-8 py-10 bg-nexus-page-bg/30 border-t border-nexus-border space-y-3">
                <Button
                  onClick={() => handlePrintBadge(selectedDetail.preRegistrationId)}
                  className="h-16 w-full bg-nexus-brand text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-nexus-brand/20 hover:bg-nexus-brand-hover"
                >
                  <Printer className="mr-3 h-5 w-5" />
                  Print Badge Now
                </Button>
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleResendEmail(selectedDetail.preRegistrationId)}
                    variant="outline"
                    className="h-14 flex-1 rounded-2xl border-nexus-border-strong font-black text-[10px] uppercase tracking-widest"
                  >
                    Email QR
                  </Button>
                  <Button
                    onClick={() => handleResendWhatsApp(selectedDetail.preRegistrationId)}
                    variant="outline"
                    className="h-14 flex-1 rounded-2xl border-nexus-border-strong font-black text-[10px] uppercase tracking-widest"
                  >
                    WhatsApp QR
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}