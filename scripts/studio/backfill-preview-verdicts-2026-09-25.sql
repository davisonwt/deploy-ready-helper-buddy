-- Preview clips inherit their source file's moderation verdict (approved
-- 2026-09-25). seed-previews is private and read through
-- media_is_allowed(); from the 2026-09-01 cutoff on, generate-preview
-- wrote no verdict for its clips, so 79 of 118 active previews were silent
-- for every visitor. Each of those 79 comes from a premium-room file whose
-- latest verdict is 'allow' (unscanned_audio_policy), measured just
-- before this ran; it gets the same verdict, reason
-- 'inherited_from_source:<source reason>'. A preview whose source is not
-- 'allow' is untouched and stays blocked. INSERT only -- no existing row is
-- changed. New previews get this from generate-preview itself
-- (_shared/previewVerdict.ts).
--
-- Restore: scripts/studio/restore-preview-verdicts-2026-09-25.sql deletes
-- exactly the rows this inserted, by id.

insert into public.media_moderation
  (bucket_id, object_path, subject_type, subject_ref, uploader_user_id, verdict, minor_suspected, reason, scores, model_version, needs_review)
select 'seed-previews', c.ppath, 'storage_object', null, c.owner, 'allow', false,
       'inherited_from_source:' || coalesce(c.src_reason, 'allow'), null, 'sightengine:nudity-2.1,face-attributes', false
  from (
    select distinct on (pv.ppath) pv.ppath, pv.owner, src.verdict src_verdict, src.reason src_reason, o.created_at pcreated
      from (
        select s.user_id owner,
               regexp_replace(p.preview_url, '^.*/seed-previews/', '') ppath,
               regexp_replace(p.file_url, '^.*/premium-room/', '') fpath
          from public.products p join public.sowers s on s.id = p.sower_id
         where p.preview_url like '%/seed-previews/%' and p.file_url like '%/premium-room/%'
      ) pv
      join storage.objects o on o.bucket_id = 'seed-previews' and o.name = pv.ppath
      cross join lateral (
        select m.verdict, m.reason from public.media_moderation m
         where m.bucket_id = 'premium-room' and m.object_path = pv.fpath
         order by m.created_at desc limit 1
      ) src
  ) c
 where c.src_verdict = 'allow'
   and not public.media_is_allowed('seed-previews', c.ppath, c.pcreated)
returning id, object_path;
