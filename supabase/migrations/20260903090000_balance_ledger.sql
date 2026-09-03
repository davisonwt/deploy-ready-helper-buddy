-- S2G Balance — Stage 1: the append-only ledger core (spec-payments.md,
-- new "S2G Balance" section to follow in a later stage).
--
-- Balance = SUM(amount) for a user, always computed, never stored as a
-- mutable number (see balance_available_v below). sower_balances is left
-- untouched by this and everything downstream — it stays exactly what it
-- is today (a topup-only credit target fed by credit_sower_balance_from_topup),
-- not reused or forked; the new ledger is a wholly separate, authoritative
-- table going forward.
CREATE TABLE public.balance_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(18,2) NOT NULL CHECK (amount <> 0),
  kind text NOT NULL CHECK (kind IN (
    'topup_usdc', 'topup_paypal', 'bestow_debit', 'earning_credit',
    -- Reserved for a future richer per-hold audit trail; not emitted yet —
    -- a bestow_debit/earning_credit row is the whole story for now.
    'escrow_hold', 'escrow_release',
    'refund', 'withdrawal', 'adjustment'
  )),
  reference_table text,
  reference_id uuid,
  -- The order/topup/payout id a credit or debit is FOR — enforces "double-
  -- submit must be idempotent on the order id" via the partial unique index
  -- below, without needing a mutable balance row to lock against.
  idempotency_key text,
  created_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX balance_ledger_idem_uq
  ON public.balance_ledger (user_id, kind, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX balance_ledger_user_idx
  ON public.balance_ledger (user_id, created_at DESC);

GRANT SELECT ON public.balance_ledger TO authenticated;
GRANT ALL ON public.balance_ledger TO service_role;

ALTER TABLE public.balance_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own balance ledger"
ON public.balance_ledger FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role manages balance ledger"
ON public.balance_ledger FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Computed, not stored — "a materialized/computed available_balance view is
-- fine for speed" (spec). A user with no rows simply has no row here;
-- callers treat a missing row as a zero balance.
CREATE VIEW public.balance_available_v
WITH (security_barrier = true) AS
SELECT user_id, SUM(amount)::numeric(18,2) AS available_balance
FROM public.balance_ledger
GROUP BY user_id;

REVOKE ALL ON public.balance_available_v FROM PUBLIC, anon;
GRANT SELECT ON public.balance_available_v TO authenticated;

-- Row-level security on a view runs as its owner and bypasses the base
-- table's RLS by default; bake the same "only your own row" restriction
-- into the view itself so a member can't read anyone else's balance.
ALTER VIEW public.balance_available_v SET (security_invoker = true);

-- --- credit_balance_ledger ------------------------------------------------
-- Idempotent on (user_id, kind, idempotency_key): a repeat call with the
-- same key returns the existing row rather than crediting twice. The
-- advisory lock (not a FOR UPDATE on some mutable row — there isn't one,
-- the ledger is append-only) is what makes two concurrent credits/debits
-- for the same user serialize correctly.
CREATE OR REPLACE FUNCTION public.credit_balance_ledger(
  _user_id uuid,
  _amount numeric,
  _kind text,
  _reference_table text DEFAULT NULL,
  _reference_id uuid DEFAULT NULL,
  _idempotency_key text DEFAULT NULL,
  _created_by uuid DEFAULT NULL,
  _notes text DEFAULT NULL
) RETURNS public.balance_ledger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.balance_ledger%ROWTYPE;
BEGIN
  IF _amount <= 0 THEN
    RAISE EXCEPTION 'credit_amount_must_be_positive:%', _amount;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(_user_id::text));

  IF _idempotency_key IS NOT NULL THEN
    SELECT * INTO v_row FROM public.balance_ledger
     WHERE user_id = _user_id AND kind = _kind AND idempotency_key = _idempotency_key;
    IF FOUND THEN
      RETURN v_row;
    END IF;
  END IF;

  INSERT INTO public.balance_ledger (
    user_id, amount, kind, reference_table, reference_id, idempotency_key, created_by, notes
  ) VALUES (
    _user_id, _amount, _kind, _reference_table, _reference_id, _idempotency_key, _created_by, _notes
  ) RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.credit_balance_ledger(uuid, numeric, text, text, uuid, text, uuid, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_balance_ledger(uuid, numeric, text, text, uuid, text, uuid, text) TO service_role;

-- --- debit_balance_ledger --------------------------------------------------
-- Same idempotency shape. Raises 'insufficient_balance:<available>' if the
-- debit would overdraw -- callers catch this and surface "Top up $X to
-- continue" rather than a generic error.
CREATE OR REPLACE FUNCTION public.debit_balance_ledger(
  _user_id uuid,
  _amount numeric,
  _kind text,
  _reference_table text DEFAULT NULL,
  _reference_id uuid DEFAULT NULL,
  _idempotency_key text DEFAULT NULL,
  _created_by uuid DEFAULT NULL,
  _notes text DEFAULT NULL
) RETURNS public.balance_ledger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.balance_ledger%ROWTYPE;
  v_available numeric;
BEGIN
  IF _amount <= 0 THEN
    RAISE EXCEPTION 'debit_amount_must_be_positive:%', _amount;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(_user_id::text));

  IF _idempotency_key IS NOT NULL THEN
    SELECT * INTO v_row FROM public.balance_ledger
     WHERE user_id = _user_id AND kind = _kind AND idempotency_key = _idempotency_key;
    IF FOUND THEN
      RETURN v_row;
    END IF;
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_available
    FROM public.balance_ledger WHERE user_id = _user_id;

  IF v_available < _amount THEN
    RAISE EXCEPTION 'insufficient_balance:%', v_available;
  END IF;

  INSERT INTO public.balance_ledger (
    user_id, amount, kind, reference_table, reference_id, idempotency_key, created_by, notes
  ) VALUES (
    _user_id, -_amount, _kind, _reference_table, _reference_id, _idempotency_key, _created_by, _notes
  ) RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.debit_balance_ledger(uuid, numeric, text, text, uuid, text, uuid, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.debit_balance_ledger(uuid, numeric, text, text, uuid, text, uuid, text) TO service_role;
