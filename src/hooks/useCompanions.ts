import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { CompanionSlug, Tier } from "@/lib/companions/registry";

export interface CompanionEntitlement {
  slug: CompanionSlug;
  name: string;
  title: string;
  emoji: string;
  summary: string;
  category: string;
  layer: "narrative" | "infrastructure" | "live" | "harvest" | "orchestration";
  default_model: string;
  mode: "none" | "basic" | "standard" | "full" | "full_plus";
  monthly_quota: number | null;
  used: number;
  remaining: number | null;
  notes: string | null;
}

export function useCompanions() {
  const [tier, setTier] = useState<Tier>("sower");
  const [companions, setCompanions] = useState<CompanionEntitlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke(
        "companion-entitlements",
        { body: {} },
      );
      if (error) throw error;
      setTier((data?.tier as Tier) ?? "sower");
      setCompanions(data?.companions ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load companions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const invoke = useCallback(
    async (
      companion: CompanionSlug,
      payload: { prompt?: string; messages?: any[]; action?: string },
    ) => {
      const { data, error } = await supabase.functions.invoke("companion-invoke", {
        body: { companion, ...payload },
      });
      if (error) throw error;
      return data as {
        text: string;
        image: string | null;
        tier: Tier;
        remaining: number | null;
        monthly_quota: number | null;
      };
    },
    [],
  );

  return { tier, companions, loading, error, refresh, invoke };
}
