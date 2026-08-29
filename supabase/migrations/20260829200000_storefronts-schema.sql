-- spec-storefronts.md build order step 1 (§2 only — bulk_upload_jobs and
-- basket_orders changes are steps 2 and 4, not this migration).

-- companies: store fields. slug/logo_url/banner_url already exist, reused
-- as-is per the spec's own note.
alter table public.companies
  add column if not exists is_store boolean not null default false,
  add column if not exists store_tagline text,
  add column if not exists store_theme jsonb,
  add column if not exists store_categories text[],
  add column if not exists collect_address text,
  add column if not exists offers_collect boolean default true,
  add column if not exists offers_delivery boolean default false,
  add column if not exists location_lat numeric,
  add column if not exists location_lng numeric;

-- products: sku and category already exist (checked live — sku: nullable
-- text, currently all null, no existing index/constraint; category:
-- present). stock is new.
alter table public.products
  add column if not exists stock integer;

-- products.status currently CHECK (status = ANY ('active','paused')) —
-- add draft/archived to the same vocabulary rather than replacing it.
alter table public.products drop constraint products_status_check;
alter table public.products add constraint products_status_check
  check (status = any (array['active', 'paused', 'draft', 'archived']));

create unique index if not exists products_company_id_sku_key
  on public.products (company_id, sku)
  where sku is not null;
