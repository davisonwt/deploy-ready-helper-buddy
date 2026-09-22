-- Owners may delete their own orchard-images objects.
--
-- ALREADY APPLIED on 2026-09-22 via the Management API; this file records
-- it, because this project's migration ledger is drifted.
--
-- The bucket's policies disagreed with each other. INSERT explicitly
-- anticipates the products/<sower_id>/... shape the app actually writes:
--
--   (storage.foldername(name))[1] = 'products'
--   AND EXISTS (SELECT 1 FROM sowers s
--               WHERE s.user_id = auth.uid()
--                 AND s.id::text = (storage.foldername(name))[2])
--
-- ...while DELETE and UPDATE only ever allowed
-- (storage.foldername(name))[1] = auth.uid(). For a products/ path
-- foldername[1] is the literal string 'products', so an owner could
-- upload a file and then never delete it. 40 objects were stranded that
-- way between 2026-09-18 and 2026-09-22.
--
-- Keyed on `owner` rather than re-deriving the path shape, matching the
-- first clause of orchard_images_select, which already reads
-- (owner = auth.uid()). That stays correct whatever folder layout the
-- app adopts next -- re-deriving the path is exactly what went stale here.
--
-- premium-room got this right by keying DELETE on foldername[2]; this is
-- the same class of gap as the missing wandering_roles DELETE policy
-- fixed in 20260922120000.
create policy "Owner can delete own orchard-images objects"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'orchard-images' and owner = auth.uid());
