
-- Backfill: sync auth.users.email into profiles.email where it's currently NULL
UPDATE public.profiles p
SET email = au.email
FROM auth.users au
WHERE au.id = p.user_id
  AND (p.email IS NULL OR p.email = '');

-- Create a trigger function to auto-sync auth email on profile creation/update
CREATE OR REPLACE FUNCTION public.sync_auth_email_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fill email if it's not already set
  IF NEW.email IS NULL OR NEW.email = '' THEN
    SELECT email INTO NEW.email
    FROM auth.users
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger on insert (new profiles get auth email automatically)
CREATE TRIGGER sync_email_on_profile_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_auth_email_to_profile();
