-- Enums
DO $$ BEGIN CREATE TYPE public.hearts_gender AS ENUM ('male','female'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.hearts_profile_status AS ENUM ('active','paused','hidden'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.hearts_match_status AS ENUM ('pending','mutual','declined','expired'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.hearts_response AS ENUM ('pending','accepted','passed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Profiles
CREATE TABLE IF NOT EXISTS public.tribal_hearts_profiles (
  user_id UUID PRIMARY KEY,
  display_first_name TEXT,
  gender public.hearts_gender NOT NULL,
  seeking public.hearts_gender NOT NULL,
  birthdate DATE NOT NULL,
  age_verified BOOLEAN NOT NULL DEFAULT false,
  photo_verified BOOLEAN NOT NULL DEFAULT false,
  bio TEXT,
  values_list TEXT[] NOT NULL DEFAULT '{}',
  interests TEXT[] NOT NULL DEFAULT '{}',
  lifestyle JSONB NOT NULL DEFAULT '{}'::jsonb,
  location_country TEXT,
  location_region TEXT,
  timezone TEXT,
  distance_pref_km INTEGER,
  status public.hearts_profile_status NOT NULL DEFAULT 'active',
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tribal_hearts_profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.tribal_hearts_profile_validate()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.gender = 'male' THEN NEW.seeking := 'female'; ELSE NEW.seeking := 'male'; END IF;
  IF NEW.birthdate IS NULL OR NEW.birthdate > (CURRENT_DATE - INTERVAL '18 years')::date THEN
    RAISE EXCEPTION 'Tribal Hearts requires members to be 18 or older.';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_tribal_hearts_profile_validate ON public.tribal_hearts_profiles;
CREATE TRIGGER trg_tribal_hearts_profile_validate
BEFORE INSERT OR UPDATE ON public.tribal_hearts_profiles
FOR EACH ROW EXECUTE FUNCTION public.tribal_hearts_profile_validate();

-- Answers
CREATE TABLE IF NOT EXISTS public.tribal_hearts_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  question_key TEXT NOT NULL,
  question_text TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, question_key)
);
ALTER TABLE public.tribal_hearts_answers ENABLE ROW LEVEL SECURITY;

-- Matches (created BEFORE policies that reference it)
CREATE TABLE IF NOT EXISTS public.tribal_hearts_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_a_id UUID NOT NULL,
  member_b_id UUID NOT NULL,
  compatibility_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  match_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  a_response public.hearts_response NOT NULL DEFAULT 'pending',
  b_response public.hearts_response NOT NULL DEFAULT 'pending',
  status public.hearts_match_status NOT NULL DEFAULT 'pending',
  chat_room_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (member_a_id, member_b_id)
);
CREATE INDEX IF NOT EXISTS idx_hearts_matches_a ON public.tribal_hearts_matches(member_a_id, status);
CREATE INDEX IF NOT EXISTS idx_hearts_matches_b ON public.tribal_hearts_matches(member_b_id, status);
ALTER TABLE public.tribal_hearts_matches ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.tribal_hearts_match_validate()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a_g public.hearts_gender; b_g public.hearts_gender;
BEGIN
  SELECT gender INTO a_g FROM public.tribal_hearts_profiles WHERE user_id = NEW.member_a_id;
  SELECT gender INTO b_g FROM public.tribal_hearts_profiles WHERE user_id = NEW.member_b_id;
  IF a_g IS NULL OR b_g IS NULL THEN
    RAISE EXCEPTION 'Both members must have a Tribal Hearts profile.';
  END IF;
  IF NOT (a_g = 'male' AND b_g = 'female') THEN
    RAISE EXCEPTION 'Tribal Hearts matches must be one male (member_a) and one female (member_b).';
  END IF;
  IF NEW.a_response = 'accepted' AND NEW.b_response = 'accepted' THEN NEW.status := 'mutual';
  ELSIF NEW.a_response = 'passed' OR NEW.b_response = 'passed' THEN NEW.status := 'declined';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_tribal_hearts_match_validate ON public.tribal_hearts_matches;
CREATE TRIGGER trg_tribal_hearts_match_validate
BEFORE INSERT OR UPDATE ON public.tribal_hearts_matches
FOR EACH ROW EXECUTE FUNCTION public.tribal_hearts_match_validate();

-- Blocks
CREATE TABLE IF NOT EXISTS public.tribal_hearts_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL,
  blocked_id UUID NOT NULL,
  reason TEXT,
  is_report BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);
ALTER TABLE public.tribal_hearts_blocks ENABLE ROW LEVEL SECURITY;

-- Safety flags
CREATE TABLE IF NOT EXISTS public.tribal_hearts_safety_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID,
  room_id UUID,
  flagged_user_id UUID,
  category TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'low',
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tribal_hearts_safety_flags ENABLE ROW LEVEL SECURITY;

-- Policies (now that all tables exist)
CREATE POLICY "hearts_profiles_self_select" ON public.tribal_hearts_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "hearts_profiles_self_insert" ON public.tribal_hearts_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "hearts_profiles_self_update" ON public.tribal_hearts_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "hearts_profiles_self_delete" ON public.tribal_hearts_profiles FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "hearts_profiles_matched_select" ON public.tribal_hearts_profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.tribal_hearts_matches m
    WHERE (m.member_a_id = auth.uid() AND m.member_b_id = tribal_hearts_profiles.user_id)
       OR (m.member_b_id = auth.uid() AND m.member_a_id = tribal_hearts_profiles.user_id))
);

CREATE POLICY "hearts_answers_self_all" ON public.tribal_hearts_answers FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "hearts_matches_view_self" ON public.tribal_hearts_matches FOR SELECT USING (auth.uid() = member_a_id OR auth.uid() = member_b_id);
CREATE POLICY "hearts_matches_update_self" ON public.tribal_hearts_matches FOR UPDATE USING (auth.uid() = member_a_id OR auth.uid() = member_b_id);

CREATE POLICY "hearts_blocks_self_all" ON public.tribal_hearts_blocks FOR ALL USING (auth.uid() = blocker_id) WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "hearts_safety_admin_select" ON public.tribal_hearts_safety_flags FOR SELECT USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'gosat'::app_role)
);