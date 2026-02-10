-- Add unique constraint needed for journal_entries upsert
CREATE UNIQUE INDEX IF NOT EXISTS idx_journal_entries_user_date_unique 
ON public.journal_entries (user_id, yhwh_year, yhwh_month, yhwh_day);

-- Add missing columns that the code references
ALTER TABLE public.journal_entries 
ADD COLUMN IF NOT EXISTS yhwh_weekday integer,
ADD COLUMN IF NOT EXISTS yhwh_day_of_year integer;