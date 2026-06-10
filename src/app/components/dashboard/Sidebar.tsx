import { motion } from "motion/react";
import { Users, FileText, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { LogoutConfirmModal } from "../LogoutConfirmModal";


interface SidebarProps {
  collapsed: boolean;
  onToggle: (collapsed: boolean) => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const menuItems = [
    { icon: Users, label: "Manage Admins", path: "/super-admin", active: true },
    { icon: FileText, label: "Audit Logs", path: "/super-admin/audit", active: false },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-nexus-brand text-white shadow-lg lg:hidden"
      >
        {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Overlay for mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.aside
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className={`fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] border-r border-nexus-border bg-nexus-surface transition-all duration-300 ${collapsed ? "w-20" : "w-60"
          } ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="flex h-full flex-col p-4">
          {/* Menu Items */}
          <nav className="flex-1 space-y-2">
            {menuItems.map((item, index) => (
              <motion.button
                key={item.label}
                onClick={() => handleNavigation(item.path)}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${item.active
                    ? "bg-nexus-brand-light text-nexus-brand shadow-sm"
                    : "text-nexus-text-label hover:bg-nexus-surface-hover"
                  }`}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
                {item.active && !collapsed && (
                  <div className="ml-auto h-1.5 w-1.5 rounded-full bg-nexus-brand" />
                )}
              </motion.button>
            ))}
          </nav>

          {/* Bottom Actions */}
          <div className="mt-auto space-y-2 border-t border-nexus-border pt-4">
            <motion.button
              onClick={() => setShowLogoutModal(true)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition-all hover:bg-red-50"
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span className="truncate">Logout</span>}
            </motion.button>
            <LogoutConfirmModal isOpen={showLogoutModal} onClose={() => setShowLogoutModal(false)} />

            {/* Collapse Button (Desktop Only) */}
            <button
              onClick={() => onToggle(!collapsed)}
              className="hidden w-full items-center justify-center rounded-lg border border-nexus-border p-2 text-nexus-text-secondary transition-colors hover:bg-nexus-surface-hover lg:flex"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </motion.aside>
    </>
  );
}