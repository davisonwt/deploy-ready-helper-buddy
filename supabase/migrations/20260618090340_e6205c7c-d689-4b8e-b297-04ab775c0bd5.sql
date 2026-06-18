ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS prophetic_words text[],
  ADD COLUMN IF NOT EXISTS ai_prompt text,
  ADD COLUMN IF NOT EXISTS dream_entry text,
  ADD COLUMN IF NOT EXISTS is_special_day boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS special_day_type text,
  ADD COLUMN IF NOT EXISTS special_day_person text,
  ADD COLUMN IF NOT EXISTS fasting_type text,
  ADD COLUMN IF NOT EXISTS water_intake integer,
  ADD COLUMN IF NOT EXISTS tithes_offerings jsonb;