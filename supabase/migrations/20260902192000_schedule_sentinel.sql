-- Schedules sentinel hourly via invoke_money_job, same mechanism as
-- payout-earnings-weekly and sweep-hot-wallet-daily.
SELECT cron.schedule(
  'sentinel-hourly',
  '0 * * * *',
  $$ SELECT public.invoke_money_job('sentinel'); $$
);
