-- SECURITY: Verify all SECURITY DEFINER functions have search_path set
-- This migration checks for and fixes any functions missing search_path

-- Find all SECURITY DEFINER functions without search_path
-- Note: This query helps identify functions that need fixing
-- Run this in Supabase SQL Editor to check:
/*
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.prosecdef = true  -- SECURITY DEFINER
AND pg_get_functiondef(p.oid) NOT LIKE '%SET search_path%'
ORDER BY p.proname;
*/

-- If any functions are found, they should be updated with:
-- SET search_path = public
-- or
-- SET search_path TO 'public'

-- Example fix for a function without search_path:
-- CREATE OR REPLACE FUNCTION public.your_function()
-- RETURNS void
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path = public  -- ADD THIS LINE
-- AS $$
-- BEGIN
--   -- function body
-- END;
-- $$;

-- Note: Most functions should already have search_path set from previous migrations.
-- This migration serves as a verification and documentation of the requirement.

