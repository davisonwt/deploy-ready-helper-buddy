import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-my-custom-header",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: tierData } = await admin.rpc("get_effective_tier", {
      _user: user.id,
    });
    const tier: string = tierData ?? "sower";

    const { data: companions } = await admin
      .from("s2g_companions")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");

    const { data: ents } = await admin
      .from("s2g_companion_entitlements")
      .select("*")
      .eq("tier", tier);

    const period = new Date()
      .toISOString()
      .slice(0, 7)
      .replace("-", "");

    const { data: usage } = await admin
      .from("s2g_companion_usage")
      .select("companion_slug,count")
      .eq("user_id", user.id)
      .eq("period_yyyymm", period);

    const usageMap = new Map(
      (usage ?? []).map((u: any) => [u.companion_slug, u.count]),
    );
    const entMap = new Map((ents ?? []).map((e: any) => [e.companion_slug, e]));

    const result = (companions ?? []).map((c: any) => {
      const e: any = entMap.get(c.slug) ?? { mode: "none", monthly_quota: 0 };
      const used = usageMap.get(c.slug) ?? 0;
      const remaining =
        e.monthly_quota == null ? null : Math.max(0, e.monthly_quota - used);
      return {
        ...c,
        mode: e.mode,
        monthly_quota: e.monthly_quota,
        used,
        remaining,
        notes: e.notes,
      };
    });

    return new Response(
      JSON.stringify({ tier, companions: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("entitlements error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
