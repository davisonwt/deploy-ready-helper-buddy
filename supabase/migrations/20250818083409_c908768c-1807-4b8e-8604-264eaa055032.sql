-- Fix security issue: Remove overly permissive public access to seeds table
-- that exposes financial information in additional_details

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Seeds are viewable by everyone" ON public.seeds;

-- Create a new policy that restricts access to authenticated users only
CREATE POLICY "Authenticated users can view seeds" 
ON public.seeds 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Optional: For even more security, we could restrict to seed owners and admins only
-- But keeping broader access for authenticated users to maintain functionality
-- CREATE POLICY "Seed owners and admins can view seeds" 
-- ON public.seeds 
-- FOR SELECT 
-- USING (
--   auth.uid() = gifter_id OR 
--   is_admin_or_gosat(auth.uid())
-- );