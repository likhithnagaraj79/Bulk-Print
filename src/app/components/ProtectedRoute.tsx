import { Navigate } from "react-router";

interface ProtectedRouteProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const token = localStorage.getItem("nexus_token");

  if (!token) {
    return <Navigate to="/" replace />;
  }

  const payload = decodeJwtPayload(token);
  const accountType = payload?.accountType as string | undefined;

  if (allowedRoles.length > 0 && (!accountType || !allowedRoles.includes(accountType))) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
