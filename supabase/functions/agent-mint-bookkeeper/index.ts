// 📒 Mint the Bookkeeper — Bestowal Reports & financial summaries
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, adminClient, userClient, callAI, logActivity, setAgentStatus } from "../_shared/linux-family.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const sb = await userClient(req);
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "auth required" }), { status: 401, headers: corsHeaders });

    const { period_days = 7, seed_id = null } = await req.json().catch(() => ({}));
    await setAgentStatus(user.id, "mint", "working");

    const admin = adminClient();
    const start = new Date(Date.now() - period_days * 86400000);
    const end = new Date();

    // Pull bestowals
    let q = admin.from("bestowals").select("amount, currency, pockets_count, created_at, payment_status, orchard_id")
      .gte("created_at", start.toISOString())
      .eq("payment_status", "completed");
    const { data: bestowals } = await q;

    // Filter by member's orchards if needed
    let mine = bestowals ?? [];
    if (!seed_id) {
      const { data: orch } = await admin.from("orchards").select("id").eq("user_id", user.id);
      const ids = new Set((orch ?? []).map(o => o.id));
      mine = mine.filter(b => ids.has(b.orchard_id));
    } else {
      mine = mine.filter(b => b.orchard_id === seed_id);
    }

    const totalAmount = mine.reduce((s, b) => s + Number(b.amount || 0), 0);
    const totalCount = mine.length;
    const avgGift = totalCount ? totalAmount / totalCount : 0;

    const metrics = {
      period_days, total_bestowals: totalCount, total_amount: totalAmount,
      average_gift: Number(avgGift.toFixed(2)),
      currency: mine[0]?.currency ?? "USD",
      growth_trend: totalCount > 0 ? "growing" : "quiet",
    };

    // AI-written narrative
    let narrative = "";
    try {
      narrative = await callAI([
        { role: "system", content: "You are Mint, a friendly penguin bookkeeper. Write a warm 2-sentence summary of these results for the member." },
        { role: "user", content: JSON.stringify(metrics) },
      ]);
    } catch { narrative = `Over the last ${period_days} days, ${totalCount} bestowals brought in ${metrics.currency} ${totalAmount.toFixed(2)}.`; }

    const html = `<!DOCTYPE html><html><body style="font-family:system-ui;max-width:600px;margin:auto;padding:24px">
<h1 style="color:#1D9E75">📒 Bestowal Report</h1>
<p style="color:#555">${start.toDateString()} → ${end.toDateString()}</p>
<div style="background:#f6faf7;padding:16px;border-radius:12px;margin:16px 0">
<p><strong>Total bestowals:</strong> ${totalCount}</p>
<p><strong>Total amount:</strong> ${metrics.currency} ${totalAmount.toFixed(2)}</p>
<p><strong>Average gift:</strong> ${metrics.currency} ${avgGift.toFixed(2)}</p>
</div>
<p style="font-style:italic;color:#444">${narrative}</p>
<p style="color:#888;font-size:12px">— Mint the Bookkeeper, Linux Open Source Family 🐧</p>
</body></html>`;

    const { data: report } = await admin.from("bestowal_reports").insert({
      user_id: user.id, seed_id,
      period_start: start.toISOString().slice(0, 10),
      period_end: end.toISOString().slice(0, 10),
      report_type: period_days === 7 ? "weekly" : period_days === 30 ? "monthly" : "on_demand",
      metrics, html_snapshot: html,
    }).select().single();

    await logActivity(user.id, "mint", "report_built",
      `📒 Built a ${period_days}-day Bestowal Report — ${metrics.currency} ${totalAmount.toFixed(2)} from ${totalCount} bestowals.`,
      { report_id: report?.id }, seed_id);
    await setAgentStatus(user.id, "mint", "idle");

    return new Response(JSON.stringify({ report, metrics, narrative }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("mint error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
