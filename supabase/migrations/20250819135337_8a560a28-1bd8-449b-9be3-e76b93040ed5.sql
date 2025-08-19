-- Add billing information fields to the profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS billing_address_line1 TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS billing_address_line2 TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS billing_city TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS billing_state TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS billing_postal_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS billing_country TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS billing_phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS billing_email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS billing_organization TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_complete_billing_info BOOLEAN DEFAULT FALSE;

-- Update the updated_at trigger to include billing fields
CREATE OR REPLACE FUNCTION public.update_billing_info_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if all required billing fields are present
  NEW.has_complete_billing_info = (
    NEW.billing_address_line1 IS NOT NULL AND 
    NEW.billing_city IS NOT NULL AND 
    NEW.billing_postal_code IS NOT NULL AND 
    NEW.billing_country IS NOT NULL AND 
    NEW.billing_email IS NOT NULL
  );
  
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update billing status
DROP TRIGGER IF EXISTS update_profiles_billing_status ON public.profiles;
CREATE TRIGGER update_profiles_billing_status
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_billing_info_status();