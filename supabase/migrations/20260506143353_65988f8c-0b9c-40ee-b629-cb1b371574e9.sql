
-- Catalog
CREATE TABLE public.s2g_companions (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  emoji TEXT NOT NULL,
  summary TEXT NOT NULL,
  category TEXT NOT NULL,
  default_model TEXT NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.s2g_companions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Companions are public" ON public.s2g_companions FOR SELECT USING (true);

-- Entitlements
CREATE TABLE public.s2g_companion_entitlements (
  companion_slug TEXT NOT NULL REFERENCES public.s2g_companions(slug) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('sower','keeper','ambassador','council')),
  mode TEXT NOT NULL CHECK (mode IN ('none','basic','standard','full','full_plus')),
  monthly_quota INT,
  notes TEXT,
  PRIMARY KEY (companion_slug, tier)
);
ALTER TABLE public.s2g_companion_entitlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Entitlements are public" ON public.s2g_companion_entitlements FOR SELECT USING (true);

-- Usage
CREATE TABLE public.s2g_companion_usage (
  user_id UUID NOT NULL,
  companion_slug TEXT NOT NULL REFERENCES public.s2g_companions(slug) ON DELETE CASCADE,
  period_yyyymm TEXT NOT NULL,
  count INT NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, companion_slug, period_yyyymm)
);
ALTER TABLE public.s2g_companion_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner can read own usage" ON public.s2g_companion_usage
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Runs (audit)
CREATE TABLE public.s2g_companion_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  companion_slug TEXT NOT NULL,
  tier_at_run TEXT,
  model TEXT,
  action TEXT,
  input_summary TEXT,
  output_summary TEXT,
  tokens_in INT,
  tokens_out INT,
  status TEXT NOT NULL DEFAULT 'ok',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.s2g_companion_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner can read own runs" ON public.s2g_companion_runs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_s2g_companion_runs_user ON public.s2g_companion_runs(user_id, created_at DESC);

-- Effective tier helper
CREATE OR REPLACE FUNCTION public.get_effective_tier(_user UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tier TEXT;
  _free BOOLEAN;
BEGIN
  IF _user IS NULL THEN RETURN 'sower'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.s2g_agent_free_access
    WHERE user_id = _user AND COALESCE(is_active, true) = true
  ) INTO _free;
  IF _free THEN RETURN 'council'; END IF;

  SELECT lower(COALESCE(membership_tier, 'sower')) INTO _tier
  FROM public.profiles WHERE user_id = _user
  ORDER BY updated_at DESC NULLS LAST LIMIT 1;

  IF _tier IS NULL THEN RETURN 'sower'; END IF;
  IF _tier IN ('sower','keeper','ambassador','council') THEN RETURN _tier; END IF;
  -- map common variants
  IF _tier ILIKE 'free%' THEN RETURN 'sower'; END IF;
  IF _tier ILIKE '%founder%' OR _tier ILIKE '%council%' THEN RETURN 'council'; END IF;
  RETURN 'sower';
END;
$$;
REVOKE ALL ON FUNCTION public.get_effective_tier(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_effective_tier(UUID) TO authenticated;

-- Quota consumer (called by edge function via service role)
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
BEGIN
  _tier := public.get_effective_tier(_user);

  SELECT mode, monthly_quota INTO _ent
  FROM public.s2g_companion_entitlements
  WHERE companion_slug = _slug AND tier = _tier;

  IF NOT FOUND OR _ent.mode = 'none' THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'not_in_tier', 'tier', _tier);
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
-- service role only (no grant to anon/authenticated)

-- Seed companions
INSERT INTO public.s2g_companions (slug, name, title, emoji, summary, category, default_model, sort_order) VALUES
  ('gentoo','Gentoo','The Grove Overseer','🐧','Coordinates the whole orchard — daily briefings, task routing, login greetings.','coordination','google/gemini-3-flash-preview',1),
  ('tux','Tux','The Story Sower','🎨','Drafts SeedFlow posts, captions, content calendars and marketing copy.','content','google/gemini-3-flash-preview',2),
  ('ubuntu','Ubuntu','The Voice Guardian','🛡️','Reviews content for tone, values and brand alignment before posting.','review','google/gemini-3-flash-preview',3),
  ('kali','Kali','The Vision Weaver','🪄','Generates and refines images: seed covers, product photos, banners.','image','google/gemini-2.5-flash-image',4),
  ('fedora','Fedora','The Reel Keeper','🎬','Plans video reels, testimonial clips and orchard intros.','video','google/gemini-3-flash-preview',5),
  ('debian','Debian','The Hearth Messenger','💬','Drafts outreach, thank-yous and collaboration proposals.','messaging','google/gemini-3-flash-preview',6),
  ('arch','Arch','The Bridge Caller','📞','Opens HearthCall sessions and routes voice/video connections.','calling','google/gemini-3-flash-preview',7),
  ('mint','Mint','The Pocket Keeper','📒','Tracks bestowals, weekly reports and tribe leader 1% finance.','finance','google/gemini-2.5-pro',8),
  ('loaf','Loaf','The Storehouse Steward','🥖','Tracks stock for Field & Forge, deliveries and order management.','logistics','google/gemini-3-flash-preview',9),
  ('sage','Sage','The Harvest Oracle','🔮','Suggests pricing, performance insights and best-time-to-post.','insight','google/gemini-2.5-pro',10);

-- Seed entitlements (tier x companion)
-- Gentoo: greeting / daily summary / full / full+governance
INSERT INTO public.s2g_companion_entitlements (companion_slug, tier, mode, monthly_quota, notes) VALUES
 ('gentoo','sower','basic',NULL,'Basic greeting'),
 ('gentoo','keeper','standard',NULL,'Daily summary'),
 ('gentoo','ambassador','full',NULL,'Full coordination'),
 ('gentoo','council','full_plus',NULL,'Full + governance'),
-- Tux
 ('tux','sower','basic',3,'3 posts/month'),
 ('tux','keeper','standard',10,'10 posts/month'),
 ('tux','ambassador','full',NULL,'Unlimited + scheduling'),
 ('tux','council','full_plus',NULL,'Unlimited'),
-- Ubuntu
 ('ubuntu','sower','basic',5,'On request'),
 ('ubuntu','keeper','standard',20,'On request'),
 ('ubuntu','ambassador','full',NULL,'Auto-reviews all posts'),
 ('ubuntu','council','full_plus',NULL,'Auto-reviews all posts'),
-- Kali
 ('kali','sower','basic',3,'3 images/month'),
 ('kali','keeper','standard',10,'10 images/month'),
 ('kali','ambassador','full',NULL,'Unlimited images'),
 ('kali','council','full_plus',NULL,'Unlimited images'),
-- Fedora
 ('fedora','sower','none',0,'Not available'),
 ('fedora','keeper','none',0,'Not available'),
 ('fedora','ambassador','full',NULL,'Full access'),
 ('fedora','council','full_plus',NULL,'Full access'),
-- Debian
 ('debian','sower','none',0,'Not available'),
 ('debian','keeper','basic',10,'Manual drafts'),
 ('debian','ambassador','full',NULL,'Auto-outreach'),
 ('debian','council','full_plus',NULL,'Auto-outreach'),
-- Arch
 ('arch','sower','basic',NULL,'HearthCall only'),
 ('arch','keeper','basic',NULL,'HearthCall only'),
 ('arch','ambassador','full',NULL,'Full routing'),
 ('arch','council','full_plus',NULL,'Full routing'),
-- Mint
 ('mint','sower','basic',2,'Basic summary'),
 ('mint','keeper','standard',8,'Weekly report'),
 ('mint','ambassador','full',NULL,'Full finance suite'),
 ('mint','council','full_plus',NULL,'Full finance suite'),
-- Loaf
 ('loaf','sower','none',0,'Not available'),
 ('loaf','keeper','basic',10,'Basic tracking'),
 ('loaf','ambassador','full',NULL,'Full logistics'),
 ('loaf','council','full_plus',NULL,'Full logistics'),
-- Sage
 ('sage','sower','none',0,'Not available'),
 ('sage','keeper','basic',5,'Basic insights'),
 ('sage','ambassador','full',NULL,'Full oracle'),
 ('sage','council','full_plus',NULL,'Full oracle + council');
