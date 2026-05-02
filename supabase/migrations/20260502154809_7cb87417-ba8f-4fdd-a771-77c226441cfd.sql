WITH ed AS (
  SELECT '110b5a23-ce07-45c8-a432-086550aa78b5'::uuid AS uid,
         'https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/' AS base
),
paired AS (
  SELECT
    v.name AS video_path,
    v.created_at AS v_at,
    v.metadata->>'size' AS v_size,
    (SELECT i.name FROM storage.objects i, ed
       WHERE i.bucket_id='orchard-images'
         AND (storage.foldername(i.name))[1] = ed.uid::text
         AND abs(extract(epoch FROM (i.created_at - v.created_at))) < 120
       ORDER BY abs(extract(epoch FROM (i.created_at - v.created_at))) ASC
       LIMIT 1) AS thumb_path
  FROM storage.objects v, ed
  WHERE v.bucket_id='orchard-videos'
    AND (storage.foldername(v.name))[1] = ed.uid::text
)
INSERT INTO public.community_videos (
  uploader_id, title, description, video_url, thumbnail_url,
  file_size, status, wandering_role, created_at
)
SELECT
  ed.uid,
  'Ed · broadcast ' || to_char(p.v_at AT TIME ZONE 'UTC', 'YYYY-MM-DD'),
  'Auto-imported from Orchard upload — Ed can rename this anytime.',
  ed.base || 'orchard-videos/' || p.video_path,
  CASE WHEN p.thumb_path IS NOT NULL
       THEN ed.base || 'orchard-images/' || p.thumb_path
       ELSE NULL END,
  NULLIF(p.v_size,'')::bigint,
  'approved',
  'story',
  p.v_at
FROM paired p, ed
WHERE NOT EXISTS (
  SELECT 1 FROM public.community_videos cv
  WHERE cv.video_url = ed.base || 'orchard-videos/' || p.video_path
);