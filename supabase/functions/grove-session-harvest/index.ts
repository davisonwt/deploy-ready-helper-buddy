import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-my-custom-header",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PROMPTS = {
  grain:
    "You are Grain, the Follow-Up Forger of Sow2Grow. Given a session summary and a list of bestowers (with name + amount + chat snippet if any), write a short personalized thank-you for EACH bestower from the sower's voice. Output strict JSON: {\"thanks\":[{\"recipient_id\":\"...\",\"message\":\"...\"}],\"sower_summary\":\"...\"}. Use 'bestowal' (never donation/purchase). Warm, sincere, never templated.",
  sheaf:
    "You are Sheaf, the Relationship Gardener. Given a list of bestowers with their tier (new/returning/core/patron) and the sower's story, write ONE short nurture message for EACH bestower (4-6 sentences) matching their tier. Output strict JSON: {\"nurtures\":[{\"recipient_id\":\"...\",\"tier\":\"...\",\"message\":\"...\",\"deliver_in_minutes\":N}]}. Stagger: new=0, returning=60, core=240, patron=1440.",
  thresh:
    "You are Thresh, the Feedback Distiller. Analyse this session and return strict JSON: {\"golden_moments\":[string],\"chaff\":[string],\"one_action_this_week\":string,\"suggested_next_session\":{\"format\":\"radio|classroom|training|skilldrop\",\"days_from_now\":N,\"theme\":string}}. Honest, never harsh. Sower must finish braver.",
};

async function callAI(prompt: string, payload: unknown, apiKey: string) {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: JSON.stringify(payload) },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!resp.ok) throw new Error(`AI ${resp.status}: ${await resp.text()}`);
  const data = await resp.json();
  const txt = data?.choices?.[0]?.message?.content ?? "{}";
  try { return JSON.parse(txt); } catch { return {}; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authenticate the caller — must be the sower themselves.
    const authHeader = req.headers.get("authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = userData.user.id;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json();
    const sowerId = String(body?.sower_id ?? "");
    const sessionId = String(body?.session_id ?? crypto.randomUUID());
    const sessionKind = String(body?.session_kind ?? "live_room"); // live_room|radio|classroom|skilldrop
    const seedTitle = String(body?.seed_title ?? "your seed");
    const transcript = String(body?.transcript ?? "");
    const bestowers: Array<{ user_id: string; name?: string; amount?: number; chat_snippet?: string }> =
      Array.isArray(body?.bestowers) ? body.bestowers : [];

    if (!sowerId) {
      return new Response(JSON.stringify({ error: "sower_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only the sower themselves may trigger their own session harvest.
    if (sowerId !== callerId) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    // Log lifecycle event
    await admin.from("grove_session_events").insert({
      session_kind: sessionKind,
      session_id: sessionId,
      sower_id: sowerId,
      event_type: "session_ended",
      payload: { seed_title: seedTitle, bestower_count: bestowers.length },
    });

    // Update relationship scores
    for (const b of bestowers) {
      const { data: existing } = await admin
        .from("grove_relationship_scores")
        .select("sessions_attended,total_bestowed,consecutive_support")
        .eq("bestower_id", b.user_id).eq("sower_id", sowerId).maybeSingle();
      const sessions = (existing?.sessions_attended ?? 0) + 1;
      const total = Number(existing?.total_bestowed ?? 0) + Number(b.amount ?? 0);
      const consec = (existing?.consecutive_support ?? 0) + 1;
      const { data: tierRow } = await admin.rpc("s2g_relationship_tier_for_score", {
        _sessions: sessions, _total: total, _consecutive: consec,
      } as any);
      const tier = (tierRow as any) ?? "new";
      await admin.from("grove_relationship_scores").upsert({
        bestower_id: b.user_id, sower_id: sowerId, tier,
        sessions_attended: sessions, total_bestowed: total,
        consecutive_support: consec, last_session_at: new Date().toISOString(),
      }, { onConflict: "bestower_id,sower_id" });
      (b as any).tier = tier;
    }

    // Fetch sower display
    const { data: sowerProfile } = await admin
      .from("profiles").select("display_name").eq("user_id", sowerId).maybeSingle();
    const sowerName = (sowerProfile as any)?.display_name ?? "the sower";

    // --- GRAIN: thank-yous ---
    const grainOut = await callAI(PROMPTS.grain, {
      sower: sowerName, seed_title: seedTitle, transcript_excerpt: transcript.slice(0, 4000), bestowers,
    }, LOVABLE_API_KEY).catch((e) => ({ error: String(e) }));

    const dispatch = async (recipient_id: string, agent: string, msg: string, meta: Record<string, unknown> = {}) => {
      await fetch(`${SUPABASE_URL}/functions/v1/grove-dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
        body: JSON.stringify({ recipient_id, agent, body: msg, metadata: { session_id: sessionId, ...meta } }),
      }).catch(() => {});
    };

    if (Array.isArray((grainOut as any)?.thanks)) {
      for (const t of (grainOut as any).thanks) {
        if (t?.recipient_id && t?.message) {
          await dispatch(t.recipient_id, "grain", t.message, { kind: "thank_you", from_sower: sowerId });
        }
      }
    }
    if ((grainOut as any)?.sower_summary) {
      await dispatch(sowerId, "grain", (grainOut as any).sower_summary, { kind: "session_summary" });
    }

    // --- SHEAF: relationship nurture (queued) ---
    const sheafOut = await callAI(PROMPTS.sheaf, {
      sower: sowerName, seed_title: seedTitle, bestowers,
    }, LOVABLE_API_KEY).catch(() => ({ nurtures: [] }));

    if (Array.isArray((sheafOut as any)?.nurtures)) {
      const rows = (sheafOut as any).nurtures
        .filter((n: any) => n?.recipient_id && n?.message)
        .map((n: any) => ({
          recipient_id: n.recipient_id,
          agent_slug: "sheaf",
          body: n.message,
          metadata: { tier: n.tier, session_id: sessionId, from_sower: sowerId },
          scheduled_for: new Date(Date.now() + Number(n.deliver_in_minutes ?? 0) * 60_000).toISOString(),
        }));
      if (rows.length) await admin.from("grove_message_queue").insert(rows);
    }

    // --- THRESH: coaching for sower ---
    const threshOut = await callAI(PROMPTS.thresh, {
      seed_title: seedTitle, transcript_excerpt: transcript.slice(0, 6000),
      bestower_count: bestowers.length,
      total_bestowed: bestowers.reduce((s, b) => s + Number(b.amount ?? 0), 0),
    }, LOVABLE_API_KEY).catch(() => null);

    if (threshOut) {
      const pretty = [
        "**🌾 Thresh — session insights**",
        "",
        `**Golden moments**\n- ${(threshOut.golden_moments ?? []).join("\n- ") || "—"}`,
        "",
        `**Chaff to leave behind**\n- ${(threshOut.chaff ?? []).join("\n- ") || "—"}`,
        "",
        `**One action this week:** ${threshOut.one_action_this_week ?? "—"}`,
        "",
        threshOut.suggested_next_session
          ? `**Next sacred step:** a *${threshOut.suggested_next_session.format}* in ${threshOut.suggested_next_session.days_from_now} days — _${threshOut.suggested_next_session.theme}_`
          : "",
      ].join("\n");
      await dispatch(sowerId, "thresh", pretty, { kind: "coaching", payload: threshOut });
    }

    return new Response(JSON.stringify({
      ok: true, session_id: sessionId,
      grain: !!grainOut, sheaf: !!sheafOut, thresh: !!threshOut,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("grove-session-harvest error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
