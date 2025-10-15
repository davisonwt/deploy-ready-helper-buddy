-- Ensure required storage buckets exist and set policies
-- Create buckets if they don't exist
insert into storage.buckets (id, name, public)
values ('music-tracks', 'music-tracks', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('radio_documents', 'radio_documents', true)
on conflict (id) do nothing;

-- Policies for music-tracks bucket
DROP POLICY IF EXISTS "music-tracks: users upload to own folder" ON storage.objects;
DROP POLICY IF EXISTS "music-tracks: users update own files" ON storage.objects;
DROP POLICY IF EXISTS "music-tracks: users delete own files" ON storage.objects;
DROP POLICY IF EXISTS "music-tracks: public can view" ON storage.objects;

CREATE POLICY "music-tracks: users upload to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'music-tracks'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "music-tracks: users update own files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'music-tracks'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "music-tracks: users delete own files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'music-tracks'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "music-tracks: public can view"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'music-tracks');

-- Policies for radio_documents bucket
DROP POLICY IF EXISTS "radio_documents: users upload to own folder" ON storage.objects;
DROP POLICY IF EXISTS "radio_documents: users update own files" ON storage.objects;
DROP POLICY IF EXISTS "radio_documents: users delete own files" ON storage.objects;
DROP POLICY IF EXISTS "radio_documents: public can view" ON storage.objects;

CREATE POLICY "radio_documents: users upload to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'radio_documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "radio_documents: users update own files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'radio_documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "radio_documents: users delete own files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'radio_documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "radio_documents: public can view"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'radio_documents');