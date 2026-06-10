import { motion } from "motion/react";
import { LayoutDashboard, UserPlus, History, Menu, X, LogOut } from "lucide-react";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { LogoutConfirmModal } from "../LogoutConfirmModal";

interface CrewSidebarProps {
  collapsed: boolean;
  onToggle: (collapsed: boolean) => void;
  crewColor?: string;
}

export function CrewSidebar({ collapsed, onToggle, crewColor = "#1E5FCC" }: CrewSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleNavigation = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const menuItems = [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      path: "/crew",
      active: location.pathname === "/crew",
    },
    {
      icon: UserPlus,
      label: "New Registration",
      path: "/crew/register",
      active: location.pathname === "/crew/register",
    },
    {
      icon: History,
      label: "Submissions",
      path: "/crew/submissions",
      active: location.pathname === "/crew/submissions",
    },
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg lg:hidden"
        style={{ backgroundColor: crewColor }}
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
        className={`fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] overflow-y-auto border-r border-nexus-border bg-nexus-surface transition-all duration-300 ${
          collapsed ? "w-20" : "w-60"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="flex h-full flex-col p-4">
          {/* Menu Items */}
          <nav className="flex-1 space-y-1">
            {menuItems.map((item, index) => (
              <motion.button
                key={item.label}
                onClick={() => handleNavigation(item.path)}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  item.active
                    ? "border-l-4 text-white"
                    : "border-l-4 border-l-transparent text-nexus-text-label hover:bg-nexus-surface-hover"
                }`}
                style={
                  item.active
                    ? { borderLeftColor: crewColor, backgroundColor: `${crewColor}18`, color: crewColor }
                    : undefined
                }
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span className="flex-1 truncate text-left">{item.label}</span>}
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
