-- Add missing updated_at column to radio_stats table
ALTER TABLE public.radio_stats 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();