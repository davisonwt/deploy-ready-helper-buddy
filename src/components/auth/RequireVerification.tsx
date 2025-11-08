import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { logInfo } from "@/lib/logging";
import { isVerificationEnabled, getVerificationRedirectPath } from "@/utils/verification";

interface RequireVerificationProps {
  children: ReactNode;
}

export function RequireVerification({ children }: RequireVerificationProps) {
  const location = useLocation();
  const { user, isAuthenticated, loading } = useAuth();

  // Wait for auth to finish loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Not authenticated → allow children (ProtectedRoute will handle redirect)
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  // Authenticated but user data not loaded yet → wait
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Allow bypass via URL parameter for testing
  const searchParams = new URLSearchParams(location.search);
  const skipVerification = searchParams.get('skip_verification') === 'true';

  // If verification feature is disabled, always allow navigation
  if (!isVerificationEnabled()) {
    return <>{children}</>;
  }

  // Only redirect if verification is enabled and user is not verified (not strictly checking === false)
  if (!skipVerification && user.is_chatapp_verified !== true) {
    const redirectTo = getVerificationRedirectPath();
    logInfo('Verification redirect', { from: location.pathname, to: redirectTo });
    return <Navigate to={redirectTo} state={{ from: location.pathname }} replace />;
  }

  // All checks passed → render protected route
  return <>{children}</>;
}

