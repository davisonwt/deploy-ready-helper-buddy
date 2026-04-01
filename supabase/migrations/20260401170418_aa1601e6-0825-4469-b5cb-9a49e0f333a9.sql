ALTER TABLE public.community_drivers 
ADD COLUMN IF NOT EXISTS last_location_updated_at timestamptz,
ADD COLUMN IF NOT EXISTS booking_score integer NOT NULL DEFAULT 0;