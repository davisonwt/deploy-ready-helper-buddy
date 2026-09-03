-- S2G Balance — Stage 5: allow a 'member' recipient_type on payouts, for an
-- on-demand S2G Balance withdrawal (request-balance-withdrawal). Distinct
-- from 'sower'/'whisperer', which are always owed_payout_balances()-sourced
-- rows -- a member withdrawal is sourced from balance_ledger instead, has
-- no covered_rows to claim (the ledger debit at request time IS the claim),
-- and needs a ledger refund rather than a covered-rows revert if it fails.
ALTER TABLE public.payouts DROP CONSTRAINT payouts_recipient_type_check;
ALTER TABLE public.payouts ADD CONSTRAINT payouts_recipient_type_check
  CHECK (recipient_type = ANY (ARRAY['sower', 'whisperer', 'member']));
