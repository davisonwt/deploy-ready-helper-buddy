-- First, let's check the current structure and add the missing relationship
-- We need to create a proper relationship between orchards and profiles

-- Add a profile_id column to orchards table that directly references profiles
ALTER TABLE public.orchards 
ADD COLUMN profile_id UUID REFERENCES public.profiles(id);

-- Update existing orchards to set the profile_id based on user_id
UPDATE public.orchards 
SET profile_id = (
  SELECT p.id 
  FROM public.profiles p 
  WHERE p.user_id = orchards.user_id
);

-- Make profile_id not null since every orchard should have a profile
ALTER TABLE public.orchards 
ALTER COLUMN profile_id SET NOT NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_orchards_profile_id ON public.orchards(profile_id);

-- Update the trigger to also update profile_id when user_id changes (if needed)
CREATE OR REPLACE FUNCTION public.sync_orchard_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- When user_id is updated, update profile_id too
  IF TG_OP = 'UPDATE' AND OLD.user_id != NEW.user_id THEN
    NEW.profile_id = (SELECT id FROM public.profiles WHERE user_id = NEW.user_id);
  END IF;
  
  -- When inserting, ensure profile_id is set
  IF TG_OP = 'INSERT' AND NEW.profile_id IS NULL THEN
    NEW.profile_id = (SELECT id FROM public.profiles WHERE user_id = NEW.user_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to maintain profile_id consistency
DROP TRIGGER IF EXISTS sync_orchard_profile_trigger ON public.orchards;
CREATE TRIGGER sync_orchard_profile_trigger
  BEFORE INSERT OR UPDATE ON public.orchards
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_orchard_profile();