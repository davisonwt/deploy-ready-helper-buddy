-- /sow/product build.
--
-- First check (per instruction): products had both `stock` (added by the
-- storefronts migration) and `stock_qty` (older, pre-existing). Checked
-- live: both existed, both 100% empty (0/58 populated), no conflicting
-- data anywhere — so "migrate" was a no-op. Kept `stock`, dropped
-- `stock_qty`, updated every reader/writer first (BulkProductDetailPage.tsx,
-- BulkUploadWizardPage.tsx).
alter table public.products drop column stock_qty;

-- kind CHECK gains 'product'. type per the one legacy physical-goods row
-- ("coffee mugs x6"), confirmed live: type = 'product'.
alter table public.products drop constraint products_kind_check;
alter table public.products add constraint products_kind_check
  check (kind is null or kind in ('music', 'ebook', 'art', 'hand', 'wheel', 'pillow', 'product'));
