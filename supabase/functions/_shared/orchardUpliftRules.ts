// P0-5 Phase D: pure Uplift rules (no Deno, no network) so
// src/test/orchard-uplift.test.ts can exercise them. orchard-release-uplift
// is the only caller that moves money, and it calls partySendAllowed() on
// the fresh row orchard_uplift_release() handed it before every send.
//
// Owner decisions (2026-09-07): party payments are USDC only in this phase
// (PayPal waits for PayPal's approval of the app); the per-transaction and
// daily ceilings are the payout circuit breaker's (SOLANA_MAX_PER_TX_USD 50
// / SOLANA_MAX_DAILY_USD 200 by default), above which a Squad decision is
// needed; an Uplift with any party-payment row can no longer be cancelled.

export const UPLIFT_MAX_ATTEMPTS = 3;
/** Rows stuck at 'sending' longer than this are re-examined (crash between send and record). */
export const UPLIFT_STALE_SENDING_MS = 15 * 60 * 1000;
export const USDC_DECIMALS = 6;
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export type PartyRail = 'solana' | 'paypal';
export type PartyEnvironment = 'live' | 'devnet' | 'sandbox';
export type PartyStatus = 'sending' | 'paid' | 'failed' | 'needs_human' | 'voided';

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Shape check only: a base58 string of the right length. The chain does the rest. */
export function looksLikeSolanaAddress(s: string | null | undefined): boolean {
  return typeof s === 'string' && BASE58.test(s.trim());
}

// --- Parties entered by a gosat --------------------------------------------

export interface PartyInput {
  label: string;
  amount: number | string;
  destination: string;
  rail?: string;
}

export interface NormalizedParty {
  label: string;
  amount: number;
  destination: string;
  rail: 'solana';
}

export interface PartyValidation {
  ok: boolean;
  problems: string[];
  total: number;
  parties: NormalizedParty[];
}

/**
 * Mirrors orchard_uplift_release()'s own checks so the console can refuse
 * before a round trip: a label, a positive 2-decimal amount, a Solana-shaped
 * destination, USDC only, and a sum no larger than what is left to pay.
 */
export function validateParties(input: PartyInput[] | null | undefined, remainingUsd: number): PartyValidation {
  const problems: string[] = [];
  const parties: NormalizedParty[] = [];
  if (!Array.isArray(input) || input.length === 0) {
    return { ok: false, problems: ['Add at least one party.'], total: 0, parties };
  }
  input.forEach((p, i) => {
    const n = i + 1;
    const label = String(p?.label ?? '').trim();
    const destination = String(p?.destination ?? '').trim();
    const rail = String(p?.rail ?? 'solana');
    const amount = typeof p?.amount === 'number' ? p.amount : Number(String(p?.amount ?? '').trim());
    if (!label) problems.push(`Party ${n}: a label is required (who is being paid).`);
    else if (label.length > 120) problems.push(`Party ${n}: the label is longer than 120 characters.`);
    if (!Number.isFinite(amount) || amount <= 0) problems.push(`Party ${n}: the amount must be more than 0.`);
    else if (round2(amount) !== amount && Math.abs(round2(amount) - amount) > 1e-9) problems.push(`Party ${n}: the amount can have at most 2 decimals.`);
    if (rail !== 'solana') problems.push(`Party ${n}: only USDC (Solana) party payments are available in this phase; PayPal waits for PayPal's approval of the app.`);
    if (!looksLikeSolanaAddress(destination)) problems.push(`Party ${n}: the destination must be a Solana wallet address (32-44 base58 characters).`);
    if (Number.isFinite(amount) && amount > 0 && label && rail === 'solana' && looksLikeSolanaAddress(destination)) {
      parties.push({ label, amount: round2(amount), destination, rail: 'solana' });
    }
  });
  const total = round2(parties.reduce((s, p) => s + p.amount, 0));
  if (problems.length === 0 && total > round2(remainingUsd)) {
    problems.push(`The parties add up to $${total.toFixed(2)} but only $${round2(remainingUsd).toFixed(2)} is left to pay on this orchard.`);
  }
  return { ok: problems.length === 0, problems, total, parties };
}

// --- The money-direction guardrail, per row, before every send ---------------

/** One orchard_release_payments row as orchard_uplift_release() returns it. */
export interface PartyRow {
  id: string;
  label: string;
  amount: number;
  rail: string;
  destination: string;
  status: string;
  attempts: number;
  environment: PartyEnvironment | string;
  reference?: string | null;
  created_at?: string | null;
  claimed_at?: string | null;
}

export interface PartyGuardContext {
  /** The environment this function's Solana cluster maps to: mainnet-beta -> live, devnet -> devnet. */
  solanaEnvironment: 'live' | 'devnet';
  maxPerTxUsd: number;
  maxDailyUsd: number;
  /** Party payments already paid today (UTC) in the row's environment. */
  sentTodayUsd: number;
}

/**
 * ok     -> send it
 * defer  -> not now, not a failure (no attempt counted; a gosat retries later)
 * park   -> needs a human; nothing is sent until a gosat acts
 */
export type PartyDecision =
  | { ok: true }
  | { ok: false; action: 'defer' | 'park'; reason: string };

export function partySendAllowed(r: PartyRow, ctx: PartyGuardContext): PartyDecision {
  const park = (reason: string): PartyDecision => ({ ok: false, action: 'park', reason });
  const defer = (reason: string): PartyDecision => ({ ok: false, action: 'defer', reason });

  if (r.status !== 'sending') return park(`row is ${r.status}, not sending`);
  if (r.reference) return park(`row already has reference ${r.reference}: never send twice`);
  if (r.rail !== 'solana') return park(`rail ${r.rail} is not automated in this phase (USDC only)`);
  const amount = round2(Number(r.amount));
  if (!(amount > 0)) return park('amount is not positive');
  if (!looksLikeSolanaAddress(r.destination)) return park(`destination ${r.destination} is not a Solana address`);
  if (r.environment === 'sandbox') return park('a USDC party payment cannot be in the sandbox environment');
  if (r.environment !== ctx.solanaEnvironment) {
    return defer(`payment is ${r.environment} but this function's cluster is ${ctx.solanaEnvironment}`);
  }
  if (amount > ctx.maxPerTxUsd) return park(`exceeds_per_tx_cap_needs_squad_approval: ${amount} > ${ctx.maxPerTxUsd}`);
  if (round2(ctx.sentTodayUsd + amount) > ctx.maxDailyUsd) {
    return defer(`exceeds_daily_cap: ${round2(ctx.sentTodayUsd)} paid today + ${amount} > ${ctx.maxDailyUsd}; tomorrow`);
  }
  return { ok: true };
}

/** Attempt bookkeeping mirror of orchard_uplift_payment_fail(): the next status. */
export function nextPartyStatusAfterFailure(attemptsSoFar: number, max = UPLIFT_MAX_ATTEMPTS): 'failed' | 'needs_human' {
  return attemptsSoFar + 1 >= max ? 'needs_human' : 'failed';
}

// --- Creation and cancel rules (mirrors of the SQL) ---------------------------

/** Why a member cannot open this orchard kind, or null when they can. Mirrors trg_orchards_uplift_gate. */
export function openRefusal(kind: string | null | undefined, isGosat: boolean): string | null {
  if ((kind ?? 'launch') === 'uplift' && !isGosat) return 'Only a gosat can open an Uplift orchard.';
  return null;
}

/**
 * Why an Uplift cannot be cancelled, or null. Mirrors the Phase D branch of
 * orchard_cancel(): any party-payment row blocks cancel for good.
 */
export function upliftCancelRefusal(kind: string | null | undefined, fundingState: string | null | undefined, partyRows: number, paidTotalUsd = 0): string | null {
  if (kind !== 'uplift') return null;
  if (partyRows > 0) {
    return `This Uplift orchard already has ${partyRows} party payment${partyRows === 1 ? '' : 's'} ($${round2(paidTotalUsd).toFixed(2)} paid). It cannot be cancelled: finish it with further release payments, and route anything unresolved to needs-human.`;
  }
  if (fundingState === 'released') return 'This Uplift orchard has been released to its parties and cannot be cancelled.';
  return null;
}

/** What is left to pay on a released Uplift: sower total minus every non-voided row. */
export function upliftRemaining(sowerTotal: number, rows: Array<{ amount: number | string; status: string }>): { committed: number; paid: number; remaining: number } {
  const committed = round2(rows.filter((r) => r.status !== 'voided').reduce((s, r) => s + Number(r.amount), 0));
  const paid = round2(rows.filter((r) => r.status === 'paid').reduce((s, r) => s + Number(r.amount), 0));
  return { committed, paid, remaining: round2(Math.max(0, Number(sowerTotal) - committed)) };
}
