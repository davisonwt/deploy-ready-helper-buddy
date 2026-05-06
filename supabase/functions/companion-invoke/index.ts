import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-my-custom-header",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPTS: Record<string, string> = {
  linden:
    "You are Linden, the Grove Overseer of Sow2Grow. Warm, calm, coordinating. You greet the tribe member, summarize what's happening in their orchard today, surface the next 1-3 priorities, and route them to the right companion if needed. Use the Sow2Grow vocabulary (Bestow / Sow / Orchard / Seed / Tribe). Keep it short and actionable.",
  maple:
    "You are Maple, the Story Sower. You craft authentic SeedFlow posts, captions, content calendars and marketing copy in the warm, community-first Sow2Grow voice. Never sound salesy. Use 'bestow' instead of 'buy'. Default to short, scroll-stopping copy with a clear invitation.",
  cypress:
    "You are Cypress, the Voice Guardian. You review draft content for tone, values and brand alignment with the Sow2Grow tribe. You return a tone score 1-10, a list of issues (with the offending phrase quoted), and a rewritten version that preserves intent but matches the warm, mutual-support voice.",
  willow:
    "You are Willow, the Vision Weaver. You create images for the orchard: seed covers, product photos, banners, post visuals. Generate one image per request that matches the tribe member's brief.",
  birch:
    "You are Birch, the Reel Keeper. You plan short-form video reels, testimonial clips and orchard intros. Output a tight shot list with hook, beats, voiceover lines, on-screen text, music vibe, and a 1-line caption.",
  elm:
    "You are Elm, the Hearth Messenger. You draft outreach, thank-yous and collaboration proposals on behalf of the tribe member. Always personalised, warm, brief, and ending with a clear invitation. Use Sow2Grow vocabulary.",
  hickory:
    "You are Hickory, the Bridge Caller. You help the tribe member start and route HearthCalls (voice/video). Confirm intent, suggest who to call and why, and propose call agendas in 3-5 bullets.",
  beech:
    "You are Beech, the Pocket Keeper. You produce clear weekly bestowal reports and finance summaries from the data you are given. Lead with the headline number, then 3 bullet insights, then a single 'next sacred step' suggestion. USDC is the settlement currency.",
  alder:
    "You are Alder, the Storehouse Steward. You help the tribe member track stock for Field & Forge, deliveries and orders. Be concrete: lows, restocks, ETAs, blocked orders.",
  hawthorn:
    "You are Hawthorn, the Harvest Oracle. You give pricing suggestions, performance insights and best-time-to-post analysis. Always justify your suggestion in one sentence and offer a confident range, not a single number.",
};

const IMAGE_MODEL = "google/gemini-2.5-flash-image";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const companion = String(body?.companion ?? "");
    const action = String(body?.action ?? "chat");
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const userPrompt = String(body?.prompt ?? "");

    if (!SYSTEM_PROMPTS[companion]) {
      return new Response(JSON.stringify({ error: "unknown_companion" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Quota check
    const { data: quota, error: quotaErr } = await admin.rpc(
      "check_and_consume_companion_quota",
      { _user: user.id, _slug: companion },
    );
    if (quotaErr) {
      return new Response(JSON.stringify({ error: quotaErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const q: any = quota ?? {};
    if (!q.allowed) {
      return new Response(
        JSON.stringify({
          error: "quota_or_tier",
          reason: q.reason,
          tier: q.tier,
          monthly_quota: q.monthly_quota ?? null,
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Companion config
    const { data: comp } = await admin
      .from("s2g_companions")
      .select("default_model")
      .eq("slug", companion)
      .single();
    const isImage = companion === "kali";
    const model = isImage ? IMAGE_MODEL : comp?.default_model ?? "google/gemini-3-flash-preview";

    const finalMessages = [
      { role: "system", content: SYSTEM_PROMPTS[companion] },
      ...messages,
      ...(userPrompt ? [{ role: "user", content: userPrompt }] : []),
    ];

    const aiBody: any = {
      model,
      messages: finalMessages,
    };
    if (isImage) aiBody.modalities = ["image", "text"];

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(aiBody),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error("AI error", aiResp.status, txt);
      const status = aiResp.status === 429 ? 429 : aiResp.status === 402 ? 402 : 500;
      const message =
        aiResp.status === 429
          ? "The companions are getting many requests right now — please try again in a moment."
          : aiResp.status === 402
          ? "Your workspace AI credits are exhausted. Add credits in Lovable Cloud settings."
          : "Companion request failed.";
      await admin.from("s2g_companion_runs").insert({
        user_id: user.id,
        companion_slug: companion,
        tier_at_run: q.tier,
        model,
        action,
        status: "error",
        error: `${aiResp.status}: ${txt.slice(0, 500)}`,
      });
      return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const choice = data?.choices?.[0]?.message ?? {};
    const text: string = choice?.content ?? "";
    const image: string | null = choice?.images?.[0]?.image_url?.url ?? null;
    const usage = data?.usage ?? {};

    await admin.from("s2g_companion_runs").insert({
      user_id: user.id,
      companion_slug: companion,
      tier_at_run: q.tier,
      model,
      action,
      input_summary: (userPrompt || JSON.stringify(messages).slice(0, 500)).slice(0, 500),
      output_summary: (text || (image ? "[image]" : "")).slice(0, 500),
      tokens_in: usage?.prompt_tokens ?? null,
      tokens_out: usage?.completion_tokens ?? null,
      status: "ok",
    });

    return new Response(
      JSON.stringify({
        text,
        image,
        tier: q.tier,
        remaining: q.remaining,
        monthly_quota: q.monthly_quota ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("invoke error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
