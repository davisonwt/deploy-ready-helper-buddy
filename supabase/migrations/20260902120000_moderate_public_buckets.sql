-- orchard-images and seed-previews were the two PUBLIC buckets in the
-- target list -- a public bucket serves objects via a public URL that
-- bypasses storage RLS entirely, so no RLS policy could ever have gated
-- them ("enforce readability in storage RLS" is structurally impossible
-- on a public bucket). Flipping both to private is the only way to make
-- the invariant hold here; src/lib/storage/signedImage.ts already exists
-- app-wide specifically to re-sign any private-bucket URL on read, so
-- every existing <img> call site that renders these buckets' URLs keeps
-- working once 'orchard-images' comes out of its PUBLIC_BUCKETS allowlist
-- (see the companion source change) -- no per-component changes needed
-- for reads. Uploads/writes are unaffected by the public/private flag.
--
-- Same grandfather rule as 20260902114500: pre-cutover objects stay
-- visible by default, only hidden once a gosat reviews and removes them.

UPDATE storage.buckets SET public = false WHERE id IN ('orchard-images', 'seed-previews');

-- orchard-images already has INSERT/UPDATE/DELETE policies (owner-folder,
-- or products/<sowers.id> for sower-owned product photos) -- it never had
-- a SELECT policy because the public flag made one unnecessary. Add one:
-- readable once moderation-allowed (or grandfathered), same as everyone
-- else; owner/admin can always see their own pending upload.
CREATE POLICY "orchard-images read: allowed, owner, or admin"
  ON storage.objects FOR SELECT TO public
  USING (
    bucket_id = 'orchard-images'
    AND (
      (auth.uid() IS NOT NULL AND owner = auth.uid())
      OR (auth.uid() IS NOT NULL AND public.is_admin_or_gosat(auth.uid()))
      OR public.media_is_allowed(bucket_id, name, objects.created_at)
    )
  );

-- seed-previews had ZERO policies of any kind (fully relied on the public
-- bucket flag) -- add the full set, not just SELECT, or uploads break
-- entirely once the bucket goes private. Upload path convention (checked
-- against every current caller): 'previews/<user_id>/...' or
-- '<user_id>/...' depending on caller (CoverDropZone/SeedDropZone take a
-- pathPrefix prop; the two direct callers in SowArtPage.tsx/SowBookPage.tsx
-- use 'previews/<user_id>/...') -- match on EITHER folder position holding
-- the caller's own id so no existing upload path breaks.
CREATE POLICY "seed-previews insert own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'seed-previews'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR (storage.foldername(name))[2] = auth.uid()::text)
  );
CREATE POLICY "seed-previews update own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'seed-previews'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR (storage.foldername(name))[2] = auth.uid()::text)
  );
CREATE POLICY "seed-previews delete own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'seed-previews'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR (storage.foldername(name))[2] = auth.uid()::text)
  );
CREATE POLICY "seed-previews read: allowed, owner, or admin"
  ON storage.objects FOR SELECT TO public
  USING (
    bucket_id = 'seed-previews'
    AND (
      (auth.uid() IS NOT NULL AND ((storage.foldername(name))[1] = auth.uid()::text OR (storage.foldername(name))[2] = auth.uid()::text))
      OR (auth.uid() IS NOT NULL AND public.is_admin_or_gosat(auth.uid()))
      OR public.media_is_allowed(bucket_id, name, objects.created_at)
    )
  );
