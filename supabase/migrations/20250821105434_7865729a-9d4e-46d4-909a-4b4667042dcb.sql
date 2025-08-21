-- Add timezone and country fields to radio_djs table
ALTER TABLE public.radio_djs 
ADD COLUMN timezone text DEFAULT 'America/New_York',
ADD COLUMN country text DEFAULT 'United States';

-- Update existing DJs with default timezone info
UPDATE public.radio_djs 
SET timezone = 'America/New_York', country = 'United States'
WHERE timezone IS NULL OR country IS NULL;