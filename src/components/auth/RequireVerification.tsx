import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface RequireVerificationProps {
  children: React.ReactNode;
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

  // logged-in but unverified → force stop at ChatApp
  if (!user.is_chatapp_verified) {
    return <Navigate to="/chatapp" state={{ from: location.pathname }} replace />;
  }

  // all checks passed → render protected route
  return <>{children}</>;
}
