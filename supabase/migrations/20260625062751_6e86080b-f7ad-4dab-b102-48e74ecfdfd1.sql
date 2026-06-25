DROP POLICY IF EXISTS "Premium-room read owner or buyer or admin" ON storage.objects;

CREATE POLICY "Premium-room read owner or buyer or admin"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'premium-room'
  AND (
    -- Owner: files stored at <room_id>/<owner_uid>/...
    (auth.uid())::text = (storage.foldername(name))[2]
    OR has_role(auth.uid(), 'admin'::app_role)
    -- Buyer of room access, scoped to THIS room
    OR EXISTS (
      SELECT 1 FROM public.premium_room_access pra
      WHERE pra.user_id = auth.uid()
        AND pra.payment_status = 'completed'
        AND pra.room_id::text = (storage.foldername(name))[1]
    )
    -- Buyer of an item in THIS room
    OR EXISTS (
      SELECT 1 FROM public.premium_item_purchases pip
      WHERE pip.buyer_id = auth.uid()
        AND pip.payment_status = 'completed'
        AND pip.room_id::text = (storage.foldername(name))[1]
    )
  )
);