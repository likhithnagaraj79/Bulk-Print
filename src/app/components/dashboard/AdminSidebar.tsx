import { motion } from "motion/react";
import { Users, FileText, Menu, X, ChevronDown, ChevronRight, LayoutDashboard, UserCog, Upload, CreditCard, Monitor, ClipboardList, UserCheck, Link } from "lucide-react";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router";

interface SidebarProps {
  collapsed: boolean;
  onToggle: (collapsed: boolean) => void;
}

export function AdminSidebar({ collapsed, onToggle }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [registrationsOpen, setRegistrationsOpen] = useState(false);
  const handleNavigation = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const crewTypes = [
    { code: "VS", label: "Visitors", path: "/admin/registrations/vs" },
    { code: "VI", label: "VIPs", path: "/admin/registrations/vi" },
    { code: "FDL", label: "Foreign Delegates", path: "/admin/registrations/fdl" },
    { code: "EH", label: "Exhibitors", path: "/admin/registrations/eh" },
    { code: "OR", label: "Organisers", path: "/admin/registrations/or" },
    { code: "SPK", label: "Speakers", path: "/admin/registrations/spk" },
    { code: "DL", label: "Delegates", path: "/admin/registrations/dl" },
    { code: "SPR", label: "Sponsors", path: "/admin/registrations/spr" },
  ];

  const menuItems = [
    { 
      icon: LayoutDashboard, 
      label: "Dashboard", 
      path: "/admin", 
      active: location.pathname === "/admin" 
    },
    {
      icon: UserCog,
      label: "Crew Management",
      path: "/admin/crew",
      active: location.pathname === "/admin/crew"
    },
    {
      icon: Users,
      label: "Registrations", 
      path: "#registrations", 
      active: location.pathname.startsWith("/admin/registrations"),
      hasSubmenu: true 
    },
    { 
      icon: Monitor, 
      label: "Monitor Crews", 
      path: "/admin/monitor", 
      active: location.pathname === "/admin/monitor" 
    },
    { 
      icon: Upload, 
      label: "Bulk Upload", 
      path: "/admin/bulk-upload", 
      active: location.pathname === "/admin/bulk-upload" 
    },
    {
      icon: CreditCard,
      label: "Badge Control",
      path: "/admin/badge-control",
      active: location.pathname === "/admin/badge-control"
    },
    {
      icon: ClipboardList,
      label: "Pre-Registrations",
      path: "/admin/pre-registrations",
      active: location.pathname === "/admin/pre-registrations"
    },
    {
      icon: UserCheck,
      label: "Visitor Pre-Reg",
      path: "/admin/visitor-prereg",
      active: location.pathname === "/admin/visitor-prereg"
    },
    {
      icon: Link,
      label: "Manage Endpoints",
      path: "/admin/visitor-endpoints",
      active: location.pathname === "/admin/visitor-endpoints"
    },
    {
      icon: FileText,
      label: "Audit Logs",
      path: "/admin/audit",
      active: location.pathname === "/admin/audit"
    },
  ];

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
        className={`fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] overflow-y-auto border-r border-nexus-border bg-nexus-surface transition-all duration-300 ${
          collapsed ? "w-20" : "w-60"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="flex h-full flex-col p-4">
          {/* Menu Items */}
          <nav className="flex-1 space-y-1">
            {menuItems.map((item, index) => (
              <div key={item.label}>
                <motion.button
                  onClick={() => {
                    if (item.hasSubmenu) {
                      setRegistrationsOpen(!registrationsOpen);
                    } else {
                      handleNavigation(item.path);
                    }
                  }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    item.active
                      ? "border-l-4 border-l-nexus-brand bg-nexus-brand-light text-nexus-brand"
                      : "text-nexus-text-label hover:bg-nexus-surface-hover"
                  }`}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate text-left">{item.label}</span>
                      {item.hasSubmenu && (
                        registrationsOpen ? 
                          <ChevronDown className="h-4 w-4" /> : 
                          <ChevronRight className="h-4 w-4" />
                      )}
                    </>
                  )}
                </motion.button>

                {/* Submenu */}
                {item.hasSubmenu && registrationsOpen && !collapsed && (
                  <div className="ml-4 mt-1 space-y-1 border-l-2 border-nexus-border pl-4">
                    {crewTypes.map((type) => (
                      <button
                        key={type.code}
                        onClick={() => handleNavigation(type.path)}
                        className={`flex w-full items-start gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                          location.pathname === type.path
                            ? "bg-nexus-brand-light text-nexus-brand font-medium"
                            : "text-nexus-text-secondary hover:bg-nexus-surface-hover hover:text-nexus-text-primary"
                        }`}
                      >
                        <span className="font-mono text-xs font-bold">{type.code}</span>
                        <span className="flex-1 text-left">{type.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Bottom Actions */}
          <div className="mt-auto space-y-2 border-t border-nexus-border pt-4">
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
