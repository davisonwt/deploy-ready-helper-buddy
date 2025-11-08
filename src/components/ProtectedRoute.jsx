import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useUserRoles } from "../hooks/useUserRoles";
import { logInfo } from "@/lib/logging";
import { LoadingSpinner } from "@/components/LoadingSpinner";

// Auth-only guard
const AuthProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading: authLoading } = useAuth();

  if (authLoading) {
    return <LoadingSpinner full text="Authenticating..." />;
  }

  if (!isAuthenticated) {
    logInfo("ProtectedRoute redirect", { reason: "unauthenticated", to: "/login" });
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Role-based guard
const RoleProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { userRoles = [], hasRole, loading: rolesLoading } = useUserRoles();

  // Wait for auth/roles to load
  if (authLoading || rolesLoading) {
    return <LoadingSpinner full text="Loading permissions..." />;
  }

  if (!isAuthenticated) {
    logInfo("RoleProtectedRoute redirect", { reason: "unauthenticated", to: "/login" });
    return <Navigate to="/login" replace />;
  }

  // Ensure roles are present before checking
  if (!userRoles.length) {
    return <LoadingSpinner full text="Loading roles..." />;
  }

  const hasRequiredRole = Array.isArray(allowedRoles) && allowedRoles.some((role) => hasRole(role));

  if (!hasRequiredRole) {
    logInfo("RoleProtectedRoute redirect", {
      reason: "missing_role",
      userId: user?.id,
      userRoles,
      allowedRoles,
      to: "/dashboard",
    });
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Combined guard
const ProtectedRoute = ({ children, allowedRoles = null }) => {
  const shouldCheckRoles = Array.isArray(allowedRoles) && allowedRoles.length > 0;
  return shouldCheckRoles ? (
    <RoleProtectedRoute allowedRoles={allowedRoles}>{children}</RoleProtectedRoute>
  ) : (
    <AuthProtectedRoute>{children}</AuthProtectedRoute>
  );
};

export default ProtectedRoute;

