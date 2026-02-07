import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";

type Props = {
  children: React.ReactNode;
  loadingText?: string;
};

/**
 * Ensures the user has an authenticated session by creating an anonymous session if needed.
 * Used for support entry points (e.g. password reset support chat) that must be reachable
 * even when a user can't log in.
 */
export default function AnonymousSupportGate({ children, loadingText = "Opening Support Chat..." }: Props) {
  const { isAuthenticated, loading, loginAnonymously } = useAuth();
  const [error, setError] = useState<string>("");
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const ensureSession = async () => {
      if (loading) return;
      if (isAuthenticated) return;
      if (attempted) return;

      setAttempted(true);
      try {
        const result = await loginAnonymously();
        if (!result?.success && !cancelled) {
          setError(result?.error || "Guest access failed");
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Guest access failed");
      }
    };

    ensureSession();

    return () => {
      cancelled = true;
    };
  }, [attempted, isAuthenticated, loading, loginAnonymously]);

  const content = useMemo(() => {
    if (loading || (!isAuthenticated && !error)) {
      return <LoadingSpinner full text={loadingText} />;
    }

    if (error) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-xl border bg-card p-6 text-center">
            <h1 className="text-lg font-semibold text-foreground">Couldnt open support chat</h1>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <div className="mt-4 flex justify-center">
              <Button type="button" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return <>{children}</>;
  }, [children, error, isAuthenticated, loading, loadingText]);

  return content;
}
