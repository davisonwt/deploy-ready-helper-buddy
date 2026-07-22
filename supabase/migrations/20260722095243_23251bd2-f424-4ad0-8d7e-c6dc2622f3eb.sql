
CREATE OR REPLACE FUNCTION public.enforce_regulated_business_credential()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.seller_template = 'regulated_business' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.seller_credentials sc
      WHERE sc.user_id = NEW.user_id
        AND sc.status IN ('verified','approved')
        AND sc.credential_type IN (
          'pharmacist_license',
          'vet_license',
          'herbalist_cert',
          'optometrist_license',
          'clinic_license',
          'regulated_business',
          'license'
        )
    ) THEN
      RAISE EXCEPTION 'Regulated business template requires an approved professional credential.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
