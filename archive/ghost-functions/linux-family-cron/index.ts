// 🐧 Linux Family Cron — runs every hour. Rolls up analytics + emits proactive suggestions.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, adminClient, AGENTS } from "../_shared/linux-family.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const sb = adminClient();
  const now = new Date();
  const created: any[] = [];

  try {
    // 1. Pull active sowers (anyone with at least one active orchard)
    const { data: sowers } = await sb
      .from("orchards")
      .select("user_id")
      .eq("status", "active");
    const userIds = Array.from(new Set((sowers ?? []).map((s: any) => s.user_id)));

    for (const user_id of userIds) {
      // Ensure agent rows exist
      await sb.rpc("ensure_linux_family_agents", { _user_id: user_id }).catch(() => {});

      // Get this user's seeds + last report + existing pending suggestions
      const [{ data: seeds }, { data: lastReport }, { data: pending }] = await Promise.all([
        sb.from("orchards").select("id,title,views,supporters,created_at").eq("user_id", user_id).eq("status", "active"),
        sb.from("bestowal_reports").select("created_at").eq("user_id", user_id).order("created_at", { ascending: false }).limit(1),
        sb.from("linux_family_suggestions").select("suggestion_type,seed_id").eq("user_id", user_id).eq("status", "pending"),
      ]);

      const pendingSet = new Set((pending ?? []).map((p: any) => `${p.suggestion_type}:${p.seed_id ?? ""}`));
      const has = (type: string, seed_id: string | null = null) => pendingSet.has(`${type}:${seed_id ?? ""}`);

      // Rule A — Weekly report nudge
      const lastReportAt = lastReport?.[0]?.created_at ? new Date(lastReport[0].created_at) : null;
      const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
      if ((!lastReportAt || lastReportAt < weekAgo) && !has("weekly_report")) {
        const { data } = await sb.from("linux_family_suggestions").insert({
          user_id, agent_name: "mint", suggestion_type: "weekly_report",
          title: "📒 Weekly Bestowal Report ready to build?",
          description: "Mint can prepare a 7-day Bestowal Report with totals, top Seeds, and growth trends.",
          proposed_action: { action: "build_report", period_days: 7 },
          expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        }).select().single();
        if (data) created.push(data);
      }

      // Per-seed rules
      for (const seed of seeds ?? []) {
        const views = Number(seed.views ?? 0);
        const supporters = Number(seed.supporters ?? 0);
        const conversion = views > 0 ? supporters / views : 0;

        // Rule B — High views, low conversion → ask Arch to follow up
        if (views >= 50 && conversion < 0.05 && !has("low_conversion_followup", seed.id)) {
          const { data } = await sb.from("linux_family_suggestions").insert({
            user_id, agent_name: "arch", suggestion_type: "low_conversion_followup", seed_id: seed.id,
            title: `📞 Low conversion on "${seed.title}" — shall Arch follow up?`,
            description: `${views} views but only ${supporters} bestowers. Arch can place follow-up calls or Debian can warm-message interested folk.`,
            proposed_action: { action: "comms_blast", message_kind: "community_ask", limit: 10 },
            expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
          }).select().single();
          if (data) created.push(data);
        }

        // Rule C — Strong performer → invite collab
        if (supporters >= 5 && !has("collab_broadcast", seed.id)) {
          const { data } = await sb.from("linux_family_suggestions").insert({
            user_id, agent_name: "debian", suggestion_type: "collab_broadcast", seed_id: seed.id,
            title: `💬 "${seed.title}" is performing well — invite collabs?`,
            description: "Debian can message other bestowars in the tribe with a tribal collab offer.",
            proposed_action: { action: "comms_blast", message_kind: "collab_offer", limit: 15 },
            expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
          }).select().single();
          if (data) created.push(data);
        }

        // Rule D — Brand-new seed (<24h) without a content pack → suggest content
        const seedAge = Date.now() - new Date(seed.created_at).getTime();
        if (seedAge < 24 * 3600 * 1000 && !has("content_pack", seed.id)) {
          const { data: mem } = await sb.from("linux_family_memory").select("id").eq("user_id", user_id).eq("seed_id", seed.id).like("memory_key", "content_pack:%").limit(1);
          if (!mem?.length) {
            const { data } = await sb.from("linux_family_suggestions").insert({
              user_id, agent_name: "tux", suggestion_type: "content_pack", seed_id: seed.id,
              title: `🎨 Build a launch content pack for "${seed.title}"?`,
              description: "Tux drafts a post → Ubuntu polishes → Kali makes a banner → Fedora plans video cuts.",
              proposed_action: { action: "run_content_pack", platform: "instagram", language: "English" },
              expires_at: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
            }).select().single();
            if (data) created.push(data);
          }
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, suggestions_created: created.length, ran_at: now.toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("cron error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
