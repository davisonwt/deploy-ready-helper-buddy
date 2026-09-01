-- net.http_post's timeout_milliseconds defaults to 5000 (5s) when not
-- passed. invoke_money_job never set it, so any cron-triggered run whose
-- edge function takes longer than 5s (e.g. payout-earnings waiting for
-- FINALIZED commitment on real Solana sends -- ~12s was observed for just
-- 2 recipients) shows up as a timeout/failure in net._http_response even
-- though the function itself completed successfully server-side. Raised
-- to 120000 (120s) -- comfortably above what a normal run needs, well
-- under the edge runtime's own 400s wall-clock ceiling on paid plans.
CREATE OR REPLACE FUNCTION public.invoke_money_job(_fn text)
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
    body := jsonb_build_object('trigger', 'cron', 'at', now()),
    timeout_milliseconds := 120000
  ) into _req_id;

  return _req_id;
end;
$function$;
