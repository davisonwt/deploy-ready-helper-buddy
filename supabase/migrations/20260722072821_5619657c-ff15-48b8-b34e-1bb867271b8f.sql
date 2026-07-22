DROP POLICY IF EXISTS "Premium-room read owner or buyer or admin" ON storage.objects;

CREATE POLICY "Premium-room read owner or buyer or admin"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'premium-room'
  AND (
    auth.uid()::text = (storage.foldername(name))[2]
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.premium_room_access pra
      WHERE pra.user_id = auth.uid()
        AND pra.payment_status = 'completed'
        AND pra.room_id::text = (storage.foldername(objects.name))[1]
    )
    OR EXISTS (
      SELECT 1
      FROM public.premium_item_purchases pip
      WHERE pip.buyer_id = auth.uid()
        AND pip.payment_status = 'completed'
        AND pip.room_id::text = (storage.foldername(objects.name))[1]
    )
  )
);