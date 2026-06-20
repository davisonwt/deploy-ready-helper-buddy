
-- 1. app_settings table
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_and_gosats_read_app_settings"
  ON public.app_settings FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'gosat'::app_role)
  );

CREATE POLICY "admins_and_gosats_write_app_settings"
  ON public.app_settings FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'gosat'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'gosat'::app_role)
  );

-- 2. Seed the promo end date (14 days from now). Only inserts once.
INSERT INTO public.app_settings (key, value)
VALUES (
  'companion_promo_ends_at',
  to_jsonb((now() + interval '14 days')::text)
)
ON CONFLICT (key) DO NOTHING;

-- 3. Promo-active helper (SECURITY DEFINER so any role can read just this fact
-- without needing app_settings SELECT).
CREATE OR REPLACE FUNCTION public.is_companion_promo_active()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ends_at TIMESTAMPTZ;
BEGIN
  SELECT (value #>> '{}')::timestamptz INTO _ends_at
  FROM public.app_settings
  WHERE key = 'companion_promo_ends_at';

  IF _ends_at IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN now() < _ends_at;
END;
$$;

REVOKE ALL ON FUNCTION public.is_companion_promo_active() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_companion_promo_active() TO authenticated, service_role, anon;

-- 4. Setter, gosat/admin only.
CREATE OR REPLACE FUNCTION public.set_companion_promo_ends_at(_ends_at TIMESTAMPTZ)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'gosat'::app_role)
  ) THEN
    RAISE EXCEPTION 'only admin or gosat may change the companion promo';
  END IF;

  INSERT INTO public.app_settings (key, value, updated_by, updated_at)
  VALUES ('companion_promo_ends_at', to_jsonb(_ends_at::text), auth.uid(), now())
  ON CONFLICT (key)
  DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now();

  RETURN _ends_at;
END;
$$;

REVOKE ALL ON FUNCTION public.set_companion_promo_ends_at(TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_companion_promo_ends_at(TIMESTAMPTZ) TO authenticated;

-- 5. Replace check_and_consume_companion_quota: bypass quota during promo,
-- still record usage so dashboards see real signal.
CREATE OR REPLACE FUNCTION public.check_and_consume_companion_quota(_user UUID, _slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tier TEXT;
  _ent RECORD;
  _period TEXT := to_char(now(), 'YYYYMM');
  _count INT := 0;
  _remaining INT;
  _promo BOOLEAN := public.is_companion_promo_active();
BEGIN
  _tier := public.get_effective_tier(_user);

  SELECT mode, monthly_quota INTO _ent
  FROM public.s2g_companion_entitlements
  WHERE companion_slug = _slug AND tier = _tier;

  IF NOT FOUND OR _ent.mode = 'none' THEN
    -- Even during promo we won't fabricate access to a companion that isn't
    -- in this user's tier matrix at all.
    RETURN jsonb_build_object('allowed', false, 'reason', 'not_in_tier', 'tier', _tier);
  END IF;

  -- PROMO BYPASS: count usage but always allow.
  IF _promo THEN
    INSERT INTO public.s2g_companion_usage(user_id, companion_slug, period_yyyymm, count, last_used_at)
    VALUES (_user, _slug, _period, 1, now())
    ON CONFLICT (user_id, companion_slug, period_yyyymm)
    DO UPDATE SET count = s2g_companion_usage.count + 1, last_used_at = now();
    RETURN jsonb_build_object(
      'allowed', true, 'mode', _ent.mode, 'remaining', NULL,
      'tier', _tier, 'promo', true
    );
  END IF;

  -- Unlimited
  IF _ent.monthly_quota IS NULL THEN
    INSERT INTO public.s2g_companion_usage(user_id, companion_slug, period_yyyymm, count, last_used_at)
    VALUES (_user, _slug, _period, 1, now())
    ON CONFLICT (user_id, companion_slug, period_yyyymm)
    DO UPDATE SET count = s2g_companion_usage.count + 1, last_used_at = now();
    RETURN jsonb_build_object('allowed', true, 'mode', _ent.mode, 'remaining', NULL, 'tier', _tier);
  END IF;

  SELECT count INTO _count FROM public.s2g_companion_usage
  WHERE user_id = _user AND companion_slug = _slug AND period_yyyymm = _period;
  _count := COALESCE(_count, 0);

  IF _count >= _ent.monthly_quota THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'quota_exceeded',
      'mode', _ent.mode, 'remaining', 0, 'tier', _tier, 'monthly_quota', _ent.monthly_quota);
  END IF;

  INSERT INTO public.s2g_companion_usage(user_id, companion_slug, period_yyyymm, count, last_used_at)
  VALUES (_user, _slug, _period, 1, now())
  ON CONFLICT (user_id, companion_slug, period_yyyymm)
  DO UPDATE SET count = s2g_companion_usage.count + 1, last_used_at = now();

  _remaining := _ent.monthly_quota - (_count + 1);
  RETURN jsonb_build_object('allowed', true, 'mode', _ent.mode, 'remaining', _remaining,
    'tier', _tier, 'monthly_quota', _ent.monthly_quota);
END;
$$;

REVOKE ALL ON FUNCTION public.check_and_consume_companion_quota(UUID, TEXT) FROM PUBLIC;
