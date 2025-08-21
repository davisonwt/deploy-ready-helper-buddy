-- Remove any remaining problematic triggers on profiles table
DROP TRIGGER IF EXISTS log_profile_changes_trigger ON public.profiles;
DROP FUNCTION IF EXISTS public.log_profile_changes() CASCADE;

-- Also check for any other triggers that might be logging to billing_access_logs
DROP TRIGGER IF EXISTS update_billing_info_status_from_secure_table_trigger ON public.profiles;
DROP FUNCTION IF EXISTS public.update_billing_info_status_from_secure_table() CASCADE;