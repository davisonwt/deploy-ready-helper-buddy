-- /sow/art build — two small schema prerequisites discovered live while
-- building it, neither in any spec's own §2:
--   1. products.kind's CHECK vocabulary (added by the service-seeds
--      migration) didn't include 'art' yet.
--   2. seed-previews only allowed audio MIME types — the art form's
--      client-side watermarked-JPEG preview would have been rejected on
--      upload otherwise.

alter table public.products drop constraint products_kind_check;
alter table public.products add constraint products_kind_check
  check (kind is null or kind in ('music', 'ebook', 'art', 'hand', 'wheel', 'pillow', 'heart'));

update storage.buckets
set allowed_mime_types = array_append(allowed_mime_types, 'image/jpeg')
where id = 'seed-previews'
  and not ('image/jpeg' = any(allowed_mime_types));
