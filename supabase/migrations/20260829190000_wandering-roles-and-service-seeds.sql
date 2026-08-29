-- spec-service-seeds.md build order step 1 (sections 4 and 6, both decided
-- 2026-08-29 after report).

-- Section 4: new wandering_roles table — replaces the four disconnected
-- directory tables (community_drivers, service_providers, stay_listings,
-- tribal_hearts_profiles) for Wheel/Hand/Pillow specifically. Heart stays
-- on tribal_hearts_profiles, untouched (its own onboarding at
-- /tribal-hearts already exists and works).
create table public.wandering_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('wheel', 'hand', 'pillow')),
  display_name text,
  base_town text,
  lat numeric,
  lng numeric,
  status text not null default 'active' check (status in ('active', 'inactive')),
  declared_self_operated_at timestamptz,
  accepted_terms_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.wandering_roles enable row level security;

create policy "Owner can read own wandering_roles"
  on public.wandering_roles for select
  using (auth.uid() = user_id);

create policy "Owner can insert own wandering_roles"
  on public.wandering_roles for insert
  with check (auth.uid() = user_id);

create policy "Owner can update own wandering_roles"
  on public.wandering_roles for update
  using (auth.uid() = user_id);

create policy "Everyone can read active wandering_roles"
  on public.wandering_roles for select
  using (status = 'active');

-- Directory's old three tables (Heart's tribal_hearts_profiles is not one
-- of these — it stays live and read) — left in place, unread, deprecated.
comment on table public.community_drivers is
  'Deprecated 2026-08-29 (spec-service-seeds.md section 4) - superseded by wandering_roles (role=wheel). No registration UI or writer anywhere in the app; left in place, unread, until a later cleanup drops it.';
comment on table public.service_providers is
  'Deprecated 2026-08-29 (spec-service-seeds.md section 4) - superseded by wandering_roles (role=hand). No registration UI or writer anywhere in the app; left in place, unread, until a later cleanup drops it.';
comment on table public.stay_listings is
  'Deprecated 2026-08-29 (spec-service-seeds.md section 4) - superseded by wandering_roles (role=pillow). Left in place, unread by the Directory going forward, until a later cleanup drops it.';

-- Section 6: service seeds are rows in products.
alter table public.products alter column file_url drop not null;

alter table public.products add column if not exists kind text;
-- Backfill from the existing `type` column, but only for values the new
-- CHECK vocabulary actually covers (music/ebook) — a handful of rows carry
-- other legacy `type` values (e.g. plain 'product') with no equivalent
-- `kind` yet; they're left null rather than forced into a mismatched value.
update public.products set kind = type where kind is null and type in ('music', 'ebook');
alter table public.products add constraint products_kind_check
  check (kind is null or kind in ('music', 'ebook', 'hand', 'wheel', 'pillow', 'heart'));

alter table public.products add column if not exists service_details jsonb;
