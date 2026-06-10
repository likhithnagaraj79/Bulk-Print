import { createBrowserRouter, Navigate } from "react-router";
import { SuperAdminDashboard } from "./components/SuperAdminDashboard";
import { AddAdminPage } from "./components/AddAdminPage";
import { AuditLogsPage } from "./components/AuditLogsPage";
import { AdminDashboard } from "./components/AdminDashboard";
import { ManageCrewPage } from "./components/ManageCrewPage";
import { RegistrationTabsPage } from "./components/RegistrationTabsPage";
import { MonitorCrewsPage } from "./components/MonitorCrewsPage";
import { BulkUploadPage } from "./components/BulkUploadPage";
import { BadgeControlPage } from "./components/BadgeControlPage";
import { AdminAuditLogsPage } from "./components/AdminAuditLogsPage";
import { CrewDashboard } from "./components/CrewDashboard";
import { CrewSubmissionsPage } from "./components/CrewSubmissionsPage";
import { CrewRegistrationPage } from "./components/CrewRegistrationPage";
import { BadgePreviewPage } from "./components/BadgePreviewPage";
import { PublicRegistrationPage } from "./components/PublicRegistrationPage";
import { OnsiteRegistrationPage } from "./components/OnsiteRegistrationPage";
import { AdminCheckinDashboard } from "./components/AdminCheckinDashboard";
import { AdminSettingsPage } from "./components/AdminSettingsPage";
import { AdminPreRegistrationPage } from "./components/AdminPreRegistrationPage";
import { AdminReportsPage } from "./components/AdminReportsPage";
import { AdminNotificationHistoryPage } from "./components/AdminNotificationHistoryPage";
import { VisitorPreRegPage } from "./components/VisitorPreRegPage";
import { FetchBadgePage } from "./components/FetchBadgePage";
import { AdminVisitorPreRegPage } from "./components/AdminVisitorPreRegPage";
import { AdminEndpointManagerPage } from "./components/AdminEndpointManagerPage";

export const router = createBrowserRouter([
  // Home → straight to admin dashboard, no login
  { path: "/", element: <Navigate to="/admin" replace /> },

  // Public pages
  { path: "/visitor-reg", element: <VisitorPreRegPage /> },
  { path: "/visitor-reg/:slug", element: <VisitorPreRegPage /> },
  { path: "/fetch-badge", element: <FetchBadgePage /> },
  { path: "/register", element: <PublicRegistrationPage /> },
  { path: "/register/:prefix", element: <PublicRegistrationPage /> },
  { path: "/onsite", element: <OnsiteRegistrationPage /> },
  { path: "/onsite/:prefix", element: <OnsiteRegistrationPage /> },

  // Super Admin — no auth gate
  { path: "/super-admin", element: <SuperAdminDashboard /> },
  { path: "/super-admin/add-admin", element: <AddAdminPage /> },
  { path: "/super-admin/audit", element: <AuditLogsPage /> },

  // Admin — all open, no auth gate
  { path: "/admin", element: <AdminDashboard /> },
  { path: "/admin/crew", element: <ManageCrewPage /> },
  { path: "/admin/registrations/:prefix", element: <RegistrationTabsPage /> },
  { path: "/admin/monitor", element: <MonitorCrewsPage /> },
  { path: "/admin/bulk-upload", element: <BulkUploadPage /> },
  { path: "/admin/badge-control", element: <BadgeControlPage /> },
  { path: "/admin/audit", element: <AdminAuditLogsPage /> },
  { path: "/admin/checkin", element: <AdminCheckinDashboard /> },
  { path: "/admin/settings", element: <AdminSettingsPage /> },
  { path: "/admin/pre-registrations", element: <AdminPreRegistrationPage /> },
  { path: "/admin/reports", element: <AdminReportsPage /> },
  { path: "/admin/notifications", element: <AdminNotificationHistoryPage /> },
  { path: "/admin/visitor-prereg", element: <AdminVisitorPreRegPage /> },
  { path: "/admin/visitor-endpoints", element: <AdminEndpointManagerPage /> },

  // Crew — no auth gate
  { path: "/crew", element: <CrewDashboard /> },
  { path: "/crew/submissions", element: <CrewSubmissionsPage /> },
  { path: "/crew/register", element: <CrewRegistrationPage /> },

  // Badge preview
  { path: "/badge", element: <BadgePreviewPage /> },
]);
