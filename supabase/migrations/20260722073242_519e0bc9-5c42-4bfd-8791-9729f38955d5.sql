DROP POLICY IF EXISTS "Premium-room read owner or buyer or admin" ON storage.objects;

CREATE POLICY "Premium-room read owner or buyer or admin"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'premium-room'
  AND auth.uid() IS NOT NULL
  AND (
    auth.uid()::text = (storage.foldername(name))[2]
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'::public.app_role
    )
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

DROP POLICY IF EXISTS "DJs can view their own show files" ON storage.objects;

CREATE POLICY "DJs can view their own show files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'radio-show-files'
  AND auth.uid() IS NOT NULL
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin'::public.app_role, 'gosat'::public.app_role, 'radio_admin'::public.app_role)
    )
  )
);