import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface Props {
  children: ReactNode;
}

// Paths that an authenticated-but-not-yet-set-up user is allowed to visit.
const ALLOWED_PATHS = [
  "/onboarding/security",
  "/communications-hub",
  "/chatapp",
  "/logout",
];

export function RequireSecuritySetup({ children }: Props) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const [status, setStatus] = useState<"checking" | "complete" | "incomplete">("checking");

  useEffect(() => {
    let cancelled = false;
    if (!isAuthenticated || !user?.id) {
      setStatus("checking");
      return;
    }
    (async () => {
      const [{ data: profile }, { data: securityQuestions }] = await Promise.all([
        supabase
        .from("profiles")
        .select("security_setup_complete")
        .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("user_security_questions")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      setStatus(profile?.security_setup_complete || securityQuestions?.user_id ? "complete" : "incomplete");
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAuthenticated) return <>{children}</>;

  if (status === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (status === "incomplete") {
    const allowed = ALLOWED_PATHS.some((p) => location.pathname.startsWith(p));
    if (!allowed) {
      return <Navigate to="/onboarding/security" replace />;
    }
  }

  return <>{children}</>;
}
