import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Save, Search, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { TopNav } from "./dashboard/TopNav";
import { AdminSidebar } from "./dashboard/AdminSidebar";
import { SettingsService, EventData } from "../api/services/settings.service";
import { SearchService, SearchResult } from "../api/services/search.service";
import { SecurityService } from "../api/services/security.service";
import { toast } from "sonner";

const TABS = [
  { id: "event", label: "Event", icon: "🎯" },
  { id: "search", label: "Search", icon: "🔍" },
  { id: "security", label: "Security", icon: "🔒" },
  { id: "system", label: "System", icon: "⚙️" },
];

export function AdminSettingsPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState("event");
  const [loading, setLoading] = useState(false);

  // Event tab state
  const [eventData, setEventData] = useState<EventData>({
    id: "",
    eventName: "",
    startDate: "",
    endDate: "",
    status: "active",
  });

  // Search tab state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState("all");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  // Security tab state
  const [securityStats, setSecurityStats] = useState({
    requests_24h: 0,
    blocked_ips: 0,
    failed_policy_attempts: 0
  });
  const [recentEvents, setRecentEvents] = useState<any[]>([]);

  useEffect(() => {
    if (activeTab === "event") {
      loadEventData();
    } else if (activeTab === "security") {
      loadSecurityAudit();
    }
  }, [activeTab]);

  const loadEventData = async () => {
    setLoading(true);
    try {
      const response = await SettingsService.getEvents();
      if (response.success && response.events.length > 0) {
        setEventData(response.events[0]); // Load the first event
      }
    } catch (error) {
      console.error("Failed to load event data:", error);
      toast.error("Failed to load event data");
    } finally {
      setLoading(false);
    }
  };

  const saveEventData = async () => {
    if (!eventData.id) return;
    setLoading(true);
    try {
      const response = await SettingsService.updateEvent(eventData.id, eventData);
      if (response.success) {
        toast.success("Event details saved successfully!");
      }
    } catch (error) {
      console.error("Failed to save event data:", error);
      toast.error("Failed to save event data");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (searchQuery.length < 2) return;

    try {
      const response = await SearchService.globalSearch({
        query: searchQuery,
        type: searchType === 'all' ? undefined : searchType
      });
      if (response.success) {
        setSearchResults(response.data);
      }
    } catch (error) {
      console.error("Global search failed:", error);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchType]);

  const loadSecurityAudit = async () => {
    try {
      const response = await SecurityService.getSummary();
      if (response.success) {
        setSecurityStats(response.data.stats);
        setRecentEvents(response.data.recent_events);
      }
    } catch (error) {
      console.error("Failed to load security audit:", error);
      toast.error("Failed to load security audit");
    }
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case "registration":
        return "🟢";
      case "pre_registration":
        return "🔵";
      case "crew":
        return "🟣";
      case "admin":
        return "🟠";
      default:
        return "⚪";
    }
  };

  const getSourceColor = (type: string) => {
    switch (type) {
      case "registration":
        return "border-green-500";
      case "pre_registration":
        return "border-blue-500";
      case "crew":
        return "border-purple-500";
      case "admin":
        return "border-orange-500";
      default:
        return "border-gray-500";
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
        <h1 className="mb-6 text-3xl font-semibold text-nexus-text-primary">Settings</h1>

        {/* Tab Navigation */}
        <div className="mb-6 flex gap-2 overflow-x-auto border-b border-nexus-border">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${activeTab === tab.id
                  ? "border-blue-600 text-nexus-brand"
                  : "border-transparent text-nexus-text-secondary hover:text-nexus-text-primary"
                }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {/* Event Details Tab */}
          {activeTab === "event" && (
            <motion.div
              key="event"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm"
            >
              <h2 className="mb-6 text-xl font-semibold text-nexus-text-primary">Event Details</h2>

              {loading ? (
                <div className="py-12 text-center text-nexus-text-secondary">Loading...</div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-nexus-text-label">
                      Event Name
                    </label>
                    <Input
                      type="text"
                      value={eventData.eventName}
                      onChange={(e) =>
                        setEventData((prev) => ({ ...prev, eventName: e.target.value }))
                      }
                      className="h-12"
                      placeholder="Event Name"
                    />
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-nexus-text-label">
                        Start Date
                      </label>
                      <Input
                        type="date"
                        value={eventData.startDate}
                        onChange={(e) =>
                          setEventData((prev) => ({ ...prev, startDate: e.target.value }))
                        }
                        className="h-12"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-nexus-text-label">
                        End Date
                      </label>
                      <Input
                        type="date"
                        value={eventData.endDate}
                        onChange={(e) =>
                          setEventData((prev) => ({ ...prev, endDate: e.target.value }))
                        }
                        className="h-12"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-nexus-text-label">Status</label>
                    <select
                      value={eventData.status}
                      onChange={(e) =>
                        setEventData((prev) => ({
                          ...prev,
                          status: e.target.value as "active" | "archived",
                        }))
                      }
                      className="h-12 w-full rounded-lg border border-nexus-border-strong px-3 text-sm"
                    >
                      <option value="active">🟢 Active</option>
                      <option value="archived">📦 Archived</option>
                    </select>
                  </div>

                  <Button
                    onClick={saveEventData}
                    className="h-12 w-full bg-nexus-brand hover:bg-nexus-brand-hover"
                  >
                    <Save className="mr-2 h-5 w-5" />
                    Save Changes
                  </Button>
                </div>
              )}
            </motion.div>
          )}

          {/* Global Search Tab */}
          {activeTab === "search" && (
            <motion.div
              key="search"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm"
            >
              <h2 className="mb-6 text-xl font-semibold text-nexus-text-primary">Global Search</h2>

              <div className="mb-6 flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-nexus-text-hint" />
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search across all records..."
                    className="h-12 pl-10"
                  />
                </div>
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value)}
                  className="h-12 rounded-lg border border-nexus-border-strong bg-nexus-surface px-4 text-sm"
                >
                  <option value="all">All Types</option>
                  <option value="registration">Registration</option>
                  <option value="pre_registration">Pre-Registration</option>
                  <option value="crew">Crew</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="space-y-3">
                {searchResults.map((result) => (
                  <div
                    key={`${result.source}-${result.id}`}
                    className={`flex items-center justify-between rounded-lg border-l-4 bg-nexus-surface-hover p-4 ${getSourceColor(
                      result.source
                    )}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getSourceIcon(result.source)}</span>
                      <div>
                        <p className="font-medium text-nexus-text-primary">{result.name}</p>
                        <p className="text-sm text-nexus-text-secondary">{result.email || result.username}</p>
                      </div>
                      {result.prefix && (
                        <span className="rounded bg-nexus-brand px-2 py-1 font-mono text-xs font-semibold text-white">
                          {result.prefix}
                        </span>
                      )}
                      {result.crew_type && (
                        <span className="rounded bg-purple-600 px-2 py-1 text-xs font-semibold text-white">
                          {result.crew_type}
                        </span>
                      )}
                    </div>
                    <span className="rounded bg-gray-200 px-3 py-1 text-xs font-medium text-nexus-text-label">
                      {result.source.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>

              {searchQuery.length > 0 && searchQuery.length < 2 && (
                <p className="text-center text-sm text-nexus-text-muted">
                  Type at least 2 characters to search
                </p>
              )}

              {searchQuery.length >= 2 && searchResults.length === 0 && (
                <p className="text-center text-sm text-nexus-text-muted">No results found</p>
              )}
            </motion.div>
          )}

          {/* Security Audit Tab */}
          {activeTab === "security" && (
            <motion.div
              key="security"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm"
            >
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-nexus-text-primary">Security Overview</h2>
                <Button onClick={loadSecurityAudit} variant="outline" className="h-10">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>

              <div className="mb-6 grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-nexus-brand-light p-4">
                  <p className="text-xs font-medium text-blue-700 uppercase">Requests (24h)</p>
                  <p className="text-2xl font-bold">{securityStats.requests_24h}</p>
                </div>
                <div className="rounded-lg bg-red-50 p-4">
                  <p className="text-xs font-medium text-red-700 uppercase">Blocked IPs</p>
                  <p className="text-2xl font-bold text-red-700">{securityStats.blocked_ips}</p>
                </div>
                <div className="rounded-lg bg-amber-50 p-4">
                  <p className="text-xs font-medium text-amber-700 uppercase">Policy Violations</p>
                  <p className="text-2xl font-bold text-amber-700">{securityStats.failed_policy_attempts}</p>
                </div>
              </div>

              <h3 className="mb-3 text-lg font-semibold">Recent Events</h3>
              <div className="space-y-2">
                {recentEvents.map((event, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b py-2 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{event.action}</p>
                      <p className="text-xs text-nexus-text-secondary">{event.performed_at} • IP: {event.ip_address}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${event.action.includes('failed') || event.action.includes('error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>
                      {event.action}
                    </span>
                  </div>
                ))}
                {recentEvents.length === 0 && (
                  <p className="text-center text-sm py-4 text-nexus-text-muted">No recent events</p>
                )}
              </div>
            </motion.div>
          )}

          {/* System Info Tab */}
          {activeTab === "system" && (
            <motion.div
              key="system"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm"
            >
              <h2 className="mb-6 text-xl font-semibold text-nexus-text-primary">System Information</h2>

              <div className="space-y-4">
                <div className="flex justify-between border-b border-nexus-border pb-3">
                  <span className="font-medium text-nexus-text-secondary">App Version</span>
                  <span className="font-semibold text-nexus-text-primary">1.0.0</span>
                </div>
                <div className="flex justify-between border-b border-nexus-border pb-3">
                  <span className="font-medium text-nexus-text-secondary">Environment</span>
                  <span className="rounded bg-green-100 px-2 py-1 text-sm font-semibold text-green-700">
                    Production
                  </span>
                </div>
                <div className="flex justify-between border-b border-nexus-border pb-3">
                  <span className="font-medium text-nexus-text-secondary">Database</span>
                  <span className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-sm font-semibold text-nexus-text-primary">Connected</span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-nexus-text-secondary">API Status</span>
                  <span className="font-mono text-sm text-green-600 font-bold">
                    ONLINE
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
