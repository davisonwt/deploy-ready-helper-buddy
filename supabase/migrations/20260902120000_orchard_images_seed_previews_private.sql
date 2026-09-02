-- Closes the orchard-images / seed-previews gap left open in the
-- wh-moderation.txt build: both buckets stayed public because flipping
-- them risked breaking live avatar/orchard-image rendering
-- (QuickProfileSetup.jsx writes an orchard-images URL straight into
-- profiles.avatar_url, rendered via plain <img src> in many places).
-- Every one of those render paths now goes through
-- src/lib/storage/signedImage.ts (useSignedImage/useSignedImages,
-- <AvatarImage>, <SignedImg>) or src/lib/media/resolvePlayableUrl.ts --
-- see the app-side commit this migration ships with. This migration is
-- the other half: flip both buckets private and gate reads the same way
-- 20260902113000/20260902114500 gated the other private buckets.
--
-- Neither bucket has an existing "visible to the whole tribe once
-- allowed" SELECT policy pattern to copy -- every prior gated bucket
-- (chat-files, tribal-hearts-media, session-documents, ...) narrows to a
-- specific audience (room participants, matched members, session
-- attendees) before the media_is_allowed() OR-clause ever applies.
-- orchard-images and seed-previews are different: orchard photos are
-- browsed by any authenticated member (BrowseOrchardsPage, behind
-- ProtectedRoute) and avatars are shown across the whole app, so their
-- SELECT policies grant to the full audience once media_is_allowed()
-- (or ownership, or admin/gosat) says so -- no extra narrowing clause.

UPDATE storage.buckets SET public = false WHERE id IN ('orchard-images', 'seed-previews');

-- ── orchard-images ───────────────────────────────────────────────────────
-- Existing INSERT/UPDATE/DELETE policies (own-folder based) are untouched;
-- there was no SELECT policy at all while the bucket was public (reads
-- bypassed RLS entirely via the public URL). This adds the first one.
CREATE POLICY "orchard_images_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'orchard-images'
    AND (
      owner = auth.uid()
      OR (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin_or_gosat(auth.uid())
      OR public.media_is_allowed(bucket_id, name, objects.created_at)
    )
  );

-- ── seed-previews ────────────────────────────────────────────────────────
-- No RLS policy of any kind existed for this bucket before (writes go
-- through the generate-preview edge function with the service-role key,
-- which bypasses RLS -- confirmed by inspecting every INSERT policy on
-- storage.objects, none of which mention seed-previews). These are the
-- first policies of any kind for this bucket; INSERT/UPDATE/DELETE are
-- intentionally left alone -- out of scope for a read-side gate.
--
-- This is the one bucket in the moderation system that a logged-out
-- visitor must be able to read: the 45s preview clip is meant to play
-- pre-signup (see resolvePlayableUrl.ts / generateWatermarkedPreview.ts /
-- usePreviewPlayer.ts comments -- "public, no signing" was a deliberate
-- product decision, confirmed when this migration was written). Split
-- into an authenticated policy (owner/admin/allowed) and a separate,
-- narrower anon policy (allowed only -- an anonymous viewer has no
-- owner-folder or admin path to begin with) rather than one combined
-- "TO public" policy: Postgres does not guarantee short-circuiting a
-- `(auth.uid() IS NOT NULL AND is_admin_or_gosat(...))` guard inside an
-- OR chain, and the anon role lacked EXECUTE on is_admin_or_gosat, so a
-- combined policy 42501'd on every anon read regardless of which branch
-- would actually have applied. Verified live via SET LOCAL ROLE anon.
CREATE POLICY "seed_previews_select_authenticated"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'seed-previews'
    AND (
      owner = auth.uid()
      OR (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin_or_gosat(auth.uid())
      OR public.media_is_allowed(bucket_id, name, objects.created_at)
    )
  );

CREATE POLICY "seed_previews_select_anon"
  ON storage.objects FOR SELECT TO anon
  USING (
    bucket_id = 'seed-previews'
    AND public.media_is_allowed(bucket_id, name, objects.created_at)
  );

-- ── anon EXECUTE grants (pre-existing gap, surfaced by the above) ────────
-- While verifying the anon path above, the same 42501 turned up for
-- is_admin_or_gosat/has_role/is_marketplace_admin even after the
-- seed-previews anon policy stopped referencing them directly: Postgres
-- RLS combines EVERY policy applicable to a role into one filter, so
-- merely having *some other* TO-public policy on storage.objects
-- reference an anon-inaccessible function breaks anon reads table-wide,
-- not just for that policy's own bucket. "Public premium-room/music-tracks
-- cover art readable by all" (20260902113000) and "creds bucket owner
-- read" already reference is_admin_or_gosat / is_marketplace_admin under
-- TO public and were already broken for anon before this migration --
-- confirmed live, pre-existing, not introduced here. All three functions
-- are SECURITY DEFINER, single boolean EXISTS checks against user_roles
-- keyed by the passed-in uuid -- granting EXECUTE lets anon actually call
-- them (getting `false` back, same as any non-staff caller), it does not
-- change what they return for any argument.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon;
GRANT EXECUTE ON FUNCTION public.is_admin_or_gosat(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_marketplace_admin(uuid) TO anon;

-- ── static site logo carve-out ───────────────────────────────────────────
-- orchard-images/logo.jpeg was the site's own branding asset, hardcoded
-- in RegisterPage.jsx and LoginPage.jsx -- both pre-auth pages with no
-- session to sign a URL with. It has been moved out of Supabase Storage
-- entirely into the repo's public/ folder (served as a static asset,
-- alongside favicon.png etc.) in the same commit, so no RLS carve-out is
-- needed for it here; both pages now load it from /logo.jpeg.
