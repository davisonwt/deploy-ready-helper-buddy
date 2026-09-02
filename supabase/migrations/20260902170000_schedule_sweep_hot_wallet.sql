-- Schedules sweep-hot-wallet as a daily cron, same mechanism as
-- payout-earnings-weekly (invoke_money_job is already generic -- takes
-- the function name as a parameter, validates it against a safe slug
-- pattern, and invokes it with CRON_SECRET as the bearer token; no
-- changes needed there). spec-payments.md section 2: "a scheduled sweep
-- moves S2G's cut from hot wallet to Squad (daily, or on threshold)."
SELECT cron.schedule(
  'sweep-hot-wallet-daily',
  '0 3 * * *', -- 03:00 UTC daily -- an hour after payout-earnings-weekly's Friday 02:00 UTC run, avoiding same-instant overlap on the same hot wallet keypair
  $$ SELECT public.invoke_money_job('sweep-hot-wallet'); $$
);
