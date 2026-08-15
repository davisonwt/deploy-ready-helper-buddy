-- 1) Harden gig_bookings financial guard (add missing fee/earnings columns)
CREATE OR REPLACE FUNCTION public.guard_gig_bookings_financials()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF public.is_service_role() THEN
    RETURN NEW;
  END IF;
  NEW.payment_status         := OLD.payment_status;
  NEW.final_fare             := OLD.final_fare;
  NEW.estimated_fare         := OLD.estimated_fare;
  NEW.platform_fee_amount    := OLD.platform_fee_amount;
  NEW.provider_earnings      := OLD.provider_earnings;
  NEW.admin_fee_amount       := OLD.admin_fee_amount;
  NEW.customer_id            := OLD.customer_id;
  NEW.provider_id            := OLD.provider_id;
  RETURN NEW;
END;
$function$;

-- 2) Ensure stay_bookings guard covers total_price + payment_status
CREATE OR REPLACE FUNCTION public.guard_stay_bookings_financials()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF public.is_service_role() THEN
    RETURN NEW;
  END IF;
  NEW.payment_status := OLD.payment_status;
  NEW.total_price    := OLD.total_price;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_guard_stay_bookings_financials ON public.stay_bookings;
CREATE TRIGGER trg_guard_stay_bookings_financials
BEFORE UPDATE ON public.stay_bookings
FOR EACH ROW EXECUTE FUNCTION public.guard_stay_bookings_financials();

DROP TRIGGER IF EXISTS trg_guard_gig_bookings_financials ON public.gig_bookings;
CREATE TRIGGER trg_guard_gig_bookings_financials
BEFORE UPDATE ON public.gig_bookings
FOR EACH ROW EXECUTE FUNCTION public.guard_gig_bookings_financials();

-- 3) Separation of duties for role granting
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin_or_gosat(auth.uid())
  AND (
    role <> 'admin'::app_role
    OR (
      public.has_role(auth.uid(), 'admin'::app_role)
      AND user_id <> auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  public.is_admin_or_gosat(auth.uid())
  AND (
    role <> 'admin'::app_role
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);