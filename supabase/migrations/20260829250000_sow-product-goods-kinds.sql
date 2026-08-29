-- /sow/product revision: "What kind of goods?" — Field / Hearth / Forge /
-- General, spec-sowing-forms.md. Hearth = home-made goods (crafts, cakes,
-- jams, chutneys), never "Creations" — that's Music/Art/Books.
--
-- First check (per instruction, re-verified live): only `stock` exists on
-- products; `stock_qty` was already dropped in the prior /sow/product
-- migration (20260829240000_sow-product-schema.sql). Nothing to migrate
-- this time.
alter table public.products drop constraint products_kind_check;
alter table public.products add constraint products_kind_check
  check (kind is null or kind in (
    'music', 'ebook', 'art', 'hand', 'wheel', 'pillow',
    'product', 'field', 'hearth', 'forge'
  ));
