import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { TopNav } from "./dashboard/TopNav";
import { Sidebar } from "./dashboard/Sidebar";
import { WelcomeBanner } from "./dashboard/WelcomeBanner";
import { StatCards } from "./dashboard/StatCards";
import { AdminTable } from "./dashboard/AdminTable";
import { AddAdminModal } from "./dashboard/AddAdminModal";
import { TOTPConfirmModal } from "./dashboard/TOTPConfirmModal";
import { EditAdminPanel } from "./dashboard/EditAdminPanel";
import { toast } from "sonner";
import { UserService, Admin } from "../api/services/user.service";

export function SuperAdminDashboard() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [filteredAdmins, setFilteredAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [selectedAdmins, setSelectedAdmins] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTOTPModal, setShowTOTPModal] = useState(false);
  const [totpAction, setTotpAction] = useState<"delete" | "edit" | null>(null);
  const [adminToEdit, setAdminToEdit] = useState<Admin | null>(null);
  const [showEditPanel, setShowEditPanel] = useState(false);

  // Fetch admins on mount
  useEffect(() => {
    fetchAdmins();
  }, []);

  // Filter admins when search or status changes
  useEffect(() => {
    let filtered = [...admins];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (admin) =>
          admin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          admin.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          admin.phoneNumber.includes(searchQuery)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((admin) => admin.status === statusFilter);
    }

    setFilteredAdmins(filtered);
    setCurrentPage(1);
  }, [searchQuery, statusFilter, admins]);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const response = await UserService.getAdmins();
      if (response.success) {
        setAdmins(response.data);
        setFilteredAdmins(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch admins:", error);
      toast.error("Failed to load admins");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAdmins = (adminIds: string[]) => {
    setSelectedAdmins(adminIds);
    setTotpAction("delete");
    setShowTOTPModal(true);
  };

  const handleEditAdmin = (admin: Admin) => {
    setAdminToEdit(admin);
    setShowEditPanel(true);
  };

  const handleTOTPConfirm = async (totpCode: string) => {
    if (totpAction === "delete") {
      try {
        const response = await UserService.deleteAdmins(selectedAdmins, totpCode);
        if (response.success) {
          setAdmins((prev) => prev.filter((admin) => !selectedAdmins.includes(admin.id)));
          setSelectedAdmins([]);
          setShowTOTPModal(false);
          toast.success(`${selectedAdmins.length} admin(s) deleted successfully`);
        } else {
          toast.error("Failed to delete admins. Check your 2FA code.");
        }
      } catch (error) {
        console.error("Delete error:", error);
        toast.error(error instanceof Error ? error.message : "An error occurred during deletion");
      }
    }
  };

  const handleAddAdmin = async (adminData: any) => {
    try {
      const response = await UserService.addAdmin(adminData);
      if (response.success) {
        toast.success("Admin added successfully");
        setShowAddModal(false);
        fetchAdmins(); // Re-fetch to get latest list with proper IDs
      } else {
        toast.error("Failed to add admin");
      }
    } catch (error) {
      console.error("Add error:", error);
      toast.error("An error occurred while adding admin");
    }
  };

  const handleUpdateAdmin = async (adminId: string, field: string, value: string, totpCode: string) => {
    try {
      const response = await UserService.updateAdmin(adminId, {
        fieldName: field,
        newValue: value,
        totpCode,
      });

      if (response.success) {
        setAdmins((prev) =>
          prev.map((admin) =>
            admin.id === adminId ? { ...admin, [field]: value } : admin
          )
        );
        setShowEditPanel(false);
        toast.success("Admin updated successfully");
      } else {
        toast.error("Failed to update admin. Check your 2FA code.");
      }
    } catch (error) {
      console.error("Update error:", error);
      toast.error(error instanceof Error ? error.message : "An error occurred during update");
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredAdmins.length / perPage);
  const paginatedAdmins = filteredAdmins.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );

  return (
    <div className="min-h-screen w-full bg-nexus-page-bg pt-16">
      {/* Top Navigation */}
      <TopNav adminCount={admins.length} />

      <div className="flex">
        {/* Sidebar */}
        <Sidebar collapsed={sidebarCollapsed} onToggle={setSidebarCollapsed} />

        {/* Main Content */}
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
            {/* Welcome Banner */}
            <WelcomeBanner />

            {/* Stat Cards */}
            <StatCards admins={admins} loading={loading} />

            {/* Admin Table */}
            <AdminTable
              admins={paginatedAdmins}
              loading={loading}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              selectedAdmins={selectedAdmins}
              onSelectionChange={setSelectedAdmins}
              onAddClick={() => setShowAddModal(true)}
              onDeleteClick={handleDeleteAdmins}
              onEditClick={handleEditAdmin}
              currentPage={currentPage}
              totalPages={totalPages}
              perPage={perPage}
              onPageChange={setCurrentPage}
              onPerPageChange={setPerPage}
              totalItems={filteredAdmins.length}
            />
          </motion.div>
        </main>
      </div>

      {/* Add Admin Modal */}
      <AddAdminModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddAdmin}
      />

      {/* TOTP Confirmation Modal */}
      <TOTPConfirmModal
        isOpen={showTOTPModal}
        onClose={() => setShowTOTPModal(false)}
        onConfirm={handleTOTPConfirm}
        title="Confirm Admin Removal"
        description={`You are about to delete ${selectedAdmins.length} admin(s). Enter your 2FA code to confirm.`}
      />

      {/* Edit Admin Panel */}
      <EditAdminPanel
        isOpen={showEditPanel}
        onClose={() => setShowEditPanel(false)}
        admin={adminToEdit}
        onUpdate={handleUpdateAdmin}
      />
    </div>
  );
}
