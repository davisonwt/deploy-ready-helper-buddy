-- Create birthdays table for storing recurring birthdays by YHWH date
-- Birthdays repeat every year on the same YHWH month and day

CREATE TABLE IF NOT EXISTS public.birthdays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Person's name
  person_name text NOT NULL,
  
  -- YHWH Calendar Date (month and day - repeats every year)
  yhwh_month integer NOT NULL CHECK (yhwh_month >= 1 AND yhwh_month <= 12),
  yhwh_day integer NOT NULL CHECK (yhwh_day >= 1 AND yhwh_day <= 31),
  
  -- Optional: Gregorian date for reference (original birthday)
  gregorian_date date,
  
  -- Optional: Relationship/notes
  relationship text,
  notes text,
  
  -- Metadata
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Ensure unique person per user (can have multiple birthdays if needed)
  UNIQUE(user_id, person_name, yhwh_month, yhwh_day)
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_birthdays_user ON public.birthdays(user_id);
CREATE INDEX IF NOT EXISTS idx_birthdays_date ON public.birthdays(yhwh_month, yhwh_day);

-- Enable Row Level Security
ALTER TABLE public.birthdays ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own birthdays"
  ON public.birthdays
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own birthdays"
  ON public.birthdays
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own birthdays"
  ON public.birthdays
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own birthdays"
  ON public.birthdays
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_birthdays_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_birthdays_updated_at
  BEFORE UPDATE ON public.birthdays
  FOR EACH ROW
  EXECUTE FUNCTION update_birthdays_updated_at();

