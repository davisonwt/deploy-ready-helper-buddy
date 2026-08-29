-- Wiring booking payment (spec-service-seeds.md §7 step 3), smallest
-- change set per the prior report: bookings stays lightweight, the real
-- financial record is one product_bestowals row created at finalize —
-- see supabase/functions/_shared/paypal/capture.ts's finalizeBooking().
alter table public.bookings add column provider text;
alter table public.bookings add column provider_order_id text;
alter table public.bookings add column payment_reference text;
