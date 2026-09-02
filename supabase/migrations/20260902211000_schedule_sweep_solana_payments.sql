-- Schedules sweep-solana-payments every 2 minutes, same invoke_money_job
-- mechanism as sweep-hot-wallet-daily / payout-earnings-weekly. Catches
-- any pending Solana payment intent whose grower closed the payment
-- screen before check-solana-payment's client-side 5s poll confirmed it.
SELECT cron.schedule(
  'sweep-solana-payments',
  '*/2 * * * *',
  $$ SELECT public.invoke_money_job('sweep-solana-payments'); $$
);
