-- AUDIT, READ ONLY -- whose money went through PayPal, and was any of it a
-- member's rather than Davison's own gosat testing? Written 2026-09-19.
-- Nothing here writes, updates or deletes.
--
-- WHY: transaction d7ca7ac6 charged $1,449.99 against a listing priced
-- R1,449.99. create-paypal-order line 194, create-invoice-payment line 260,
-- create-orchard-bestowal-order line 339 and create-booking-paypal-order
-- line 154 all hardcode currency_code "USD" and send the listing's own
-- number. For a USD listing that is right; for a rand listing the buyer pays
-- roughly 18x.
--
-- The claim to confirm is "all 12 were my own gosat test transactions".
-- Query 1 answers it by name. Anything whose payer is not Davison is
-- tonight's emergency.
--
--   node scripts/studio/run-sql-file.mjs scripts/studio/audit_paypal_transactions_ownership_20260919.sql

-- 1. THE ANSWER. Every PayPal transaction, whose money it was, and what
--    currency the thing being paid for was actually priced in.
select
  pt.id,
  left(pt.id::text, 8)                         as short_id,
  pt.created_at,
  pt.status,
  pt.payment_method,
  pt.amount                                    as charged_amount,
  pt.currency                                  as charged_currency,
  b.currency                                   as bestowal_currency,
  b.bestower_id                                as payer_user_id,
  coalesce(p.display_name, p.first_name || ' ' || p.last_name, '(no profile)')
                                               as payer_name,
  au.email                                     as payer_email,
  case
    when au.email = 'davison.taljaard@icloud.com' then 'DAVISON (gosat test)'
    else '*** NOT DAVISON -- INVESTIGATE ***'
  end                                          as whose_money
from public.payment_transactions pt
left join public.bestowals b   on b.id = pt.bestowal_id
left join auth.users au        on au.id = b.bestower_id
left join public.profiles p    on p.user_id = b.bestower_id
where lower(pt.payment_method) like '%paypal%'
order by pt.created_at;

-- 2. Same question, one line. If `not_davison` is 0, the claim holds.
select
  count(*)                                                        as paypal_transactions,
  count(*) filter (where au.email = 'davison.taljaard@icloud.com') as davison,
  count(*) filter (where au.email is distinct from 'davison.taljaard@icloud.com')
                                                                  as not_davison
from public.payment_transactions pt
left join public.bestowals b on b.id = pt.bestowal_id
left join auth.users au      on au.id = b.bestower_id
where lower(pt.payment_method) like '%paypal%';

-- 3. The specific transaction named.
select pt.*, b.currency as bestowal_currency, b.bestower_id, au.email as payer_email
from public.payment_transactions pt
left join public.bestowals b on b.id = pt.bestowal_id
left join auth.users au      on au.id = b.bestower_id
where pt.id::text like 'd7ca7ac6%';

-- 4. PayPal money that did NOT come through payment_transactions --
--    Books invoices pay through invoice_payments, on their own rail.
--    invoices.currency_display is what the payer was SHOWN; the charge was
--    always USD.
select
  ip.id, ip.created_at, ip.rail, ip.status, ip.amount, ip.processor_fee,
  ip.payer_user_id, ip.payer_email,
  i.currency_display                       as invoice_shown_in,
  i.total                                  as invoice_total,
  case when i.currency_display <> 'USD'
       then '*** SHOWN IN ' || i.currency_display || ', CHARGED IN USD ***'
       else 'usd invoice, charged correctly' end as verdict
from public.invoice_payments ip
left join public.invoices i on i.id = ip.invoice_id
where lower(ip.rail) like '%paypal%'
order by ip.created_at;

-- 5. Orchard bestowals: orchards carry their own currency and the PayPal
--    branch hardcodes USD. Any non-USD orchard that took money is exposed.
select o.id, o.currency, o.pocket_price, count(b.id) as bestowals,
       sum(b.amount) as total_amount
from public.orchards o
left join public.bestowals b on b.orchard_id = o.id
group by o.id, o.currency, o.pocket_price
having o.currency <> 'USD' or count(b.id) > 0
order by o.currency, total_amount desc nulls last;
