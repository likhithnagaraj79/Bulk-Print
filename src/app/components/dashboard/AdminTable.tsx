import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Search, Plus, Trash2, Edit2, ChevronDown } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Checkbox } from "../ui/checkbox";
import { Admin } from "../../api/services/user.service";

interface AdminTableProps {
  admins: Admin[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: "all" | "active" | "inactive";
  onStatusFilterChange: (filter: "all" | "active" | "inactive") => void;
  selectedAdmins: string[];
  onSelectionChange: (ids: string[]) => void;
  onAddClick: () => void;
  onDeleteClick: (ids: string[]) => void;
  onEditClick: (admin: Admin) => void;
  currentPage: number;
  totalPages: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
  totalItems: number;
}

export function AdminTable({
  admins,
  loading,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  selectedAdmins,
  onSelectionChange,
  onAddClick,
  onDeleteClick,
  onEditClick,
  currentPage,
  totalPages,
  perPage,
  onPageChange,
  onPerPageChange,
  totalItems,
}: AdminTableProps) {
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(debouncedSearch);
    }, 300);

    return () => clearTimeout(timer);
  }, [debouncedSearch]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(admins.map((a) => a.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedAdmins, id]);
    } else {
      onSelectionChange(selectedAdmins.filter((selectedId) => selectedId !== id));
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  const allSelected = admins.length > 0 && selectedAdmins.length === admins.length;
  const someSelected = selectedAdmins.length > 0 && selectedAdmins.length < admins.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="rounded-xl border border-nexus-border bg-nexus-surface shadow-sm"
    >
      {/* Table Header Actions */}
      <div className="flex flex-col gap-4 border-b border-nexus-border p-6 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-nexus-text-hint" />
          <Input
            type="text"
            placeholder="Search admins..."
            value={debouncedSearch}
            onChange={(e) => setDebouncedSearch(e.target.value)}
            className="h-10 border-nexus-border-strong pl-10 shadow-sm"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value as any)}
              className="h-10 appearance-none rounded-lg border border-nexus-border-strong bg-nexus-surface pl-3 pr-8 text-sm font-medium text-nexus-text-label shadow-sm transition-colors hover:bg-nexus-surface-hover"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-nexus-text-hint" />
          </div>

          {/* Add Admin Button */}
          <Button
            onClick={onAddClick}
            className="h-10 bg-nexus-brand px-4 text-sm font-medium text-white shadow-sm hover:bg-nexus-brand-hover"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Admin
          </Button>

          {/* Remove Selected Button */}
          {selectedAdmins.length > 0 && (
            <Button
              onClick={() => onDeleteClick(selectedAdmins)}
              variant="destructive"
              className="h-10 px-4 text-sm font-medium shadow-sm"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove ({selectedAdmins.length})
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-nexus-surface-hover">
            <tr>
              <th className="w-12 px-6 py-3 text-left">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                  className={someSelected ? "data-[state=checked]:bg-gray-400" : ""}
                />
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
                Company Email
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
                <td colSpan={8} className="px-6 py-12 text-center text-sm text-nexus-text-muted">
                  Loading admins...
                </td>
              </tr>
            ) : admins.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-sm text-nexus-text-muted">
                  No admins found
                </td>
              </tr>
            ) : (
              admins.map((admin) => (
                <motion.tr
                  key={admin.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="transition-colors hover:bg-nexus-surface-hover"
                >
                  <td className="px-6 py-4">
                    <Checkbox
                      checked={selectedAdmins.includes(admin.id)}
                      onCheckedChange={(checked) => handleSelectOne(admin.id, checked as boolean)}
                      aria-label={`Select ${admin.name}`}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-nexus-text-primary">{admin.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-nexus-text-secondary">{admin.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-mono text-nexus-text-secondary">
                      {admin.phoneCountryCode} {admin.phoneNumber}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-nexus-text-secondary">
                      {admin.companyEmail || <span className="text-nexus-text-hint">—</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${admin.status === "active"
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                        }`}
                    >
                      {admin.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-nexus-text-secondary">{formatDate(admin.createdAt)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onEditClick(admin)}
                        className="rounded-lg p-2 text-nexus-text-secondary transition-colors hover:bg-nexus-surface-muted hover:text-nexus-text-primary"
                        title="Edit admin"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDeleteClick([admin.id])}
                        className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
                        title="Remove admin"
                      >
                        <Trash2 className="h-4 w-4" />
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
      <div className="flex flex-col gap-4 border-t border-nexus-border p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-nexus-text-secondary">
          Showing {admins.length === 0 ? 0 : (currentPage - 1) * perPage + 1} to{" "}
          {Math.min(currentPage * perPage, totalItems)} of {totalItems} results
        </div>

        <div className="flex items-center gap-4">
          {/* Per Page Selector */}
          <select
            value={perPage}
            onChange={(e) => onPerPageChange(Number(e.target.value))}
            className="h-9 rounded-lg border border-nexus-border-strong bg-nexus-surface px-3 text-sm font-medium text-nexus-text-label shadow-sm"
          >
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
          </select>

          {/* Page Pills */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-nexus-border-strong text-sm font-medium text-nexus-text-label transition-colors hover:bg-nexus-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              ←
            </button>

            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let page = i + 1;
              if (totalPages > 5 && currentPage > 3) {
                page = currentPage - 2 + i;
                if (page > totalPages) page = totalPages - (4 - i);
              }
              return (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors ${currentPage === page
                    ? "bg-nexus-brand text-white"
                    : "border border-nexus-border-strong text-nexus-text-label hover:bg-nexus-surface-hover"
                    }`}
                >
                  {page}
                </button>
              );
            })}

            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-nexus-border-strong text-sm font-medium text-nexus-text-label transition-colors hover:bg-nexus-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              →
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
