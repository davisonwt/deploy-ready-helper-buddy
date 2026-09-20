-- Follow-up to 20260920121500_stall_image_ownership_guard.sql, whose own
-- comment called a /stalls/templates/ image path "a legitimate, sanctioned
-- mechanism" the ownership guard should leave alone. That's no longer
-- true: the wizard's template registry (public/stalls/templates/
-- templates.json) is now empty for every category -- the one entry it
-- ever had (books_writing) was Davison's own branded stall content, not
-- generic art, and has been removed. With zero registered templates, the
-- exemption is a dead door: nothing legitimate uses it, but a row could
-- still be written pointing at /stalls/templates/... instead of its own
-- storage folder.
--
-- Davison's own stall (04754d57-d41d-4ea7-93df-542047a6785b) was the one
-- row actually using a template path (interior_image_path only -- front
-- already pointed at his own folder) -- migrated to his own storage
-- folder first (a real upload through the wizard, same path scheme every
-- other stall's images use), verified rendering identically before/after,
-- with stalls.hotspots (11 explicit rows) confirmed untouched. Swept: zero
-- stalls rows reference /stalls/templates/ as of this migration.
--
-- The two PNGs under public/stalls/templates/ stay on disk (per
-- instruction) -- this migration makes them inert for any stalls row,
-- not deleted.

ALTER TABLE public.stalls DROP CONSTRAINT stalls_images_own_folder_or_template;

ALTER TABLE public.stalls ADD CONSTRAINT stalls_images_own_folder_only CHECK (
  (front_image_path IS NULL OR front_image_path LIKE 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/stalls/' || user_id::text || '/%')
  AND
  (interior_image_path IS NULL OR interior_image_path LIKE 'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/stalls/' || user_id::text || '/%')
);
