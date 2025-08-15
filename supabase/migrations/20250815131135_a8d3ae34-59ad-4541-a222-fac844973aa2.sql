-- Completely remove the public_profiles view to resolve Security Definer View issue
-- The view may be causing security concerns by inheriting special privileges

DROP VIEW IF EXISTS public.public_profiles;

-- Instead of a view, we'll rely on the RLS policies on the profiles table directly
-- Components should query the profiles table directly with appropriate column selection