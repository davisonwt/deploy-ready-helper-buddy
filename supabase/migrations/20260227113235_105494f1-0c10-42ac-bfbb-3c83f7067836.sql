ALTER TABLE public.biz_ads
  ADD COLUMN IF NOT EXISTS voiceover_url text,
  ADD COLUMN IF NOT EXISTS overlay_headline text,
  ADD COLUMN IF NOT EXISTS overlay_tagline text,
  ADD COLUMN IF NOT EXISTS overlay_position text DEFAULT 'bottom';