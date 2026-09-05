-- Audit 2026-09-05, P0-1: payout-earnings now refuses unreadable bodies and
-- only performs a real send when the JSON body carries exactly
-- "confirm":"send" (supabase/functions/payout-earnings/runMode.ts). The
-- weekly cron reaches it through invoke_money_job(), whose body was fixed at
-- {"trigger":"cron","at":now()} -- which, under the new rule, is a DRY RUN.
--
-- This migration:
--   1. Gives invoke_money_job an optional second argument, `_body`, merged
--      over the default body. The other jobs (sweep-hot-wallet-daily,
--      sentinel-hourly, sweep-solana-payments) keep calling the one-argument
--      form and are unchanged. The old one-argument overload has to be
--      dropped first: keeping both would make invoke_money_job('x')
--      ambiguous ("function is not unique").
--   2. Reschedules payout-earnings-weekly with '{"confirm":"send"}'.
--   3. Revokes EXECUTE from public/anon/authenticated. The function is
--      SECURITY DEFINER, reads CRON_SECRET from the vault, and can now be
--      told to send -- nothing but pg_cron (runs as the job owner) should be
--      able to call it. Idempotent if a revoke already exists.
--
-- Until this is applied live, the Friday 02:00 UTC run is a DRY RUN ONLY.

DROP FUNCTION IF EXISTS public.invoke_money_job(text);

CREATE OR REPLACE FUNCTION public.invoke_money_job(_fn text, _body jsonb DEFAULT '{}'::jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'vault'
AS $function$
declare
  _secret text;
  _req_id bigint;
begin
  if _fn !~ '^[a-z0-9-]+$' then
    raise exception 'invalid function name';
  end if;

  select decrypted_secret into _secret
  from vault.decrypted_secrets
  where name = 'CRON_SECRET'
  limit 1;

  if _secret is null or length(_secret) < 16 then
    raise exception 'CRON_SECRET not configured in vault';
  end if;

  select net.http_post(
    url := 'https://zuwkgasbkpjlxzsjzumu.supabase.co/functions/v1/' || _fn,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _secret
    ),
    body := jsonb_build_object('trigger', 'cron', 'at', now()) || coalesce(_body, '{}'::jsonb),
    timeout_milliseconds := 120000
  ) into _req_id;

  return _req_id;
end;
$function$;

-- Same grants the one-argument form had (20260825195712).
REVOKE ALL ON FUNCTION public.invoke_money_job(text, jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.invoke_money_job(text, jsonb) TO postgres, service_role;

DO $$
BEGIN
  PERFORM cron.unschedule('payout-earnings-weekly');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'payout-earnings-weekly: not scheduled, nothing to unschedule';
END;
$$;

SELECT cron.schedule(
  'payout-earnings-weekly',
  '0 2 * * 5', -- Friday 02:00 UTC, unchanged
  $$ SELECT public.invoke_money_job('payout-earnings', '{"confirm":"send"}'::jsonb); $$
);
