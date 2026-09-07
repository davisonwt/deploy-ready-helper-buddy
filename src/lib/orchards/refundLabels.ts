// P0-5 Phase C3: the words people see for orchard money states. Pure, no
// Supabase imports, so src/test/orchard-refund-labels.test.ts pins every
// mapping. The states themselves come from the C2 migration
// (supabase/migrations/20260906210000_orchard_cancel_refund.sql):
//   orchard_holdings.status  held | released | refund_pending | refunded | refund_failed | written_off
//   orchard_refunds.status   queued | sending | sent | confirmed | failed | needs_human | written_off
//   orchards.funding_state   open | funded | released | cancelling | cancelled

export type HoldingStatus = 'held' | 'released' | 'refund_pending' | 'refunded' | 'refund_failed' | 'written_off';
export type RefundStatus = 'queued' | 'sending' | 'sent' | 'confirmed' | 'failed' | 'needs_human' | 'written_off';
export type FundingState = 'open' | 'funded' | 'released' | 'cancelling' | 'cancelled';
export type Rail = 'solana' | 'paypal' | 'balance' | 'unknown';
export type Environment = 'live' | 'devnet' | 'sandbox';

export interface RefundFacts {
  status: RefundStatus | string;
  rail?: Rail | string | null;
  rail_reference?: string | null;
  environment?: Environment | string | null;
}

export type PocketTone = 'held' | 'released' | 'pending' | 'done' | 'problem';

export interface PocketState {
  /** Plain words for the member. */
  label: string;
  tone: PocketTone;
  /** The transaction signature or PayPal refund id, when the money has gone back. */
  reference: string | null;
  /** A link for the reference when one exists (Solana explorer); PayPal has none. */
  referenceUrl: string | null;
}

export function shortRef(ref: string | null | undefined, head = 8, tail = 4): string {
  if (!ref) return '';
  if (ref.length <= head + tail + 1) return ref;
  return `${ref.slice(0, head)}…${ref.slice(-tail)}`;
}

/** First and last characters of a wallet address, for display only. */
export function maskAddress(address: string | null | undefined): string {
  if (!address) return '—';
  if (address.length <= 12) return address;
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

/** Explorer link for a rail reference; null when no public explorer applies. */
export function explorerUrl(rail: string | null | undefined, reference: string | null | undefined, environment?: string | null): string | null {
  if (!reference) return null;
  if (rail === 'solana') {
    return `https://solscan.io/tx/${reference}${environment === 'devnet' ? '?cluster=devnet' : ''}`;
  }
  return null;
}

/** What a bestower reads about one pocket. */
export function pocketState(holdingStatus: HoldingStatus | string | null | undefined, refund?: RefundFacts | null, orchardKind: string | null = 'launch'): PocketState {
  const none = { reference: null, referenceUrl: null };
  switch (holdingStatus) {
    case 'held':
      return { label: 'Held for this orchard', tone: 'held', ...none };
    case 'released':
      // Phase D: an Uplift has no sower payout; S2G pays the named parties.
      return orchardKind === 'uplift'
        ? { label: 'Funded — Sow2Grow pays the parties directly', tone: 'released', ...none }
        : { label: 'Funded — released to the sower', tone: 'released', ...none };
    case 'refund_pending':
    case 'refund_failed':
      // A failed attempt is a gosat's problem, not the member's: the money is still coming.
      return { label: 'Refund on its way', tone: 'pending', ...none };
    case 'refunded': {
      const reference = refund?.rail_reference ?? null;
      const url = explorerUrl(refund?.rail, reference, refund?.environment);
      const via = refund?.rail === 'paypal' ? 'to your PayPal' : refund?.rail === 'solana' ? 'to the wallet you paid from' : '';
      // A Solana signature is 88 characters and gets shortened; a PayPal
      // refund id is short and shown whole.
      const shown = refund?.rail === 'solana' ? shortRef(reference) : reference;
      return {
        label: reference ? `Refunded ${via} · ${refund?.rail === 'paypal' ? 'ref' : 'tx'} ${shown}`.replace(/\s+·/, ' ·') : `Refunded ${via}`.trim(),
        tone: 'done',
        reference,
        referenceUrl: url,
      };
    }
    case 'written_off':
      return { label: 'Refund could not be sent — please contact Sow2Grow', tone: 'problem', ...none };
    default:
      return { label: 'Held for this orchard', tone: 'held', ...none };
  }
}

/** Orchard state, as a badge. */
export function fundingStateLabel(state: FundingState | string | null | undefined): { label: string; tone: PocketTone } {
  switch (state) {
    case 'funded': return { label: 'Fully funded', tone: 'released' };
    case 'released': return { label: 'Funded & released', tone: 'released' };
    case 'cancelling': return { label: 'Cancelling — refunds in progress', tone: 'pending' };
    case 'cancelled': return { label: 'Cancelled', tone: 'problem' };
    case 'open':
    default: return { label: 'Open', tone: 'held' };
  }
}

/** Refund row state, gosat console wording. */
export function refundStatusLabel(status: RefundStatus | string | null | undefined): { label: string; tone: PocketTone; needsGosat: boolean } {
  switch (status) {
    case 'queued': return { label: 'Queued', tone: 'pending', needsGosat: false };
    case 'sending': return { label: 'Sending', tone: 'pending', needsGosat: false };
    case 'sent': return { label: 'Sent, awaiting settlement', tone: 'pending', needsGosat: false };
    case 'confirmed': return { label: 'Confirmed', tone: 'done', needsGosat: false };
    case 'failed': return { label: 'Failed', tone: 'problem', needsGosat: true };
    case 'needs_human': return { label: 'Needs a human', tone: 'problem', needsGosat: true };
    case 'written_off': return { label: 'Written off', tone: 'problem', needsGosat: false };
    default: return { label: String(status ?? 'unknown'), tone: 'pending', needsGosat: false };
  }
}

export function isCancellable(state: FundingState | string | null | undefined): boolean {
  return state === 'open' || state === 'funded';
}

/** Why cancel is refused, or null when it is allowed. Mirrors orchard_cancel()'s own checks (Phase D: the Uplift rule first). */
export function cancelRefusal(
  state: FundingState | string | null | undefined,
  hasReleasedHolding = false,
  orchardKind: string | null = 'launch',
  partyRows = 0,
  partyPaidTotal = 0,
): string | null {
  if (orchardKind === 'uplift') {
    if (partyRows > 0) {
      return `This Uplift orchard already has ${partyRows} party payment${partyRows === 1 ? '' : 's'} ($${(Math.round(partyPaidTotal * 100) / 100).toFixed(2)} paid). It cannot be cancelled: finish it with further release payments, and route anything unresolved to needs-human.`;
    }
    if (state === 'released' || hasReleasedHolding) return 'This Uplift orchard has been released to its parties and cannot be cancelled.';
  }
  if (state === 'released' || hasReleasedHolding) return 'Released orchards cannot be cancelled: the sower has already been paid.';
  if (state === 'cancelling') return 'Already cancelling: refunds are in progress.';
  if (state === 'cancelled') return 'Already cancelled.';
  return null;
}

export interface HoldingForSummary {
  bestower_user_id: string;
  gross_amount: number | string;
  rail: string;
  status: string;
  payer_source?: string | null;
}

export interface CancelSummary {
  bestowers: number;
  holdings: number;
  total: number;
  byRail: Record<string, number>;
  unknownPayers: number;
  sentence: string;
}

/** The sentence the cancel dialog shows: who gets what back, on which rails. */
export function cancelSummary(holdings: HoldingForSummary[]): CancelSummary {
  const held = holdings.filter((h) => h.status === 'held');
  const bestowers = new Set(held.map((h) => h.bestower_user_id)).size;
  const total = Math.round(held.reduce((s, h) => s + Number(h.gross_amount || 0), 0) * 100) / 100;
  const byRail: Record<string, number> = {};
  for (const h of held) byRail[h.rail] = (byRail[h.rail] ?? 0) + 1;
  const unknownPayers = held.filter((h) => h.rail === 'solana' && (h.payer_source ?? 'unknown') === 'unknown').length;
  const rails = Object.entries(byRail).map(([r, n]) => `${r} ×${n}`).join(', ');
  const sentence = held.length === 0
    ? 'This orchard holds no money. Cancelling closes it; there is nothing to refund.'
    : `This refunds ${bestowers} bestower${bestowers === 1 ? '' : 's'} a total of $${total.toFixed(2)} on their original rails (${rails}).`;
  return { bestowers, holdings: held.length, total, byRail, unknownPayers, sentence };
}
