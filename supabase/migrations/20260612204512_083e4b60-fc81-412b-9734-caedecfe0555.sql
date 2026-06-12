DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT p.policyname
    FROM storage.buckets b
    JOIN pg_policies p
      ON p.schemaname = 'storage'
     AND p.tablename = 'objects'
    WHERE b.public = true
      AND p.cmd = 'SELECT'
      AND p.qual = format('(bucket_id = %L::text)', b.id)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;