-- Backfill: reverts two of Amber Wheeles' (sower c34c0eba-0010-480b-8326-
-- 7063cd7221ae) product_bestowals rows that were credited to balance_ledger
-- ($2.00 each, kind='earning_credit') by the original Stage-4 backfill
-- migration (20260903093500_balance_ledger_earnings_backfill.sql), which
-- ran BEFORE credit_earning_for_bestowal's app_settings.s2g_balance_enabled
-- gate existed (added later, in 20260903150000_non_custodial_cutover.sql).
-- The flag has been false ever since that cutover -- current code is
-- already correctly gated (verified directly: scripts/s2g-balance-flag-
-- tests.sql exercises both flag states against the live function and
-- passes) -- these two rows are stale DATA left over from that timing gap,
-- not evidence of an ongoing bug in finalize_basket_order or
-- credit_earning_for_bestowal.
--
-- Reversed via debit_balance_ledger (kind='adjustment'), not a delete --
-- balance_ledger is append-only by design; this keeps both the original
-- credit and its reversal visible in the audit trail. payout_status is
-- restored to 'pending' so owed_payout_balances() (and so
-- request-earnings-payout / EarningsPayoutCard on Payout Settings) sees
-- these again.
--
-- Scoped to Amber's two rows only -- a broader sweep found 7 bestowals
-- system-wide in the same stuck state ($13.95 total sower_amount across
-- other sowers), left for a separate, explicitly-requested backfill.

DO $$
DECLARE
  v_bestowal_id uuid;
  v_sower_user_id uuid := 'c34c0eba-0010-480b-8326-7063cd7221ae';
BEGIN
  FOR v_bestowal_id IN
    SELECT id FROM public.product_bestowals
     WHERE id IN (
       'f119e2a6-09fa-494f-8696-1ce5976d54e1',
       'acc9074c-f0c8-48b1-9cd3-c90158859768'
     )
     AND payout_status = 'credited_to_balance' -- idempotent: no-op if already reverted
  LOOP
    PERFORM public.debit_balance_ledger(
      v_sower_user_id, 2.00, 'adjustment',
      'product_bestowals', v_bestowal_id, v_bestowal_id::text || ':revert-stale-credit',
      NULL,
      'Reverted: credited while s2g_balance_enabled was already off (stale backfill-era data, not a live bug)'
    );

    UPDATE public.product_bestowals
       SET payout_status = 'pending'
     WHERE id = v_bestowal_id;
  END LOOP;
END $$;
