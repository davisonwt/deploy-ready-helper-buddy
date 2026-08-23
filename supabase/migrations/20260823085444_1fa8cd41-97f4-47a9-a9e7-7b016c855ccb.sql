CREATE OR REPLACE FUNCTION public.tg_mark_payout_setup_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.wallet_type IN ('nowpayments_crypto','paypal_email') THEN
    PERFORM set_config('app.system_payout_update', 'on', true);
    UPDATE public.profiles
       SET payout_setup_complete = true,
           updated_at = now()
     WHERE user_id = NEW.user_id
       AND payout_setup_complete = false;
    PERFORM set_config('app.system_payout_update', 'off', true);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean := public.has_role(auth.uid(), 'admin'::app_role)
                     OR public.is_admin_or_gosat(auth.uid());
  system_payout boolean := coalesce(current_setting('app.system_payout_update', true), 'off') = 'on';
BEGIN
  IF is_admin THEN
    RETURN NEW;
  END IF;

  IF NEW.membership_tier IS DISTINCT FROM OLD.membership_tier
     OR NEW.verification_status IS DISTINCT FROM OLD.verification_status
     OR NEW.is_chatapp_verified IS DISTINCT FROM OLD.is_chatapp_verified
     OR NEW.suspended IS DISTINCT FROM OLD.suspended
     OR NEW.video_credits IS DISTINCT FROM OLD.video_credits THEN
    RAISE EXCEPTION 'Privileged profile fields may only be modified by admins';
  END IF;

  IF NEW.payout_setup_complete IS DISTINCT FROM OLD.payout_setup_complete
     AND NOT system_payout THEN
    RAISE EXCEPTION 'Privileged profile fields may only be modified by admins';
  END IF;

  RETURN NEW;
END;
$$;