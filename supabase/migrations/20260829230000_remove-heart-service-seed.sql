-- spec-service-seeds.md §4, revised decision: Heart is matchmaking
-- (/tribal-hearts), not a service seed — it was never meant to get its
-- own /sow/heart form or products.kind value. Confirmed live first: 0
-- products rows used kind = 'heart'.
alter table public.products drop constraint products_kind_check;
alter table public.products add constraint products_kind_check
  check (kind is null or kind in ('music', 'ebook', 'art', 'hand', 'wheel', 'pillow'));
