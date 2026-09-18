-- Remove NOWPayments as a reachable choice.
--
-- Crypto on S2G is Solana, via Phantom. NOWPayments has been raised and
-- rejected more than once, and a value that still appears in a CHECK
-- constraint is how a future session concludes the rail exists.
--
-- Snapshot taken first, per the snapshot rule:
--   scripts/studio/restore_nowpayments_values_20260918.sql
--
-- MEASURED BEFORE WRITING (2026-09-18), not assumed:
--   user_wallets.wallet_type = 'nowpayments_crypto'   2 rows  <- LIVE members
--   basket_orders.provider   = 'nowpayments'          5 rows  <- all 'expired'
--   profiles.preferred_payout_method                  0 rows
--   topups.provider                                   0 rows
--   content_purchases.provider                        0 rows
--   processed_webhooks.provider                       0 rows
--   revenue_ledger.rail                               0 rows
--
-- There is no payout_method ENUM in this database; the reachable values are
-- CHECK constraints on text columns. Seven of them mention NOWPayments.

begin;

-- 1. The two live wallets are NOT NOWPayments accounts.
--
-- Both are 44-character Solana addresses with no api_key and no merchant_id
-- -- Phantom wallets that were saved under the wrong label, back when the
-- crypto rail was called NOWPayments. Renaming them is what makes dropping
-- the label safe; dropping it first would orphan two members' payouts, since
-- _shared/resolveSowerPayout.ts selects on exactly this string.
update public.user_wallets
   set wallet_type = 'phantom'
 where wallet_type = 'nowpayments_crypto';

-- 2. Stop new writes choosing it.
alter table public.user_wallets drop constraint if exists user_wallets_wallet_type_check;
alter table public.user_wallets add constraint user_wallets_wallet_type_check
  check (wallet_type = any (array['binance_pay','binance','binance_pay_id','phantom','paypal_email']));

alter table public.profiles drop constraint if exists profiles_preferred_payout_method_check;
alter table public.profiles add constraint profiles_preferred_payout_method_check
  check (preferred_payout_method is null
         or preferred_payout_method = any (array['phantom','paypal_email']));

alter table public.topups drop constraint if exists topups_provider_check;
alter table public.topups add constraint topups_provider_check
  check (provider = any (array['paypal','solana']));

alter table public.content_purchases drop constraint if exists content_purchases_provider_check;
alter table public.content_purchases add constraint content_purchases_provider_check
  check (provider = any (array['paypal','solana','balance','paystack']));

alter table public.processed_webhooks drop constraint if exists processed_webhooks_provider_check;
alter table public.processed_webhooks add constraint processed_webhooks_provider_check
  check (provider = any (array['binance_pay','stripe','other','paypal','solana','paystack']));

alter table public.revenue_ledger drop constraint if exists revenue_ledger_rail_check;
alter table public.revenue_ledger add constraint revenue_ledger_rail_check
  check (rail = any (array['solana','paypal','balance','paystack','none']));

-- 3. basket_orders is DELIBERATELY left allowing 'nowpayments'.
--
-- Five rows carry it. They are abandoned checkouts (status 'expired', all
-- 2026-08-28) -- no money moved -- but they are still a record of what the
-- app offered that day. Narrowing this constraint would either fail on those
-- rows or require rewriting them to a provider that was never offered, and
-- payment history is not ours to restate. New writes cannot reach it anyway:
-- nothing in the client or the edge functions sends 'nowpayments' any more.
--
-- If these five are ever purged as test data, narrow it then:
--   alter table public.basket_orders drop constraint basket_orders_provider_check;
--   alter table public.basket_orders add constraint basket_orders_provider_check
--     check (provider = any (array['paypal','solana','balance','paystack']));

commit;

-- Proof, for the runner's own eyes.
select 'user_wallets nowpayments rows remaining' as check, count(*) as rows
from public.user_wallets where wallet_type ilike '%nowpay%'
union all
select 'phantom wallets now', count(*) from public.user_wallets where wallet_type = 'phantom'
union all
select 'basket_orders nowpayments rows (expected 5, untouched)', count(*)
from public.basket_orders where provider ilike '%nowpay%';
