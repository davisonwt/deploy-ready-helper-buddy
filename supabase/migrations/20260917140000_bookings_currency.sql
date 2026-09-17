-- Step one of making a booking carry its own currency.
--
-- A booking records amount, s2g_fee and total as bare numbers with no unit.
-- A host lists at R1650, the guest agrees to R1650, and the number 1650
-- reaches create-booking-paypal-order, which labels it USD because nothing
-- ever said otherwise. The listing knew all along: pillow_seed_details,
-- wheel_seed_details and hand_seed_details each carry their own `currency`.
-- It is dropped the moment the booking row is written.
--
-- This migration changes NO payment behaviour. The rails still do exactly
-- what they did before. It is the prerequisite: nothing downstream can be
-- correct until the amount carries its unit.
--
-- NOT NULL, and deliberately NO DEFAULT. A default of 'USD' is how this bug
-- survived unnoticed for so long; a booking with no currency should be
-- impossible, not silently a dollar.
--
-- The currency is set by a BEFORE INSERT trigger that reads the listing,
-- and it OVERWRITES whatever the client sent. That is the point: a guest's
-- browser must not be able to choose what currency it is charged in. It
-- also means the three booking forms need no change and a browser tab open
-- from before this migration keeps working, since omitting the column is
-- the normal case rather than an error.
--
-- Snapshot rule: no restore script accompanies this. It touches no existing
-- row, because there are none -- public.bookings is empty (verified before
-- writing, 0 rows).

alter table public.bookings
  add column if not exists currency text;

create or replace function public.bookings_set_currency_from_listing()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_currency text;
  v_kind text;
begin
  select p.kind into v_kind from public.products p where p.id = new.product_id;

  select case v_kind
           when 'pillow' then (select d.currency from public.pillow_seed_details d where d.product_id = new.product_id)
           when 'wheel'  then (select d.currency from public.wheel_seed_details  d where d.product_id = new.product_id)
           when 'hand'   then (select d.currency from public.hand_seed_details   d where d.product_id = new.product_id)
           else null
         end
    into v_currency;

  if v_currency is null or btrim(v_currency) = '' then
    -- Refuse rather than guess. A booking whose currency cannot be
    -- established is the exact state this column exists to prevent, and a
    -- clear error here is far cheaper than a wrong charge later.
    raise exception
      'cannot determine the currency for this booking'
      using errcode = 'not_null_violation',
            detail  = format('product %s (kind %s) has no seed-detail currency', new.product_id, coalesce(v_kind, 'unknown')),
            hint    = 'Only wheel, pillow and hand listings can be booked, and each must carry its own currency.';
  end if;

  -- Always the listing's own value, never the client's.
  new.currency := upper(btrim(v_currency));
  return new;
end;
$$;

comment on function public.bookings_set_currency_from_listing() is
  'Sets bookings.currency from the listing''s own seed-detail currency on '
  'insert, overwriting any client-supplied value. The guest''s browser must '
  'not be able to choose the currency it is charged in.';

drop trigger if exists trg_bookings_currency on public.bookings;
create trigger trg_bookings_currency
  before insert on public.bookings
  for each row
  execute function public.bookings_set_currency_from_listing();

-- Safe because the table is empty and the trigger fills every future row
-- before the constraint is checked.
alter table public.bookings
  alter column currency set not null;

alter table public.bookings
  drop constraint if exists bookings_currency_iso4217;
alter table public.bookings
  add constraint bookings_currency_iso4217 check (currency ~ '^[A-Z]{3}$');

comment on column public.bookings.currency is
  'ISO 4217 code of the currency the listing was priced in, copied from the '
  'seed-detail row at insert. Not the currency the rail charges in; that is '
  'still decided by the provider and is the subject of step two.';

notify pgrst, 'reload schema';
