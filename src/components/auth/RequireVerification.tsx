import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface RequireVerificationProps {
  children: ReactNode;
}

export function RequireVerification({ children }: RequireVerificationProps) {
  const location = useLocation();
  const { user, isAuthenticated, loading } = useAuth();

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );

  // not logged in → let <ProtectedRoute> handle login
  if (!isAuthenticated || !user) return <>{children}</>;

  // Allow bypass via URL parameter for testing
  const searchParams = new URLSearchParams(location.search);
  const skipVerification = searchParams.get('skip_verification') === 'true';

  // Only redirect if explicitly false (not undefined/null) and no bypass
  // This allows users with undefined/null verification status to navigate freely
  if (!skipVerification && user.is_chatapp_verified === false) {
    return <Navigate to="/chatapp" state={{ from: location.pathname }} replace />;
  }

  // all checks passed → render protected route
  return <>{children}</>;
}
