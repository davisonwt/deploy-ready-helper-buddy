-- A home for the app's own static media, owned by us rather than by
-- Lovable's preview host.
--
-- ALREADY APPLIED on 2026-09-24 via the Management API; this file records
-- it, because this project's migration ledger is drifted.
--
-- Why: 32 imported assets -- 24 calendar images, 6 explainer voice-overs
-- and 2 marketing videos -- existed only at /__l5e/assets-v1/... on
-- Lovable's asset route. Vercel serves production and has no such route,
-- so every one of them 404'd live. The bytes were recoverable from the
-- Lovable preview host, which is a preview environment and can go away.
-- They are archived at
--   C:\Users\Ezra\S2G-backups\storage-archive\lovable-assets-2026-09-24\
-- with a sha256 MANIFEST.json, and that archive is the recovery source
-- from here on.
--
-- Shape follows `stalls` and `wandering`: a public bucket with a plain
-- public SELECT policy. It differs from them in ONE deliberate way -- it
-- has NO insert/update/delete policy at all, so no client can write to it.
-- These are the app's own assets, not member uploads; they are put here by
-- the service role, which bypasses RLS, and there is no per-user folder to
-- scope a write policy to in the first place.
--
-- allowed_mime_types includes image/png, which the brief's list omitted:
-- 24 of the 32 files ARE png (the calendar art), and without it every one
-- of those uploads is rejected. image/jpeg and image/webp are kept for
-- whatever lands here next; nothing in this batch is either.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'app-assets',
  'app-assets',
  true,
  20971520,  -- 20 MB, same as stalls; the largest file here is 7.6 MB
  array['image/png', 'image/jpeg', 'image/webp', 'audio/mpeg', 'video/mp4']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Read: everyone, including logged out -- these are the app's own images,
-- audio and video, requested by <img>/<audio>/<video> with no session.
drop policy if exists "Anyone can view app assets" on storage.objects;
create policy "Anyone can view app assets"
  on storage.objects for select
  to public
  using (bucket_id = 'app-assets');

-- Deliberately NO insert/update/delete policy for this bucket.
