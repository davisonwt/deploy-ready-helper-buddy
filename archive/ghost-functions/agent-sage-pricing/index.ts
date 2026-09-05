// 🔮 Sage the Pricing Oracle
// Multi-currency pricing intelligence: looks at the member's seed, comparable
// tribe seeds in the same category, and produces a fair-price band + a
// localized suggestion in the member's preferred currency.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, userClient, adminClient, callAI, logActivity, setAgentStatus } from "../_shared/linux-family.ts";

// Static FX rates vs USDC (mirrors src/lib/i18n/currency.ts foundation set).
const FX: Record<string, number> = {
  USDC: 1, USD: 1, EUR: 0.92, GBP: 0.79, ZAR: 18.5, NGN: 1550, KES: 129,
  GHS: 12.5, EGP: 49, MAD: 10, INR: 84, BRL: 5.1, MXN: 17.2, CAD: 1.36,
  AUD: 1.52, JPY: 152, CNY: 7.25, AED: 3.67, SAR: 3.75, TRY: 33,
};
const fmt = (n: number, cur: string) => {
  const rate = FX[cur] ?? 1;
  const v = n * rate;
  return `${cur} ${v.toLocaleString(undefined, { maximumFractionDigits: v < 10 ? 2 : 0 })}`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const sb = await userClient(req);
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "auth required" }), { status: 401, headers: corsHeaders });

    const { seed_id, target_currency = "USDC" } = await req.json().catch(() => ({}));
    if (!seed_id) return new Response(JSON.stringify({ error: "seed_id required" }), { status: 400, headers: corsHeaders });

    await setAgentStatus(user.id, "sage", "working");
    const admin = adminClient();

    // Load the member's seed
    const { data: seed } = await admin
      .from("orchards")
      .select("id,user_id,title,description,category,location,pocket_price,total_pockets,seed_value,currency")
      .eq("id", seed_id)
      .maybeSingle();
    if (!seed || seed.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "seed not found" }), { status: 404, headers: corsHeaders });
    }

    // Load comps: same category, active, other members
    const { data: comps } = await admin
      .from("orchards")
      .select("pocket_price,seed_value,location,total_pockets,filled_pockets")
      .eq("category", seed.category ?? "")
      .neq("user_id", user.id)
      .eq("status", "active")
      .gt("pocket_price", 0)
      .limit(80);

    const compPrices = (comps ?? []).map(c => Number(c.pocket_price)).filter(p => p > 0).sort((a, b) => a - b);
    const median = compPrices.length ? compPrices[Math.floor(compPrices.length / 2)] : Number(seed.pocket_price ?? 0);
    const p25 = compPrices.length ? compPrices[Math.floor(compPrices.length * 0.25)] : median * 0.8;
    const p75 = compPrices.length ? compPrices[Math.floor(compPrices.length * 0.75)] : median * 1.2;
    const myPrice = Number(seed.pocket_price ?? 0);

    let position: 'below_market' | 'at_market' | 'above_market' = 'at_market';
    if (myPrice < p25) position = 'below_market';
    else if (myPrice > p75) position = 'above_market';

    // Local sell-through signal — same-region average fill
    const local = (comps ?? []).filter(c => c.location && seed.location && c.location.toLowerCase() === seed.location.toLowerCase());
    const localFillAvg = local.length
      ? Math.round((local.reduce((s, c) => s + (c.total_pockets > 0 ? (c.filled_pockets / c.total_pockets) : 0), 0) / local.length) * 100)
      : null;

    const recommended = {
      low: Number(p25.toFixed(2)),
      mid: Number(median.toFixed(2)),
      high: Number(p75.toFixed(2)),
    };

    // AI narrative
    let narrative = "";
    try {
      narrative = await callAI([
        { role: "system", content: "You are Sage 🔮, a calm, fair pricing oracle for the Sow2Grow tribe. In 2 sentences, advise the sower in plain warm English. End with one concrete suggestion. No markdown." },
        { role: "user", content: `Seed: ${seed.title} (${seed.category ?? 'general'}, ${seed.location ?? 'global'}). Current pocket price: USDC ${myPrice}. Tribe comps: low ${recommended.low}, mid ${recommended.mid}, high ${recommended.high}. Position: ${position}. Local fill avg: ${localFillAvg ?? 'n/a'}%. Member's preferred currency: ${target_currency}.` },
      ]);
    } catch {
      narrative = `Tribe comps centre around ${fmt(median, target_currency)} per pocket. You are ${position.replace('_', ' ')}.`;
    }

    const result = {
      seed_id,
      my_price_usdc: myPrice,
      my_price_local: fmt(myPrice, target_currency),
      position,
      recommended_band_usdc: recommended,
      recommended_band_local: {
        low: fmt(recommended.low, target_currency),
        mid: fmt(recommended.mid, target_currency),
        high: fmt(recommended.high, target_currency),
      },
      comps_count: compPrices.length,
      local_fill_avg_pct: localFillAvg,
      target_currency,
      narrative,
    };

    await logActivity(user.id, "sage", "pricing_brief",
      `🔮 Pricing read for "${seed.title}" — ${position.replace('_', ' ')} (${result.my_price_local}).`,
      { position, comps: compPrices.length }, seed_id);
    await setAgentStatus(user.id, "sage", "idle");

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("sage error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: corsHeaders });
  }
});
