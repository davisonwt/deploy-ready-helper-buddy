-- S2G Balance — Stage 4 backfill: any product_bestowals row already
-- release_status='released' with payout_status still 'pending' at cutover
-- (created before this migration) gets credited into the ledger once, same
-- as if it had just been released -- so nothing already-released-but-
-- unpaid is stuck between the old owed_payout_balances() rail and the new
-- ledger. One-time, idempotent by construction (credit_earning_for_bestowal
-- itself no-ops anything not still 'pending').
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT id FROM public.product_bestowals
     WHERE release_status = 'released' AND payout_status = 'pending'
  LOOP
    PERFORM public.credit_earning_for_bestowal(r.id, NULL, 'system_backfill');
  END LOOP;
END $$;
