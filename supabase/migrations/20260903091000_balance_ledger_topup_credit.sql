-- S2G Balance — Stage 2: wallet top-ups credit the new ledger instead of
-- sower_balances. Mirrors credit_sower_balance_from_topup's exact
-- lock/idempotency shape (lock the topup row, no-op if credited_at is
-- already set) so the swap in _shared/paypal/capture.ts's finalize() is a
-- one-line change with identical semantics -- nothing about how
-- create-wallet-topup, createSolanaIntent, checkAndFinalizeSolanaIntent, or
-- the PayPal capture webhook work needs to change.
CREATE OR REPLACE FUNCTION public.credit_balance_ledger_from_topup(_topup_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid;
  _amount numeric;
  _provider text;
  _already boolean;
  _kind text;
BEGIN
  SELECT user_id, amount, provider, (credited_at IS NOT NULL)
    INTO _user, _amount, _provider, _already
    FROM public.topups
   WHERE id = _topup_id
   FOR UPDATE;

  IF _user IS NULL THEN
    RAISE EXCEPTION 'topup_not_found:%', _topup_id;
  END IF;
  IF _already THEN
    RETURN false;
  END IF;

  _kind := CASE WHEN _provider = 'paypal' THEN 'topup_paypal' ELSE 'topup_usdc' END;

  PERFORM public.credit_balance_ledger(
    _user, _amount, _kind, 'topups', _topup_id, _topup_id::text, NULL,
    'wallet top-up via ' || _provider
  );

  UPDATE public.topups
     SET status = 'completed',
         credited_at = now()
   WHERE id = _topup_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.credit_balance_ledger_from_topup(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_balance_ledger_from_topup(uuid) TO service_role;
