-- Public 'wandering' bucket for Wandering member media.
--
-- Why: every wandering_roles photo_url/gallery_urls object lived in
-- `premium-room`, which is PRIVATE. In-app that was invisible because
-- SignedImg re-signs private URLs client-side, but a link-preview crawler
-- has no session, so a shared door could never carry the member's photo --
-- api/wandering.ts had to suppress og:image entirely rather than advertise
-- a URL that 400s.
--
-- Mirrors the `stalls` bucket exactly: public read, and write/update/delete
-- scoped to the uploader by path -- auth.uid() must be the FIRST folder
-- segment. Note the path shape changes with it: premium-room used
-- `covers/<uid>/<file>`, this uses `<uid>/<file>` so the stalls policy
-- applies unchanged.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'wandering', 'wandering', true, 20971520,
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can view wandering media" on storage.objects;
create policy "Anyone can view wandering media"
  on storage.objects for select
  using (bucket_id = 'wandering');

drop policy if exists "Users can upload their own wandering media" on storage.objects;
create policy "Users can upload their own wandering media"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'wandering' and (auth.uid())::text = (storage.foldername(name))[1]);

drop policy if exists "Users can update their own wandering media" on storage.objects;
create policy "Users can update their own wandering media"
  on storage.objects for update to authenticated
  using (bucket_id = 'wandering' and (auth.uid())::text = (storage.foldername(name))[1]);

drop policy if exists "Users can delete their own wandering media" on storage.objects;
create policy "Users can delete their own wandering media"
  on storage.objects for delete to authenticated
  using (bucket_id = 'wandering' and (auth.uid())::text = (storage.foldername(name))[1]);
