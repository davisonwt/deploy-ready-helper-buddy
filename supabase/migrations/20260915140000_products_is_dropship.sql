-- Dropship support for factory-sower products (fulfillment/bookkeeping
-- distinction only -- no change to the sower/S2G 85/15 payment split).
alter table public.products
  add column if not exists is_dropship boolean not null default false;

comment on column public.products.is_dropship is
  'True when this product ships direct from the supplier/factory rather than the listing sower''s own stock. Display/fulfillment flag only; does not affect bestowal fee or split math.';
