-- Drop the problematic trigger that's causing the billing_address_line1 error
DROP TRIGGER IF EXISTS update_billing_info_status_trigger ON public.profiles;

-- Also drop the function if it exists and is causing issues
DROP FUNCTION IF EXISTS public.update_billing_info_status() CASCADE;

-- Create a simple trigger for updating timestamps only
CREATE OR REPLACE FUNCTION public.update_profiles_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Create trigger for timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_profiles_timestamp();