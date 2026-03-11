
-- ============================================
-- S2G Referral Circle System
-- ============================================

-- 1. user_referrals: one row per user with unique referral code
CREATE TABLE public.user_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code text NOT NULL,
  total_clicks integer NOT NULL DEFAULT 0,
  total_signups integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_referrals_user_id_key UNIQUE (user_id),
  CONSTRAINT user_referrals_referral_code_key UNIQUE (referral_code)
);

-- 2. referral_circle: tracks who referred whom
CREATE TABLE public.referral_circle (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active',
  referred_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referral_circle_referred_user_id_key UNIQUE (referred_user_id)
);

-- 3. Indexes
CREATE INDEX idx_user_referrals_code ON public.user_referrals (referral_code);
CREATE INDEX idx_referral_circle_referrer ON public.referral_circle (referrer_id);

-- 4. Enable RLS
ALTER TABLE public.user_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_circle ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for user_referrals
CREATE POLICY "Users can read own referral" ON public.user_referrals
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can read referral by code" ON public.user_referrals
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage all referrals" ON public.user_referrals
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 6. RLS Policies for referral_circle
CREATE POLICY "Users can see their circle" ON public.referral_circle
  FOR SELECT TO authenticated
  USING (referrer_id = auth.uid() OR referred_user_id = auth.uid());

CREATE POLICY "Admins can manage referral circles" ON public.referral_circle
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Service role can insert (used by edge function)
CREATE POLICY "Service can insert referral circle" ON public.referral_circle
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- 7. Function to generate referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := 'S2G-';
  i integer;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- 8. Trigger: auto-create user_referrals on profile insert
CREATE OR REPLACE FUNCTION public.trg_auto_create_user_referral()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code text;
  max_attempts integer := 10;
  attempt integer := 0;
BEGIN
  LOOP
    attempt := attempt + 1;
    new_code := generate_referral_code();
    BEGIN
      INSERT INTO public.user_referrals (user_id, referral_code)
      VALUES (NEW.user_id, new_code);
      EXIT; -- success
    EXCEPTION WHEN unique_violation THEN
      IF attempt >= max_attempts THEN
        RAISE EXCEPTION 'Could not generate unique referral code after % attempts', max_attempts;
      END IF;
    END;
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_create_user_referral
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_auto_create_user_referral();

-- 9. Backfill: generate codes for existing profiles
INSERT INTO public.user_referrals (user_id, referral_code)
SELECT p.user_id, public.generate_referral_code()
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_referrals ur WHERE ur.user_id = p.user_id
)
ON CONFLICT (user_id) DO NOTHING;

-- 10. Function to process referral after signup
CREATE OR REPLACE FUNCTION public.process_referral(
  p_referred_user_id uuid,
  p_referral_code text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id uuid;
  v_result json;
BEGIN
  -- Find the referrer
  SELECT user_id INTO v_referrer_id
  FROM public.user_referrals
  WHERE referral_code = p_referral_code;

  IF v_referrer_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid referral code');
  END IF;

  -- Prevent self-referral
  IF v_referrer_id = p_referred_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot refer yourself');
  END IF;

  -- Check if already referred
  IF EXISTS (SELECT 1 FROM public.referral_circle WHERE referred_user_id = p_referred_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'User already referred');
  END IF;

  -- Create relationship
  INSERT INTO public.referral_circle (referrer_id, referred_user_id)
  VALUES (v_referrer_id, p_referred_user_id);

  -- Increment signups counter
  UPDATE public.user_referrals
  SET total_signups = total_signups + 1
  WHERE user_id = v_referrer_id;

  RETURN json_build_object('success', true, 'referrer_id', v_referrer_id);
END;
$$;
