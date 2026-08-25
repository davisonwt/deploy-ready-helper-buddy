-- Sow2Grow money-job cron schedules
--
-- STATUS: the four cron jobs below are ALREADY SCHEDULED in this project.
-- The only thing you must do by hand is store your CRON_SECRET in the
-- encrypted vault, once:
--
--   select vault.create_secret('YOUR_CRON_SECRET_VALUE', 'CRON_SECRET');
--
-- (If it already exists, rotate it with:
--    select vault.update_secret(
--      (select id from vault.secrets where name = 'CRON_SECRET'),
--      'NEW_VALUE');
--  )
--
-- The secret value MUST be identical to the CRON_SECRET edge function secret.
-- It is never written into a cron schedule or a URL — public.invoke_money_job()
-- reads it from the vault and sends it as `Authorization: Bearer <secret>`.
--
-- Schedules (already live):
--   release-escrow-hourly              0 * * * *    -> release-escrow
--   payout-sower-earnings-daily        10 2 * * *   -> payout-sower-earnings
--   payout-whisperer-earnings-daily    40 2 * * *   -> payout-whisperer-earnings
--   expire-stale-xrp-quotes            */5 * * * *  -> public.expire_stale_xrp_quotes()

-- Re-create the schedules (safe to re-run):
create extension if not exists pg_cron;
create extension if not exists pg_net;

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

select cron.schedule('release-escrow-hourly', '0 * * * *',
  $$ select public.invoke_money_job('release-escrow'); $$);

select cron.schedule('payout-sower-earnings-daily', '10 2 * * *',
  $$ select public.invoke_money_job('payout-sower-earnings'); $$);

select cron.schedule('payout-whisperer-earnings-daily', '40 2 * * *',
  $$ select public.invoke_money_job('payout-whisperer-earnings'); $$);

select cron.schedule('expire-stale-xrp-quotes', '*/5 * * * *',
  $$ select public.expire_stale_xrp_quotes(); $$);

-- Verify schedules
select jobid, jobname, schedule, active from cron.job order by jobname;

-- Verify the last runs (after the vault secret is set)
select jobid, status, return_message, start_time
from cron.job_run_details
order by start_time desc
limit 20;

-- Manual smoke test of one job (uses the vault secret, no plaintext here)
-- select public.invoke_money_job('release-escrow');
