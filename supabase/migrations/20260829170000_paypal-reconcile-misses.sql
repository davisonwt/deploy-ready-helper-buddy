-- Tracks consecutive PayPal 404 (RESOURCE_NOT_FOUND) responses for
-- reconcile-paypal-orders, per the overnight-check finding: basket_orders
-- 70f28cf8-... has been getting a genuine 404 from PayPal on every 15-minute
-- check since at least 2026-08-28 23:30 UTC, and the reconciler's "only
-- close it on a positive ok confirmation" rule left it pending forever --
-- a 404 isn't `ok` in fetch terms, so it fell into the same bucket as a
-- transient lookup failure and was never actionable.
--
-- A side table rather than columns on basket_orders/content_purchases/
-- bestowals: keeps this diagnostic concern off the payment tables' own
-- schema entirely. RLS enabled, no policies -- same lockdown shape as
-- processed_webhooks -- only the service role (every caller of this
-- function) ever touches it.
--
-- Rows are deleted when a non-404 result breaks the consecutive streak (a
-- transient miss doesn't carry meaning on its own), and kept permanently
-- (with resolved_at/resolved_reason stamped) once 3 consecutive 404s plus
-- the existing 48h staleness threshold actually closes an order out --
-- an audit trail for exactly what reconcile-paypal-orders decided and why.
CREATE TABLE public.paypal_reconcile_misses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  miss_count integer NOT NULL DEFAULT 0,
  last_status_code integer,
  last_checked_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (table_name, record_id)
);

ALTER TABLE public.paypal_reconcile_misses ENABLE ROW LEVEL SECURITY;

-- Route expire_stale_orders through invoke_money_job, same as
-- reconcile-paypal-orders, so its actual return value (per-table expired
-- counts) lands in net._http_response instead of vanishing -- a bare
-- `SELECT public.expire_stale_orders();` cron command has no HTTP call to
-- capture, only a generic "1 row" in cron.job_run_details.return_message.
-- New expire-stale-orders edge function just wraps the existing RPC and
-- returns its jsonb result; the RPC itself is unchanged.
-- cron.schedule() with an existing jobname updates that job in place
-- (confirmed this session, jobid stays 13) -- no separate unschedule needed.
SELECT cron.schedule(
  'expire-stale-orders',
  '0 * * * *',
  $$ SELECT public.invoke_money_job('expire-stale-orders'); $$
);
