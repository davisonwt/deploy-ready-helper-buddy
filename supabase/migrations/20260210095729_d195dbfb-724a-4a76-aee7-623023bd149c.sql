
-- Add distance_unit column to community_drivers
ALTER TABLE public.community_drivers ADD COLUMN IF NOT EXISTS distance_unit text DEFAULT 'km';

-- Add service_radius and distance_unit columns to service_providers
ALTER TABLE public.service_providers ADD COLUMN IF NOT EXISTS service_radius numeric;
ALTER TABLE public.service_providers ADD COLUMN IF NOT EXISTS distance_unit text DEFAULT 'km';
