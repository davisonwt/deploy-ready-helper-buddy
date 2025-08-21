-- Drop existing trigger first
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;

-- Drop the problematic billing trigger and function
DROP TRIGGER IF EXISTS update_billing_info_status_trigger ON public.profiles;
DROP FUNCTION IF EXISTS public.update_billing_info_status() CASCADE;

-- Recreate the simple timestamp trigger
CREATE OR REPLACE FUNCTION public.update_profiles_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_profiles_timestamp();