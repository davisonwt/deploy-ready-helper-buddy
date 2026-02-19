
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS music_mood TEXT,
  ADD COLUMN IF NOT EXISTS music_genre TEXT;

CREATE INDEX IF NOT EXISTS idx_products_music_mood ON public.products(music_mood);
CREATE INDEX IF NOT EXISTS idx_products_music_genre ON public.products(music_genre);
