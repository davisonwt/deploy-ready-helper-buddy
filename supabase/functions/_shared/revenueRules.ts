// Bookkeeping Phase 1 (BOOKKEEPING-PLAN.md section 3): the rules of the
// revenue ledger, as pure functions. This is the TypeScript twin of
// public.record_revenue() / public.revenue_summary() in
// supabase/migrations/20260906120000_revenue_ledger.sql, kept free of Deno
// and Supabase imports so src/test/revenue-ledger.test.ts can exercise it.
// If a rule changes here it changes in the migration, and vice versa.

export type RevenueKind =
  | "sale_fee"
  | "gift_fee"
  | "content_fee"
  | "booking_fee"
  | "orchard_fee"
  | "processor_fee_income"
  | "refund_cost"
  | "payout_fee_cost"
  | "correction"
  | "opening_balance";

export type RevenueDirection = "income" | "cost";
export type RevenueEnvironment = "live" | "devnet" | "sandbox";
export type RevenueRail = "solana" | "paypal" | "balance" | "nowpayments" | "none";

export const INCOME_KINDS: readonly RevenueKind[] = [
  "sale_fee", "gift_fee", "content_fee", "booking_fee", "orchard_fee", "processor_fee_income",
];
export const COST_KINDS: readonly RevenueKind[] = ["refund_cost", "payout_fee_cost"];
export const SIGNED_KINDS: readonly RevenueKind[] = ["correction", "opening_balance"];
export const ALL_KINDS: readonly RevenueKind[] = [...INCOME_KINDS, ...COST_KINDS, ...SIGNED_KINDS];

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Mirrors record_revenue's amount/direction rules:
 *  - income kinds must be positive and are stored as given;
 *  - cost kinds are stored negative whatever sign the caller passed;
 *  - correction / opening_balance take their direction from the sign;
 *  - zero is "nothing to record" (null), never a row.
 * Throws on an unknown kind or a negative amount for an income kind, the
 * two cases the SQL raises on.
 */
export function signedAmount(kind: RevenueKind, amount: number): { direction: RevenueDirection; amount: number } | null {
  const a = round2(amount);
  if (INCOME_KINDS.includes(kind)) {
    if (a === 0) return null;
    if (a < 0) throw new Error(`record_revenue: ${kind} must be positive, got ${amount}`);
    return { direction: "income", amount: a };
  }
  if (COST_KINDS.includes(kind)) {
    if (a === 0) return null;
    return { direction: "cost", amount: -Math.abs(a) };
  }
  if (SIGNED_KINDS.includes(kind)) {
    if (a === 0) return null;
    return { direction: a > 0 ? "income" : "cost", amount: a };
  }
  throw new Error(`record_revenue: unknown kind ${kind}`);
}

/** The table CHECK: direction and sign must agree. */
export function signMatchesDirection(direction: RevenueDirection, amount: number): boolean {
  return (direction === "income" && amount > 0) || (direction === "cost" && amount < 0);
}

/** Solana: only mainnet-beta is live money; anything else (or unknown) is devnet. */
export function environmentFromSolanaCluster(cluster: string | null | undefined): RevenueEnvironment {
  return cluster === "mainnet-beta" ? "live" : "devnet";
}

/** PayPal: PAYPAL_ENV 'sandbox' is sandbox; everything else is live. */
export function environmentFromPaypalEnv(env: string | null | undefined): RevenueEnvironment {
  return env === "sandbox" ? "sandbox" : "live";
}

/** Balance spends, NOWPayments-era rows and legacy rows with no provider are live. */
export function environmentFor(params: {
  provider: string | null | undefined;
  solanaCluster?: string | null;
  paypalEnv?: string | null;
}): RevenueEnvironment {
  if (params.provider === "solana") return environmentFromSolanaCluster(params.solanaCluster);
  if (params.provider === "paypal") return environmentFromPaypalEnv(params.paypalEnv);
  return "live";
}

export function railFor(provider: string | null | undefined): RevenueRail {
  switch (provider) {
    case "solana": return "solana";
    case "paypal": return "paypal";
    case "balance": return "balance";
    case "nowpayments": return "nowpayments";
    default: return "none";
  }
}

/**
 * Mirrors record_revenue's source guard: income is recorded only for a
 * source row that is really completed / released. Unknown pairs are
 * refused (false) rather than assumed.
 */
export function isReleasedSource(
  kind: RevenueKind,
  sourceTable: string | null | undefined,
  row: Record<string, unknown> | null | undefined,
): boolean {
  if (kind === "correction" || kind === "opening_balance") return true;
  if (!sourceTable || !row) return false;
  switch (sourceTable) {
    case "product_bestowals":
      return ["sale_fee", "booking_fee", "processor_fee_income", "refund_cost"].includes(kind) && row.status === "completed";
    case "bookings":
      return ["booking_fee", "refund_cost"].includes(kind) && row.status === "paid";
    case "content_purchases":
      return ["content_fee", "processor_fee_income", "refund_cost"].includes(kind) && row.payment_status === "completed";
    case "bestowals":
      return ["gift_fee", "processor_fee_income", "refund_cost"].includes(kind) &&
        (row.payment_status === "completed" || row.payment_status === "distributed") &&
        (row.orchard_id === null || row.orchard_id === undefined);
    case "orchard_releases":
      return ["orchard_fee", "refund_cost"].includes(kind) && row.exists === true;
    case "orchard_refunds":
      return kind === "refund_cost" && row.exists === true;
    case "payouts":
      return kind === "payout_fee_cost" && row.status === "paid";
    default:
      return false;
  }
}

export interface RevenueRow {
  kind: RevenueKind;
  direction: RevenueDirection;
  amount: number;
  environment: RevenueEnvironment;
  source_table?: string | null;
  source_id?: string | null;
  recognised_at: string; // ISO
}

/** The unique key record_revenue dedupes on (corrections and source-less rows are exempt). */
export function revenueKey(row: Pick<RevenueRow, "kind" | "source_table" | "source_id">): string | null {
  if (row.kind === "correction" || !row.source_table || !row.source_id) return null;
  return `${row.kind}|${row.source_table}|${row.source_id}`;
}

/** Applies the unique key the way ON CONFLICT DO NOTHING does: first row wins. */
export function dedupe<T extends Pick<RevenueRow, "kind" | "source_table" | "source_id">>(rows: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const r of rows) {
    const k = revenueKey(r);
    if (k && seen.has(k)) continue;
    if (k) seen.add(k);
    out.push(r);
  }
  return out;
}

export function periodOf(recognisedAt: string): string {
  return recognisedAt.slice(0, 7); // YYYY-MM in UTC, same as the generated `period` column
}

export interface RevenueSummary {
  environment: RevenueEnvironment;
  period: string;
  by_kind: Record<string, number>;
  income_total: number;
  cost_total: number;
  net: number;
  operating_net: number;
  rows: number;
}

/** Mirrors public.revenue_summary(_period, _environment). */
export function summarize(
  rows: RevenueRow[],
  opts: { environment?: RevenueEnvironment; period?: string | null } = {},
): RevenueSummary {
  const environment = opts.environment ?? "live";
  const period = opts.period ?? null;
  const picked = rows.filter((r) => r.environment === environment && (!period || periodOf(r.recognised_at) === period));
  const by_kind: Record<string, number> = {};
  let income = 0, cost = 0, opening = 0;
  for (const r of picked) {
    by_kind[r.kind] = round2((by_kind[r.kind] ?? 0) + r.amount);
    if (r.direction === "income") income += r.amount; else cost += r.amount;
    if (r.kind === "opening_balance") opening += r.amount;
  }
  return {
    environment,
    period: period ?? "all",
    by_kind,
    income_total: round2(income),
    cost_total: round2(cost),
    net: round2(income + cost),
    operating_net: round2(income + cost - opening),
    rows: picked.length,
  };
}
