ALTER TABLE public.memry_posts DROP CONSTRAINT memry_posts_content_type_check;
ALTER TABLE public.memry_posts ADD CONSTRAINT memry_posts_content_type_check 
  CHECK (content_type = ANY (ARRAY['photo','video','recipe','music','study']));

INSERT INTO public.memry_posts (user_id, content_type, media_url, caption, content_category, study_id)
SELECT 
  user_id,
  'study',
  COALESCE(cover_image_url, '/lovable-uploads/ff9e6e48-049d-465a-8d2b-f6e8fed93522.png'),
  '📖 New Study: ' || title || E'\n\n' || COALESCE(LEFT(description, 200), 'New study uploaded'),
  'scripture',
  id
FROM public.s2g_library_items
WHERE id = 'cf455f90-bbd1-4be2-bbc2-674540a4fe02'
AND NOT EXISTS (SELECT 1 FROM public.memry_posts WHERE study_id = 'cf455f90-bbd1-4be2-bbc2-674540a4fe02');