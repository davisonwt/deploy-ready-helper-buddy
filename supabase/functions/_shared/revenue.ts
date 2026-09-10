// Bookkeeping Phase 1: the Deno-side helpers the finalizers use to write
// S2G's fee into public.revenue_ledger at the release moment.
//
//   resolveOrderEnvironment  -> live | devnet | sandbox for an order, from
//                               the Solana intent's cluster / PAYPAL_ENV
//   recordRevenue            -> rpc('record_revenue', ...) that NEVER throws:
//                               a missing revenue row is recoverable from
//                               the backfill query, a failed order is not.
//
// The rules themselves live in revenueRules.ts (pure, unit-tested).

import {
  environmentFor,
  railFor,
  type RevenueEnvironment,
  type RevenueKind,
  type RevenueRail,
} from "./revenueRules.ts";

// deno-lint-ignore no-explicit-any
type SupabaseLike = any;

export function paypalEnvironment(): RevenueEnvironment {
  return environmentFor({ provider: "paypal", paypalEnv: (Deno.env.get("PAYPAL_ENV") ?? "").trim().toLowerCase() });
}

/** Paystack has no separate env var like PAYPAL_ENV -- mode comes from which secret key is configured (see _shared/paystack/client.ts's paystackEnvironmentFromKey()). */
export function paystackEnvironment(): RevenueEnvironment {
  const key = Deno.env.get("PAYSTACK_SECRET_KEY") ?? "";
  return environmentFor({ provider: "paystack", paystackKeyMode: key.startsWith("sk_test_") ? "sandbox" : "live" });
}

/**
 * Which environment did this order's money move on? Solana orders answer
 * from their payment intent's cluster; PayPal from PAYPAL_ENV; Paystack from
 * which secret key is configured; balance and legacy rows are live. Unknown
 * Solana orders are devnet, never live.
 */
export async function resolveOrderEnvironment(
  supabase: SupabaseLike,
  params: { provider: string | null | undefined; orderKind: string; orderId: string },
): Promise<RevenueEnvironment> {
  if (params.provider === "solana") {
    let cluster: string | null = null;
    try {
      const { data } = await supabase
        .from("solana_payment_intents")
        .select("cluster, status, paid_at, created_at")
        .eq("order_kind", params.orderKind)
        .eq("order_id", params.orderId)
        .order("paid_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(5);
      const rows = (data ?? []) as Array<{ cluster: string | null; status: string | null }>;
      cluster = (rows.find((r) => r.status === "paid") ?? rows[0])?.cluster ?? null;
    } catch (err) {
      console.warn("[revenue] intent lookup failed; treating as devnet", err);
    }
    return environmentFor({ provider: "solana", solanaCluster: cluster });
  }
  if (params.provider === "paypal") return paypalEnvironment();
  if (params.provider === "paystack") return paystackEnvironment();
  return "live";
}

export interface RecordRevenueParams {
  kind: RevenueKind;
  amount: number;
  environment: RevenueEnvironment;
  sourceTable: string;
  sourceId: string;
  rail?: RevenueRail | string | null;
  releaseRef?: string | null;
  recognisedAt?: string | null;
  notes?: string | null;
}

/**
 * Writes one fee row. Returns the ledger row id, or null when nothing was
 * recorded (duplicate handled server-side returns the existing row; a
 * refused source or an RPC failure returns null and is logged). Never
 * throws.
 */
export async function recordRevenue(supabase: SupabaseLike, p: RecordRevenueParams): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc("record_revenue", {
      _kind: p.kind,
      _amount: p.amount,
      _environment: p.environment,
      _source_table: p.sourceTable,
      _source_id: p.sourceId,
      _rail: railFor(p.rail ?? null),
      _release_ref: p.releaseRef ?? null,
      _recognised_at: p.recognisedAt ?? new Date().toISOString(),
      _notes: p.notes ?? null,
    });
    if (error) {
      console.error("[revenue] record_revenue failed (order unaffected)", p.kind, p.sourceTable, p.sourceId, error.message);
      return null;
    }
    const id = (data && typeof data === "object" && "id" in data) ? String((data as { id: string }).id) : null;
    if (!id) {
      console.warn("[revenue] record_revenue recorded nothing (source not released or zero fee)", p.kind, p.sourceTable, p.sourceId);
    }
    return id;
  } catch (err) {
    console.error("[revenue] record_revenue threw (order unaffected)", p.kind, p.sourceTable, p.sourceId, err);
    return null;
  }
}
