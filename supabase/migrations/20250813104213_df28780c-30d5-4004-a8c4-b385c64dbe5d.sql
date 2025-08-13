-- Fix security issue: Restrict orchard financial data to authenticated users only
-- Drop the overly permissive policy that allows everyone to view orchards with financial data
DROP POLICY IF EXISTS "Orchards are viewable by everyone" ON public.orchards;

-- Create a new policy that only allows authenticated users to view orchards
-- This protects financial information while maintaining app functionality for logged-in users
CREATE POLICY "Authenticated users can view active orchards" 
ON public.orchards 
FOR SELECT 
TO authenticated
USING (status = 'active'::orchard_status);

-- Keep existing policies for insert, update, and delete unchanged
-- Users can still create, update, and delete their own orchards