
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS linkedin_url  text,
  ADD COLUMN IF NOT EXISTS pinterest_url text,
  ADD COLUMN IF NOT EXISTS whatsapp_url  text,
  ADD COLUMN IF NOT EXISTS telegram_url  text;
