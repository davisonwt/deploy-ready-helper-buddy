// Bookkeeping Phase 2: reconciliation math (TypeScript twin of
// public.treasury_verdict, see supabase/functions/_shared/liabilityRules.ts).
// The database side is proven by scripts/studio/liability-shortfall-tests.sql.

import { describe, it, expect } from 'vitest';
import {
  treasuryVerdict,
  verdictSentence,
  walletExpectations,
  type SnapshotForWallets,
} from '../../supabase/functions/_shared/liabilityRules';

describe('treasury verdict', () => {
  it('GREEN when assets cover liabilities and the expected parts explain the rest', () => {
    const v = treasuryVerdict({ assetsUsd: 100, liabilitiesUsd: 60, s2gOwnUsd: 20, unrecordedUsd: 1, recordedFloatUsd: 19 });
    expect(v.verdict).toBe('GREEN');
    expect(v.expected_assets).toBe(100);
    expect(v.unexplained).toBe(0);
    expect(v.unexplained_beyond_tolerance).toBe(false);
    expect(v.shortfall).toBe(0);
    expect(v.coverage_ratio).toBe(1.6667);
  });

  it("RED on a shortfall: today's live picture (5.62 on hand vs 21.95 held)", () => {
    const v = treasuryVerdict({ assetsUsd: 5.62, liabilitiesUsd: 21.95, s2gOwnUsd: 1.9, unrecordedUsd: 0.02 });
    expect(v.verdict).toBe('RED');
    expect(v.shortfall).toBe(16.33);
    expect(verdictSentence(v, 'live')).toMatch(/^Short by \$16\.33/);
  });

  it('a forced shortfall flips GREEN to RED (the fixture case)', () => {
    const before = treasuryVerdict({ assetsUsd: 50, liabilitiesUsd: 20, s2gOwnUsd: 5, recordedFloatUsd: 25 });
    const after = treasuryVerdict({ assetsUsd: 50, liabilitiesUsd: 20 + 1000, s2gOwnUsd: 5, recordedFloatUsd: 25 });
    expect(before.verdict).toBe('GREEN');
    expect(after.verdict).toBe('RED');
    expect(after.shortfall).toBe(970);
  });

  it('negative recognised revenue never counts as an asset', () => {
    const v = treasuryVerdict({ assetsUsd: 30, liabilitiesUsd: 20, s2gOwnUsd: -12.05 });
    expect(v.s2g_own).toBe(0);
    expect(v.expected_assets).toBe(20);
    expect(v.unexplained).toBe(10);
  });

  it('tolerance defaults to the larger of 1.00 and 1% of expected assets', () => {
    expect(treasuryVerdict({ assetsUsd: 10, liabilitiesUsd: 5, s2gOwnUsd: 0 }).tolerance).toBe(1);
    expect(treasuryVerdict({ assetsUsd: 1000, liabilitiesUsd: 500, s2gOwnUsd: 0 }).tolerance).toBe(5);
    const v = treasuryVerdict({ assetsUsd: 1006, liabilitiesUsd: 500, s2gOwnUsd: 0, toleranceUsd: 2 });
    expect(v.verdict).toBe('GREEN');
    expect(v.unexplained).toBe(506);
    expect(v.unexplained_beyond_tolerance).toBe(true);
    expect(verdictSentence(v, 'live')).toMatch(/^Covered, with \$506\.00 more on hand/);
  });

  it('agreement within tolerance reads as covered', () => {
    const v = treasuryVerdict({ assetsUsd: 100.4, liabilitiesUsd: 80, s2gOwnUsd: 20 });
    expect(v.verdict).toBe('GREEN');
    expect(verdictSentence(v, 'live')).toBe('Covered. Books and wallets agree within $0.40.');
  });
});

describe('per-wallet expectation', () => {
  const snap: SnapshotForWallets = {
    held_for_members: { owed: { by_rail: { solana: 4, paypal: 4, unassigned: 2 } }, parked: { total: 13.95 } },
    held_for_orchards: { by_location: { 'hot_wallet/solana': 10, 'paypal_balance/paypal': 20, 'orchard_wallet/solana': 30 } },
    s2g_own: { operating_net: 1.9, by_rail: { solana: 1.2, paypal: 0.6, none: 0.1 } },
    unrecorded: { solana_processor_fees: 0.02 },
    recorded_float: { by_wallet: { hot: 1 } },
    swept_to_squad: 0.5,
  };
  it('places every rail-bearing amount in exactly one wallet and never drops the rest', () => {
    const { wallets, unplaced } = walletExpectations(snap);
    const byName = Object.fromEntries(wallets.map((w) => [w.wallet, w]));
    expect(byName.hot.expected).toBe(15.72); // 4 owed + 10 orchards + 0.7 unswept own + 0.02 fees + 1 float
    expect(byName.squad.expected).toBe(0.5);
    expect(byName.launch.expected).toBe(30);
    expect(byName.uplift.expected).toBe(0);
    expect(byName.paypal.expected).toBe(24.6);
    expect(unplaced).toEqual({ parked_s2g_balance_without_rail: 13.95, owed_without_rail: 2, s2g_own_other_rails: 0.1 });
  });
  it("cross-rail payouts move expectation from the paying wallet to the one holding the sale proceeds (today's 4.00)", () => {
    const { wallets } = walletExpectations({
      held_for_members: { owed: { by_rail: {} }, parked: { total: 8 } },
      held_for_orchards: { by_location: {} },
      s2g_own: { operating_net: 2.5, by_rail: { solana: 0.6, paypal: 1.8, none: 0.1 } },
      unrecorded: { solana_processor_fees: 0.02 },
      recorded_float: { by_wallet: { hot: 15 } },
      swept_to_squad: 0,
      payouts_paid: { total: 8, by_rail: { solana: 8 }, cross_rail: { solana_paid_for_paypal_sales: 4, paypal_paid_for_solana_sales: 0 } },
    });
    const byName = Object.fromEntries(wallets.map((w) => [w.wallet, w]));
    // hot: 0.6 own + 0.02 fees + 15 float - 4 paid for PayPal sales = 11.62 (actual 12.62: the unrecorded 1.00 seed)
    expect(byName.hot.expected).toBe(11.62);
    expect(byName.hot.parts.paid_out_for_paypal_sales).toBe(-4);
    // paypal: 1.8 own + 4 it now holds on the hot wallet's behalf
    expect(byName.paypal.expected).toBe(5.8);
  });

  it('closed books (2026-09-06): every wallet reconciles to the cent when parked money is placed by rail', () => {
    const { wallets, unplaced } = walletExpectations({
      held_for_members: { owed: { by_rail: {} }, parked: { total: 8, by_rail: { paypal: 8 } } },
      held_for_orchards: { by_location: {} },
      s2g_own: { operating_net: 2.4, by_rail: { solana: 0.6, paypal: 1.8, none: 0 } },
      unrecorded: { solana_processor_fees: 0.02 },
      recorded_float: { by_wallet: { hot: 16 } },
      swept_to_squad: 0,
      payouts_paid: { total: 8, by_rail: { solana: 8 }, cross_rail: { solana_paid_for_paypal_sales: 4, paypal_paid_for_solana_sales: 0 } },
    });
    const byName = Object.fromEntries(wallets.map((w) => [w.wallet, w]));
    expect(byName.hot.expected).toBe(12.62);   // 0.6 + 0.02 + 16 - 4 = the wallet's actual balance
    expect(byName.paypal.expected).toBe(13.8); // 8 parked + 1.8 own + 4 held for the hot wallet = six 2.30 sales
    expect(unplaced).toEqual({ parked_s2g_balance_without_rail: 0, owed_without_rail: 0, s2g_own_other_rails: 0 });
  });

  it('an empty snapshot expects nothing anywhere', () => {
    const { wallets, unplaced } = walletExpectations({
      held_for_members: { owed: { by_rail: {} }, parked: { total: 0 } },
      held_for_orchards: { by_location: {} },
      s2g_own: { operating_net: 0, by_rail: {} },
      unrecorded: { solana_processor_fees: 0 },
      recorded_float: { by_wallet: {} },
      swept_to_squad: 0,
    });
    for (const w of wallets) expect(w.expected).toBe(0);
    expect(unplaced.parked_s2g_balance_without_rail).toBe(0);
  });
});
