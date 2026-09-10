-- Print-ready receipt page (/receipt/:orderId). Every receipt already
-- exists as a `chat_messages` row (message_type = 'bestowal_receipt',
-- inserted/updated by _shared/postFinalize/messaging.ts) carrying every
-- display field in system_metadata -- there is no separate "receipts"
-- table, and none is needed. orderId in the route IS that message's own
-- id.
--
-- Visibility: "the payer, the sower on it, or GoSat" maps exactly onto
-- chat_participants of the receipt's own room -- get_or_create_direct_room
-- (messaging.ts) always creates that room between exactly the buyer and
-- that one sower, and ensureS2gSystemRoom (topups) creates it with only
-- the buyer. So "is a participant of this message's room" already is
-- "payer or the sower on it"; this RPC adds GoSat as an explicit override
-- on top, rather than relying on chat_messages' own RLS (which may be
-- broader/narrower than exactly this rule).

CREATE OR REPLACE FUNCTION public.get_receipt(_message_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $gr$
DECLARE
  v_msg record;
  v_is_participant boolean;
BEGIN
  SELECT id, room_id, system_metadata, created_at
    INTO v_msg
    FROM public.chat_messages
   WHERE id = _message_id AND message_type = 'bestowal_receipt';
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.chat_participants
     WHERE room_id = v_msg.room_id AND user_id = auth.uid()
  ) INTO v_is_participant;

  IF NOT v_is_participant AND NOT public.is_admin_or_gosat(auth.uid()) THEN
    RETURN NULL; -- unauthorized reads identically to "not found" -- never confirms a message id exists
  END IF;

  RETURN jsonb_build_object(
    'id', v_msg.id,
    'created_at', v_msg.created_at,
    'metadata', v_msg.system_metadata
  );
END;
$gr$;

REVOKE ALL ON FUNCTION public.get_receipt(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_receipt(uuid) TO authenticated;

-- --- Sower's earnings view (MyOrdersPage "I sowed" tab) --------------------
-- product_bestowals rows (basket-sourced sales) don't carry the receipt
-- message's own source_id directly -- messaging.ts's resolveBasketOrder
-- keys the receipt to the PARENT basket_orders.id, one receipt per sower
-- across however many product_bestowals lines that sower had in the same
-- basket. This resolves a single sale row to its shared receipt's message
-- id (or null if none was ever posted -- e.g. a pre-receipt-feature sale).
-- Returns only an opaque id, no message content, so no auth check is
-- needed here -- get_receipt() re-validates before returning anything a
-- caller could read.
CREATE OR REPLACE FUNCTION public.find_bestowal_receipt(_product_bestowal_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fbr$
DECLARE
  v_sower_id uuid;
  v_sower_user_id uuid;
  v_basket_order_id uuid;
  v_msg_id uuid;
BEGIN
  SELECT sower_id INTO v_sower_id FROM public.product_bestowals WHERE id = _product_bestowal_id;
  IF v_sower_id IS NULL THEN RETURN NULL; END IF;

  SELECT user_id INTO v_sower_user_id FROM public.sowers WHERE id = v_sower_id;
  IF v_sower_user_id IS NULL THEN RETURN NULL; END IF;

  SELECT basket_order_id INTO v_basket_order_id
    FROM public.basket_order_bestowals
   WHERE bestowal_id = _product_bestowal_id;
  IF v_basket_order_id IS NULL THEN RETURN NULL; END IF;

  SELECT id INTO v_msg_id
    FROM public.chat_messages
   WHERE message_type = 'bestowal_receipt'
     AND system_metadata @> jsonb_build_object(
           'source', 'basket',
           'source_id', v_basket_order_id::text,
           'sower_key', v_sower_user_id::text
         )
   LIMIT 1;

  RETURN v_msg_id;
END;
$fbr$;

REVOKE ALL ON FUNCTION public.find_bestowal_receipt(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.find_bestowal_receipt(uuid) TO authenticated;

-- --- Proof --------------------------------------------------------------------
SELECT json_build_object(
  'get_receipt_exists', EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_receipt'),
  'find_bestowal_receipt_exists', EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'find_bestowal_receipt')
) AS proof;
