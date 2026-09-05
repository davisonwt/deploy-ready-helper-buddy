// 🤝 Bestowal Matching Engine
// Scans recent orchards, finds smart collaboration pairings (cross-category complements,
// same-region bundles, co-promotion), persists to tribal_matches, and optionally
// asks Debian to send opt-in DMs to both members.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, userClient, adminClient, callAI, logActivity, setAgentStatus } from "../_shared/linux-family.ts";

interface OrchardLite {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string | null;
  location: string | null;
}

// Lightweight pairing heuristic — picks pairs where:
// • different owners
// • complementary or same category
// • same location preferred
function scorePair(a: OrchardLite, b: OrchardLite): number {
  if (a.user_id === b.user_id) return 0;
  let s = 0.3;
  if (a.location && b.location && a.location.toLowerCase() === b.location.toLowerCase()) s += 0.3;
  if (a.category && b.category) {
    if (a.category === b.category) s += 0.2;       // same tribe — co-promo
    else s += 0.25;                                 // different — bundle potential
  }
  return Math.min(0.99, s);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const sb = await userClient(req);
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "auth required" }), { status: 401, headers: corsHeaders });

    const { mode = "scan", dispatch_dm = false, max_pairs = 5 } = await req.json().catch(() => ({}));
    await setAgentStatus(user.id, "gentoo", "working");
    const admin = adminClient();

    // Pull this user's orchards + a window of other recent orchards
    const { data: mine } = await admin
      .from("orchards")
      .select("id,user_id,title,description,category,location")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(20);

    const { data: others } = await admin
      .from("orchards")
      .select("id,user_id,title,description,category,location")
      .neq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(120);

    const myList = (mine ?? []) as OrchardLite[];
    const otherList = (others ?? []) as OrchardLite[];

    // Generate candidate pairs
    type Candidate = { a: OrchardLite; b: OrchardLite; conf: number };
    const candidates: Candidate[] = [];
    for (const a of myList) {
      for (const b of otherList) {
        const conf = scorePair(a, b);
        if (conf >= 0.55) candidates.push({ a, b, conf });
      }
    }
    // Sort by confidence and dedupe by partner user
    candidates.sort((x, y) => y.conf - x.conf);
    const seenPartners = new Set<string>();
    const top: Candidate[] = [];
    for (const c of candidates) {
      if (seenPartners.has(c.b.user_id)) continue;
      seenPartners.add(c.b.user_id);
      top.push(c);
      if (top.length >= max_pairs) break;
    }

    // Skip pairs that already have an open match recently
    const matchInserts: any[] = [];
    for (const c of top) {
      const { data: existing } = await admin
        .from("tribal_matches")
        .select("id,status")
        .or(`and(member_a_id.eq.${user.id},member_b_id.eq.${c.b.user_id}),and(member_a_id.eq.${c.b.user_id},member_b_id.eq.${user.id})`)
        .in("status", ["pending", "accepted"])
        .gte("created_at", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
        .limit(1)
        .maybeSingle();
      if (existing) continue;

      // AI reason — short warm whisper
      let reason = `${c.a.title} and ${c.b.title} feel like they grow well together.`;
      let action = "Reach out and propose a friendly bundle or cross-promo.";
      try {
        const ai = await callAI([
          { role: "system", content: "You are Gentoo 🐧, the warm tribal matchmaker. Reply with strict JSON: {\"reason\":\"...\",\"action\":\"...\"}. Reason ≤ 140 chars, action ≤ 90 chars. No markdown." },
          { role: "user", content: `My seed: ${c.a.title} (${c.a.category ?? 'general'}, ${c.a.location ?? 'global'}). Tribe member's seed: ${c.b.title} (${c.b.category ?? 'general'}, ${c.b.location ?? 'global'}). Suggest a warm collaboration.` },
        ]);
        const parsed = JSON.parse(ai.replace(/```json|```/g, "").trim());
        if (parsed.reason) reason = parsed.reason;
        if (parsed.action) action = parsed.action;
      } catch {/* fallback */}

      matchInserts.push({
        member_a_id: user.id,
        member_b_id: c.b.user_id,
        match_type: c.a.category === c.b.category ? "co_promotion" : "bundle",
        match_reason: reason,
        suggested_action: action,
        confidence_score: c.conf,
        seed_a_id: c.a.id,
        seed_b_id: c.b.id,
        metadata: {
          a_title: c.a.title, b_title: c.b.title,
          a_category: c.a.category, b_category: c.b.category,
          a_location: c.a.location, b_location: c.b.location,
        },
      });
    }

    let created: any[] = [];
    if (matchInserts.length && mode !== "preview") {
      const { data: ins } = await admin
        .from("tribal_matches")
        .insert(matchInserts)
        .select();
      created = ins ?? [];
    }

    // Optionally fire Debian DMs (opt-in dispatch)
    let dms_sent = 0;
    if (dispatch_dm && created.length) {
      for (const m of created) {
        try {
          const body = `🌱 ${m.match_reason}\n\n${m.suggested_action}`;
          await admin.from("linux_family_outbound_messages").insert({
            user_id: user.id,
            recipient_user_id: m.member_b_id,
            message_body: body,
            message_type: "collab_offer",
            channel: "chatapp",
            status: "queued",
            metadata: { tribal_match_id: m.id },
          });
          dms_sent++;
        } catch (_) { /* skip */ }
      }
    }

    await logActivity(user.id, "gentoo", "matches_generated",
      `🤝 Found ${created.length} tribal match(es)${dms_sent ? `, queued ${dms_sent} DM(s)` : ''}.`,
      { count: created.length, dms_sent });
    await setAgentStatus(user.id, "gentoo", "idle");

    return new Response(JSON.stringify({
      preview: mode === "preview" ? matchInserts : undefined,
      created: created.length,
      matches: created,
      dms_sent,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("matcher error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: corsHeaders });
  }
});
