-- P0-5 Phase C1 (ORCHARD-CANCEL-REFUND-PLAN.md section 3): know who to
-- refund. Approved by the owner 2026-09-06.
--
--   solana_payment_intents.payer_address / payer_source   the sender the
--       confirmer read from the transaction (chain) or unknown
--   orchard_holdings.payer_source   chain | intent | manual | unknown
--   orchard_apply_holding()         copies the payer from the intent at hold time
--   orchard_record_payer()          service-role RPC the backfill writes through
--   orchard_set_payer_manual()      gosat/admin: enter a payer by hand, logged
--       as manual (owner decision 1)
-- Prefer: npx supabase db query --linked -f <this file>

ALTER TABLE public.solana_payment_intents
  ADD COLUMN IF NOT EXISTS payer_address text,
  ADD COLUMN IF NOT EXISTS payer_source  text CHECK (payer_source IN ('chain', 'unknown'));

ALTER TABLE public.orchard_holdings
  ADD COLUMN IF NOT EXISTS payer_source text CHECK (payer_source IN ('chain', 'intent', 'manual', 'unknown'));

-- Service-role writer used by backfill-orchard-payers (never guesses; records unknown as unknown).
CREATE OR REPLACE FUNCTION public.orchard_record_payer(_holding_id uuid, _address text, _source text, _detail text, _actor text DEFAULT 'service')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $c1_rec$
DECLARE
  v_h public.orchard_holdings%ROWTYPE;
BEGIN
  IF _source NOT IN ('chain', 'unknown') THEN
    RAISE EXCEPTION 'orchard_record_payer: source must be chain or unknown';
  END IF;
  IF _source = 'chain' AND (_address IS NULL OR length(_address) < 32 OR length(_address) > 44 OR _address !~ '^[1-9A-HJ-NP-Za-km-z]+$') THEN
    RAISE EXCEPTION 'orchard_record_payer: invalid address for a chain reading';
  END IF;
  SELECT * INTO v_h FROM public.orchard_holdings WHERE id = _holding_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('recorded', false, 'reason', 'holding_not_found'); END IF;
  IF v_h.payer_source = 'manual' THEN
    RETURN jsonb_build_object('recorded', false, 'reason', 'manual_entry_kept', 'payer_address', v_h.payer_address);
  END IF;

  UPDATE public.orchard_holdings
     SET payer_address = CASE WHEN _source = 'chain' THEN _address ELSE payer_address END,
         payer_source = CASE WHEN _source = 'chain' THEN 'chain' ELSE 'unknown' END,
         updated_at = now()
   WHERE id = _holding_id;
  UPDATE public.solana_payment_intents i
     SET payer_address = CASE WHEN _source = 'chain' THEN _address ELSE i.payer_address END,
         payer_source = CASE WHEN _source = 'chain' THEN 'chain' ELSE COALESCE(i.payer_source, 'unknown') END
   WHERE i.order_kind = 'orchard' AND i.order_id = v_h.bestowal_id;

  INSERT INTO public.orchard_events (orchard_id, holding_id, event, from_state, to_state, amount, actor_role, notes)
  VALUES (v_h.orchard_id, _holding_id, 'payer_recorded', NULL, _source, NULL, 'system',
          format('payer %s (%s) by %s: %s', COALESCE(_address, '-'), _source, _actor, COALESCE(_detail, '')));
  RETURN jsonb_build_object('recorded', true, 'payer_address', CASE WHEN _source = 'chain' THEN _address ELSE v_h.payer_address END, 'payer_source', _source);
END;
$c1_rec$;
REVOKE ALL ON FUNCTION public.orchard_record_payer(uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.orchard_record_payer(uuid, text, text, text, text) TO service_role;

-- Gosat/admin: enter the payer by hand when the chain cannot tell us (logged as manual).
CREATE OR REPLACE FUNCTION public.orchard_set_payer_manual(_holding_id uuid, _address text, _note text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $c1_man$
DECLARE
  v_h public.orchard_holdings%ROWTYPE;
BEGIN
  IF NOT public.is_admin_or_gosat(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _note IS NULL OR length(btrim(_note)) < 10 THEN RAISE EXCEPTION 'manual_payer_needs_note'; END IF;
  IF _address IS NULL OR length(_address) < 32 OR length(_address) > 44 OR _address !~ '^[1-9A-HJ-NP-Za-km-z]+$' THEN
    RAISE EXCEPTION 'invalid_solana_address';
  END IF;
  SELECT * INTO v_h FROM public.orchard_holdings WHERE id = _holding_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'holding_not_found'; END IF;
  IF v_h.rail <> 'solana' THEN RAISE EXCEPTION 'manual_payer_only_for_solana'; END IF;
  IF v_h.status IN ('refunded', 'released') THEN RAISE EXCEPTION 'holding_not_refundable: %', v_h.status; END IF;

  UPDATE public.orchard_holdings SET payer_address = _address, payer_source = 'manual', updated_at = now() WHERE id = _holding_id;
  INSERT INTO public.orchard_events (orchard_id, holding_id, event, from_state, to_state, amount, actor_id, actor_role, notes)
  VALUES (v_h.orchard_id, _holding_id, 'payer_set_manually', COALESCE(v_h.payer_source, 'none'), 'manual', NULL, auth.uid(), 'gosat',
          format('payer %s entered by hand (was %s): %s', _address, COALESCE(v_h.payer_address, '-'), _note));
  PERFORM public.log_security_event_enhanced('orchard_payer_manual', auth.uid(),
    jsonb_build_object('holding_id', _holding_id, 'address', _address, 'note', _note), inet_client_addr(), 'warning');
  RETURN jsonb_build_object('recorded', true, 'payer_address', _address, 'payer_source', 'manual');
END;
$c1_man$;
REVOKE ALL ON FUNCTION public.orchard_set_payer_manual(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.orchard_set_payer_manual(uuid, text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.orchard_apply_holding(_bestowal_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $c1_ah$
DECLARE
  v_b         public.bestowals%ROWTYPE;
  v_holding   uuid;
  v_gross     numeric;
  v_sower     numeric;
  v_s2g       numeric;
  v_rail      text;
  v_payer     text;
  v_payer_src text;
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

  -- Phase C1: who to refund. Solana: the sender the confirmer read from the
  -- transaction (solana_payment_intents.payer_address); unknown if it
  -- could not. PayPal / balance: the capture id / member id is the
  -- destination, no wallet to store.
  IF v_rail = 'solana' THEN
    SELECT i.payer_address INTO v_payer
      FROM public.solana_payment_intents i
     WHERE i.order_kind = 'orchard' AND i.order_id = v_b.id AND i.payer_address IS NOT NULL
     ORDER BY i.paid_at DESC NULLS LAST LIMIT 1;
    v_payer_src := CASE WHEN v_payer IS NULL THEN 'unknown' ELSE 'intent' END;
  END IF;

  INSERT INTO public.orchard_holdings (
    orchard_id, bestowal_id, bestower_user_id, pockets, pocket_type,
    gross_amount, sower_amount, s2g_amount, processor_fee,
    rail, rail_reference, delivery_address, location, status,
    payer_address, payer_source
  ) VALUES (
    v_b.orchard_id, v_b.id, v_b.bestower_id, GREATEST(COALESCE(v_b.pockets_count, 1), 1), v_b.pocket_type,
    v_gross, v_sower, v_s2g, COALESCE(v_b.processor_fee_amount, 0),
    v_rail, v_b.payment_reference, v_b.delivery_address,
    CASE WHEN v_b.provider = 'paypal' THEN 'paypal_balance' ELSE 'hot_wallet' END, 'held',
    v_payer, v_payer_src
  )
  ON CONFLICT (bestowal_id) DO NOTHING
  RETURNING id INTO v_holding;

  IF v_holding IS NULL THEN
    SELECT id INTO v_holding FROM public.orchard_holdings WHERE bestowal_id = _bestowal_id;
    RETURN v_holding;
  END IF;

  -- Orchard money is not an earning until release.
  UPDATE public.bestowals SET payout_status = 'held_for_orchard' WHERE id = _bestowal_id;

  INSERT INTO public.orchard_events (orchard_id, holding_id, event, from_state, to_state, amount, actor_role, notes)
  VALUES (v_b.orchard_id, v_holding, 'holding_created', NULL, 'held', v_gross, 'system',
          format('%s pocket(s) via %s, ref %s', GREATEST(COALESCE(v_b.pockets_count, 1), 1), v_rail, COALESCE(v_b.payment_reference, '-')));

  -- Phase B: if this holding completed the funding, release now, in this
  -- transaction (idempotent; a no-op when not funded or already released).
  PERFORM public.orchard_release_if_funded(v_b.orchard_id);

  RETURN v_holding;
END;
$c1_ah$;

-- Proof
SELECT jsonb_build_object(
  'intent_cols', (SELECT count(*) FROM information_schema.columns WHERE table_name = 'solana_payment_intents' AND column_name IN ('payer_address', 'payer_source')),
  'holding_col', (SELECT count(*) FROM information_schema.columns WHERE table_name = 'orchard_holdings' AND column_name = 'payer_source'),
  'holdings_without_payer', (SELECT count(*) FROM public.orchard_holdings WHERE rail = 'solana' AND payer_address IS NULL),
  'grants', jsonb_build_object(
    'record_payer_authenticated', has_function_privilege('authenticated', 'public.orchard_record_payer(uuid, text, text, text, text)', 'EXECUTE'),
    'record_payer_service_role', has_function_privilege('service_role', 'public.orchard_record_payer(uuid, text, text, text, text)', 'EXECUTE'),
    'manual_authenticated', has_function_privilege('authenticated', 'public.orchard_set_payer_manual(uuid, text, text)', 'EXECUTE'))
) AS proof;
