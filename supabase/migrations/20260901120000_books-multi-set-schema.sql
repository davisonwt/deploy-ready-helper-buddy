-- spec-books.md — multiple sets of books per member (build order step 1).
-- A "set of books" is a companies row. This migration:
--   1. Adds business-identity fields + is_default to companies, with a
--      partial unique index enforcing one default per owner.
--   2. Backfills a default companies row for every sower who doesn't have
--      one yet, then marks the oldest company per owner as default for
--      everyone (covers the pre-existing 1-row and >1-row cases too).
--   3. Adds a BEFORE INSERT safety-net trigger on products/orchards that
--      fills company_id from the inserting owner's default set when a
--      writer doesn't set it — added because a live sow happened mid
--      migration; keeps every products/orchards writer from breaking in
--      the window before every call site is updated to set it explicitly.
--      Also adds an AFTER INSERT trigger on sowers itself, so a brand new
--      sower row (a first-time uploader) always has a default company to
--      resolve before their very first product — without this, the first
--      sow of anyone who signs up after this migration would violate the
--      new NOT NULL constraint below.
--   4. Backfills products.company_id (already existed, unused — and,
--      discovered live, already had an FK with ON DELETE SET NULL) to
--      each product's owner's default set, then locks it NOT NULL.
--   5. Adds orchards.company_id the same way (new column, new FK, no
--      ON DELETE clause specified — plain RESTRICT).
-- books_income/expenses are unchanged — they're already business_id-scoped.

-- 1. companies: business-identity fields + is_default -----------------------
alter table public.companies
  add column if not exists registration_no text,
  add column if not exists vat_no text,
  add column if not exists address text,
  add column if not exists is_default boolean not null default false;

-- 2. Backfill: every sower with no companies row yet gets one, as their
--    default set. Slug generated the same way useBooksBusiness.ts's
--    createWorkspace() does, so a later app-side edit doesn't collide.
insert into public.companies (owner_user_id, name, slug, is_default, books_enabled)
select
  s.user_id,
  s.display_name,
  trim(both '-' from lower(regexp_replace(
    coalesce(nullif(trim(s.display_name), ''), 'books'), '[^a-zA-Z0-9]+', '-', 'g'
  ))) || '-' || substr(s.user_id::text, 1, 6),
  true,
  false
from public.sowers s
where not exists (select 1 from public.companies c where c.owner_user_id = s.user_id);

-- 3. is_default: the oldest companies row per owner becomes the default —
--    covers users who already had exactly one row (now marked default) and
--    the >1-row orphan case (oldest wins, the rest stay visible, not
--    default) in the same pass.
with ranked as (
  select id, row_number() over (partition by owner_user_id order by created_at asc, id asc) as rn
  from public.companies
)
update public.companies c
set is_default = true
from ranked r
where c.id = r.id and r.rn = 1;

-- One default per owner, enforced going forward.
create unique index if not exists companies_one_default_per_owner
  on public.companies (owner_user_id)
  where is_default = true;

-- 4. Safety-net triggers (see header) — fill company_id server-side from
--    the owner's default set whenever a writer doesn't set it.
create or replace function public.products_default_company_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.company_id is null then
    select c.id into new.company_id
    from public.sowers s
    join public.companies c on c.owner_user_id = s.user_id and c.is_default = true
    where s.id = new.sower_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_products_default_company_id on public.products;
create trigger trg_products_default_company_id
before insert on public.products
for each row execute function public.products_default_company_id();

create or replace function public.orchards_default_company_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.company_id is null then
    select c.id into new.company_id
    from public.companies c
    where c.owner_user_id = new.user_id and c.is_default = true;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_orchards_default_company_id on public.orchards;
create trigger trg_orchards_default_company_id
before insert on public.orchards
for each row execute function public.orchards_default_company_id();

create or replace function public.sowers_ensure_default_company()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.companies c where c.owner_user_id = new.user_id) then
    insert into public.companies (owner_user_id, name, slug, is_default, books_enabled)
    values (
      new.user_id,
      new.display_name,
      trim(both '-' from lower(regexp_replace(
        coalesce(nullif(trim(new.display_name), ''), 'books'), '[^a-zA-Z0-9]+', '-', 'g'
      ))) || '-' || substr(new.user_id::text, 1, 6),
      true,
      false
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sowers_ensure_default_company on public.sowers;
create trigger trg_sowers_ensure_default_company
after insert on public.sowers
for each row execute function public.sowers_ensure_default_company();

-- 5. products.company_id: backfill to the owner's default set, then lock
--    it NOT NULL. The FK (company_id -> companies.id, ON DELETE SET NULL)
--    already existed on this column from whenever it was first added —
--    left as-is rather than fought.
update public.products p
set company_id = c.id
from public.sowers s
join public.companies c on c.owner_user_id = s.user_id and c.is_default = true
where p.sower_id = s.id
  and p.company_id is null;

alter table public.products
  alter column company_id set not null;

-- 6. orchards.company_id: new column, same backfill shape, then lock it.
alter table public.orchards
  add column if not exists company_id uuid;

update public.orchards o
set company_id = c.id
from public.companies c
where c.owner_user_id = o.user_id
  and c.is_default = true
  and o.company_id is null;

alter table public.orchards
  alter column company_id set not null;

alter table public.orchards
  add constraint orchards_company_id_fkey foreign key (company_id) references public.companies(id);
