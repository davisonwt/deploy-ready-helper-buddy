-- Sow2Grow money-job cron schedules
-- HOW TO RUN:
--   1. Replace the two occurrences of PASTE_YOUR_CRON_SECRET_HERE below with the
--      same CRON_SECRET value you saved as an edge function secret.
--   2. Paste the whole file into the Supabase SQL Editor and run it.
--   3. Do NOT commit the filled-in version back into the repo.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Clean re-run safety: drop existing schedules with these names
do $$
declare j text;
begin
  foreach j in array array[
    'release-escrow-hourly',
    'payout-sower-earnings-daily',
    'payout-whisperer-earnings-daily',
    'expire-stale-xrp-quotes'
  ] loop
    if exists (select 1 from cron.job where jobname = j) then
      perform cron.unschedule(j);
    end if;
  end loop;
end $$;

-- 1) Release escrow that has passed its auto-release window — every hour
select cron.schedule(
  'release-escrow-hourly',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://zuwkgasbkpjlxzsjzumu.supabase.co/functions/v1/release-escrow',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer PASTE_YOUR_CRON_SECRET_HERE'
    ),
    body := jsonb_build_object('trigger', 'cron', 'at', now())
  );
  $$
);

-- 2) Pay sowers their released bestowals — daily 02:10 UTC
select cron.schedule(
  'payout-sower-earnings-daily',
  '10 2 * * *',
  $$
  select net.http_post(
    url := 'https://zuwkgasbkpjlxzsjzumu.supabase.co/functions/v1/payout-sower-earnings',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer PASTE_YOUR_CRON_SECRET_HERE'
    ),
    body := jsonb_build_object('trigger', 'cron', 'at', now())
  );
  $$
);

-- 3) Pay whisperer commissions — daily 02:40 UTC (after sower run)
select cron.schedule(
  'payout-whisperer-earnings-daily',
  '40 2 * * *',
  $$
  select net.http_post(
    url := 'https://zuwkgasbkpjlxzsjzumu.supabase.co/functions/v1/payout-whisperer-earnings',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer PASTE_YOUR_CRON_SECRET_HERE'
    ),
    body := jsonb_build_object('trigger', 'cron', 'at', now())
  );
  $$
);

-- 4) Expire stale 10-minute XRP checkout quotes — every 5 minutes (pure SQL, no secret)
select cron.schedule(
  'expire-stale-xrp-quotes',
  '*/5 * * * *',
  $$ select public.expire_stale_xrp_quotes(); $$
);

-- Verify
select jobid, jobname, schedule, active from cron.job order by jobname;
