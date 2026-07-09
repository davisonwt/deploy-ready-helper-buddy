
-- 1. Orchards: block non-admin self-changes to verification_status
CREATE OR REPLACE FUNCTION public.prevent_orchard_verification_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status
     AND NOT public.is_admin_or_gosat(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins/gosats may modify verification_status';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orchards_protect_verification ON public.orchards;
CREATE TRIGGER trg_orchards_protect_verification
BEFORE UPDATE ON public.orchards
FOR EACH ROW EXECUTE FUNCTION public.prevent_orchard_verification_self_update();

-- 2. Profiles: block self-updates to sensitive fields
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean := public.has_role(auth.uid(), 'admin'::app_role)
                     OR public.is_admin_or_gosat(auth.uid());
BEGIN
  IF is_admin THEN
    RETURN NEW;
  END IF;

  IF NEW.membership_tier IS DISTINCT FROM OLD.membership_tier
     OR NEW.verification_status IS DISTINCT FROM OLD.verification_status
     OR NEW.is_chatapp_verified IS DISTINCT FROM OLD.is_chatapp_verified
     OR NEW.suspended IS DISTINCT FROM OLD.suspended
     OR NEW.video_credits IS DISTINCT FROM OLD.video_credits
     OR NEW.payout_setup_complete IS DISTINCT FROM OLD.payout_setup_complete THEN
    RAISE EXCEPTION 'Privileged profile fields may only be modified by admins';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_protect_privileged ON public.profiles;
CREATE TRIGGER trg_profiles_protect_privileged
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- 3a. providers: block self-approval of status
CREATE OR REPLACE FUNCTION public.prevent_provider_status_self_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NOT public.has_role(auth.uid(), 'admin'::app_role)
     AND NOT public.is_admin_or_gosat(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins/gosats may modify provider status';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_providers_protect_status ON public.providers;
CREATE TRIGGER trg_providers_protect_status
BEFORE UPDATE ON public.providers
FOR EACH ROW EXECUTE FUNCTION public.prevent_provider_status_self_approval();

-- 3b. service_providers: block self-approval of status/verification_status
CREATE OR REPLACE FUNCTION public.prevent_service_provider_status_self_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.status IS DISTINCT FROM OLD.status
      OR NEW.verification_status IS DISTINCT FROM OLD.verification_status)
     AND NOT public.has_role(auth.uid(), 'admin'::app_role)
     AND NOT public.is_admin_or_gosat(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins/gosats may modify service provider status/verification';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_service_providers_protect_status ON public.service_providers;
CREATE TRIGGER trg_service_providers_protect_status
BEFORE UPDATE ON public.service_providers
FOR EACH ROW EXECUTE FUNCTION public.prevent_service_provider_status_self_approval();

-- 3c. community_drivers: block self-approval of status/background_check_status
CREATE OR REPLACE FUNCTION public.prevent_driver_status_self_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.status IS DISTINCT FROM OLD.status
      OR NEW.background_check_status IS DISTINCT FROM OLD.background_check_status)
     AND NOT public.has_role(auth.uid(), 'admin'::app_role)
     AND NOT public.is_admin_or_gosat(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins/gosats may modify driver status/background_check_status';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_drivers_protect_status ON public.community_drivers;
CREATE TRIGGER trg_drivers_protect_status
BEFORE UPDATE ON public.community_drivers
FOR EACH ROW EXECUTE FUNCTION public.prevent_driver_status_self_approval();

-- 4. seed_story_overrides: restrict SELECT to owner
DROP POLICY IF EXISTS "Users can read all story overrides" ON public.seed_story_overrides;
CREATE POLICY "Users can read their own story overrides"
ON public.seed_story_overrides
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 5. payment_config: drop legacy plaintext columns (encrypted columns retained)
ALTER TABLE public.payment_config
  DROP COLUMN IF EXISTS bank_account_number,
  DROP COLUMN IF EXISTS bank_account_name,
  DROP COLUMN IF EXISTS bank_swift_code,
  DROP COLUMN IF EXISTS business_email;
