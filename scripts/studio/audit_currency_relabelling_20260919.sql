-- AUDIT, READ ONLY -- has any real money ever been charged in the wrong
-- currency? Written 2026-09-19. Nothing here writes, updates or deletes.
--
-- THE QUESTION: the client sent a listing's own amount to PayPal labelled
-- "USD" (create-booking-paypal-order line 154, currency_code hardcoded), and
-- to Paystack as `amountUsd` which it then multiplied by the USD->ZAR rate.
-- For a USD listing both are correct. For any non-USD listing the buyer was
-- charged the right NUMBER in the wrong CURRENCY.
--
-- So the exposure is exactly: paid rows whose listing currency was not USD.
--
--   node scripts/studio/run-sql-file.mjs scripts/studio/audit_currency_relabelling_20260919.sql

-- 1. WHERE COULD IT HAVE HAPPENED? Every public table carrying a currency,
--    so nothing is missed because a name was guessed wrong.
select table_name, column_name, data_type, column_default
  from information_schema.columns
 where table_schema = 'public'
   and (column_name = 'currency' or column_name like '%currency%')
 order by table_name, column_name;

-- 2. THE LISTINGS. Any non-USD listing is a listing whose sales need
--    checking. If this returns nothing, no money can have moved wrong.
select 'pillow' as kind, currency, count(*) as listings
  from public.pillow_seed_details group by currency
union all
select 'wheel', currency, count(*)
  from public.wheel_seed_details group by currency
union all
select 'hand', currency, count(*)
  from public.hand_seed_details group by currency
 order by 1, 2;

-- 3. BOOKINGS -- the path with the hardcoded USD. bookings.currency is set
--    from the listing by trigger, so this is authoritative.
--    Anything here that is NOT 'USD' and IS paid is real money moved wrong.
select id, status, payment_status, currency, total, provider,
       provider_order_id, created_at
  from public.bookings
 where coalesce(currency, '') <> 'USD'
 order by created_at desc;

select currency, status, count(*) as bookings, sum(total) as total_amount
  from public.bookings
 group by currency, status
 order by currency, status;

-- 4. BESTOWALS. These are dollar-denominated by design, so a non-USD row
--    here is either the bug or a column that was never populated. Look at
--    both rather than assuming.
select currency, count(*) as rows, sum(amount) as total_amount,
       min(created_at) as first_seen, max(created_at) as last_seen
  from public.bestowals
 group by currency
 order by rows desc;

-- 5. INVOICES.
select currency, status, count(*) as rows, sum(amount_due) as total_due
  from public.invoices
 group by currency, status
 order by currency, status;

-- 6. WHAT PAYSTACK ACTUALLY CHARGED. Every row is a ZAR charge computed as
--    amountUsd * fxRate. If the source amount was already rands, the buyer
--    was charged roughly 18x the listed price. This is the one that would
--    hurt most, so read it row by row rather than in aggregate.
select id, reference, kind, record_id, amount_zar, fx_rate, status, created_at
  from public.paystack_transactions
 order by created_at desc;
