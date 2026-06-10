import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Copy,
  Check,
  CheckCircle2,
  Power,
  AlertCircle
} from "lucide-react";
import { TopNav } from "./dashboard/TopNav";
import { AdminSidebar } from "./dashboard/AdminSidebar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { PasswordStrengthMeter } from "./PasswordStrengthMeter";
import { TOTPInput } from "./TOTPInput";
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";
// @ts-ignore
import QRCode from "qrcode";
import { generateSecret, keyuri } from "../utils/totp";
import { toast } from "sonner";
import { UserService, CrewMember } from "../api/services/user.service";

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

type CrewType = "master" | "visitors" | "vips" | "foreign_delegates" | "exhibitors" | "organisers" | "speakers" | "delegates" | "sponsors";
type Step = 1 | 2 | 3;

interface CrewTypeInfo {
  key: CrewType | "all";
  label: string;
  code: string;
  color: string;
  count: number;
}

const crewTypes: CrewTypeInfo[] = [
  { key: "master", label: "Master", code: "MASTER", color: "#1E40AF", count: 0 },
  { key: "visitors", label: "Visitors", code: "VS", color: "#3B82F6", count: 0 },
  { key: "vips", label: "VIPs", code: "VI", color: "#8B5CF6", count: 0 },
  { key: "foreign_delegates", label: "Foreign Delegates", code: "FDL", color: "#EC4899", count: 0 },
  { key: "exhibitors", label: "Exhibitors", code: "EH", color: "#F59E0B", count: 0 },
  { key: "organisers", label: "Organisers", code: "OR", color: "#10B981", count: 0 },
  { key: "speakers", label: "Speakers", code: "SPK", color: "#EF4444", count: 0 },
  { key: "delegates", label: "Delegates", code: "DL", color: "#06B6D4", count: 0 },
  { key: "sponsors", label: "Sponsors", code: "SPR", color: "#F97316", count: 0 },
];

export function ManageCrewPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<CrewType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage] = useState(20);
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<CrewMember[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [crewCounts, setCrewCounts] = useState<Record<string, number>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [editingMember, setEditingMember] = useState<CrewMember | null>(null);
  const [deactivatingMember, setDeactivatingMember] = useState<CrewMember | null>(null);
  const [removingIds, setRemovingIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  // Add Crew Form State
  const [formData, setFormData] = useState({
    name: "",
    crewType: "visitors" as CrewType,
    email: "",
    phoneCountryCode: "+91",
    phoneNumber: "",
    aadharNumber: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [aadharTouched, setAadharTouched] = useState(false);
  const [totpSecret, setTotpSecret] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [secretRevealed, setSecretRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Form State
  const [editField, setEditField] = useState("");
  const [editValue, setEditValue] = useState("");
  const [editTotpCode, setEditTotpCode] = useState("");

  // Deactivate Form State
  const [deactivateReason, setDeactivateReason] = useState("");
  const [deactivateTotpCode, setDeactivateTotpCode] = useState("");

  // Remove Form State
  const [removeTotpCode, setRemoveTotpCode] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch crew data on mount or filter change
  useEffect(() => {
    fetchCrewData();
  }, [activeTab, statusFilter, debouncedSearch, currentPage]);

  const fetchCrewData = async () => {
    setLoading(true);
    try {
      const response = await UserService.getCrew({
        page: currentPage,
        limit: perPage,
        search: debouncedSearch,
        status: statusFilter === "all" ? undefined : statusFilter,
        crewType: activeTab === "all" ? undefined : activeTab,
      });

      if (response.success) {
        setCrewMembers(response.data);
        setFilteredMembers(response.data);

        // Update counts
        const counts: Record<string, number> = {};
        crewTypes.forEach((type) => {
          if (type.key !== "all") {
            counts[type.key] = response.data.filter(m => m.crewType === type.key).length;
          }
        });
        setCrewCounts(counts);
      }
    } catch (error) {
      console.error("Failed to fetch crew data:", error);
      toast.error("Failed to load crew members");
    } finally {
      setLoading(false);
    }
  };

  // Render crew count chart
  useEffect(() => {
    if (!chartRef.current || Object.keys(crewCounts).length === 0) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    const data = crewTypes
      .filter((t) => t.key !== "all")
      .map((t) => ({
        label: t.code,
        count: crewCounts[t.key] || 0,
        color: t.color,
      }))
      .sort((a, b) => b.count - a.count);

    chartInstanceRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: data.map((d) => d.label),
        datasets: [
          {
            label: "Crew Members",
            data: data.map((d) => d.count),
            backgroundColor: data.map((d) => d.color),
            borderRadius: 6,
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
              label: (context) => `${context.parsed.x} members`,
            },
          },
        },
        scales: {
          x: { beginAtZero: true, grid: { color: "#E5E7EB" } },
          y: { grid: { display: false } },
        },
      },
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [crewCounts]);

  const validatePassword = (password: string) => {
    if (password.length < 12) return false;
    if ((password.match(/[A-Z]/g) || []).length < 2) return false;
    if ((password.match(/[0-9]/g) || []).length < 2) return false;
    if ((password.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g) || []).length < 2) return false;
    return true;
  };

  const isStep1Valid = () => {
    return (
      formData.name.length > 0 &&
      formData.name.length <= 32 &&
      /^[A-Z]/.test(formData.name) &&
      (!formData.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) &&
      formData.phoneNumber.length === 10 &&
      /^\d{10}$/.test(formData.phoneNumber) &&
      formData.aadharNumber.length === 12 &&
      /^\d{12}$/.test(formData.aadharNumber) &&
      validatePassword(formData.password) &&
      formData.password === formData.confirmPassword
    );
  };

  const generateQRCode = async () => {
    const secret = generateSecret();
    setTotpSecret(secret);

    const otpauthUrl = keyuri(formData.email, "NEXUS", secret);
    const qrUrl = await QRCode.toDataURL(otpauthUrl);
    setQrCodeUrl(qrUrl);
  };

  const handleStep1Next = async () => {
    if (!isStep1Valid()) return;
    await generateQRCode();
    setCurrentStep(2);
  };

  const handleStep2Next = () => {
    setCurrentStep(3);
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(totpSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFinishAddCrew = async () => {
    if (totpCode.length !== 6) return;

    setIsSubmitting(true);
    try {
      const { confirmPassword, ...crewFormData } = formData;
      const response = await UserService.addCrew({
        ...crewFormData,
        totpSecret,
        totpCode,
      });

      if (response.success) {
        toast.success("Crew member created successfully!");
        setShowAddModal(false);
        resetAddModal();
        fetchCrewData();
      } else {
        toast.error("Failed to create crew member");
      }
    } catch (error) {
      console.error("Add crew error:", error);
      toast.error(error instanceof Error ? error.message : "An error occurred during crew creation");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAddModal = () => {
    setCurrentStep(1);
    setFormData({
      name: "",
      crewType: "visitors",
      email: "",
      phoneCountryCode: "+91",
      phoneNumber: "",
      aadharNumber: "",
      password: "",
      confirmPassword: "",
    });
    setPhoneTouched(false);
    setAadharTouched(false);
    setTotpSecret("");
    setQrCodeUrl("");
    setTotpCode("");
    setIsSubmitting(false);
  };

  const handleEdit = (member: CrewMember) => {
    setEditingMember(member);
    setEditField("");
    setEditValue("");
    setEditTotpCode("");
    setShowEditModal(true);
  };

  const handleConfirmEdit = async () => {
    if (!editingMember || !editField || !editValue || editTotpCode.length !== 6) return;

    setIsSubmitting(true);
    try {
      const response = await UserService.updateCrew(editingMember.id, {
        fieldName: editField,
        newValue: editValue,
        totpCode: editTotpCode,
      });

      if (response.success) {
        toast.success("Crew member updated successfully!");
        setShowEditModal(false);
        fetchCrewData();
      } else {
        toast.error("Failed to update crew member");
      }
    } catch (error) {
      console.error("Edit crew error:", error);
      toast.error(error instanceof Error ? error.message : "An error occurred during update");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = (member: CrewMember) => {
    setDeactivatingMember(member);
    setDeactivateReason("");
    setDeactivateTotpCode("");
    setShowDeactivateModal(true);
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivatingMember || deactivateTotpCode.length !== 6) return;

    setIsSubmitting(true);
    try {
      const response = await UserService.updateUserStatus(deactivatingMember.id, {
        status: deactivatingMember.status === "active" ? "inactive" : "active",
        reason: deactivateReason,
        totpCode: deactivateTotpCode,
      });

      if (response.success) {
        toast.success(
          `Crew member ${deactivatingMember.status === "active" ? "deactivated" : "activated"} successfully!`
        );
        setShowDeactivateModal(false);
        fetchCrewData();
      } else {
        toast.error("Failed to update status");
      }
    } catch (error) {
      console.error("Status update error:", error);
      toast.error(error instanceof Error ? error.message : "An error occurred during status update");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = (ids: string[]) => {
    setRemovingIds(ids);
    setRemoveTotpCode("");
    setShowRemoveModal(true);
  };

  const handleConfirmRemove = async () => {
    if (removeTotpCode.length !== 6) return;

    setIsSubmitting(true);
    try {
      const response = await UserService.deleteCrew(removingIds, removeTotpCode);

      if (response.success) {
        toast.success(`${response.removed} crew member(s) removed successfully!`);
        setShowRemoveModal(false);
        setSelectedIds([]);
        fetchCrewData();
      } else {
        toast.error("Failed to remove crew member(s)");
      }
    } catch (error) {
      console.error("Remove crew error:", error);
      toast.error(error instanceof Error ? error.message : "An error occurred during removal");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectAll = () => {
    const visibleIds = filteredMembers.map((m) => m.id);
    if (selectedIds.length === visibleIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(visibleIds);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(dateString));
  };

  const getCrewTypeColor = (type: string) => {
    return crewTypes.find((t) => t.key === type)?.color || "#6B7280";
  };

  const getCrewTypeCode = (type: string) => {
    return crewTypes.find((t) => t.key === type)?.code || type.toUpperCase();
  };

  const getMaskedSecret = () => {
    if (!totpSecret) return "";
    return `${totpSecret.slice(0, 4)}${"•".repeat(totpSecret.length - 8)}${totpSecret.slice(-4)}`;
  };

  const maxCount = Math.max(...Object.values(crewCounts), 1);

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
              <h1 className="text-3xl font-semibold text-nexus-text-primary">Manage Crew</h1>
              <p className="mt-1 text-base text-nexus-text-secondary">
                Add, edit, and manage crew accounts across all types
              </p>
            </div>

            {/* Crew Count Stat Cards */}
            <div className="mb-6 overflow-x-auto">
              <div className="flex gap-4 pb-2">
                {crewTypes
                  .filter((t) => t.key !== "all")
                  .map((type, index) => {
                    const count = crewCounts[type.key] || 0;
                    const percentage = (count / maxCount) * 100;

                    return (
                      <motion.div
                        key={type.key}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: index * 0.05 }}
                        className="min-w-[120px] flex-shrink-0 rounded-xl border border-nexus-border bg-nexus-surface p-4 shadow-sm"
                      >
                        <p className="text-xs font-medium text-nexus-text-secondary">{type.code}</p>
                        <p className="mt-1 text-2xl font-bold text-nexus-text-primary">{count}</p>
                        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-gray-200">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: type.color,
                            }}
                          />
                        </div>
                      </motion.div>
                    );
                  })}
              </div>
            </div>

            {/* Tab Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-6 overflow-x-auto"
            >
              <div className="flex gap-6 border-b border-nexus-border">
                <button
                  onClick={() => setActiveTab("all")}
                  className={`pb-3 text-sm font-medium transition-colors ${activeTab === "all"
                    ? "border-b-2 border-b-nexus-brand text-nexus-brand"
                    : "text-nexus-text-secondary hover:text-nexus-text-primary"
                    }`}
                >
                  All
                </button>
                {crewTypes
                  .filter((t) => t.key !== "all")
                  .map((type) => (
                    <button
                      key={type.key}
                      onClick={() => setActiveTab(type.key)}
                      className={`pb-3 text-sm font-medium transition-colors ${activeTab === type.key
                        ? "border-b-2 border-b-nexus-brand text-nexus-brand"
                        : "text-nexus-text-secondary hover:text-nexus-text-primary"
                        }`}
                    >
                      {type.code}
                    </button>
                  ))}
              </div>
            </motion.div>

            {/* Filters and Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mb-6 flex flex-wrap items-center gap-4"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-nexus-text-hint" />
                <Input
                  type="text"
                  placeholder="Search by name, email, or Aadhar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 border-nexus-border-strong pl-10 shadow-sm"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="h-10 rounded-lg border border-nexus-border-strong bg-nexus-surface px-3 text-sm font-medium text-nexus-text-label shadow-sm transition-colors hover:bg-nexus-surface-hover"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              {selectedIds.length > 0 && (
                <Button
                  onClick={() => handleRemove(selectedIds)}
                  variant="destructive"
                  className="h-10 px-4 text-sm"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove ({selectedIds.length})
                </Button>
              )}

              <Button
                onClick={() => setShowAddModal(true)}
                className="h-10 bg-nexus-brand px-4 text-sm hover:bg-nexus-brand-hover"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Crew
              </Button>
            </motion.div>

            {/* Crew Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mb-6 rounded-xl border border-nexus-border bg-nexus-surface shadow-sm"
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-nexus-surface-hover">
                    <tr>
                      <th className="w-12 px-6 py-3 text-left">
                        <Checkbox
                          checked={
                            filteredMembers.length > 0 &&
                            filteredMembers.every((m) => selectedIds.includes(m.id))
                          }
                          onCheckedChange={handleSelectAll}
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                        Phone
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                        Created
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-nexus-text-secondary">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-nexus-border">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-nexus-text-secondary">
                          Loading crew members...
                        </td>
                      </tr>
                    ) : filteredMembers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-nexus-text-secondary">
                          No crew members found.
                        </td>
                      </tr>
                    ) : (
                      filteredMembers.map((member) => (
                        <tr key={member.id} className="transition-colors hover:bg-nexus-surface-hover">
                          <td className="px-6 py-4">
                            <Checkbox
                              checked={selectedIds.includes(member.id)}
                              onCheckedChange={() => handleSelectOne(member.id)}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className="inline-block rounded px-2 py-1 font-mono text-xs font-semibold text-white"
                              style={{ backgroundColor: getCrewTypeColor(member.crewType) }}
                            >
                              {getCrewTypeCode(member.crewType)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-nexus-text-primary">
                            {member.name}
                          </td>
                          <td className="px-6 py-4 text-sm text-nexus-text-secondary">{member.email}</td>
                          <td className="px-6 py-4 font-mono text-sm text-nexus-text-secondary">
                            {member.phoneNumber}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${member.status === "active"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                                }`}
                            >
                              <div
                                className={`h-1.5 w-1.5 rounded-full ${member.status === "active" ? "bg-green-500" : "bg-red-500"
                                  }`}
                              />
                              {member.status === "active" ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-nexus-text-secondary">
                            {formatDate(member.createdAt)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEdit(member)}
                                className="rounded p-1.5 text-nexus-text-secondary transition-colors hover:bg-nexus-surface-muted hover:text-nexus-text-primary"
                                title="Edit"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeactivate(member)}
                                className={`rounded p-1.5 transition-colors ${member.status === "active"
                                  ? "text-red-600 hover:bg-red-50"
                                  : "text-green-600 hover:bg-green-50"
                                  }`}
                                title={member.status === "active" ? "Deactivate" : "Activate"}
                              >
                                <Power className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleRemove([member.id])}
                                className="rounded p-1.5 text-red-600 transition-colors hover:bg-red-50"
                                title="Remove"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between border-t border-nexus-border px-6 py-4">
                <p className="text-sm text-nexus-text-secondary">
                  Showing {(currentPage - 1) * perPage + 1} to{" "}
                  {Math.min(currentPage * perPage, filteredMembers.length)} crew members
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
                  <Button
                    onClick={() => setCurrentPage((p) => p + 1)}
                    disabled={filteredMembers.length < perPage}
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

      {/* Add Crew Modal (Simplified version for space) */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl rounded-2xl bg-nexus-surface p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowAddModal(false)}
                className="absolute right-6 top-6 rounded-full p-2 text-nexus-text-hint transition-colors hover:bg-nexus-surface-hover hover:text-nexus-text-primary"
              >
                <X className="h-6 w-6" />
              </button>

              <div className="mb-8">
                <h2 className="text-2xl font-bold text-nexus-text-primary">Add New Crew Member</h2>
                <div className="mt-4 flex items-center gap-2">
                  {[1, 2, 3].map((step) => (
                    <div key={step} className="flex items-center">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${currentStep === step
                          ? "bg-nexus-brand text-white"
                          : currentStep > step
                            ? "bg-green-500 text-white"
                            : "bg-nexus-surface-hover text-nexus-text-muted"
                          }`}
                      >
                        {currentStep > step ? <Check className="h-4 w-4" /> : step}
                      </div>
                      {step < 3 && (
                        <div
                          className={`h-1 w-12 transition-colors ${currentStep > step ? "bg-green-500" : "bg-nexus-surface-hover"
                            }`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        placeholder="e.g. Rahul Sharma"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="crewType">Crew Type</Label>
                      <select
                        id="crewType"
                        value={formData.crewType}
                        onChange={(e) => setFormData({ ...formData, crewType: e.target.value as CrewType })}
                        className="h-10 w-full rounded-lg border border-nexus-border-strong bg-nexus-surface px-3 text-sm font-medium text-nexus-text-label shadow-sm transition-colors hover:bg-nexus-surface-hover"
                      >
                        {crewTypes.filter(t => t.key !== 'all').map(t => (
                          <option key={t.key} value={t.key}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="rahul@nexus.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <div className="flex gap-2">
                        <Input
                          value={formData.phoneCountryCode}
                          className="w-20 text-center"
                          readOnly
                        />
                        <Input
                          id="phone"
                          placeholder="9876543210"
                          value={formData.phoneNumber}
                          maxLength={10}
                          inputMode="numeric"
                          className={phoneTouched && !/^\d{10}$/.test(formData.phoneNumber) ? "border-red-500 focus-visible:ring-red-500" : ""}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                            setFormData({ ...formData, phoneNumber: val });
                          }}
                          onBlur={() => setPhoneTouched(true)}
                        />
                      </div>
                      {phoneTouched && formData.phoneNumber.length > 0 && !/^\d{10}$/.test(formData.phoneNumber) && (
                        <p className="text-xs text-red-500">Enter a valid 10-digit phone number</p>
                      )}
                      {phoneTouched && formData.phoneNumber.length === 0 && (
                        <p className="text-xs text-red-500">Phone number is required</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="aadhar">Aadhar Number</Label>
                      <Input
                        id="aadhar"
                        placeholder="1234 5678 9012"
                        inputMode="numeric"
                        maxLength={14}
                        value={
                          formData.aadharNumber
                            ? formData.aadharNumber.replace(/(\d{4})(?=\d)/g, "$1 ").trim()
                            : ""
                        }
                        className={aadharTouched && !/^\d{12}$/.test(formData.aadharNumber) ? "border-red-500 focus-visible:ring-red-500" : ""}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, "").slice(0, 12);
                          setFormData({ ...formData, aadharNumber: digits });
                        }}
                        onBlur={() => setAadharTouched(true)}
                      />
                      {aadharTouched && formData.aadharNumber.length > 0 && !/^\d{12}$/.test(formData.aadharNumber) && (
                        <p className="text-xs text-red-500">Enter a valid 12-digit Aadhar number</p>
                      )}
                      {aadharTouched && formData.aadharNumber.length === 0 && (
                        <p className="text-xs text-red-500">Aadhar number is required</p>
                      )}
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-nexus-text-hint hover:text-nexus-text-primary"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm">Confirm Password</Label>
                      <div className="relative">
                        <Input
                          id="confirm"
                          type={showConfirmPassword ? "text" : "password"}
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-nexus-text-hint hover:text-nexus-text-primary"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <PasswordStrengthMeter password={formData.password} confirmPassword={formData.confirmPassword} />
                  </div>
                  <div className="mt-8 flex justify-end">
                    <Button
                      onClick={handleStep1Next}
                      disabled={!isStep1Valid()}
                      className="bg-nexus-brand px-8 hover:bg-nexus-brand-hover"
                    >
                      Setup 2FA <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="text-center">
                  <p className="mb-6 text-nexus-text-secondary">
                    Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                  </p>
                  <div className="mx-auto mb-6 flex h-48 w-48 items-center justify-center rounded-xl bg-white p-4 shadow-inner">
                    <img src={qrCodeUrl} alt="2FA QR Code" className="h-full w-full" />
                  </div>
                  <div className="mb-8 rounded-lg bg-nexus-surface-hover p-4 text-left">
                    <p className="text-xs font-semibold uppercase tracking-wider text-nexus-text-muted">
                      Manual Configuration Key
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <code className="font-mono text-sm font-bold text-nexus-text-primary">
                        {secretRevealed ? totpSecret : getMaskedSecret()}
                      </code>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSecretRevealed(!secretRevealed)}
                          className="text-nexus-brand hover:underline text-xs font-medium"
                        >
                          {secretRevealed ? "Hide" : "Reveal"}
                        </button>
                        <button
                          onClick={handleCopySecret}
                          className="flex items-center gap-1 text-nexus-brand hover:underline text-xs font-medium"
                        >
                          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          {copied ? "Copied" : "Copy"}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setCurrentStep(1)}>
                      <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button onClick={handleStep2Next} className="bg-nexus-brand px-8 hover:bg-nexus-brand-hover">
                      I've scanned it <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="text-center">
                  <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-nexus-brand-light">
                    <CheckCircle2 className="h-8 w-8 text-nexus-brand" />
                  </div>
                  <h3 className="mb-2 text-xl font-bold text-nexus-text-primary">Verify 2FA</h3>
                  <p className="mb-8 text-nexus-text-secondary">
                    Enter the 6-digit code from your authenticator app to complete setup.
                  </p>
                  <div className="mb-8">
                    <TOTPInput value={totpCode} onChange={setTotpCode} onComplete={() => { }} />
                  </div>
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setCurrentStep(2)}>
                      <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button
                      onClick={handleFinishAddCrew}
                      disabled={totpCode.length !== 6 || isSubmitting}
                      className="bg-nexus-brand px-12 hover:bg-nexus-brand-hover"
                    >
                      {isSubmitting ? "Creating..." : "Confirm & Create"}
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal (Simplified) */}
      <AnimatePresence>
        {showEditModal && editingMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-xl bg-nexus-surface p-6 shadow-xl"
            >
              <h3 className="mb-4 text-xl font-bold">Edit Crew Member</h3>
              <div className="space-y-4">
                <div>
                  <Label>Field to Update</Label>
                  <select
                    value={editField}
                    onChange={(e) => setEditField(e.target.value)}
                    className="h-10 w-full rounded-lg border border-nexus-border-strong bg-nexus-surface px-3 text-sm font-medium text-nexus-text-label shadow-sm transition-colors hover:bg-nexus-surface-hover"
                  >
                    <option value="">Select Field</option>
                    <option value="name">Name</option>
                    <option value="email">Email</option>
                    <option value="phoneNumber">Phone Number</option>
                    <option value="aadharNumber">Aadhar Number</option>
                    <option value="password">Password</option>
                  </select>
                </div>
                {editField && (
                  <div>
                    <Label>New Value</Label>
                    <Input
                      type={editField === "password" ? "password" : "text"}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                    />
                  </div>
                )}
                <div>
                  <Label>Your 2FA Code</Label>
                  <TOTPInput value={editTotpCode} onChange={setEditTotpCode} onComplete={() => { }} />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button variant="outline" className="flex-1" onClick={() => setShowEditModal(false)}>
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-nexus-brand"
                    disabled={!editField || !editValue || editTotpCode.length !== 6 || isSubmitting}
                    onClick={handleConfirmEdit}
                  >
                    {isSubmitting ? "Updating..." : "Update"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Deactivate Modal */}
      <AnimatePresence>
        {showDeactivateModal && deactivatingMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-xl bg-nexus-surface p-6 shadow-xl"
            >
              <h3 className="mb-4 text-xl font-bold">
                {deactivatingMember.status === "active" ? "Deactivate" : "Activate"} Crew Member
              </h3>
              <p className="mb-4 text-nexus-text-secondary">
                Are you sure you want to {deactivatingMember.status === "active" ? "deactivate" : "activate"}{" "}
                <span className="font-bold">{deactivatingMember.name}</span>?
              </p>
              <div className="space-y-4">
                <div>
                  <Label>Reason (Optional)</Label>
                  <Input
                    value={deactivateReason}
                    onChange={(e) => setDeactivateReason(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Your 2FA Code</Label>
                  <TOTPInput value={deactivateTotpCode} onChange={setDeactivateTotpCode} onComplete={() => { }} />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button variant="outline" className="flex-1" onClick={() => setShowDeactivateModal(false)}>
                    Cancel
                  </Button>
                  <Button
                    className={`flex-1 ${deactivatingMember.status === "active" ? "bg-red-600" : "bg-green-600"
                      }`}
                    disabled={deactivateTotpCode.length !== 6 || isSubmitting}
                    onClick={handleConfirmDeactivate}
                  >
                    {isSubmitting
                      ? "Processing..."
                      : deactivatingMember.status === "active"
                        ? "Deactivate"
                        : "Activate"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Remove Modal */}
      <AnimatePresence>
        {showRemoveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-xl bg-nexus-surface p-6 shadow-xl"
            >
              <h3 className="mb-4 text-xl font-bold">Remove Crew Members</h3>
              <p className="mb-4 text-nexus-text-secondary">
                You are about to permanently remove <span className="font-bold">{removingIds.length}</span> crew member(s). This action cannot be undone.
              </p>
              <div className="space-y-4">
                <div>
                  <Label>Your 2FA Code</Label>
                  <TOTPInput value={removeTotpCode} onChange={setRemoveTotpCode} onComplete={() => { }} />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button variant="outline" className="flex-1" onClick={() => setShowRemoveModal(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    disabled={removeTotpCode.length !== 6 || isSubmitting}
                    onClick={handleConfirmRemove}
                  >
                    {isSubmitting ? "Removing..." : "Remove"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
