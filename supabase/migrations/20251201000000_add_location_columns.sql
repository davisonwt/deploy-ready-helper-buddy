-- Add latitude, longitude, and location verification columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS location_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMP WITH TIME ZONE;

-- Add index for location queries
CREATE INDEX IF NOT EXISTS idx_profiles_location ON public.profiles(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

