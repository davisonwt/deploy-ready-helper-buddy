-- P0-5 Phase A, Migration A1: orchard holdings ledger ("stop the leak,
-- start the ledger"). See ORCHARD-MONEY-PLAN.md sections 2-3 and 8.
--
-- Owner's rules (2026-09-05): all-or-nothing, no deadline, nothing
-- releases before full funding; target = total_pockets x pocket_price.
--
-- What this does:
--   1. bestowals gains pocket_type / delivery_address (captured at bestow).
--   2. orchard_holdings: one row per PAID orchard pocket bestowal, status
--      held | released | refund_pending | refunded. Owner reads own rows,
--      gosat/admin read all, no client writes.
--   3. orchard_events: append-only audit trail (gosat/admin read).
--   4. orchard_funding_status(orchard_id): target, held_total, pockets,
--      funded -- SECURITY DEFINER, read-only.
--   5. orchards.filled_pockets is maintained by a trigger on
--      orchard_holdings (the old update_orchard_filled_pockets() was never
--      attached to anything and is dropped).
--   6. orchard_apply_holding(bestowal_id): service-role-only, idempotent;
--      creates the holding for a completed orchard bestowal. Edge code
--      calls this instead of credit_earning_for_gift_bestowal for orchard
--      rows; that RPC now refuses orchard rows itself (second guard).
--   7. Backfill: a held holding for every already-completed orchard pocket
--      bestowal, and reversal of any stray parked-ledger credit for the
--      sower. Step 0 (scripts/studio/phase-a-step0.sql, 2026-09-05) found
--      0 such rows, so this is a no-op today but stays idempotent.
--   8. Proof query.

-- 1. Pocket kind + delivery address captured at bestow time --------------
ALTER TABLE public.bestowals
  ADD COLUMN IF NOT EXISTS pocket_type text
    CHECK (pocket_type IS NULL OR pocket_type IN ('bestowal', 'gift')),
  ADD COLUMN IF NOT EXISTS delivery_address jsonb;

-- 2. Holdings ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orchard_holdings (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orchard_id       uuid NOT NULL REFERENCES public.orchards(id) ON DELETE RESTRICT,
  bestowal_id      uuid NOT NULL UNIQUE REFERENCES public.bestowals(id) ON DELETE RESTRICT,
  bestower_user_id uuid NOT NULL,
  pockets          integer NOT NULL CHECK (pockets > 0),
  pocket_type      text CHECK (pocket_type IS NULL OR pocket_type IN ('bestowal', 'gift')),
  gross_amount     numeric(18,2) NOT NULL CHECK (gross_amount >= 0),   -- pocket price x pockets, fee-inclusive
  sower_amount     numeric(18,2) NOT NULL CHECK (sower_amount >= 0),   -- from the distribution snapshot
  s2g_amount       numeric(18,2) NOT NULL CHECK (s2g_amount >= 0),     -- held with everything else
  processor_fee    numeric(18,2) NOT NULL DEFAULT 0,
  rail             text NOT NULL CHECK (rail IN ('solana', 'paypal', 'balance', 'unknown')),
  rail_reference   text,                                               -- solana signature / paypal capture id
  payer_address    text,                                               -- Phase C backfill (solana sender)
  delivery_address jsonb,
  location         text NOT NULL DEFAULT 'hot_wallet' CHECK (location IN ('hot_wallet', 'paypal_balance', 'orchard_wallet')),
  status           text NOT NULL DEFAULT 'held' CHECK (status IN ('held', 'released', 'refund_pending', 'refunded')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orchard_holdings_orchard_idx  ON public.orchard_holdings (orchard_id, status);
CREATE INDEX IF NOT EXISTS orchard_holdings_bestower_idx ON public.orchard_holdings (bestower_user_id);

ALTER TABLE public.orchard_holdings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS orchard_holdings_select_own_or_gosat ON public.orchard_holdings;
CREATE POLICY orchard_holdings_select_own_or_gosat ON public.orchard_holdings
  FOR SELECT TO authenticated
  USING (bestower_user_id = auth.uid() OR public.is_admin_or_gosat(auth.uid()));
-- No INSERT/UPDATE/DELETE policies: only the service role (edge functions,
-- SECURITY DEFINER functions) writes here.
REVOKE ALL ON public.orchard_holdings FROM public, anon;
GRANT SELECT ON public.orchard_holdings TO authenticated;
GRANT ALL ON public.orchard_holdings TO service_role;

-- 3. Audit trail ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orchard_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orchard_id  uuid NOT NULL REFERENCES public.orchards(id) ON DELETE CASCADE,
  holding_id  uuid REFERENCES public.orchard_holdings(id) ON DELETE SET NULL,
  event       text NOT NULL,
  from_state  text,
  to_state    text,
  amount      numeric(18,2),
  actor_id    uuid,
  actor_role  text NOT NULL DEFAULT 'system' CHECK (actor_role IN ('member', 'gosat', 'system')),
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orchard_events_orchard_idx ON public.orchard_events (orchard_id, created_at);
ALTER TABLE public.orchard_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS orchard_events_select_gosat ON public.orchard_events;
CREATE POLICY orchard_events_select_gosat ON public.orchard_events
  FOR SELECT TO authenticated USING (public.is_admin_or_gosat(auth.uid()));
REVOKE ALL ON public.orchard_events FROM public, anon;
GRANT SELECT ON public.orchard_events TO authenticated;
GRANT ALL ON public.orchard_events TO service_role;

-- 4. Funding status ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.orchard_funding_status(_orchard_id uuid)
RETURNS TABLE (
  orchard_id     uuid,
  target         numeric,
  held_total     numeric,
  pockets_total  integer,
  pockets_held   integer,
  funded         boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $a1_1$
  SELECT
    o.id,
    round(COALESCE(o.total_pockets, 0) * COALESCE(o.pocket_price, 0), 2)                        AS target,
    round(COALESCE((SELECT sum(h.gross_amount) FROM public.orchard_holdings h
                    WHERE h.orchard_id = o.id AND h.status IN ('held', 'released')), 0), 2)       AS held_total,
    COALESCE(o.total_pockets, 0)                                                                 AS pockets_total,
    COALESCE((SELECT sum(h.pockets) FROM public.orchard_holdings h
              WHERE h.orchard_id = o.id AND h.status IN ('held', 'released')), 0)::integer         AS pockets_held,
    (COALESCE(o.total_pockets, 0) > 0
      AND COALESCE((SELECT sum(h.gross_amount) FROM public.orchard_holdings h
                    WHERE h.orchard_id = o.id AND h.status IN ('held', 'released')), 0)
          >= COALESCE(o.total_pockets, 0) * COALESCE(o.pocket_price, 0))                          AS funded
  FROM public.orchards o
  WHERE o.id = _orchard_id;
$a1_1$;
REVOKE ALL ON FUNCTION public.orchard_funding_status(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.orchard_funding_status(uuid) TO authenticated, service_role;

-- 5. Pocket counter maintained from holdings --------------------------------
DROP FUNCTION IF EXISTS public.update_orchard_filled_pockets();  -- never attached to a trigger

CREATE OR REPLACE FUNCTION public.orchard_recount_pockets()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $a1_2$
DECLARE
  v_orchard uuid := COALESCE(NEW.orchard_id, OLD.orchard_id);
BEGIN
  UPDATE public.orchards o
     SET filled_pockets = COALESCE((SELECT sum(h.pockets) FROM public.orchard_holdings h
                                    WHERE h.orchard_id = v_orchard AND h.status IN ('held', 'released')), 0),
         updated_at = now()
   WHERE o.id = v_orchard;
  RETURN NULL;
END;
$a1_2$;
DROP TRIGGER IF EXISTS orchard_holdings_recount ON public.orchard_holdings;
CREATE TRIGGER orchard_holdings_recount
  AFTER INSERT OR DELETE OR UPDATE OF status, pockets ON public.orchard_holdings
  FOR EACH ROW EXECUTE FUNCTION public.orchard_recount_pockets();

-- 6. Apply a holding for a completed orchard bestowal (idempotent) ----------
CREATE OR REPLACE FUNCTION public.orchard_apply_holding(_bestowal_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $a1_3$
DECLARE
  v_b         public.bestowals%ROWTYPE;
  v_holding   uuid;
  v_gross     numeric;
  v_sower     numeric;
  v_s2g       numeric;
  v_rail      text;
BEGIN
  SELECT * INTO v_b FROM public.bestowals WHERE id = _bestowal_id FOR UPDATE;
  IF NOT FOUND OR v_b.orchard_id IS NULL THEN
    RETURN NULL;                                           -- not an orchard bestowal
  END IF;
  IF v_b.payment_status NOT IN ('completed', 'distributed') THEN
    RETURN NULL;                                           -- not paid yet
  END IF;

  SELECT id INTO v_holding FROM public.orchard_holdings WHERE bestowal_id = _bestowal_id;
  IF v_holding IS NOT NULL THEN
    RETURN v_holding;                                      -- already applied
  END IF;

  v_gross := round(COALESCE(v_b.base_amount, v_b.amount, 0), 2);
  v_sower := round(COALESCE((v_b.distribution_data ->> 'sower_amount')::numeric, v_gross / 1.15), 2);
  v_s2g   := round(GREATEST(v_gross - v_sower, 0), 2);
  v_rail  := CASE v_b.provider WHEN 'solana' THEN 'solana' WHEN 'paypal' THEN 'paypal' WHEN 'balance' THEN 'balance' ELSE 'unknown' END;

  INSERT INTO public.orchard_holdings (
    orchard_id, bestowal_id, bestower_user_id, pockets, pocket_type,
    gross_amount, sower_amount, s2g_amount, processor_fee,
    rail, rail_reference, delivery_address, location, status
  ) VALUES (
    v_b.orchard_id, v_b.id, v_b.bestower_id, GREATEST(COALESCE(v_b.pockets_count, 1), 1), v_b.pocket_type,
    v_gross, v_sower, v_s2g, COALESCE(v_b.processor_fee_amount, 0),
    v_rail, v_b.payment_reference, v_b.delivery_address,
    CASE WHEN v_b.provider = 'paypal' THEN 'paypal_balance' ELSE 'hot_wallet' END, 'held'
  )
  ON CONFLICT (bestowal_id) DO NOTHING
  RETURNING id INTO v_holding;

  IF v_holding IS NULL THEN
    SELECT id INTO v_holding FROM public.orchard_holdings WHERE bestowal_id = _bestowal_id;
    RETURN v_holding;
  END IF;

  -- Orchard money is not an earning until release: keep the payout queue
  -- from ever seeing this row (Phase B adds the released condition).
  UPDATE public.bestowals SET payout_status = 'held_for_orchard' WHERE id = _bestowal_id;

  INSERT INTO public.orchard_events (orchard_id, holding_id, event, from_state, to_state, amount, actor_role, notes)
  VALUES (v_b.orchard_id, v_holding, 'holding_created', NULL, 'held', v_gross, 'system',
          format('%s pocket(s) via %s, ref %s', GREATEST(COALESCE(v_b.pockets_count, 1), 1), v_rail, COALESCE(v_b.payment_reference, '-')));

  RETURN v_holding;
END;
$a1_3$;
REVOKE ALL ON FUNCTION public.orchard_apply_holding(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.orchard_apply_holding(uuid) TO service_role;

-- bestowals.payout_status has no CHECK constraint (confirmed in
-- 20260831090000: values are 'pending' | 'processing' | 'paid' |
-- 'credited_to_balance'); 'held_for_orchard' is excluded from
-- owed_payout_balances() by its payout_status = 'pending' filter.

-- 6b. Second guard: the gift credit refuses orchard rows outright ----------
CREATE OR REPLACE FUNCTION public.credit_earning_for_gift_bestowal(_bestowal_id uuid, _actor_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $a1_4$
DECLARE
  v_b public.bestowals%ROWTYPE;
  v_recipient uuid;
  v_amount numeric;
  v_flag boolean;
BEGIN
  SELECT * INTO v_b FROM public.bestowals WHERE id = _bestowal_id FOR UPDATE;
  IF NOT FOUND OR v_b.payout_status IS DISTINCT FROM 'pending' THEN
    RETURN; -- already credited (or paid via the old rail) -- never double-credit
  END IF;

  -- Phase A (2026-09-05): orchard money is HELD, never credited here.
  IF v_b.orchard_id IS NOT NULL THEN
    RETURN;
  END IF;

  -- Same gate as credit_earning_for_bestowal (non-custodial model): when
  -- S2G Balance is off, leave the row 'pending' for the payout pipeline.
  SELECT (value = 'true'::jsonb) INTO v_flag
    FROM public.app_settings WHERE key = 's2g_balance_enabled';
  IF NOT COALESCE(v_flag, false) THEN
    RETURN;
  END IF;

  v_recipient := (v_b.distribution_data ->> 'sower_user_id')::uuid;
  v_amount := COALESCE((v_b.distribution_data ->> 'sower_amount')::numeric, v_b.base_amount);

  IF v_recipient IS NOT NULL AND v_amount > 0 THEN
    PERFORM public.credit_balance_ledger(
      v_recipient, v_amount, 'earning_credit',
      'bestowals', _bestowal_id, _bestowal_id::text, _actor_id,
      'gift bestowal earning released'
    );
  END IF;

  UPDATE public.bestowals
     SET payout_status = 'credited_to_balance'
   WHERE id = _bestowal_id AND payout_status = 'pending';
END;
$a1_4$;

-- 7. Backfill (idempotent; 0 rows expected on 2026-09-05) -------------------
DO $a1_5$
DECLARE
  r record;
  v_holding uuid;
  v_created int := 0;
  v_reversed int := 0;
  v_reversed_total numeric := 0;
  v_skipped int := 0;
BEGIN
  FOR r IN
    SELECT b.id AS bestowal_id
    FROM public.bestowals b
    WHERE b.orchard_id IS NOT NULL
      AND b.payment_status IN ('completed', 'distributed')
      AND NOT EXISTS (SELECT 1 FROM public.orchard_holdings h WHERE h.bestowal_id = b.id)
  LOOP
    v_holding := public.orchard_apply_holding(r.bestowal_id);
    IF v_holding IS NOT NULL THEN v_created := v_created + 1; END IF;
  END LOOP;

  -- Reverse stray parked-ledger credits: mirror debit referenced to the holding.
  FOR r IN
    SELECT l.id AS ledger_id, l.user_id, l.amount, l.reference_id AS bestowal_id, h.id AS holding_id
    FROM public.balance_ledger l
    JOIN public.bestowals b ON b.id = l.reference_id
    JOIN public.orchard_holdings h ON h.bestowal_id = b.id
    WHERE l.reference_table = 'bestowals'
      AND l.kind = 'earning_credit'
      AND b.orchard_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.balance_ledger x
        WHERE x.idempotency_key = 'orchard-holding-reversal:' || b.id::text
      )
  LOOP
    BEGIN
      PERFORM public.debit_balance_ledger(
        r.user_id, r.amount, 'adjustment',
        'orchard_holdings', r.holding_id,
        'orchard-holding-reversal:' || r.bestowal_id::text, NULL,
        'Reversed: orchard pocket money was credited before the orchard funded (P0-5 Phase A); now held on orchard_holdings'
      );
      UPDATE public.bestowals SET payout_status = 'held_for_orchard' WHERE id = r.bestowal_id;
      v_reversed := v_reversed + 1;
      v_reversed_total := v_reversed_total + r.amount;
    EXCEPTION WHEN OTHERS THEN
      v_skipped := v_skipped + 1;
      RAISE NOTICE 'reversal skipped for bestowal % (%): %', r.bestowal_id, r.user_id, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'Phase A backfill: holdings created=%, ledger credits reversed=% (total %), reversal skipped=%',
    v_created, v_reversed, v_reversed_total, v_skipped;
END;
$a1_5$;

-- 8. Proof --------------------------------------------------------------------
SELECT json_build_object(
  'per_orchard', (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
      SELECT o.id, o.title, o.filled_pockets, f.target, f.held_total, f.pockets_total, f.pockets_held, f.funded
      FROM public.orchards o
      JOIN LATERAL public.orchard_funding_status(o.id) f ON true
      WHERE o.status = 'active' OR EXISTS (SELECT 1 FROM public.orchard_holdings h WHERE h.orchard_id = o.id)
      ORDER BY f.held_total DESC, o.created_at DESC
      LIMIT 50
    ) t
  ),
  'holdings', (SELECT json_build_object('rows', count(*), 'held_total', round(COALESCE(sum(gross_amount), 0), 2)) FROM public.orchard_holdings WHERE status = 'held'),
  'reversed_credits_per_sower', (
    SELECT COALESCE(json_agg(json_build_object('user_id', user_id, 'reversed', round(amount, 2))), '[]'::json)
    FROM (SELECT user_id, sum(amount) AS amount FROM public.balance_ledger
          WHERE reference_table = 'orchard_holdings' AND kind = 'adjustment' GROUP BY user_id) s
  ),
  'orchard_bestowals_still_credited', (
    SELECT count(*) FROM public.bestowals WHERE orchard_id IS NOT NULL AND payout_status = 'credited_to_balance'
  ),
  'dead_trigger_fn_gone', NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_orchard_filled_pockets'),
  'rpc_grants', json_build_object(
    'funding_status_authenticated', has_function_privilege('authenticated', 'public.orchard_funding_status(uuid)', 'EXECUTE'),
    'apply_holding_authenticated',  has_function_privilege('authenticated', 'public.orchard_apply_holding(uuid)', 'EXECUTE'),
    'apply_holding_service_role',   has_function_privilege('service_role', 'public.orchard_apply_holding(uuid)', 'EXECUTE')
  )
) AS proof;
