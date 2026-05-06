
-- Helper: get orchard owner user id
CREATE OR REPLACE FUNCTION public.fn_orchard_owner(_orchard_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM public.orchards WHERE id = _orchard_id;
$$;

-- Trigger fn: 1% of 5% admin-fee kickback to inviter on completed bestowals
CREATE OR REPLACE FUNCTION public.fn_bestowal_invite_kickback()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_referrer_aff uuid;
  v_referrer_user uuid;
  v_admin_fee numeric;
  v_kickback numeric;
BEGIN
  -- Only act when transitioning into a 'completed' state
  IF NEW.payment_status <> 'completed' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.payment_status = 'completed' THEN RETURN NEW; END IF;

  v_owner := public.fn_orchard_owner(NEW.orchard_id);
  IF v_owner IS NULL THEN RETURN NEW; END IF;

  -- Find an active referral pointing at this owner (the sower being supported)
  SELECT r.referrer_id, a.user_id
    INTO v_referrer_aff, v_referrer_user
  FROM public.referrals r
  JOIN public.affiliates a ON a.id = r.referrer_id
  WHERE r.referred_id = v_owner
  ORDER BY r.created_at ASC
  LIMIT 1;

  IF v_referrer_aff IS NULL THEN RETURN NEW; END IF;
  -- Don't pay sowers for bestowing into their own tribe-mate as a referrer of themselves
  IF v_referrer_user = v_owner THEN RETURN NEW; END IF;

  v_admin_fee := COALESCE(NEW.amount, 0) * 0.05;        -- 5% admin fee
  v_kickback  := v_admin_fee * 0.01;                    -- 1% of the admin fee
  IF v_kickback <= 0 THEN RETURN NEW; END IF;

  -- Credit affiliate lifetime earnings
  UPDATE public.affiliates
     SET earnings = COALESCE(earnings, 0) + v_kickback,
         updated_at = now()
   WHERE id = v_referrer_aff;

  -- Audit row
  INSERT INTO public.referrals (referrer_id, referred_id, orchard_id, commission_amount, commission_rate, status, paid_at)
  VALUES (v_referrer_aff, v_owner, NEW.orchard_id, v_kickback, 0.01, 'paid', now());

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bestowal_invite_kickback ON public.bestowals;
CREATE TRIGGER trg_bestowal_invite_kickback
AFTER INSERT OR UPDATE OF payment_status ON public.bestowals
FOR EACH ROW
EXECUTE FUNCTION public.fn_bestowal_invite_kickback();
