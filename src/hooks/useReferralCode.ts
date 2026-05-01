import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { ensureReferralCode } from "@/lib/referral";

/**
 * React hook returning the current user's permanent invitation code.
 * Lazily creates an `affiliates` row if the user has never had one.
 */
export function useReferralCode() {
  const { user } = useAuth();
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) {
      setCode(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    ensureReferralCode(user.id)
      .then((res) => {
        if (!cancelled) setCode(res.code);
      })
      .catch((err) => {
        console.warn("[useReferralCode] failed:", err);
        if (!cancelled) setCode(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return { code, loading };
}
