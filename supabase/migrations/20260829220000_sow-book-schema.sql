-- /sow/book build — the only real schema gap found live: premium-room
-- had no EPUB MIME type, so an EPUB upload would have been rejected by
-- Storage's own bucket-level restriction (same class of issue as the
-- seed-previews/image-jpeg gap found building /sow/art).
--
-- Checked and confirmed already correct, no change needed:
--   - products.kind's CHECK already allows 'ebook' (added by the
--     service-seeds migration, spec-sowing-forms.md §... kind column).
--   - seed-previews already allows image/jpeg (added building /sow/art).

update storage.buckets
set allowed_mime_types = array_append(allowed_mime_types, 'application/epub+zip')
where id = 'premium-room'
  and not ('application/epub+zip' = any(allowed_mime_types));
