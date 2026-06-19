// Returns the list of currencies the merchant has enabled on NOWPayments.
// Used by src/components/payouts/AddNowPaymentsWallet.tsx to populate the
// currency/network dropdown. In-memory cached for 5 minutes per cold start.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const NOWPAYMENTS_API = "https://api.nowpayments.io/v1";
const CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry = { at: number; payload: unknown };
let cache: CacheEntry | null = null;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("NOWPAYMENTS_API_KEY");
    if (!apiKey) {
      return json({ error: "NOWPAYMENTS_API_KEY not configured" }, 500);
    }

    if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
      return json(cache.payload satisfies unknown);
    }

    // /merchant/coins returns the codes the merchant has enabled.
    // /full-currencies enriches each with network + min payout info.
    const [merchantRes, fullRes] = await Promise.all([
      fetch(`${NOWPAYMENTS_API}/merchant/coins`, {
        headers: { "x-api-key": apiKey },
      }),
      fetch(`${NOWPAYMENTS_API}/full-currencies`, {
        headers: { "x-api-key": apiKey },
      }),
    ]);

    if (!merchantRes.ok) {
      const body = await merchantRes.text();
      return json(
        { error: "NOWPayments /merchant/coins failed", status: merchantRes.status, body },
        502,
      );
    }

    const merchantJson = await merchantRes.json() as { selectedCurrencies?: string[] };
    const enabledCodes = new Set(
      (merchantJson.selectedCurrencies ?? []).map((c) => c.toLowerCase()),
    );

    let enriched: Array<Record<string, unknown>> = [];
    if (fullRes.ok) {
      const fullJson = await fullRes.json() as {
        currencies?: Array<{
          code?: string;
          name?: string;
          network?: string;
          min_amount?: number;
          enable?: boolean;
        }>;
      };
      enriched = (fullJson.currencies ?? [])
        .filter((c) => c.code && enabledCodes.has(c.code.toLowerCase()))
        .map((c) => ({
          code: c.code,
          name: c.name ?? c.code,
          network: c.network ?? null,
          min_amount: c.min_amount ?? null,
        }));
    } else {
      // Fallback: just return codes if /full-currencies is not available on this plan.
      enriched = [...enabledCodes].map((code) => ({
        code,
        name: code,
        network: null,
        min_amount: null,
      }));
    }

    const payload = { currencies: enriched };
    cache = { at: Date.now(), payload };
    return json(payload);
  } catch (err) {
    console.error("nowpayments-list-currencies error", err);
    return json(
      { error: err instanceof Error ? err.message : String(err) },
      500,
    );
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
