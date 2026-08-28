-- Fix expire_stale_orders so it never expires a PayPal order that might
-- still be genuinely in flight or already captured -- that's exactly what
-- happened to basket_orders 1b68e18f on 2026-08-26: PayPal had already
-- captured the payment, our own finalize attempt(s) kept failing for an
-- unrelated reason (see the 20260829120000 migration), and this job marked
-- it 'expired' purely on age, with no attempt to ask PayPal first.
--
-- content_purchases/bestowals store the real PayPal order id in
-- provider_order_id directly; basket_orders keeps it separately in
-- provider_invoice_id (provider_order_id there holds "basket:<uuid>", the
-- custom_id string) -- same distinction capture-paypal-order already
-- documents and relies on.
--
-- Responsibility for anything excluded here now belongs entirely to the new
-- reconcile-paypal-orders function below, which actually asks PayPal.
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
     AND created_at < now() - interval '48 hours'
     AND NOT (provider = 'paypal' AND provider_order_id IS NOT NULL);
  GET DIAGNOSTICS v_content_purchases = ROW_COUNT;

  UPDATE public.bestowals
     SET payment_status = 'expired'
   WHERE payment_status IN ('pending', 'processing')
     AND created_at < now() - interval '48 hours'
     AND NOT (provider = 'paypal' AND provider_order_id IS NOT NULL);
  GET DIAGNOSTICS v_bestowals = ROW_COUNT;

  UPDATE public.basket_orders
     SET status = 'expired'
   WHERE status IN ('pending', 'processing')
     AND created_at < now() - interval '48 hours'
     AND NOT (provider = 'paypal' AND provider_invoice_id IS NOT NULL);
  GET DIAGNOSTICS v_basket_orders = ROW_COUNT;

  RETURN jsonb_build_object(
    'product_bestowals', v_product_bestowals,
    'content_purchases', v_content_purchases,
    'bestowals', v_bestowals,
    'basket_orders', v_basket_orders
  );
END;
$function$;

-- Every 15 minutes: check every pending/processing PayPal order directly
-- against PayPal, finalize anything PayPal confirms COMPLETED, and mark
-- genuinely-dead ones (PayPal positively confirms not completed, and old
-- enough) failed. Uses the same invoke_money_job/CRON_SECRET pattern as
-- release-escrow and the payout runners -- vault-stored secret, not a
-- bearer token embedded in the cron job's own SQL text.
SELECT cron.schedule(
  'reconcile-paypal-orders',
  '*/15 * * * *',
  $$ SELECT public.invoke_money_job('reconcile-paypal-orders'); $$
);
