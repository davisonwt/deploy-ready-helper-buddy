-- Janitorial job: any order row stuck in 'pending'/'processing' more than 48
-- hours (an abandoned checkout, or a payment whose confirmation genuinely
-- never arrived) gets marked 'expired' instead of sitting there forever.
-- Mirrors the existing expire_stale_xrp_quotes() pattern -- a plain function
-- scheduled directly via pg_cron, no edge function needed.
--
-- Returns a jsonb summary of rows touched per table, both so a manual
-- `select public.expire_stale_orders();` reports something useful and so
-- the cron run leaves a value behind if anyone later wants to log it.
--
-- Deliberately does not touch a row past that 48h window's own logic beyond
-- the status flip: this is a label, not a hard lock. A late webhook/IPN
-- reaching finalize_basket_order (etc.) after this runs will still complete
-- the order normally -- those RPCs only ever short-circuit on an
-- already-'completed' status, never on 'expired'.
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
     AND created_at < now() - interval '48 hours';
  GET DIAGNOSTICS v_content_purchases = ROW_COUNT;

  UPDATE public.bestowals
     SET payment_status = 'expired'
   WHERE payment_status IN ('pending', 'processing')
     AND created_at < now() - interval '48 hours';
  GET DIAGNOSTICS v_bestowals = ROW_COUNT;

  UPDATE public.basket_orders
     SET status = 'expired'
   WHERE status IN ('pending', 'processing')
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

-- Hourly is more than enough for a 48h staleness window (release-escrow, the
-- other money-adjacent janitorial job, also runs hourly).
SELECT cron.schedule(
  'expire-stale-orders',
  '0 * * * *',
  $$ SELECT public.expire_stale_orders(); $$
);
