import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Mail, MessageCircle, RefreshCw, Calendar } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { TopNav } from "./dashboard/TopNav";
import { AdminSidebar } from "./dashboard/AdminSidebar";
import { NotificationService, NotificationLog } from "../api/services/notification.service";
import { toast } from "sonner";

const STATUS_CONFIG: Record<string, { color: string; icon: string; label: string; bgColor: string }> = {
  queued: { color: "#EAB308", icon: "🟡", label: "Queued", bgColor: "#FEF3C7" },
  sent: { color: "#22C55E", icon: "🟢", label: "Sent", bgColor: "#D1FAE5" },
  delivered: { color: "#3B82F6", icon: "🔵", label: "Delivered", bgColor: "#DBEAFE" },
  read: { color: "#14B8A6", icon: "🟢", label: "Read", bgColor: "#CCFBF1" },
  failed: { color: "#EF4444", icon: "🔴", label: "Failed", bgColor: "#FEE2E2" },
  bounced: { color: "#F97316", icon: "🟠", label: "Bounced", bgColor: "#FFEDD5" },
  not_sent: { color: "#6B7280", icon: "⚪", label: "Not Sent", bgColor: "#F3F4F6" },
};

export function AdminNotificationHistoryPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [channelFilter, setChannelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);
  const [currentPage, setCurrentPage] = useState(1);
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const itemsPerPage = 50;

  const [stats, setStats] = useState({
    total: 0,
    sent: 0,
    delivered: 0,
    failed: 0,
    bounced: 0,
  });

  useEffect(() => {
    loadNotifications();
  }, [channelFilter, statusFilter, fromDate, toDate, currentPage]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await NotificationService.getStats();
      setStats({
        total: response.total,
        sent: response.sent,
        delivered: response.delivered,
        failed: response.failed,
        bounced: response.bounced,
      });
    } catch {
      // stats remain at 0 if unavailable
    }
  };

  const loadNotifications = async () => {
    try {
      const response = await NotificationService.listLogs({
        channel: channelFilter !== "all" ? channelFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        from: fromDate,
        to: toDate,
        page: currentPage,
        limit: itemsPerPage,
      });
      setNotifications(response.logs ?? []);
      setTotalRecords(response.total ?? 0);
    } catch {
      toast.error("Failed to load notifications");
    }
  };

  const handleResend = async (registrationId: string, notificationId: string) => {
    setResendingId(notificationId);
    try {
      await NotificationService.resend(registrationId, ["email", "whatsapp"]);
      toast.success("Notification resent successfully");
      loadNotifications();
    } catch {
      toast.error("Failed to resend notification");
    } finally {
      setResendingId(null);
    }
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
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
        <h1 className="mb-6 text-3xl font-semibold text-nexus-text-primary">Notification History</h1>

        {/* KPI Cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm"
          >
            <p className="text-sm font-medium text-nexus-text-secondary">Total</p>
            <p className="mt-2 text-4xl font-bold text-nexus-text-primary">{stats.total}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm"
          >
            <p className="text-sm font-medium text-nexus-text-secondary">Sent</p>
            <p className="mt-2 text-4xl font-bold text-green-600">{stats.sent}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm"
          >
            <p className="text-sm font-medium text-nexus-text-secondary">Delivered</p>
            <p className="mt-2 text-4xl font-bold text-nexus-brand">{stats.delivered}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm"
          >
            <p className="text-sm font-medium text-nexus-text-secondary">Failed</p>
            <p className="mt-2 text-4xl font-bold text-red-600">{stats.failed}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm"
          >
            <p className="text-sm font-medium text-nexus-text-secondary">Bounced</p>
            <p className="mt-2 text-4xl font-bold text-amber-600">{stats.bounced}</p>
          </motion.div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <select
            value={channelFilter}
            onChange={(e) => {
              setChannelFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="h-10 rounded-lg border border-nexus-border-strong bg-nexus-surface px-4 text-sm shadow-sm"
          >
            <option value="all">All Channels</option>
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="h-10 rounded-lg border border-nexus-border-strong bg-nexus-surface px-4 text-sm shadow-sm"
          >
            <option value="all">All Status</option>
            <option value="queued">Queued</option>
            <option value="sent">Sent</option>
            <option value="delivered">Delivered</option>
            <option value="read">Read</option>
            <option value="failed">Failed</option>
            <option value="bounced">Bounced</option>
            <option value="not_sent">Not Sent</option>
          </select>

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
                    Attendee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                    Recipient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                    Channel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nexus-border">
                {notifications.map((notif, index) => {
                  const statusConfig = STATUS_CONFIG[notif.status];
                  const canResend = ["failed", "bounced", "not_sent"].includes(notif.status);

                  return (
                    <motion.tr
                      key={notif.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className={`hover:bg-nexus-surface-hover ${
                        ["failed", "bounced"].includes(notif.status) ? "bg-red-50/30" : ""
                      }`}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-nexus-text-primary">
                        {notif.attendeeName}
                        <span className="ml-2 text-xs text-nexus-text-muted">
                          ({notif.registrationType === "onsite" ? "Onsite" : "Pre-Reg"})
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-nexus-text-secondary">{notif.recipient}</td>
                      <td className="px-6 py-4 text-sm">
                        {notif.channel === "email" ? (
                          <span className="flex items-center gap-2" title="Email">
                            <Mail className="h-5 w-5 text-nexus-brand" />
                            <span className="text-nexus-text-secondary">Email</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-2" title="WhatsApp">
                            <MessageCircle className="h-5 w-5 text-green-600" />
                            <span className="text-nexus-text-secondary">WhatsApp</span>
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="group relative inline-block">
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                            style={{
                              color: statusConfig.color,
                              backgroundColor: statusConfig.bgColor,
                            }}
                          >
                            <span>{statusConfig.icon}</span>
                            <span>{statusConfig.label}</span>
                          </span>
                          {notif.errorMessage && (
                            <div className="invisible absolute left-0 top-full z-10 mt-2 w-64 rounded-lg bg-gray-900 p-3 text-xs text-white shadow-xl group-hover:visible">
                              <div className="font-semibold">Error Details:</div>
                              <div className="mt-1">{notif.errorMessage}</div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-nexus-text-secondary">
                        {notif.sentAt ? getRelativeTime(notif.sentAt) : "-"}
                      </td>
                      <td className="px-6 py-4">
                        {canResend && (
                          <button
                            onClick={() => handleResend(notif.registrationId, notif.id)}
                            disabled={resendingId === notif.id}
                            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                              resendingId === notif.id
                                ? "border-nexus-border-strong bg-nexus-surface-muted text-nexus-text-hint"
                                : "border-red-300 bg-nexus-surface text-red-600 hover:bg-red-50"
                            }`}
                            title="Resend notification"
                          >
                            <RefreshCw
                              className={`h-4 w-4 ${resendingId === notif.id ? "animate-spin" : ""}`}
                            />
                            <span>{resendingId === notif.id ? "Sending..." : "Resend"}</span>
                          </button>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-nexus-border px-6 py-4">
            <div className="text-sm text-nexus-text-secondary">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, totalRecords)} of {totalRecords} notifications
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
    </div>
  );
}
