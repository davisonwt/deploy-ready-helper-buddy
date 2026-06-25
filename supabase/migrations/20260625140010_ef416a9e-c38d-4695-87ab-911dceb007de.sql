ALTER TABLE public.community_videos ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.community_videos DROP CONSTRAINT IF EXISTS community_videos_category_check;
ALTER TABLE public.community_videos ADD CONSTRAINT community_videos_category_check CHECK (category IS NULL OR category IN ('home','study','training','tutorial','testimony','other'));
CREATE INDEX IF NOT EXISTS idx_community_videos_category ON public.community_videos(category);