-- Premium-room bucket lockdown: drop wide-open SELECT, restrict to owner/admin/purchaser

DROP POLICY IF EXISTS "Allow authenticated access to premium-room" ON storage.objects;
DROP POLICY IF EXISTS "Public read premium-room" ON storage.objects;

-- Re-affirm owner-scoped INSERT/UPDATE/DELETE.
-- Path layout in this bucket is {covers|products}/<user_uuid>/<filename>,
-- so the uploader's uid is at foldername index 2.
DROP POLICY IF EXISTS "Authenticated upload premium-room" ON storage.objects;
CREATE POLICY "Authenticated upload premium-room"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'premium-room'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

DROP POLICY IF EXISTS "Authenticated update premium-room" ON storage.objects;
CREATE POLICY "Authenticated update premium-room"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'premium-room'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

DROP POLICY IF EXISTS "Authenticated delete premium-room" ON storage.objects;
CREATE POLICY "Authenticated delete premium-room"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'premium-room'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

-- New SELECT policy: only the uploader, an admin, or a user with a
-- completed purchase / granted access for any room may read.
-- (Purchase->file linkage is currently loose; the edge function will issue
-- signed URLs only after a precise per-asset access check.)
DROP POLICY IF EXISTS "Premium-room read owner or buyer or admin" ON storage.objects;
CREATE POLICY "Premium-room read owner or buyer or admin"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'premium-room'
    AND (
      auth.uid()::text = (storage.foldername(name))[2]
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.premium_room_access pra
        WHERE pra.user_id = auth.uid()
          AND pra.payment_status = 'completed'
      )
      OR EXISTS (
        SELECT 1 FROM public.premium_item_purchases pip
        WHERE pip.buyer_id = auth.uid()
          AND pip.payment_status = 'completed'
      )
    )
  );