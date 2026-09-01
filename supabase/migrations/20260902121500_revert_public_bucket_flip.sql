-- Corrects 20260902120000: that migration flipped orchard-images and
-- seed-previews from public to private buckets so the moderation gate in
-- storage RLS could apply. On investigation this is unsafe to ship as-is:
-- orchard-images backs more than orchard photo galleries -- at least one
-- flow (QuickProfileSetup.jsx) stores a orchard-images getPublicUrl()
-- result directly into profiles.avatar_url, which then renders via plain
-- <img src={profile.avatar_url}> across many components app-wide with no
-- signed-URL wrapper. A private bucket's getPublicUrl() 400s. Flipping the
-- bucket without first finding and wiring every one of those render call
-- sites through src/lib/storage/signedImage.ts would break live avatar/
-- image rendering for real users immediately on deploy -- a worse outcome
-- than leaving this specific enforcement gap for a follow-up pass.
--
-- Reverting both buckets to public and dropping the SELECT/write policies
-- added for the private state (harmless no-ops on a public bucket, but
-- clean up rather than leave dead policies). The moderation infrastructure
-- (media_moderation, moderate-media, media_is_allowed) is unaffected and
-- still exists for when this is finished properly -- see SESSION-STATE.md
-- for the follow-up: convert to private, then find and wire every
-- orchard-images/seed-previews/avatar_url render call site through
-- useSignedImage/useSignedImages before flipping the bucket flag again.

UPDATE storage.buckets SET public = true WHERE id IN ('orchard-images', 'seed-previews');

DROP POLICY IF EXISTS "orchard-images read: allowed, owner, or admin" ON storage.objects;
DROP POLICY IF EXISTS "seed-previews insert own" ON storage.objects;
DROP POLICY IF EXISTS "seed-previews update own" ON storage.objects;
DROP POLICY IF EXISTS "seed-previews delete own" ON storage.objects;
DROP POLICY IF EXISTS "seed-previews read: allowed, owner, or admin" ON storage.objects;
