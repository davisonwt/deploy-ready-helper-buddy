import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-my-custom-header",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPTS: Record<string, string> = {
  // ─── Infrastructure ───
  linden:
    "You are Linden, the Grove Overseer of Sow2Grow. Warm, calm, coordinating. You greet the tribe member, summarize what's happening in their orchard today, surface the next 1-3 priorities, and route them to the right companion if needed. Use the Sow2Grow vocabulary (Bestow / Sow / Orchard / Seed / Tribe). Keep it short and actionable.",
  maple:
    "You are Maple, the Story Sower. You craft authentic SeedFlow posts, captions, content calendars and marketing copy in the warm, community-first Sow2Grow voice. Never sound salesy. Use 'bestow' instead of 'buy'. Default to short, scroll-stopping copy with a clear invitation.",
  cypress:
    "You are Cypress, the Voice Guardian. You review draft content for tone, values and brand alignment with the Sow2Grow tribe. You return a tone score 1-10, a list of issues (with the offending phrase quoted), and a rewritten version that preserves intent but matches the warm, mutual-support voice.",
  willow:
    "You are Willow, the Vision Weaver. You create images for the orchard: seed covers, product photos, banners, post visuals. Generate one image per request that matches the tribe member's brief.",
  birch:
    "You are Birch, the Reel Keeper. You plan short-form video reels, testimonial clips and orchard intros — chat freely, refine the idea, suggest shots, voiceover lines, on-screen text, music vibe, and a 1-line caption.\n\nWhen — and ONLY when — the tribe member explicitly signals they're ready to generate (e.g. 'let's make it', 'generate this', 'looks good — build it', or the user says 'finalize'), end your reply with a fenced ```json block exactly in this shape so the app can wire it into the real generation buttons:\n\n```json\n{\n  \"reel_plan\": {\n    \"scenes\": [\n      { \"shot\": \"<visual description, 1 sentence>\", \"duration_s\": 5, \"image_prompt\": \"<concise prompt for a cover image generator>\" }\n    ],\n    \"voiceover_script\": \"<final spoken text, ≤ 280 chars per 30s of video>\",\n    \"voice\": \"af_bella\",\n    \"music_mood\": \"<one short phrase>\",\n    \"caption\": \"<one-line social caption>\"\n  }\n}\n```\n\nNever invent a reel_plan block unprompted — only when the user signals ready. Allowed voice values: af_bella, af_nicole, af_sarah, af_sky, am_adam, am_michael, bf_emma, bf_isabella, bm_george, bm_lewis. Keep scenes to 1–3 entries (Phase 2 only renders the first scene).",
  elm:
    "You are Elm, the Hearth Messenger. You draft outreach, thank-yous and collaboration proposals on behalf of the tribe member. Always personalised, warm, brief, and ending with a clear invitation. Use Sow2Grow vocabulary.",
  hickory:
    "You are Hickory, the Bridge Caller. You help the tribe member start and route HearthCalls (voice/video). Confirm intent, suggest who to call and why, and propose call agendas in 3-5 bullets.",
  beech:
    "You are Beech, the Pocket Keeper. You produce clear weekly bestowal reports and finance summaries. You have a tool `get_bestowal_summary({ days })` that returns the caller's real bestowal data — USE IT before answering any question about totals, counts, payouts, or trends; do not invent numbers. After the tool returns, lead with the headline number, then 3 bullet insights, then a single 'next sacred step'. USDC is the settlement currency. If the tool returns zero rows, say so honestly.",
  alder:
    "You are Alder, the Storehouse Steward. You help the tribe member track Field & Forge stock and orders. You have two tools: `get_low_stock_products({ threshold })` and `get_open_orders({ limit })` — USE THEM before answering anything about stock levels, restocks, or pending orders. Be concrete: list low items, blocked orders, ETAs. If a tool returns nothing, say so plainly.",
  hawthorn:
    "You are Hawthorn, the Harvest Oracle. You give pricing suggestions and best-time-to-post analysis. You have a tool `get_price_benchmarks({ category })` that returns median/min/max price across active listings — USE IT when the tribe member asks about pricing. Always justify your suggestion in one sentence and offer a confident range, not a single number. For performance questions, work only from what the tribe member tells you — you do not have access to their personal analytics.",

  // ─── Narrative ───
  acorn:
    "You are Acorn, the Seed Intake of Sow2Grow. You welcome first-time sowers with warmth and curiosity, asking 5 to 8 short interview questions one at a time about their product and life. Examples: 'Where do you grow this?', 'What's the hardest part of this season?', 'Who taught you this craft?'. Never pile up questions. Listen. Reflect briefly before the next question. End by summarizing what you learned in 3 sentences and confirming the seed is ready for Root.",
  root:
    "You are Root, the Identity Forger. You read the sower's interview transcript and distill an identity profile: where they live, what shaped them, their struggle, their dream, their calling. Output strict JSON with keys: location, history, struggle, dream, calling, sensory_details (array of vivid concrete images). Keep each field one sentence, never generic.",
  bud:
    "You are Bud, the Promise Designer. You design 3 to 5 bestowal tiers with emotional hooks, in USDC. Each tier has: amount (number), name (warm 2-3 word name), promise (what the bestower receives, vivid and specific), why_it_matters (one sentence linking it to the sower's story). Output JSON array. Avoid corporate language; speak in the sower's voice.",

  // ─── Live ───
  hive:
    "You are Hive, the Room Conductor. You manage live-room flow for Sow2Grow's four formats: Radio, Classroom, Training, Skilldrop. Read the situation given and output: (1) recommended room type, (2) one-line pre-warm message for the audience, (3) two transition cues the sower can listen for, (4) when to consider switching format.",
  nectar:
    "You are Nectar, the Engagement Alchemist. You read the room's energy and propose ONE small intervention to keep the room alive: a poll, a flash-bestowal moment, a Q&A prompt, or a hands-on invitation. Output: { intervention_type, exact_words_to_say, expected_lift }. Be concise — sowers will read this mid-session.",
  petal:
    "You are Petal, the Audience Matcher. Given a seed and a list of candidate tribe members with histories, you select 5-15 best matches. For each, output: { handle, why_match (one sentence), suggested_invite_message (warm, 2 sentences max) }. Match on values and curiosity, not just past spending.",

  // ─── Harvest ───
  grain:
    "You are Grain, the Follow-Up Forger. After a live session ends, you write personalized thank-you messages from the sower to each bestower, and an impact summary for the sower. Use the bestower's name, the bestowal amount, the sower's story snippet, and any kind chat message they left. Tone: warm, sincere, never templated. Always mention 'bestowal' (never 'donation' / 'purchase').",
  sheaf:
    "You are Sheaf, the Relationship Gardener. You read a bestower's history with a sower and write a short nurture message matching their relationship tier (new / returning / core / patron). New = welcoming and gentle. Returning = recognising the pattern. Core = honoring the bond. Patron = reverent, offering reciprocity. Keep messages 4-6 sentences.",
  thresh:
    "You are Thresh, the Feedback Distiller. You have a tool `get_seed_performance({ days, seed_id? })` that returns the caller's real per-seed analytics (views, reach, clicks, messages, calls, bestowals) — USE IT before answering anything about session/seed performance; do not invent numbers. After the tool returns, output strict JSON: { golden_moments: [string], chaff: [string], one_action_this_week: string, suggested_next_session: { format, days_from_now, theme } }. Be honest, never harsh. If the tool returns zero rows, say so and offer guidance from first principles.",

  // ─── Orchestration ───
  groundskeeper:
    "You are the Groundskeeper, the wise steward of Sow2Grow's grove. You speak warmly, slightly archaic, like a grandparent who has tended this land for 40 years. You know every tree-agent: Acorn (seed intake), Root (identity), Maple (story), Bud (tiers), Willow (images), Birch (reels), Cypress (tone review), Elm (messages), Hickory (calls), Beech (finance), Alder (logistics), Hawthorn (insights), Linden (overseer), Hive (live rooms), Nectar (engagement), Petal (audience match), Grain (thank-yous), Sheaf (relationships), Thresh (coaching). When the tribe member asks something a specific tree handles, name that tree gently ('Birch tends recordings — let me open that branch for you') and give a one-paragraph helpful answer. Never sound like a chatbot. Always end with one warm invitation or question.",
};

const IMAGE_MODEL = "google/gemini-2.5-flash-image";
const MAX_TOOL_ROUNDS = 3;

// ── Tool registry ────────────────────────────────────────────────────────────
type ToolCtx = { admin: SupabaseClient; callerId: string };
type ToolDef = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: Record<string, unknown>, ctx: ToolCtx) => Promise<unknown>;
};

const clampInt = (v: unknown, min: number, max: number, dflt: number) => {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  if (!Number.isFinite(n)) return dflt;
  return Math.max(min, Math.min(max, Math.trunc(n)));
};

const sinceIso = (days: number) =>
  new Date(Date.now() - days * 86400_000).toISOString();

// Beech ─ bestowal summary scoped to caller via orchards.user_id
const getBestowalSummary: ToolDef = {
  name: "get_bestowal_summary",
  description:
    "Get the caller's bestowal totals received as a sower in the last N days (default 30). Returns counts, total USDC base amount, breakdown by payout status, top orchards, and 7-day trend.",
  parameters: {
    type: "object",
    properties: {
      days: { type: "integer", description: "Window in days (1-365)", minimum: 1, maximum: 365 },
    },
    additionalProperties: false,
  },
  execute: async (args, { admin, callerId }) => {
    const days = clampInt(args.days, 1, 365, 30);
    const since = sinceIso(days);
    const { data, error } = await admin
      .from("bestowals")
      .select(
        "base_amount, amount, currency, payout_status, release_status, created_at, orchard_id, orchards!inner(user_id, title)"
      )
      .eq("orchards.user_id", callerId)
      .gte("created_at", since)
      .limit(500);
    if (error) return { error: error.message };
    const rows = data ?? [];
    let total = 0;
    const byStatus: Record<string, { count: number; amount: number }> = {};
    const byOrchard: Record<string, { title: string; count: number; amount: number }> = {};
    const dayBuckets: Record<string, number> = {};
    const sevenAgo = Date.now() - 7 * 86400_000;
    for (const r of rows as any[]) {
      const amt = Number(r.base_amount ?? r.amount ?? 0) || 0;
      total += amt;
      const st = String(r.payout_status ?? r.release_status ?? "unknown");
      byStatus[st] ??= { count: 0, amount: 0 };
      byStatus[st].count++;
      byStatus[st].amount += amt;
      const oid = r.orchard_id ?? "unknown";
      const title = r.orchards?.title ?? "(untitled)";
      byOrchard[oid] ??= { title, count: 0, amount: 0 };
      byOrchard[oid].count++;
      byOrchard[oid].amount += amt;
      const ts = new Date(r.created_at).getTime();
      if (ts >= sevenAgo) {
        const d = new Date(r.created_at).toISOString().slice(0, 10);
        dayBuckets[d] = (dayBuckets[d] ?? 0) + amt;
      }
    }
    const topOrchards = Object.entries(byOrchard)
      .map(([orchard_id, v]) => ({ orchard_id, ...v }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
    return {
      window_days: days,
      total_count: rows.length,
      total_base_amount: Number(total.toFixed(2)),
      currency: "USDC",
      by_status: byStatus,
      top_orchards: topOrchards,
      last_7_days_trend: dayBuckets,
      truncated: rows.length === 500,
    };
  },
};

// Alder ─ low stock
const getLowStockProducts: ToolDef = {
  name: "get_low_stock_products",
  description:
    "List the caller's Field & Forge products at or below a stock threshold (default 5).",
  parameters: {
    type: "object",
    properties: {
      threshold: { type: "integer", minimum: 0, maximum: 1000 },
    },
    additionalProperties: false,
  },
  execute: async (args, { admin, callerId }) => {
    const threshold = clampInt(args.threshold, 0, 1000, 5);
    const { data, error } = await admin
      .from("provider_products")
      .select("id, title, price, stock, status, providers!inner(user_id)")
      .eq("providers.user_id", callerId)
      .lte("stock", threshold)
      .limit(200);
    if (error) return { error: error.message };
    return {
      threshold,
      count: data?.length ?? 0,
      items: (data ?? []).map((r: any) => ({
        id: r.id, title: r.title, price: r.price, stock: r.stock, status: r.status,
      })),
    };
  },
};

// Alder ─ open orders
const getOpenOrders: ToolDef = {
  name: "get_open_orders",
  description:
    "List the caller's open Field & Forge orders (pending / accepted / in_transit / escrow_held).",
  parameters: {
    type: "object",
    properties: {
      limit: { type: "integer", minimum: 1, maximum: 100 },
    },
    additionalProperties: false,
  },
  execute: async (args, { admin, callerId }) => {
    const limit = clampInt(args.limit, 1, 100, 20);
    const { data, error } = await admin
      .from("provider_orders")
      .select(
        "id, product_id, quantity, total_amount, status, escrow_status, delivery_city, delivery_country, created_at, providers!inner(user_id)"
      )
      .eq("providers.user_id", callerId)
      .in("status", ["pending", "accepted", "in_transit", "escrow_held"])
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return { error: error.message };
    return {
      count: data?.length ?? 0,
      orders: (data ?? []).map((r: any) => ({
        id: r.id, product_id: r.product_id, quantity: r.quantity,
        total_amount: r.total_amount, status: r.status, escrow_status: r.escrow_status,
        delivery_city: r.delivery_city, delivery_country: r.delivery_country,
        created_at: r.created_at,
      })),
    };
  },
};

// Thresh ─ seed performance
const getSeedPerformance: ToolDef = {
  name: "get_seed_performance",
  description:
    "Get the caller's per-seed daily analytics in the last N days (default 30). Optional seed_id filter.",
  parameters: {
    type: "object",
    properties: {
      days: { type: "integer", minimum: 1, maximum: 180 },
      seed_id: { type: "string", description: "Optional UUID of a specific seed" },
    },
    additionalProperties: false,
  },
  execute: async (args, { admin, callerId }) => {
    const days = clampInt(args.days, 1, 180, 30);
    const since = sinceIso(days);
    let q = admin
      .from("seed_analytics_daily")
      .select("seed_id, metric_date, views, reach, clicks, messages, calls, bestowals_count, bestowals_amount")
      .eq("user_id", callerId)
      .gte("metric_date", since.slice(0, 10))
      .limit(500);
    if (typeof args.seed_id === "string" && /^[0-9a-f-]{36}$/i.test(args.seed_id)) {
      q = q.eq("seed_id", args.seed_id);
    }
    const { data, error } = await q;
    if (error) return { error: error.message };
    const rows = (data ?? []) as any[];
    const totals = { views: 0, reach: 0, clicks: 0, messages: 0, calls: 0, bestowals_count: 0, bestowals_amount: 0 };
    const perSeed: Record<string, typeof totals> = {};
    for (const r of rows) {
      for (const k of Object.keys(totals) as (keyof typeof totals)[]) {
        const v = Number(r[k] ?? 0) || 0;
        totals[k] += v;
        perSeed[r.seed_id] ??= { views: 0, reach: 0, clicks: 0, messages: 0, calls: 0, bestowals_count: 0, bestowals_amount: 0 };
        perSeed[r.seed_id][k] += v;
      }
    }
    const top = Object.entries(perSeed)
      .map(([seed_id, v]) => ({ seed_id, ...v }))
      .sort((a, b) => b.bestowals_amount - a.bestowals_amount)
      .slice(0, 10);
    return {
      window_days: days,
      row_count: rows.length,
      totals,
      top_seeds: top,
      truncated: rows.length === 500,
    };
  },
};

// Hawthorn ─ price benchmarks (public reference data)
const getPriceBenchmarks: ToolDef = {
  name: "get_price_benchmarks",
  description:
    "Return min/median/max price across active public product listings, optionally filtered by category string (case-insensitive partial match).",
  parameters: {
    type: "object",
    properties: {
      category: { type: "string", maxLength: 80 },
    },
    additionalProperties: false,
  },
  execute: async (args, { admin }) => {
    let q = admin
      .from("products")
      .select("price, category")
      .eq("status", "active")
      .not("price", "is", null)
      .limit(1000);
    if (typeof args.category === "string" && args.category.trim()) {
      q = q.ilike("category", `%${args.category.trim().slice(0, 80)}%`);
    }
    const { data, error } = await q;
    if (error) return { error: error.message };
    const prices = (data ?? [])
      .map((r: any) => Number(r.price))
      .filter((n) => Number.isFinite(n) && n > 0)
      .sort((a, b) => a - b);
    if (prices.length === 0) return { sample_size: 0, note: "No active listings matched." };
    const median = prices[Math.floor(prices.length / 2)];
    return {
      sample_size: prices.length,
      min: prices[0],
      median,
      max: prices[prices.length - 1],
      p25: prices[Math.floor(prices.length * 0.25)],
      p75: prices[Math.floor(prices.length * 0.75)],
      category: typeof args.category === "string" ? args.category : null,
      currency_note: "Prices as stored on listings; treat as USDC unless context says otherwise.",
    };
  },
};

const TOOL_REGISTRY: Record<string, ToolDef[]> = {
  beech: [getBestowalSummary],
  alder: [getLowStockProducts, getOpenOrders],
  thresh: [getSeedPerformance],
  hawthorn: [getPriceBenchmarks],
};

const toToolSpec = (t: ToolDef) => ({
  type: "function",
  function: { name: t.name, description: t.description, parameters: t.parameters },
});

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

    // Quota check (one unit per user request regardless of tool rounds)
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
    const isImage = companion === "willow";
    const model = isImage ? IMAGE_MODEL : comp?.default_model ?? "google/gemini-3-flash-preview";

    const tools = !isImage ? (TOOL_REGISTRY[companion] ?? []) : [];
    const ctx: ToolCtx = { admin, callerId: user.id };

    const finalMessages: any[] = [
      { role: "system", content: SYSTEM_PROMPTS[companion] },
      ...messages,
      ...(userPrompt ? [{ role: "user", content: userPrompt }] : []),
    ];

    let text = "";
    let image: string | null = null;
    let tokensIn = 0;
    let tokensOut = 0;
    const toolsFired: string[] = [];
    let lastResp: Response | null = null;
    let lastChoice: any = null;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const aiBody: any = { model, messages: finalMessages };
      if (isImage) aiBody.modalities = ["image", "text"];
      if (tools.length > 0) {
        aiBody.tools = tools.map(toToolSpec);
        aiBody.tool_choice = "auto";
      }

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(aiBody),
      });
      lastResp = aiResp;

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
      const usage = data?.usage ?? {};
      tokensIn += Number(usage?.prompt_tokens ?? 0) || 0;
      tokensOut += Number(usage?.completion_tokens ?? 0) || 0;
      const choice = data?.choices?.[0]?.message ?? {};
      lastChoice = choice;
      const toolCalls = Array.isArray(choice?.tool_calls) ? choice.tool_calls : [];

      if (toolCalls.length === 0) {
        text = choice?.content ?? "";
        image = choice?.images?.[0]?.image_url?.url ?? null;
        break;
      }

      // Append the assistant message verbatim, then execute each tool.
      finalMessages.push({
        role: "assistant",
        content: choice?.content ?? "",
        tool_calls: toolCalls,
      });

      for (const call of toolCalls) {
        const name = call?.function?.name ?? "";
        const argsRaw = call?.function?.arguments ?? "{}";
        let parsed: Record<string, unknown> = {};
        try {
          parsed = typeof argsRaw === "string" ? JSON.parse(argsRaw || "{}") : (argsRaw ?? {});
        } catch {
          parsed = {};
        }
        const tool = tools.find((t) => t.name === name);
        let result: unknown;
        if (!tool) {
          result = { error: `unknown_tool:${name}` };
        } else {
          try {
            result = await tool.execute(parsed, ctx);
            toolsFired.push(name);
          } catch (e) {
            result = { error: e instanceof Error ? e.message : "tool_failed" };
          }
        }
        finalMessages.push({
          role: "tool",
          tool_call_id: call.id,
          name,
          content: JSON.stringify(result).slice(0, 20000),
        });
      }
      // loop continues for another round
    }

    // Safety net: if we exited the loop still mid-tool-call, surface last text
    if (!text && lastChoice && !image) {
      text = lastChoice?.content ?? "I tried to look that up but couldn't finish — please try again.";
    }

    const toolNote = toolsFired.length
      ? ` [tools: ${toolsFired.join(", ")}]`
      : "";

    await admin.from("s2g_companion_runs").insert({
      user_id: user.id,
      companion_slug: companion,
      tier_at_run: q.tier,
      model,
      action,
      input_summary: (userPrompt || JSON.stringify(messages).slice(0, 500)).slice(0, 500),
      output_summary: ((text || (image ? "[image]" : "")) + toolNote).slice(0, 500),
      tokens_in: tokensIn || null,
      tokens_out: tokensOut || null,
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
