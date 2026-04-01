ALTER TABLE public.community_drivers
ADD COLUMN max_passengers integer DEFAULT NULL,
ADD COLUMN max_cargo_kg numeric DEFAULT NULL;