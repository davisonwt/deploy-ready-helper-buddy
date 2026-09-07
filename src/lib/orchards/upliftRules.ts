// P0-5 Phase D: client twin of supabase/functions/_shared/orchardUpliftRules.ts
// (drift-tested in src/test/orchard-uplift.test.ts). Pure: the console uses
// it to refuse a bad party list before the round trip and to show what is
// left to pay; the SQL and the edge function are the real gates.

export const UPLIFT_MAX_ATTEMPTS = 3;
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function looksLikeSolanaAddress(s: string | null | undefined): boolean {
  return typeof s === 'string' && BASE58.test(s.trim());
}

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

export function nextPartyStatusAfterFailure(attemptsSoFar: number, max = UPLIFT_MAX_ATTEMPTS): 'failed' | 'needs_human' {
  return attemptsSoFar + 1 >= max ? 'needs_human' : 'failed';
}

export function openRefusal(kind: string | null | undefined, isGosat: boolean): string | null {
  if ((kind ?? 'launch') === 'uplift' && !isGosat) return 'Only a gosat can open an Uplift orchard.';
  return null;
}

export function upliftCancelRefusal(kind: string | null | undefined, fundingState: string | null | undefined, partyRows: number, paidTotalUsd = 0): string | null {
  if (kind !== 'uplift') return null;
  if (partyRows > 0) {
    return `This Uplift orchard already has ${partyRows} party payment${partyRows === 1 ? '' : 's'} ($${round2(paidTotalUsd).toFixed(2)} paid). It cannot be cancelled: finish it with further release payments, and route anything unresolved to needs-human.`;
  }
  if (fundingState === 'released') return 'This Uplift orchard has been released to its parties and cannot be cancelled.';
  return null;
}

export function upliftRemaining(sowerTotal: number, rows: Array<{ amount: number | string; status: string }>): { committed: number; paid: number; remaining: number } {
  const committed = round2(rows.filter((r) => r.status !== 'voided').reduce((s, r) => s + Number(r.amount), 0));
  const paid = round2(rows.filter((r) => r.status === 'paid').reduce((s, r) => s + Number(r.amount), 0));
  return { committed, paid, remaining: round2(Math.max(0, Number(sowerTotal) - committed)) };
}

/** Party-payment row state, console wording. */
export function partyStatusLabel(status: string | null | undefined): { label: string; tone: 'held' | 'released' | 'pending' | 'done' | 'problem'; needsGosat: boolean } {
  switch (status) {
    case 'sending': return { label: 'Sending', tone: 'pending', needsGosat: false };
    case 'paid': return { label: 'Paid', tone: 'done', needsGosat: false };
    case 'failed': return { label: 'Failed', tone: 'problem', needsGosat: true };
    case 'needs_human': return { label: 'Needs a human', tone: 'problem', needsGosat: true };
    case 'voided': return { label: 'Voided', tone: 'held', needsGosat: false };
    default: return { label: String(status ?? 'unknown'), tone: 'pending', needsGosat: false };
  }
}
