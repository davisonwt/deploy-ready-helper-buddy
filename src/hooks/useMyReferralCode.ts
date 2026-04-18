/**
 * useMyReferralCode
 * --------------------------------------------------------------
 * Resolves the current user's referral code, preferring the canonical
 * `user_referrals.referral_code`, then falling back to `affiliates.referral_code`.
 * Auto-creates an `affiliates` row if neither exists, so every authenticated
 * user instantly has a usable code for marketing-video personalization.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface MyReferral {
  code: string | null;
  inviterName: string;
  shareUrl: string;
  loading: boolean;
}

export function useMyReferralCode(): MyReferral {
  const { user } = useAuth();
  const [code, setCode] = useState<string | null>(null);
  const [inviterName, setInviterName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      setLoading(true);

      // Display name from profiles
      const { data: prof } = await supabase
        .from("profiles")
        .select("first_name, last_name, display_name, username")
        .eq("user_id", user.id)
        .maybeSingle();
      const name =
        (prof as any)?.display_name ||
        [prof?.first_name, prof?.last_name].filter(Boolean).join(" ").trim() ||
        (prof as any)?.username ||
        "a friend";

      // Prefer user_referrals
      let resolved: string | null = null;
      const { data: ur } = await supabase
        .from("user_referrals")
        .select("referral_code")
        .eq("user_id", user.id)
        .maybeSingle();
      if (ur?.referral_code) resolved = ur.referral_code;

      // Fallback: affiliates
      if (!resolved) {
        const { data: aff } = await supabase
          .from("affiliates")
          .select("referral_code")
          .eq("user_id", user.id)
          .maybeSingle();
        if (aff?.referral_code) resolved = aff.referral_code;
      }

      // Auto-create affiliate row if no code anywhere
      if (!resolved) {
        const newCode = Math.random().toString(36).substring(2, 10).toUpperCase();
        const { data: created } = await supabase
          .from("affiliates")
          .insert({
            user_id: user.id,
            referral_code: newCode,
            commission_rate: 10,
            earnings: 0,
          })
          .select("referral_code")
          .maybeSingle();
        resolved = created?.referral_code || newCode;
      }

      if (!cancelled) {
        setCode(resolved);
        setInviterName(name);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const shareUrl = code ? `sow2growapp.com/?ref=${code}` : "sow2growapp.com";
  return { code, inviterName, shareUrl, loading };
}
