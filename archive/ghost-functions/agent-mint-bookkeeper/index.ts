// 📒 Mint the Bookkeeper (Mint-Pro upgrade)
// Bestowal Reports + global tax/compliance helper.
// Modes:
//   • report      → traditional financial summary (default, free)
//   • tax_brief   → simple country-aware tax + compliance notes (Ambassador-only via orchestrator)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, adminClient, userClient, callAI, logActivity, setAgentStatus } from "../_shared/linux-family.ts";

// Lightweight country → tax/compliance hints. Generic, plain-language.
// NOT legal advice — Mint says so explicitly.
const COUNTRY_HINTS: Record<string, { vat: string; threshold: string; reminders: string[] }> = {
  ZA: { vat: "VAT 15%", threshold: "VAT registration required above ZAR 1,000,000 turnover/12mo",
    reminders: ["SARS provisional tax due Aug & Feb", "Keep invoices for 5 years"] },
  US: { vat: "Sales tax varies by state", threshold: "Most states: economic nexus ~ USD 100k or 200 transactions",
    reminders: ["1099-K may apply for online platforms", "Quarterly estimated tax: Apr/Jun/Sep/Jan"] },
  GB: { vat: "VAT 20%", threshold: "VAT registration required above £90,000 turnover/12mo",
    reminders: ["MTD compliant records required", "Self-assessment due 31 Jan"] },
  NG: { vat: "VAT 7.5%", threshold: "Mandatory VAT registration on all taxable supplies",
    reminders: ["Monthly VAT return by 21st", "Companies Income Tax return annually"] },
  KE: { vat: "VAT 16%", threshold: "VAT registration required above KES 5,000,000",
    reminders: ["Monthly VAT return by 20th", "iTax filings"] },
  IN: { vat: "GST 5–18%", threshold: "GST registration above ₹40 lakh (goods) / ₹20 lakh (services)",
    reminders: ["GSTR-3B monthly", "Income tax return by 31 Jul"] },
  EU: { vat: "VAT varies 17–27%", threshold: "Distance-selling threshold €10,000 (OSS scheme)",
    reminders: ["File OSS quarterly if cross-border", "Keep invoices for 10 years"] },
};

function inferCountry(country?: string | null): string {
  if (!country) return "ZA";
  const c = country.trim().toUpperCase();
  if (c.length === 2 && COUNTRY_HINTS[c]) return c;
  if (c.includes("SOUTH AFRICA")) return "ZA";
  if (c.includes("UNITED STATES") || c === "USA") return "US";
  if (c.includes("UNITED KINGDOM") || c === "UK") return "GB";
  if (c.includes("NIGERIA")) return "NG";
  if (c.includes("KENYA")) return "KE";
  if (c.includes("INDIA")) return "IN";
  return "EU";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const sb = await userClient(req);
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "auth required" }), { status: 401, headers: corsHeaders });

    const { mode = "report", period_days = 7, seed_id = null, country = null } = await req.json().catch(() => ({}));
    await setAgentStatus(user.id, "mint", "working");

    const admin = adminClient();
    const start = new Date(Date.now() - period_days * 86400000);
    const end = new Date();

    // Pull bestowals
    const { data: bestowals } = await admin
      .from("bestowals")
      .select("amount, currency, pockets_count, created_at, payment_status, orchard_id")
      .gte("created_at", start.toISOString())
      .eq("payment_status", "completed");

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
    const reportCurrency = mine[0]?.currency ?? "USD";

    const metrics = {
      period_days, total_bestowals: totalCount, total_amount: totalAmount,
      average_gift: Number(avgGift.toFixed(2)),
      currency: reportCurrency,
      growth_trend: totalCount > 0 ? "growing" : "quiet",
    };

    // ===== TAX / COMPLIANCE BRIEF MODE (Mint-Pro) =====
    if (mode === "tax_brief") {
      // Resolve country: explicit param > profile.country > fallback ZA
      let resolvedCountry = country;
      if (!resolvedCountry) {
        const { data: prof } = await admin.from("profiles").select("country").eq("user_id", user.id).maybeSingle();
        resolvedCountry = (prof as any)?.country ?? null;
      }
      const code = inferCountry(resolvedCountry);
      const hints = COUNTRY_HINTS[code] ?? COUNTRY_HINTS.EU;

      // Rough taxable revenue = totalAmount (gross)
      const vatPercentMatch = hints.vat.match(/([\d.]+)%/);
      const vatPct = vatPercentMatch ? Number(vatPercentMatch[1]) : 0;
      const vatEstimate = vatPct ? Number((totalAmount * vatPct / 100).toFixed(2)) : 0;

      let narrative = "";
      try {
        narrative = await callAI([
          { role: "system", content: "You are Mint 📒 in Pro mode — a friendly bookkeeper penguin. In plain warm English (3 short sentences) explain what this member should keep an eye on this period. Always end with: 'This is general guidance, not legal/tax advice — please confirm with a local accountant.'" },
          { role: "user", content: `Country: ${code}. Period: ${period_days}d. Gross sales: ${reportCurrency} ${totalAmount.toFixed(2)} from ${totalCount} bestowals. ${hints.vat}. Threshold: ${hints.threshold}. Reminders: ${hints.reminders.join('; ')}.` },
        ]);
      } catch {
        narrative = `Over ${period_days} days you collected ${reportCurrency} ${totalAmount.toFixed(2)}. ${hints.vat}. ${hints.reminders[0] ?? ''} This is general guidance — confirm with a local accountant.`;
      }

      const html = `<!DOCTYPE html><html><body style="font-family:system-ui;max-width:600px;margin:auto;padding:24px">
<h1 style="color:#1D9E75">📒 Mint-Pro: Tax & Compliance Brief</h1>
<p style="color:#555">${start.toDateString()} → ${end.toDateString()} · Country: <strong>${code}</strong></p>
<div style="background:#f6faf7;padding:16px;border-radius:12px;margin:16px 0">
<p><strong>Gross sales (period):</strong> ${reportCurrency} ${totalAmount.toFixed(2)}</p>
<p><strong>Tax regime:</strong> ${hints.vat}</p>
<p><strong>Estimated VAT/sales tax (if applicable):</strong> ${reportCurrency} ${vatEstimate.toFixed(2)}</p>
<p><strong>Registration threshold:</strong> ${hints.threshold}</p>
</div>
<h3 style="color:#1D9E75;font-size:14px">Reminders</h3>
<ul>${hints.reminders.map(r => `<li>${r}</li>`).join('')}</ul>
<p style="font-style:italic;color:#444;margin-top:16px">${narrative}</p>
<p style="color:#888;font-size:12px">— Mint the Bookkeeper, Linux Open Source Family 🐧 · General guidance only, not legal/tax advice.</p>
</body></html>`;

      const briefMetrics = {
        ...metrics, mode: "tax_brief", country: code,
        vat_percent: vatPct, vat_estimate: vatEstimate,
        threshold: hints.threshold, reminders: hints.reminders,
      };

      const { data: report } = await admin.from("bestowal_reports").insert({
        user_id: user.id, seed_id,
        period_start: start.toISOString().slice(0, 10),
        period_end: end.toISOString().slice(0, 10),
        report_type: "tax_brief",
        metrics: briefMetrics, html_snapshot: html,
      }).select().single();

      await logActivity(user.id, "mint", "tax_brief",
        `📒 Mint-Pro tax brief built for ${code} — ${reportCurrency} ${totalAmount.toFixed(2)} gross.`,
        { report_id: report?.id, country: code }, seed_id);
      await setAgentStatus(user.id, "mint", "idle");

      return new Response(JSON.stringify({ report, metrics: briefMetrics, narrative, country: code }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ===== STANDARD REPORT MODE =====
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
