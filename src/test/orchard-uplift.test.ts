// P0-5 Phase D: the Uplift rules -- party validation (sum <= what is left to
// pay), the per-row money-direction guardrail the release function runs
// before every USDC send, the cancel rule (refused once any party row
// exists), the creation gate mirror, and the client/server twin drift check.
// The database side is proven by scripts/studio/phase-d-uplift-tests.sql.

import { describe, it, expect } from 'vitest';
import * as server from '../../supabase/functions/_shared/orchardUpliftRules';
import * as client from '@/lib/orchards/upliftRules';
import { cancelRefusal, pocketState } from '@/lib/orchards/refundLabels';

const ADDR_A = 'EbSUvuE8sstLCcGsMZqXb7rB6rvgpVR4dTqEZEi32ekx';
const ADDR_B = '7h8NWW5whNQt6n3W8j28mgdgiy2g2JvLb7qJ5DbzDC4r';

describe('validateParties (mirrors orchard_uplift_release)', () => {
  it('accepts two USDC parties whose sum is within what is left', () => {
    const v = server.validateParties([{ label: 'Builder', amount: 10, destination: ADDR_A }, { label: 'Supplier', amount: '7.40', destination: ADDR_B }], 17.4);
    expect(v.ok).toBe(true);
    expect(v.total).toBe(17.4);
    expect(v.parties.map((p) => p.amount)).toEqual([10, 7.4]);
  });

  it('refuses a sum above the sower total, naming both numbers', () => {
    const v = server.validateParties([{ label: 'Builder', amount: 10, destination: ADDR_A }, { label: 'Supplier', amount: 7.41, destination: ADDR_B }], 17.4);
    expect(v.ok).toBe(false);
    expect(v.problems[0]).toMatch(/\$17\.41 but only \$17\.40 is left/);
  });

  it('refuses an empty list, a missing label, a non-positive or 3-decimal amount, a bad address, and PayPal', () => {
    expect(server.validateParties([], 100).ok).toBe(false);
    const v = server.validateParties([
      { label: '', amount: 5, destination: ADDR_A },
      { label: 'Zero', amount: 0, destination: ADDR_A },
      { label: 'Cents', amount: 1.005, destination: ADDR_A },
      { label: 'Bad wallet', amount: 1, destination: 'not-a-wallet' },
      { label: 'PayPal', amount: 1, destination: ADDR_A, rail: 'paypal' },
    ], 100);
    expect(v.ok).toBe(false);
    expect(v.problems).toHaveLength(5);
    expect(v.problems[0]).toMatch(/Party 1: a label is required/);
    expect(v.problems[1]).toMatch(/Party 2: the amount must be more than 0/);
    expect(v.problems[2]).toMatch(/Party 3: the amount can have at most 2 decimals/);
    expect(v.problems[3]).toMatch(/Party 4: the destination must be a Solana wallet/);
    expect(v.problems[4]).toMatch(/Party 5: only USDC/);
  });

  it('client and server twins agree', () => {
    const cases: Array<[server.PartyInput[], number]> = [
      [[{ label: 'Builder', amount: 10, destination: ADDR_A }], 10],
      [[{ label: 'Builder', amount: 10.01, destination: ADDR_A }], 10],
      [[{ label: 'x', amount: '3', destination: ADDR_B, rail: 'paypal' }], 10],
      [[], 0],
    ];
    for (const [input, remaining] of cases) expect(client.validateParties(input, remaining)).toEqual(server.validateParties(input, remaining));
  });
});

describe('partySendAllowed: the guardrail on the fresh row', () => {
  const row = (over: Partial<server.PartyRow> = {}): server.PartyRow => ({
    id: 'p1', label: 'Builder', amount: 10, rail: 'solana', destination: ADDR_A, status: 'sending', attempts: 0, environment: 'devnet', reference: null,
    created_at: '2026-09-07T10:00:00Z', claimed_at: '2026-09-07T10:00:00Z', ...over,
  });
  const ctx: server.PartyGuardContext = { solanaEnvironment: 'devnet', maxPerTxUsd: 50, maxDailyUsd: 200, sentTodayUsd: 0 };

  it('sends a fresh sending USDC row in the right environment', () => {
    expect(server.partySendAllowed(row(), ctx)).toEqual({ ok: true });
  });
  it('never sends twice: a reference parks the row', () => {
    const d = server.partySendAllowed(row({ reference: 'SIG' }), ctx);
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.action).toBe('park');
  });
  it('parks a row that is not sending, not USDC, not positive, or not a Solana address', () => {
    for (const bad of [row({ status: 'paid' }), row({ rail: 'paypal' }), row({ amount: 0 }), row({ destination: 'nope' }), row({ environment: 'sandbox' })]) {
      const d = server.partySendAllowed(bad, ctx);
      expect(d.ok).toBe(false);
      if (!d.ok) expect(d.action).toBe('park');
    }
  });
  it('defers when the cluster does not match the row environment', () => {
    const d = server.partySendAllowed(row({ environment: 'live' }), ctx);
    expect(d).toEqual({ ok: false, action: 'defer', reason: expect.stringMatching(/live but this function's cluster is devnet/) });
  });
  it('parks above the per-transaction cap (Squad), defers over the daily cap', () => {
    const big = server.partySendAllowed(row({ amount: 50.01 }), ctx);
    expect(big).toEqual({ ok: false, action: 'park', reason: expect.stringMatching(/^exceeds_per_tx_cap_needs_squad_approval/) });
    const daily = server.partySendAllowed(row({ amount: 10 }), { ...ctx, sentTodayUsd: 190.01 });
    expect(daily).toEqual({ ok: false, action: 'defer', reason: expect.stringMatching(/^exceeds_daily_cap/) });
    expect(server.partySendAllowed(row({ amount: 10 }), { ...ctx, sentTodayUsd: 190 })).toEqual({ ok: true });
  });
  it('the third failure parks the row at needs_human (mirrors orchard_uplift_payment_fail)', () => {
    expect(server.nextPartyStatusAfterFailure(0)).toBe('failed');
    expect(server.nextPartyStatusAfterFailure(1)).toBe('failed');
    expect(server.nextPartyStatusAfterFailure(2)).toBe('needs_human');
    expect(client.nextPartyStatusAfterFailure(2)).toBe(server.nextPartyStatusAfterFailure(2));
  });
});

describe('cancel and creation rules', () => {
  it('a Launch is unaffected by the Uplift rule', () => {
    expect(server.upliftCancelRefusal('launch', 'funded', 3)).toBeNull();
    expect(cancelRefusal('funded', false, 'launch', 3)).toBeNull();
  });
  it('an Uplift with no party rows can still be cancelled while open or funded', () => {
    expect(server.upliftCancelRefusal('uplift', 'open', 0)).toBeNull();
    expect(server.upliftCancelRefusal('uplift', 'funded', 0)).toBeNull();
    expect(cancelRefusal('funded', false, 'uplift', 0)).toBeNull();
  });
  it('the first party row makes an Uplift uncancellable, with the reason spelled out', () => {
    const msg = server.upliftCancelRefusal('uplift', 'released', 1, 10);
    expect(msg).toMatch(/already has 1 party payment \(\$10\.00 paid\)\. It cannot be cancelled/);
    expect(cancelRefusal('released', true, 'uplift', 2, 17.4)).toMatch(/2 party payments \(\$17\.40 paid\)/);
    expect(client.upliftCancelRefusal('uplift', 'released', 2, 17.4)).toBe(server.upliftCancelRefusal('uplift', 'released', 2, 17.4));
  });
  it('a released Uplift with rows voided to zero still cannot be cancelled', () => {
    expect(server.upliftCancelRefusal('uplift', 'released', 0)).toMatch(/released to its parties/);
  });
  it('only a gosat can open an Uplift (mirror of trg_orchards_uplift_gate)', () => {
    expect(server.openRefusal('uplift', false)).toBe('Only a gosat can open an Uplift orchard.');
    expect(server.openRefusal('uplift', true)).toBeNull();
    expect(server.openRefusal('launch', false)).toBeNull();
    expect(client.openRefusal('uplift', false)).toBe(server.openRefusal('uplift', false));
  });
  it('what is left to pay excludes voided rows and counts paid separately', () => {
    const rows = [{ amount: 10, status: 'paid' }, { amount: 7.4, status: 'failed' }, { amount: 7.4, status: 'voided' }];
    expect(server.upliftRemaining(17.4, rows)).toEqual({ committed: 17.4, paid: 10, remaining: 0 });
    expect(client.upliftRemaining(17.4, rows)).toEqual(server.upliftRemaining(17.4, rows));
  });
  it('a released pocket reads differently on an Uplift', () => {
    expect(pocketState('released', null, 'launch').label).toBe('Funded — released to the sower');
    expect(pocketState('released', null, 'uplift').label).toBe('Funded — Sow2Grow pays the parties directly');
  });
});
