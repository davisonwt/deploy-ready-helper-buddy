-- SNAPSHOT / RESTORE -- every row carrying a NOWPayments value, 2026-09-18.
--
-- Taken BEFORE 20260918210000_remove_nowpayments.sql. Restores the exact
-- prior value of each row, named by primary key, never by a WHERE clause
-- that could match differently later.
--
-- user_wallets.wallet_type = 'nowpayments_crypto' : 2 rows (LIVE member wallets)
--     4bc50874-6856-47c0-86e5-4aee929ccf90  amberswheeles  created 2026-08-30
--     bcf20d3f-2c9a-4b26-931f-f594a4f33d10  callth3guy  created 2026-08-26
-- basket_orders.provider  = 'nowpayments'        : 5 rows (all status 'expired')
--     3d16509f-352c-4176-9827-ed2c59677e65  status=expired  created 2026-08-28
--     5df39e7b-4721-4683-949f-62d6d4078b99  status=expired  created 2026-08-28
--     bba99081-91cb-4087-ab4d-cafdf5ef31eb  status=expired  created 2026-08-28
--     d42d2577-f498-47ca-a3b7-b71dcb6b9eae  status=expired  created 2026-08-28
--     e8dbd7f5-b42c-4b35-9b10-771c116600b7  status=expired  created 2026-08-28
--
--   node scripts/studio/run-sql-file.mjs scripts/studio/restore_nowpayments_values_20260918.sql

-- The CHECK constraints must allow the old value again before the rows can
-- be written back, so this undoes the constraint change first.
alter table public.user_wallets drop constraint if exists user_wallets_wallet_type_check;
alter table public.user_wallets add constraint user_wallets_wallet_type_check
  check (wallet_type = any (array['binance_pay','binance','binance_pay_id','phantom','nowpayments_crypto','paypal_email']));

alter table public.profiles drop constraint if exists profiles_preferred_payout_method_check;
alter table public.profiles add constraint profiles_preferred_payout_method_check
  check (preferred_payout_method is null or preferred_payout_method = any (array['nowpayments_crypto','paypal_email']));

update public.user_wallets set wallet_type = 'nowpayments_crypto' where id = '4bc50874-6856-47c0-86e5-4aee929ccf90';
update public.user_wallets set wallet_type = 'nowpayments_crypto' where id = 'bcf20d3f-2c9a-4b26-931f-f594a4f33d10';

select id, wallet_type from public.user_wallets
where id in ('4bc50874-6856-47c0-86e5-4aee929ccf90', 'bcf20d3f-2c9a-4b26-931f-f594a4f33d10');
