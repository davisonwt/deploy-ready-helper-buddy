-- Booking = a purchase kind, steps 1-2 only (spec-service-seeds.md §7).
-- No payment yet — that's step 3/4. This is the request/accept/decline
-- round trip and its 24h auto-expiry.

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  grower_user_id uuid not null references auth.users(id),
  sower_user_id uuid not null references auth.users(id),
  company_id uuid not null references public.companies(id),
  status text not null default 'requested'
    check (status in ('requested', 'accepted', 'declined', 'expired', 'paid', 'cancelled')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  quantity numeric not null check (quantity > 0),
  rate_unit text not null,
  amount numeric not null,
  s2g_fee numeric not null,
  total numeric not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create index bookings_requested_expiry_idx on public.bookings (expires_at) where status = 'requested';
create index bookings_grower_idx on public.bookings (grower_user_id);
create index bookings_sower_idx on public.bookings (sower_user_id);

create trigger bookings_touch_updated_at
  before update on public.bookings
  for each row execute function public.update_updated_at_column();

alter table public.bookings enable row level security;

create policy "Grower and sower read own bookings"
  on public.bookings for select
  using (auth.uid() = grower_user_id or auth.uid() = sower_user_id);

create policy "Grower inserts bookings"
  on public.bookings for insert
  with check (auth.uid() = grower_user_id);

create policy "Sower updates booking status"
  on public.bookings for update
  using (auth.uid() = sower_user_id)
  with check (auth.uid() = sower_user_id);

-- Cron (every 15 min, via invoke_money_job — see expire-bookings edge
-- function): requested bookings past expires_at become expired, and both
-- sides get one notification message in their existing direct room.
create or replace function public.expire_bookings()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  _row record;
  _room_id uuid;
  _count int := 0;
begin
  for _row in
    select b.id, b.grower_user_id, b.sower_user_id, p.title
    from public.bookings b
    join public.products p on p.id = b.product_id
    where b.status = 'requested' and b.expires_at < now()
  loop
    update public.bookings set status = 'expired' where id = _row.id;

    select public.get_or_create_direct_room(_row.sower_user_id, _row.grower_user_id) into _room_id;

    insert into public.chat_messages (room_id, sender_id, content, message_type, system_metadata)
    values (
      _room_id,
      null,
      format('Booking request for "%s" expired - no response within 24 hours.', _row.title),
      'text',
      jsonb_build_object('is_system', true, 'sender_name', 'Sow2Grow', 'type', 'booking_expired', 'booking_id', _row.id)
    );

    _count := _count + 1;
  end loop;

  return jsonb_build_object('expired_count', _count);
end;
$$;

select cron.schedule(
  'expire-bookings',
  '*/15 * * * *',
  $$ select public.invoke_money_job('expire-bookings'); $$
);
