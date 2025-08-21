-- Add timezone and location fields to profiles table for better radio scheduling
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS country text;

-- Update existing profiles with default timezone
UPDATE public.profiles 
SET timezone = 'UTC' 
WHERE timezone IS NULL;