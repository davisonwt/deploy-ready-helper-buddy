// P0-5 Phase C2: pure refund rules (no Deno, no network) so
// src/test/orchard-refund.test.ts can exercise them. orchard-refund-worker
// is the only caller that moves money, and it calls refundSendAllowed()
// on a fresh read under lock before every send.
//
// Owner decisions (ORCHARD-CANCEL-REFUND-PLAN.md, Status): 100% of what the
// bestower paid (holding gross_amount) on the original rail; S2G absorbs
// every fee; the ceiling is the payout circuit breaker's
// (SOLANA_MAX_PER_TX_USD 50 / SOLANA_MAX_DAILY_USD 200 by default), above
// which a Squad decision is needed.

export const ORCHARD_REFUND_MAX_ATTEMPTS = 3;
/** Rows stuck at 'sending' longer than this are re-examined (crash between send and confirm). */
export const ORCHARD_REFUND_STALE_SENDING_MS = 15 * 60 * 1000;
/** Flat network cost booked per Solana refund, the same figure the checkout charges as the Solana fee. */
export const SOLANA_REFUND_FEE_USD = 0.01;
export const USDC_DECIMALS = 6;

export type RefundRail = 'solana' | 'paypal' | 'balance' | 'unknown';
export type RefundEnvironment = 'live' | 'devnet' | 'sandbox';

/** What orchard_refund_claim() returns for one claimed row, re-read under lock. */
export interface RefundClaim {
  id: string;
  orchard_id: string;
  holding_id: string;
  rail: RefundRail;
  amount: number;
  destination: string | null;
  status: string;
  attempts: number;
  rail_reference: string | null;
  environment: RefundEnvironment;
  claimed_at: string | null;
  holding_status: string;
  holding_gross: number;
  holding_payer: string | null;
  holding_reference: string | null;
  funding_state: string;
}

export interface RefundGuardContext {
  /** The environment this worker's Solana cluster maps to: mainnet-beta -> live, devnet -> devnet. */
  solanaEnvironment: 'live' | 'devnet';
  /** The environment this worker's PayPal credentials hit. */
  paypalEnvironment: 'live' | 'sandbox';
  maxPerTxUsd: number;
  maxDailyUsd: number;
  /** Refunds already sent or confirmed today (UTC) in the claim's environment. */
  sentTodayUsd: number;
}

/**
 * ok      -> send it
 * defer   -> not now, not a failure (back to queued, no attempt counted)
 * park    -> needs a human; nothing will be sent until a gosat acts
 */
export type RefundDecision =
  | { ok: true }
  | { ok: false; action: 'defer' | 'park'; reason: string };

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** The money-direction guardrail. Every check is on the fresh row the claim returned. */
export function refundSendAllowed(c: RefundClaim, ctx: RefundGuardContext): RefundDecision {
  const park = (reason: string): RefundDecision => ({ ok: false, action: 'park', reason });
  const defer = (reason: string): RefundDecision => ({ ok: false, action: 'defer', reason });

  if (c.status !== 'sending') return park(`row is ${c.status}, not sending`);
  if (c.rail_reference) return park(`row already has a rail reference ${c.rail_reference}: never send twice`);
  if (c.holding_status !== 'refund_pending') return park(`holding is ${c.holding_status}, not refund_pending`);
  // A refund row exists only for a cancelled orchard's holdings or a late
  // payment into a released one. Money never leaves for an open or funded orchard.
  if (c.funding_state !== 'cancelling' && c.funding_state !== 'released') {
    return park(`orchard is ${c.funding_state}: refunds only leave a cancelling orchard (or a late payment into a released one)`);
  }
  const amount = round2(Number(c.amount));
  if (!(amount > 0)) return park('amount is not positive');
  if (amount !== round2(Number(c.holding_gross))) {
    return park(`amount ${amount} is not the holding's gross ${round2(Number(c.holding_gross))}`);
  }

  if (c.rail === 'solana') {
    if (!c.destination) return park('no destination wallet');
    if (c.destination !== c.holding_payer) return park(`destination ${c.destination} is not the holding's payer ${c.holding_payer ?? 'unknown'}`);
    if (c.environment === 'sandbox') return park('a Solana refund cannot be in the sandbox environment');
    if (c.environment !== ctx.solanaEnvironment) {
      return defer(`refund is ${c.environment} but the worker's cluster is ${ctx.solanaEnvironment}`);
    }
  } else if (c.rail === 'paypal') {
    if (!c.destination) return park('no PayPal capture id');
    if (c.destination !== c.holding_reference) return park(`destination ${c.destination} is not the holding's capture id ${c.holding_reference ?? '-'}`);
    if (c.environment === 'devnet') return park('a PayPal refund cannot be in the devnet environment');
    if (c.environment !== ctx.paypalEnvironment) {
      return defer(`refund is ${c.environment} but the worker's PayPal credentials are ${ctx.paypalEnvironment}`);
    }
  } else {
    return park(`rail ${c.rail} is not automated`);
  }

  if (amount > ctx.maxPerTxUsd) return park(`exceeds_per_tx_cap_needs_squad_approval: ${amount} > ${ctx.maxPerTxUsd}`);
  if (round2(ctx.sentTodayUsd + amount) > ctx.maxDailyUsd) {
    return defer(`exceeds_daily_cap: ${round2(ctx.sentTodayUsd)} sent today + ${amount} > ${ctx.maxDailyUsd}; tomorrow`);
  }
  return { ok: true };
}

/** Attempt bookkeeping mirror of orchard_refund_fail(): what the next status will be. */
export function nextStatusAfterFailure(attemptsSoFar: number, max = ORCHARD_REFUND_MAX_ATTEMPTS): 'queued' | 'failed' {
  return attemptsSoFar + 1 >= max ? 'failed' : 'queued';
}

/** S2G's cost of a PayPal refund: the part of the original fee PayPal kept. */
export function paypalRefundFeeCost(captureFeeUsd: number | null | undefined, feeReturnedUsd: number | null | undefined): number {
  const kept = Number(captureFeeUsd ?? 0) - Number(feeReturnedUsd ?? 0);
  return Number.isFinite(kept) && kept > 0 ? round2(kept) : 0;
}

export function usdToRawUsdc(amountUsd: number): string {
  return String(Math.round(round2(amountUsd) * 10 ** USDC_DECIMALS));
}

// --- "Did it already go out?" ------------------------------------------------
// Before a retry, the worker lists the hot wallet's recent USDC transfers and
// looks for one of exactly `amount` to `destination` since the claim. Finding
// one records it instead of sending again.

export interface RecentParsedTx {
  signature: string;
  blockTime?: number | null;
  meta?: {
    err?: unknown;
    postTokenBalances?: Array<{ accountIndex?: number; mint?: string; owner?: string }>;
  } | null;
  transaction?: {
    message?: {
      instructions?: Array<{
        program?: string;
        parsed?: {
          type?: string;
          info?: { mint?: string; destination?: string; source?: string; authority?: string; tokenAmount?: { amount?: string }; amount?: string };
        };
      }>;
    };
  };
}

export interface SendSearch {
  mint: string;
  hotWalletAta: string;
  destinationOwner: string;
  amountUsd: number;
  /** Unix seconds; transactions older than this are ignored. */
  sinceUnix: number;
}

/** Pure: the signature of a matching send, or null. */
export function findRefundSendInParsedTxs(txs: RecentParsedTx[], s: SendSearch): string | null {
  const raw = usdToRawUsdc(s.amountUsd);
  for (const tx of txs) {
    if (!tx || tx.meta?.err) continue;
    if (typeof tx.blockTime === 'number' && tx.blockTime < s.sinceUnix) continue;
    const ownerAccounts = new Set<string>();
    // owner -> which of the post balances belong to the destination owner, by mint
    const postOwners = (tx.meta?.postTokenBalances ?? []).filter((b) => b.mint === s.mint && b.owner === s.destinationOwner);
    if (postOwners.length === 0) continue;
    for (const ix of tx.transaction?.message?.instructions ?? []) {
      if (ix.program !== 'spl-token') continue;
      const p = ix.parsed;
      if (!p || (p.type !== 'transferChecked' && p.type !== 'transfer')) continue;
      const info = p.info ?? {};
      if (info.source !== s.hotWalletAta) continue;
      if (p.type === 'transferChecked' && info.mint && info.mint !== s.mint) continue;
      const amt = info.tokenAmount?.amount ?? info.amount;
      if (amt !== raw) continue;
      if (info.destination) ownerAccounts.add(info.destination);
    }
    if (ownerAccounts.size > 0) return tx.signature;
  }
  return null;
}
