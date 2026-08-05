CREATE OR REPLACE FUNCTION public.prescription_object_owner(_path text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, storage
AS $$
  SELECT o.owner
  FROM storage.objects o
  WHERE o.bucket_id = 'prescriptions'
    AND o.name = _path
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.prescription_object_owner(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prescription_object_owner(text) TO service_role;