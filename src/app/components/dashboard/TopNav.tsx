import { motion } from "motion/react";
import { Users } from "lucide-react";

interface TopNavProps {
  adminCount?: number;
  role?: "super_admin" | "admin" | "crew";
  crewLabel?: string;
  crewColor?: string;
}

export function TopNav({ adminCount, role = "super_admin", crewLabel, crewColor }: TopNavProps) {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-nexus-border bg-white/80 backdrop-blur-xl"
    >
      <div className="flex h-16 items-center justify-between px-6 lg:px-8">
        {/* Logo */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-nexus-brand to-nexus-brand-hover">
              <span className="text-lg font-bold text-white">N</span>
            </div>
            <span className="text-xl font-semibold text-nexus-text-primary">NEXUS</span>
          </div>
        </div>

        {/* Role Badge & User Actions */}
        <div className="flex items-center gap-4">
          {/* Admin Count Badge (Super Admin Only) */}
          {adminCount !== undefined && (
            <div className="flex items-center gap-2 rounded-lg border border-nexus-border bg-nexus-surface-hover px-3 py-1.5 shadow-sm">
              <Users className="h-4 w-4 text-nexus-brand" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-nexus-text-hint">Total Admins</span>
                <span className="text-sm font-bold tabular-nums text-nexus-text-primary">{adminCount}</span>
              </div>
            </div>
          )}

          {/* Role Badge */}
          <div
            className="hidden rounded-full px-4 py-1.5 sm:block"
            style={role === "crew" && crewColor ? { backgroundColor: `${crewColor}18` } : undefined}
          >
            <span
              className="text-sm font-medium"
              style={role === "crew" && crewColor ? { color: crewColor } : { color: "var(--nexus-brand)" }}
            >
              {role === "admin" ? "Admin" : role === "crew" ? (crewLabel || "Crew") : "Super Admin"}
            </span>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
