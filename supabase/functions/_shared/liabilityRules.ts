// Bookkeeping Phase 2 (BOOKKEEPING-PLAN.md section 4): reconciliation
// math, as pure functions. TypeScript twin of public.treasury_verdict()
// in supabase/migrations/20260906140000_liability_snapshot.sql, plus the
// per-wallet expectation the page shows. No Deno or Supabase imports, so
// src/test/liability-snapshot.test.ts can exercise it.

export type Verdict = "GREEN" | "RED";

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export interface VerdictInput {
  assetsUsd: number;          // live cash on hand: the four wallets' USDC + PayPal available
  liabilitiesUsd: number;     // held for members + held for orchards
  s2gOwnUsd: number;          // recognised operating net from the revenue ledger (negative counts as 0)
  unrecordedUsd?: number;     // S2G's but not yet in the ledger (Solana processor fees until phase 4)
  recordedFloatUsd?: number;  // gosat-entered float (treasury_movements, USD/USDC only)
  toleranceUsd?: number | null;
}

export interface VerdictResult {
  verdict: Verdict;
  assets: number;
  liabilities: number;
  s2g_own: number;
  unrecorded: number;
  recorded_float: number;
  expected_assets: number;
  unexplained: number;
  tolerance: number;
  unexplained_beyond_tolerance: boolean;
  shortfall: number;
  coverage_ratio: number | null;
}

/** Mirrors public.treasury_verdict(). */
export function treasuryVerdict(i: VerdictInput): VerdictResult {
  const assets = round2(i.assetsUsd || 0);
  const liabilities = round2(i.liabilitiesUsd || 0);
  const own = round2(Math.max(i.s2gOwnUsd || 0, 0));
  const unrec = round2(i.unrecordedUsd || 0);
  const flt = round2(i.recordedFloatUsd || 0);
  const expected = round2(liabilities + own + unrec + flt);
  const unexplained = round2(assets - expected);
  const tolerance = round2(i.toleranceUsd ?? Math.max(1.0, expected * 0.01));
  const red = assets < liabilities;
  return {
    verdict: red ? "RED" : "GREEN",
    assets,
    liabilities,
    s2g_own: own,
    unrecorded: unrec,
    recorded_float: flt,
    expected_assets: expected,
    unexplained,
    tolerance,
    unexplained_beyond_tolerance: Math.abs(unexplained) > tolerance,
    shortfall: red ? round2(liabilities - assets) : 0,
    coverage_ratio: liabilities > 0 ? Math.round((assets / liabilities) * 10000) / 10000 : null,
  };
}

export function verdictSentence(v: VerdictResult, env: string): string {
  if (v.verdict === "RED") {
    return `Short by $${v.shortfall.toFixed(2)}: ${env} cash on hand ($${v.assets.toFixed(2)}) does not cover what is held for others ($${v.liabilities.toFixed(2)}).`;
  }
  if (v.unexplained_beyond_tolerance) {
    const dir = v.unexplained > 0 ? "more" : "less";
    return `Covered, with $${Math.abs(v.unexplained).toFixed(2)} ${dir} on hand than the books explain (tolerance $${v.tolerance.toFixed(2)}). Run scripts/studio/bookkeeping-reconcile.sql.`;
  }
  return `Covered. Books and wallets agree within $${Math.abs(v.unexplained).toFixed(2)}.`;
}

/** The subset of liability_snapshot() the wallet expectation needs. */
export interface SnapshotForWallets {
  held_for_members: { owed: { by_rail: Record<string, number> }; parked: { total: number } };
  held_for_orchards: { by_location: Record<string, number> };
  s2g_own: { operating_net: number; by_rail: Record<string, number> };
  unrecorded: { solana_processor_fees: number };
  recorded_float: { by_wallet: Record<string, number> };
  swept_to_squad: number;
  /** Payouts already made, and the cross-rail part: money paid from one rail for sales that came in on the other. */
  payouts_paid?: { total: number; by_rail: Record<string, number>; cross_rail: { solana_paid_for_paypal_sales: number; paypal_paid_for_solana_sales: number } };
}

export type WalletName = "hot" | "squad" | "launch" | "uplift" | "paypal";

export interface WalletExpectation {
  wallet: WalletName;
  expected: number;
  parts: Record<string, number>;
}

function sumWhere(obj: Record<string, number> | undefined, pred: (k: string) => boolean): number {
  return round2(Object.entries(obj ?? {}).filter(([k]) => pred(k)).reduce((s, [, v]) => s + Number(v || 0), 0));
}

/**
 * What the books say should be sitting in each wallet. Money with no
 * assigned rail (the parked ledger, recipients without a payout method)
 * cannot be placed and is returned under `unplaced` so it is never
 * silently dropped.
 */
export function walletExpectations(s: SnapshotForWallets): { wallets: WalletExpectation[]; unplaced: Record<string, number> } {
  const owedSolana = Number(s.held_for_members.owed.by_rail?.solana ?? 0);
  const owedPaypal = Number(s.held_for_members.owed.by_rail?.paypal ?? 0);
  const owedOther = sumWhere(s.held_for_members.owed.by_rail, (k) => k !== "solana" && k !== "paypal");
  const orchHotSolana = sumWhere(s.held_for_orchards.by_location, (k) => k.startsWith("hot_wallet/"));
  const orchOrchardWallet = sumWhere(s.held_for_orchards.by_location, (k) => k.startsWith("orchard_wallet/"));
  const orchPaypal = sumWhere(s.held_for_orchards.by_location, (k) => k.startsWith("paypal_balance/"));
  const ownSolana = Math.max(0, Number(s.s2g_own.by_rail?.solana ?? 0));
  const ownPaypal = Math.max(0, Number(s.s2g_own.by_rail?.paypal ?? 0));
  const ownOther = Math.max(0, sumWhere(s.s2g_own.by_rail, (k) => k !== "solana" && k !== "paypal"));
  const swept = Number(s.swept_to_squad ?? 0);
  const flt = s.recorded_float.by_wallet ?? {};
  const proc = Number(s.unrecorded.solana_processor_fees ?? 0);
  // Cross-rail payouts: a Solana payout of a PayPal-sale earning left the hot
  // wallet while the sale proceeds stayed in PayPal, so the hot wallet expects
  // less and PayPal expects more by that amount (and the mirror case).
  const solForPaypal = Number(s.payouts_paid?.cross_rail?.solana_paid_for_paypal_sales ?? 0);
  const paypalForSol = Number(s.payouts_paid?.cross_rail?.paypal_paid_for_solana_sales ?? 0);

  const hot: WalletExpectation = {
    wallet: "hot",
    parts: {
      owed_to_members_solana: owedSolana,
      held_for_orchards: orchHotSolana,
      s2g_own_unswept: round2(Math.max(ownSolana - swept, 0)),
      unrecorded_processor_fees: proc,
      recorded_float: Number(flt.hot ?? 0),
      paid_out_for_paypal_sales: round2(-solForPaypal),
      received_for_solana_sales_paid_by_paypal: paypalForSol,
    },
    expected: 0,
  };
  const squad: WalletExpectation = { wallet: "squad", parts: { swept_s2g_fees: swept, recorded_float: Number(flt.squad ?? 0) }, expected: 0 };
  const launch: WalletExpectation = { wallet: "launch", parts: { held_for_orchards_in_wallet: orchOrchardWallet, recorded_float: Number(flt.launch ?? 0) }, expected: 0 };
  const uplift: WalletExpectation = { wallet: "uplift", parts: { recorded_float: Number(flt.uplift ?? 0) }, expected: 0 };
  const paypal: WalletExpectation = {
    wallet: "paypal",
    parts: {
      owed_to_members_paypal: owedPaypal,
      held_for_orchards: orchPaypal,
      s2g_own: ownPaypal,
      recorded_float: Number(flt.paypal ?? 0),
      held_for_hot_wallet_after_cross_rail_payouts: solForPaypal,
      paid_out_for_solana_sales: round2(-paypalForSol),
    },
    expected: 0,
  };
  for (const w of [hot, squad, launch, uplift, paypal]) {
    w.expected = round2(Object.values(w.parts).reduce((a, b) => a + b, 0));
  }
  return {
    wallets: [hot, squad, launch, uplift, paypal],
    unplaced: {
      parked_s2g_balance: round2(Number(s.held_for_members.parked.total ?? 0)),
      owed_without_rail: owedOther,
      s2g_own_other_rails: ownOther,
    },
  };
}
