-- Restore script for davisontest1's "Sabbath Test Stall" and its 14
-- "Sabbath Scripture Study" products -- written BEFORE deleting them as
-- part of the test-fixture teardown requested 2026-09-20 (Golden rule:
-- snapshot member content before overwriting it -- applies here too,
-- even though this is an explicit, requested teardown of a test
-- account's own content, not an accidental loss).
--
-- Names every row explicitly by id, not by a WHERE clause that could
-- match differently later.
--
-- IMPORTANT LIMITATION, stated plainly: this restores the DATABASE ROWS
-- only. The actual image/audio BYTES for the 8 stall-scoped storage
-- objects (front/interior images, welcome-note audio, and their
-- superseded predecessors) were downloaded to a session-scoped temp
-- directory as a safety net WHILE this deletion ran, then deliberately
-- discarded once the deletion was verified correct and reported --
-- keeping AI-placeholder test-image bytes around indefinitely is exactly
-- the "test artifact that outlives its run" this same teardown exists to
-- prevent, and the DB-row restore above plus this file are what actually
-- need to persist. If this script is ever run, the storage objects
-- referenced by front_image_path/interior_image_path/welcome_audio_path
-- must be re-uploaded (fresh placeholders are fine -- nothing about
-- their content was load-bearing) to the same paths BEFORE running this
-- script: the CHECK constraint stalls_images_own_folder_only and the
-- enforce_stall_image_ownership trigger both validate that the
-- referenced path resolves under this user's own folder -- they do not
-- require the object to exist, but the stall will show broken images
-- until it does.
--
-- Excluded from this restore: 49 unrelated storage objects under
-- de22c876-d477-4a5e-93df-542047a6785b/gathering/*.pdf -- these are
-- Gathering Room board-export debris, a different feature entirely, out
-- of scope for "her stall" and NOT touched by this teardown. Flagged in
-- the teardown report, left in place.

BEGIN;

INSERT INTO public.stalls (
  id, user_id, tier, category, name, tagline, front_image_path,
  interior_image_path, tiles, published, created_at, updated_at,
  hotspots, story, story_pdf_path, village, enter_via_front, categories,
  story_photo_path, welcome_audio_path
) VALUES (
  'b9211356-2e31-423b-8827-f7daa9112f87',
  'de22c876-d477-4a5e-81a2-cd22091ce125',
  'farm_stall',
  'music',
  'Sabbath Test Stall',
  NULL,
  'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/stalls/de22c876-d477-4a5e-81a2-cd22091ce125/1789919289447.webp',
  'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/stalls/de22c876-d477-4a5e-81a2-cd22091ce125/interior.webp?v=1789885046984',
  '[]'::jsonb,
  true,
  '2026-09-20T06:17:27.278076+00:00',
  '2026-09-20T15:48:22.720907+00:00',
  '[{"h":20,"w":20.6,"x":5.9,"y":67,"id":"d5b5d810-31de-4d4a-b16e-b39e473da44e","kind":"books","label":"Books"},{"h":20,"w":20.6,"x":28.4,"y":67,"id":"f6b022dd-225f-435a-bf82-71368c93175b","kind":"music","label":"Music"},{"h":20,"w":20.6,"x":50.8,"y":67,"id":"6667a1cf-3078-4a61-b204-10d4f86c3d88","kind":"lyrics","label":"Lyrics"},{"h":20,"w":20.8,"x":73.4,"y":67,"id":"5768ea54-f676-4d0e-aa04-3e0b071fd665","kind":"story","label":"My Story"}]'::jsonb,
  NULL, NULL, NULL, false,
  ARRAY['music','books_writing'],
  NULL,
  'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/stalls/de22c876-d477-4a5e-81a2-cd22091ce125/1789919295105.mp3'
);

-- 14 "Sabbath Scripture Study" ebook products, all created 2026-09-13
-- (pre-existing test debris, not created in today's session), all
-- confirmed zero dependent rows in every FK-referencing table before
-- deletion (basket_items, product_bestowals, product_likes,
-- product_images, product_whisperer_assignments, whisperer_invitations,
-- whisperer_referral_links, whisperer_clicks, whisperer_conversions,
-- books_items, radio_rundown_segments -- all checked, all zero).
-- Re-insert with minimal required columns only (title, kind, status,
-- sower_id, created_at) -- full original row content beyond these
-- fields was not separately captured since every dependent-row count
-- was zero and title/kind/status/sower_id/created_at is what identifies
-- them; if a fuller restore is ever needed, cross-reference this id
-- list against any external backup.
INSERT INTO public.products (id, title, kind, type, status, sower_id, created_at) VALUES
  ('40d2e6d3-4ef4-4a66-aeb5-bca61b10f76a', 'Sabbath Scripture Study', 'ebook', 'ebook', 'active', '10f3a704-cf85-425f-b9c2-ea6b8c6a418b', '2026-09-13 08:52:57.808593+00'),
  ('22a4194f-1d81-4648-8d93-e93c2be9d82f', 'Sabbath Scripture Study', 'ebook', 'ebook', 'active', '10f3a704-cf85-425f-b9c2-ea6b8c6a418b', '2026-09-13 08:53:57.74138+00'),
  ('7b87ffea-e5f8-4825-863b-be122d3bc5cf', 'Sabbath Scripture Study', 'ebook', 'ebook', 'active', '10f3a704-cf85-425f-b9c2-ea6b8c6a418b', '2026-09-13 08:56:18.637514+00'),
  ('bb046eda-7b96-4323-920b-d8076660b428', 'Sabbath Scripture Study', 'ebook', 'ebook', 'active', '10f3a704-cf85-425f-b9c2-ea6b8c6a418b', '2026-09-13 09:00:07.507378+00'),
  ('38c35c63-42c7-48ad-b0a8-4f85647c5e24', 'Sabbath Scripture Study', 'ebook', 'ebook', 'active', '10f3a704-cf85-425f-b9c2-ea6b8c6a418b', '2026-09-13 09:01:53.490554+00'),
  ('8ef5bd53-d6f7-4958-9ac3-4c95894c3d0e', 'Sabbath Scripture Study', 'ebook', 'ebook', 'active', '10f3a704-cf85-425f-b9c2-ea6b8c6a418b', '2026-09-13 09:07:51.630822+00'),
  ('a74af4cc-675f-424f-aea6-02990271891a', 'Sabbath Scripture Study', 'ebook', 'ebook', 'active', '10f3a704-cf85-425f-b9c2-ea6b8c6a418b', '2026-09-13 09:09:31.056791+00'),
  ('918f1931-fb4b-461d-9456-fe351661e984', 'Sabbath Scripture Study', 'ebook', 'ebook', 'active', '10f3a704-cf85-425f-b9c2-ea6b8c6a418b', '2026-09-13 09:11:02.917738+00'),
  ('1e002be6-1358-4d7f-b944-1cafeb0c8fb7', 'Sabbath Scripture Study', 'ebook', 'ebook', 'active', '10f3a704-cf85-425f-b9c2-ea6b8c6a418b', '2026-09-13 09:12:37.111265+00'),
  ('7671dde2-b36c-4732-b1ff-f3fba3d0e0e9', 'Sabbath Scripture Study', 'ebook', 'ebook', 'active', '10f3a704-cf85-425f-b9c2-ea6b8c6a418b', '2026-09-13 09:14:21.875153+00'),
  ('270c2a81-849c-4311-8225-25afefea151b', 'Sabbath Scripture Study', 'ebook', 'ebook', 'active', '10f3a704-cf85-425f-b9c2-ea6b8c6a418b', '2026-09-13 09:15:29.879729+00'),
  ('045b6d88-c86a-4108-bf26-da0a16d5f351', 'Sabbath Scripture Study', 'ebook', 'ebook', 'active', '10f3a704-cf85-425f-b9c2-ea6b8c6a418b', '2026-09-13 09:16:36.464218+00'),
  ('c010cee8-38c4-4c85-a2c9-4b8acd46c50e', 'Sabbath Scripture Study', 'ebook', 'ebook', 'active', '10f3a704-cf85-425f-b9c2-ea6b8c6a418b', '2026-09-13 09:23:33.458872+00'),
  ('feb111cc-3ac5-49c9-8417-1cb716ce62ae', 'Sabbath Scripture Study', 'ebook', 'ebook', 'active', '10f3a704-cf85-425f-b9c2-ea6b8c6a418b', '2026-09-13 09:24:37.63058+00');

COMMIT;
