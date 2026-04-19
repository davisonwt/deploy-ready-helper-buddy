
-- ============================================================
-- TRIBAL SCORES (Ubuntu Reputation System)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tribal_scores (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  tier TEXT NOT NULL DEFAULT 'seedling',
  badges TEXT[] NOT NULL DEFAULT '{}',
  breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  bestowals_given_count INTEGER NOT NULL DEFAULT 0,
  bestowals_received_count INTEGER NOT NULL DEFAULT 0,
  orchards_count INTEGER NOT NULL DEFAULT 0,
  tribe_size INTEGER NOT NULL DEFAULT 0,
  helpful_votes INTEGER NOT NULL DEFAULT 0,
  reviews_avg_rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  last_recomputed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tribal_scores_score ON public.tribal_scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_tribal_scores_tier ON public.tribal_scores(tier);

ALTER TABLE public.tribal_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tribal scores are viewable by everyone authenticated"
  ON public.tribal_scores FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "System can insert tribal scores"
  ON public.tribal_scores FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can update any score"
  ON public.tribal_scores FOR UPDATE
  USING (auth.role() = 'service_role' OR auth.uid() = user_id);

-- ============================================================
-- TRIBAL MATCHES (Bestowal Matching Engine)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tribal_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_a_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_b_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_type TEXT NOT NULL DEFAULT 'collaboration',
  match_reason TEXT NOT NULL,
  suggested_action TEXT,
  confidence_score NUMERIC(3,2) NOT NULL DEFAULT 0.5,
  seed_a_id UUID,
  seed_b_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  member_a_response TEXT,
  member_b_response TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT different_members CHECK (member_a_id <> member_b_id)
);

CREATE INDEX IF NOT EXISTS idx_tribal_matches_member_a ON public.tribal_matches(member_a_id, status);
CREATE INDEX IF NOT EXISTS idx_tribal_matches_member_b ON public.tribal_matches(member_b_id, status);
CREATE INDEX IF NOT EXISTS idx_tribal_matches_status ON public.tribal_matches(status, created_at DESC);

ALTER TABLE public.tribal_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their own matches"
  ON public.tribal_matches FOR SELECT
  TO authenticated
  USING (auth.uid() = member_a_id OR auth.uid() = member_b_id);

CREATE POLICY "Members can update their match response"
  ON public.tribal_matches FOR UPDATE
  TO authenticated
  USING (auth.uid() = member_a_id OR auth.uid() = member_b_id);

-- ============================================================
-- PROFILES: add preferred_language + garden_settings
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS garden_settings JSONB NOT NULL DEFAULT '{"theme":"forest","celebrations_enabled":true,"layout":"organic"}'::jsonb;

-- ============================================================
-- SQL FUNCTION: recompute_tribal_score
-- ============================================================
CREATE OR REPLACE FUNCTION public.recompute_tribal_score(_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bestowals_given INTEGER := 0;
  v_bestowals_received INTEGER := 0;
  v_orchards INTEGER := 0;
  v_tribe_size INTEGER := 0;
  v_helpful_votes INTEGER := 0;
  v_avg_rating NUMERIC := 0;
  v_score INTEGER := 0;
  v_tier TEXT := 'seedling';
  v_badges TEXT[] := '{}';
  v_breakdown JSONB;
BEGIN
  -- Bestowals given (this user as bestower)
  SELECT COUNT(*) INTO v_bestowals_given
  FROM bestowals
  WHERE bestower_id = _user_id AND payment_status = 'completed';

  -- Bestowals received (orchards owned by this user)
  SELECT COUNT(*) INTO v_bestowals_received
  FROM bestowals b
  JOIN orchards o ON o.id = b.orchard_id
  WHERE o.user_id = _user_id AND b.payment_status = 'completed';

  -- Orchards/seeds count
  SELECT COUNT(*) INTO v_orchards FROM orchards WHERE user_id = _user_id;

  -- Tribe size (referrals via affiliates)
  SELECT COALESCE(SUM(total_referrals), 0) INTO v_tribe_size
  FROM affiliates WHERE user_id = _user_id;

  -- Helpful votes (community post upvotes received)
  SELECT COALESCE(SUM(upvotes), 0) INTO v_helpful_votes
  FROM community_posts WHERE author_id = _user_id;

  -- Avg rating from stay_reviews where user is the host (via stays_listings)
  -- Skipped if table missing; default 0
  BEGIN
    SELECT COALESCE(AVG(sr.rating), 0) INTO v_avg_rating
    FROM stay_reviews sr
    WHERE sr.listing_id IN (
      SELECT id FROM stays_listings WHERE host_id = _user_id
    );
  EXCEPTION WHEN undefined_table THEN
    v_avg_rating := 0;
  END;

  -- Score formula (max ~1000)
  v_score := LEAST(1000,
    (v_bestowals_given * 8)        -- generosity weight
    + (v_bestowals_received * 5)   -- success weight
    + (v_orchards * 12)            -- contribution weight
    + (v_tribe_size * 20)          -- network weight
    + (v_helpful_votes * 2)        -- helpfulness weight
    + (v_avg_rating * 30)::INTEGER -- quality weight
  );

  -- Tier mapping
  v_tier := CASE
    WHEN v_score >= 750 THEN 'elder'
    WHEN v_score >= 500 THEN 'mentor'
    WHEN v_score >= 250 THEN 'sower'
    WHEN v_score >= 75  THEN 'sprout'
    ELSE 'seedling'
  END;

  -- Badges
  IF v_bestowals_given >= 10 THEN v_badges := array_append(v_badges, 'bestower'); END IF;
  IF v_orchards >= 5         THEN v_badges := array_append(v_badges, 'sower'); END IF;
  IF v_tribe_size >= 5       THEN v_badges := array_append(v_badges, 'connector'); END IF;
  IF v_avg_rating >= 4.5     THEN v_badges := array_append(v_badges, 'mentor'); END IF;
  IF v_helpful_votes >= 50   THEN v_badges := array_append(v_badges, 'helper'); END IF;

  v_breakdown := jsonb_build_object(
    'bestowals_given', v_bestowals_given,
    'bestowals_received', v_bestowals_received,
    'orchards', v_orchards,
    'tribe_size', v_tribe_size,
    'helpful_votes', v_helpful_votes,
    'avg_rating', v_avg_rating
  );

  INSERT INTO tribal_scores (
    user_id, score, tier, badges, breakdown,
    bestowals_given_count, bestowals_received_count,
    orchards_count, tribe_size, helpful_votes,
    reviews_avg_rating, last_recomputed_at, updated_at
  ) VALUES (
    _user_id, v_score, v_tier, v_badges, v_breakdown,
    v_bestowals_given, v_bestowals_received,
    v_orchards, v_tribe_size, v_helpful_votes,
    v_avg_rating, now(), now()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET score = EXCLUDED.score,
      tier = EXCLUDED.tier,
      badges = EXCLUDED.badges,
      breakdown = EXCLUDED.breakdown,
      bestowals_given_count = EXCLUDED.bestowals_given_count,
      bestowals_received_count = EXCLUDED.bestowals_received_count,
      orchards_count = EXCLUDED.orchards_count,
      tribe_size = EXCLUDED.tribe_size,
      helpful_votes = EXCLUDED.helpful_votes,
      reviews_avg_rating = EXCLUDED.reviews_avg_rating,
      last_recomputed_at = now(),
      updated_at = now();

  RETURN v_score;
END;
$$;

-- ============================================================
-- AUTO-CREATE tribal_scores row on new profile
-- ============================================================
CREATE OR REPLACE FUNCTION public.init_tribal_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO tribal_scores (user_id) VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_init_tribal_score ON public.profiles;
CREATE TRIGGER trigger_init_tribal_score
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.init_tribal_score();

-- ============================================================
-- Updated_at trigger for tribal_matches
-- ============================================================
CREATE TRIGGER update_tribal_matches_updated_at
  BEFORE UPDATE ON public.tribal_matches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Seed scores for existing profiles (one-time backfill)
-- ============================================================
INSERT INTO public.tribal_scores (user_id)
SELECT user_id FROM public.profiles
WHERE user_id NOT IN (SELECT user_id FROM public.tribal_scores)
ON CONFLICT (user_id) DO NOTHING;
