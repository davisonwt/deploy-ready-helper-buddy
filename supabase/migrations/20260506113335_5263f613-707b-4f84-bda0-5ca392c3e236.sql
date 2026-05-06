ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_birthday boolean DEFAULT true;
CREATE INDEX IF NOT EXISTS idx_profiles_dob ON public.profiles (date_of_birth);