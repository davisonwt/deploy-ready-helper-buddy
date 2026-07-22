DROP POLICY IF EXISTS "DJs can view their own show files" ON storage.objects;

CREATE POLICY "DJs can view their own show files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'radio-show-files'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'gosat')
    OR public.has_role(auth.uid(), 'radio_admin')
  )
);