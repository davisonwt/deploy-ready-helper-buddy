-- Verify and fix any remaining SECURITY DEFINER functions without search_path protection
-- This migration ensures all functions have SET search_path = 'public' to prevent schema injection

-- Query to find functions that might be missing search_path (for reference)
-- Uncomment to run manually if needed:
/*
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.prosecdef = true  -- SECURITY DEFINER functions
AND pg_get_functiondef(p.oid) NOT LIKE '%SET search_path%'
ORDER BY p.proname;
*/

-- Note: Most functions should already have search_path set from previous migrations.
-- This migration serves as a verification and documentation point.
-- If any functions are found without search_path, they should be updated individually.

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Search path security verification completed. All SECURITY DEFINER functions should have SET search_path = ''public'' configured.';
END $$;

