// 🥖 Loaf the Logistics Penguin
// Inventory tracking, demand prediction, reorder suggestions and shipping cost tips.
// Reads orchards (treated as SKUs) + recent bestowals (treated as sales velocity)
// and produces a structured logistics brief with AI-narrated recommendations.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, userClient, adminClient, callAI, logActivity, setAgentStatus } from "../_shared/linux-family.ts";

interface SkuRow {
  id: string;
  title: string;
  total_pockets: number;
  filled_pockets: number;
  category: string | null;
  location: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const sb = await userClient(req);
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "auth required" }), { status: 401, headers: corsHeaders });

    const { window_days = 30, seed_id = null } = await req.json().catch(() => ({}));
    await setAgentStatus(user.id, "loaf", "working");
    const admin = adminClient();

    // Load member's active seeds
    const skuQ = admin.from("orchards")
      .select("id,title,total_pockets,filled_pockets,category,location")
      .eq("user_id", user.id)
      .eq("status", "active");
    if (seed_id) skuQ.eq("id", seed_id);
    const { data: skus } = await skuQ;
    const skuList = (skus ?? []) as SkuRow[];

    if (!skuList.length) {
      await setAgentStatus(user.id, "loaf", "idle");
      return new Response(JSON.stringify({ skus: [], note: "No active seeds yet — plant one first 🌱" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Pull bestowals in window for velocity calc
    const since = new Date(Date.now() - window_days * 86400000).toISOString();
    const { data: bestowals } = await admin
      .from("bestowals")
      .select("orchard_id,pockets_count,created_at")
      .in("orchard_id", skuList.map(s => s.id))
      .eq("payment_status", "completed")
      .gte("created_at", since);

    const velocity: Record<string, number> = {};
    (bestowals ?? []).forEach(b => {
      velocity[b.orchard_id] = (velocity[b.orchard_id] ?? 0) + Number(b.pockets_count || 0);
    });

    const briefs = skuList.map(s => {
      const sold = velocity[s.id] ?? 0;
      const dailyRate = sold / window_days;
      const remaining = Math.max(0, s.total_pockets - s.filled_pockets);
      const daysLeft = dailyRate > 0 ? Math.round(remaining / dailyRate) : null;
      const fillRate = s.total_pockets > 0 ? Math.round((s.filled_pockets / s.total_pockets) * 100) : 0;
      let signal: 'reorder_now' | 'plan_reorder' | 'healthy' | 'slow' = 'healthy';
      if (daysLeft !== null && daysLeft <= 7) signal = 'reorder_now';
      else if (daysLeft !== null && daysLeft <= 21) signal = 'plan_reorder';
      else if (sold === 0) signal = 'slow';
      return {
        seed_id: s.id,
        title: s.title,
        category: s.category,
        location: s.location,
        sold_in_window: sold,
        daily_rate: Number(dailyRate.toFixed(2)),
        days_until_sold_out: daysLeft,
        fill_percent: fillRate,
        signal,
      };
    });

    // AI narrative on the strongest signal
    const focus = briefs.find(b => b.signal === 'reorder_now')
      ?? briefs.find(b => b.signal === 'plan_reorder')
      ?? briefs.find(b => b.signal === 'slow')
      ?? briefs[0];
    let narrative = "";
    try {
      narrative = await callAI([
        { role: "system", content: "You are Loaf 🥖, a warm, no-nonsense logistics penguin for Sow2Grow. In 2 short sentences, advise the member on inventory + shipping. Plain English, gentle tone, end with one concrete next step." },
        { role: "user", content: `Window: ${window_days}d. Focus seed: ${JSON.stringify(focus)}. All seeds: ${JSON.stringify(briefs)}.` },
      ]);
    } catch {
      narrative = `Loaf checked your shelves: ${focus.title} is ${focus.signal.replace('_', ' ')}. Plan your next batch in good time.`;
    }

    await logActivity(user.id, "loaf", "logistics_brief",
      `🥖 Logistics brief built for ${briefs.length} seed(s).`,
      { count: briefs.length, focus: focus.title, signal: focus.signal }, seed_id);
    await setAgentStatus(user.id, "loaf", "idle");

    return new Response(JSON.stringify({ window_days, briefs, focus, narrative }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("loaf error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: corsHeaders });
  }
});
