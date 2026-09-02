-- Direct Solana USDC pay-in (spec-payments.md section 3; decided 2026-08-30,
-- built 2026-09-02). Replaces NOWPayments as the crypto checkout rail.
--
-- One polymorphic intents table rather than adding reference/expiry columns
-- to each of the order-kind tables (basket_orders, content_purchases,
-- bestowals, topups) individually -- order_kind + order_id is the same
-- (kind, recordId) pairing paypal-webhook already uses via parseCustomId(),
-- reused here so check-solana-payment can call the exact same
-- finalizeCompletedOrder() every PayPal capture path already uses.
CREATE TABLE public.solana_payment_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_kind text NOT NULL CHECK (order_kind IN ('basket', 'content', 'gift', 'orchard', 'topup')),
  order_id uuid NOT NULL,
  amount_usdc numeric NOT NULL CHECK (amount_usdc > 0),
  -- The Solana Pay "reference" -- a fresh keypair's PUBLIC key only, never
  -- the private key, included as a read-only account in the transfer so the
  -- payment is findable via getSignaturesForAddress without a per-order
  -- deposit wallet.
  reference_pubkey text NOT NULL,
  hot_wallet_address text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'underpaid', 'expired', 'failed')),
  signature text,
  received_amount_usdc numeric,
  cluster text NOT NULL DEFAULT 'devnet' CHECK (cluster IN ('devnet', 'mainnet-beta')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  checked_at timestamptz,
  paid_at timestamptz,
  UNIQUE (reference_pubkey)
);

CREATE INDEX solana_payment_intents_pending_idx
  ON public.solana_payment_intents (status, expires_at)
  WHERE status = 'pending';

CREATE INDEX solana_payment_intents_order_idx
  ON public.solana_payment_intents (order_kind, order_id);

-- Server-only table (created by create-*-order, read/written by
-- check-solana-payment / sweep-solana-payments, all service-role). No
-- policies -- RLS enabled with nothing granted denies every anon/authenticated
-- request; the client never reads this table directly, only polls
-- check-solana-payment, which does its own ownership check against the
-- underlying order row.
ALTER TABLE public.solana_payment_intents ENABLE ROW LEVEL SECURITY;

-- --- Allow 'solana' wherever 'nowpayments' was an allowed provider value ---
ALTER TABLE public.processed_webhooks DROP CONSTRAINT processed_webhooks_provider_check;
ALTER TABLE public.processed_webhooks ADD CONSTRAINT processed_webhooks_provider_check
  CHECK (provider = ANY (ARRAY['binance_pay', 'stripe', 'other', 'paypal', 'nowpayments', 'solana']));

ALTER TABLE public.basket_orders DROP CONSTRAINT basket_orders_provider_check;
ALTER TABLE public.basket_orders ADD CONSTRAINT basket_orders_provider_check
  CHECK (provider = ANY (ARRAY['nowpayments', 'paypal', 'solana']));

ALTER TABLE public.content_purchases DROP CONSTRAINT content_purchases_provider_check;
ALTER TABLE public.content_purchases ADD CONSTRAINT content_purchases_provider_check
  CHECK (provider = ANY (ARRAY['nowpayments', 'paypal', 'solana']));

ALTER TABLE public.topups DROP CONSTRAINT topups_provider_check;
ALTER TABLE public.topups ADD CONSTRAINT topups_provider_check
  CHECK (provider = ANY (ARRAY['nowpayments', 'paypal', 'solana']));
-- bestowals.provider carries no CHECK constraint (verified against the live
-- schema) -- nothing to widen there.

-- --- Teach expire_stale_orders() the same lesson PayPal already learned ---
-- (09a56a94): never expire an order over elapsed time alone once it has a
-- real, checkable payment reference. A Solana order's reference is
-- positively checked by check-solana-payment / sweep-solana-payments
-- (every 2 minutes, and on every client poll) BEFORE it is ever marked
-- 'expired' -- that path already only expires a solana_payment_intents row,
-- and the order row alongside it, once the chain has actually been queried
-- and found empty past expires_at. Blanket time-based expiry here would
-- race that positive check and could expire an order a slow-confirming
-- payment was about to land on.
CREATE OR REPLACE FUNCTION public.expire_stale_orders()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_product_bestowals integer;
  v_content_purchases integer;
  v_bestowals integer;
  v_basket_orders integer;
BEGIN
  UPDATE public.product_bestowals
     SET status = 'expired'
   WHERE status IN ('pending', 'processing')
     AND created_at < now() - interval '48 hours';
  GET DIAGNOSTICS v_product_bestowals = ROW_COUNT;

  UPDATE public.content_purchases
     SET payment_status = 'expired'
   WHERE payment_status IN ('pending', 'processing')
     AND provider IS DISTINCT FROM 'solana'
     AND created_at < now() - interval '48 hours';
  GET DIAGNOSTICS v_content_purchases = ROW_COUNT;

  UPDATE public.bestowals
     SET payment_status = 'expired'
   WHERE payment_status IN ('pending', 'processing')
     AND provider IS DISTINCT FROM 'solana'
     AND created_at < now() - interval '48 hours';
  GET DIAGNOSTICS v_bestowals = ROW_COUNT;

  UPDATE public.basket_orders
     SET status = 'expired'
   WHERE status IN ('pending', 'processing')
     AND provider IS DISTINCT FROM 'solana'
     AND created_at < now() - interval '48 hours';
  GET DIAGNOSTICS v_basket_orders = ROW_COUNT;

  RETURN jsonb_build_object(
    'product_bestowals', v_product_bestowals,
    'content_purchases', v_content_purchases,
    'bestowals', v_bestowals,
    'basket_orders', v_basket_orders
  );
END;
$function$;
