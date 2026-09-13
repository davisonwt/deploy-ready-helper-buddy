-- Incident (2026-09-13): a test-seeding script pointed a test account's
-- own stalls row (front_image_path/interior_image_path) directly at
-- another real member's storage URL instead of copying the file into the
-- test account's own folder. Since /cockpit legitimately renders whatever
-- URL a member's OWN row stores (correctly scoped by user_id -- confirmed,
-- not the bug), and RLS already correctly blocks writing to another
-- account's row (confirmed live: an UPDATE targeting another user_id's
-- row affects 0 rows, an INSERT impersonating another user_id is
-- rejected), this was a data-hygiene bug in that one script, not an RLS
-- or render-scoping bug. This constraint makes the same mistake
-- impossible going forward, regardless of which code path writes the row:
-- an image path must be NULL, a shared template asset, or live under the
-- row's own user_id folder in the public "stalls" bucket.
alter table public.stalls
add constraint stalls_images_own_folder_or_template check (
  (
    front_image_path is null
    or front_image_path like '/stalls/templates/%'
    or front_image_path like 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/stalls/' || user_id::text || '/%'
  )
  and
  (
    interior_image_path is null
    or interior_image_path like '/stalls/templates/%'
    or interior_image_path like 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/stalls/' || user_id::text || '/%'
  )
);
