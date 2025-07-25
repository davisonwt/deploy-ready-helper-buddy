-- Fix bestowals relationship - bestower_id should reference profiles.user_id, not profiles.id
-- We need to create a proper foreign key for bestowals

-- Add bestower_profile_id to reference profiles table directly
ALTER TABLE public.bestowals 
ADD COLUMN bestower_profile_id UUID REFERENCES public.profiles(id);

-- Update existing bestowals to set the bestower_profile_id
UPDATE public.bestowals 
SET bestower_profile_id = (
  SELECT p.id 
  FROM public.profiles p 
  WHERE p.user_id = bestowals.bestower_id
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_bestowals_bestower_profile_id ON public.bestowals(bestower_profile_id);