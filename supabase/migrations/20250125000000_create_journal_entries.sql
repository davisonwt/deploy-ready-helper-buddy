-- Create journal_entries table for syncing calendar, journal, and wheel calendar
-- This allows users to add entries to calendar days that sync across all components
-- Enables sow2grow to write books about users' lives

CREATE TABLE IF NOT EXISTS public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- YHWH Calendar Date
  yhwh_year integer NOT NULL,
  yhwh_month integer NOT NULL CHECK (yhwh_month >= 1 AND yhwh_month <= 12),
  yhwh_day integer NOT NULL CHECK (yhwh_day >= 1 AND yhwh_day <= 31),
  yhwh_weekday integer NOT NULL CHECK (yhwh_weekday >= 1 AND yhwh_weekday <= 7),
  yhwh_day_of_year integer NOT NULL CHECK (yhwh_day_of_year >= 1 AND yhwh_day_of_year <= 364),
  
  -- Gregorian Date (for reference)
  gregorian_date date NOT NULL,
  
  -- Entry Content
  content text NOT NULL,
  mood text CHECK (mood IN ('happy', 'sad', 'neutral', 'excited', 'grateful')),
  tags text[] DEFAULT '{}',
  images text[] DEFAULT '{}',
  
  -- Time Information
  part_of_yowm integer CHECK (part_of_yowm >= 1 AND part_of_yowm <= 18),
  watch integer CHECK (watch >= 1 AND watch <= 4),
  
  -- Special Days
  is_shabbat boolean DEFAULT false,
  is_tequvah boolean DEFAULT false,
  feast text,
  
  -- Metadata
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Ensure one entry per user per day (YHWH date)
  UNIQUE(user_id, yhwh_year, yhwh_month, yhwh_day)
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_date ON public.journal_entries(user_id, yhwh_year, yhwh_month, yhwh_day);
CREATE INDEX IF NOT EXISTS idx_journal_entries_gregorian_date ON public.journal_entries(user_id, gregorian_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_yhwh_date ON public.journal_entries(yhwh_year, yhwh_month, yhwh_day);

-- Enable Row Level Security
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own journal entries"
  ON public.journal_entries
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own journal entries"
  ON public.journal_entries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own journal entries"
  ON public.journal_entries
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own journal entries"
  ON public.journal_entries
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_journal_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_journal_entries_updated_at
  BEFORE UPDATE ON public.journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_journal_entries_updated_at();

