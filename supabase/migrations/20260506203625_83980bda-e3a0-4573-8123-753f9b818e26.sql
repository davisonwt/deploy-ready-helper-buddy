-- ──────────────────────────────────────────────────────────
-- Phase 1: Extend companions with `layer` + plant 11 new agents
-- ──────────────────────────────────────────────────────────
ALTER TABLE public.s2g_companions
  ADD COLUMN IF NOT EXISTS layer TEXT NOT NULL DEFAULT 'infrastructure'
    CHECK (layer IN ('narrative','infrastructure','live','harvest','orchestration'));

-- Reclassify existing 10 agents into their grove layers
UPDATE public.s2g_companions SET layer = CASE slug
  WHEN 'maple'    THEN 'narrative'        -- StorySower
  WHEN 'linden'   THEN 'infrastructure'
  WHEN 'cypress'  THEN 'infrastructure'
  WHEN 'willow'   THEN 'infrastructure'
  WHEN 'birch'    THEN 'infrastructure'
  WHEN 'elm'      THEN 'infrastructure'
  WHEN 'hickory'  THEN 'infrastructure'
  WHEN 'beech'    THEN 'infrastructure'
  WHEN 'alder'    THEN 'infrastructure'
  WHEN 'hawthorn' THEN 'infrastructure'
  ELSE layer END
WHERE slug IN ('maple','linden','cypress','willow','birch','elm','hickory','beech','alder','hawthorn');

-- Plant the 11 missing agents
INSERT INTO public.s2g_companions (slug, name, title, emoji, summary, category, default_model, sort_order, layer) VALUES
  ('acorn',         'Acorn',         'The Seed Intake',         '🌰', 'Welcomes first-time sowers and gently interviews them, turning raw produce or skills into a seed with story.',           'narrative',     'google/gemini-3-flash-preview', 11, 'narrative'),
  ('root',          'Root',          'The Identity Forger',     '🪵', 'Listens beneath the surface and shapes who you are — your place, your history, your dreams — into a soulful identity profile.', 'narrative',  'google/gemini-2.5-pro',         12, 'narrative'),
  ('bud',           'Bud',           'The Promise Designer',    '🌷', 'Crafts bestowal tiers with emotional hooks — what tribe members receive when they support your seed.',                'narrative',     'google/gemini-2.5-pro',         13, 'narrative'),
  ('hive',          'Hive',          'The Room Conductor',      '🐝', 'Conducts the live room — pre-warms the audience, suggests when to switch between Radio, Classroom, Skilldrop, Training.', 'live',         'google/gemini-3-flash-preview', 14, 'live'),
  ('nectar',        'Nectar',        'The Engagement Alchemist','🍯', 'Reads the room''s energy and gently injects polls, flash bestowals and Q&A prompts so dead air never settles.',         'live',         'google/gemini-2.5-pro',         15, 'live'),
  ('petal',         'Petal',         'The Audience Matcher',    '🌸', 'Quietly picks who should be invited to which seed''s live room, matching tribe members to stories they''ll resonate with.', 'live',     'google/gemini-2.5-pro',         16, 'live'),
  ('grain',         'Grain',         'The Follow-Up Forger',    '🌾', 'After every harvest, writes warm personal thank-yous and impact reports to every bestower in the tribe.',             'harvest',       'google/gemini-3-flash-preview', 17, 'harvest'),
  ('sheaf',         'Sheaf',         'The Relationship Gardener','🌻', 'Tends bonds between sowers and bestowers — recognises returning supporters and grows them from new soil into deep roots.', 'harvest',     'google/gemini-3-flash-preview', 18, 'harvest'),
  ('thresh',        'Thresh',        'The Feedback Distiller',  '🌿', 'Winnows each session''s data into 3 honest insights and 1 next sacred step for the sower.',                          'harvest',       'google/gemini-2.5-pro',         19, 'harvest'),
  ('groundskeeper', 'Groundskeeper', 'The Grove Steward',       '🌳', 'The one voice that knows the whole grove. Ask anything — the Steward routes you to the right tree.',                 'orchestration', 'google/gemini-2.5-pro',         20, 'orchestration')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  title = EXCLUDED.title,
  emoji = EXCLUDED.emoji,
  summary = EXCLUDED.summary,
  category = EXCLUDED.category,
  default_model = EXCLUDED.default_model,
  sort_order = EXCLUDED.sort_order,
  layer = EXCLUDED.layer;

-- Tier entitlements for the new agents
INSERT INTO public.s2g_companion_entitlements (companion_slug, tier, mode, monthly_quota, notes) VALUES
 -- Acorn: open to all sowers, more generous higher up
 ('acorn','sower','basic',5,'5 seed intakes / month'),
 ('acorn','keeper','standard',20,'20 seed intakes / month'),
 ('acorn','ambassador','full',NULL,'Unlimited seed intakes'),
 ('acorn','council','full_plus',NULL,'Unlimited seed intakes'),
 -- Root: identity work is for those investing
 ('root','sower','none',0,'Not yet'),
 ('root','keeper','basic',5,'5 identity profiles'),
 ('root','ambassador','full',NULL,'Unlimited'),
 ('root','council','full_plus',NULL,'Unlimited'),
 -- Bud: bestowal tier design
 ('bud','sower','none',0,'Not yet'),
 ('bud','keeper','basic',5,'5 tier sets'),
 ('bud','ambassador','full',NULL,'Unlimited'),
 ('bud','council','full_plus',NULL,'Unlimited'),
 -- Hive: room conducting
 ('hive','sower','none',0,'Not yet'),
 ('hive','keeper','none',0,'Not yet'),
 ('hive','ambassador','full',NULL,'Unlimited room conducting'),
 ('hive','council','full_plus',NULL,'Unlimited room conducting'),
 -- Nectar: engagement alchemy
 ('nectar','sower','none',0,'Not yet'),
 ('nectar','keeper','none',0,'Not yet'),
 ('nectar','ambassador','full',NULL,'Unlimited'),
 ('nectar','council','full_plus',NULL,'Unlimited'),
 -- Petal: audience matching
 ('petal','sower','none',0,'Not yet'),
 ('petal','keeper','none',0,'Not yet'),
 ('petal','ambassador','full',NULL,'Unlimited matches'),
 ('petal','council','full_plus',NULL,'Unlimited matches'),
 -- Grain: thank-yous (auto-fired post-session)
 ('grain','sower','basic',NULL,'Auto thank-yous'),
 ('grain','keeper','standard',NULL,'Auto thank-yous'),
 ('grain','ambassador','full',NULL,'Auto + custom thank-yous'),
 ('grain','council','full_plus',NULL,'Auto + custom thank-yous'),
 -- Sheaf: relationship gardening (auto)
 ('sheaf','sower','none',0,'Not yet'),
 ('sheaf','keeper','basic',NULL,'Basic relationship tier'),
 ('sheaf','ambassador','full',NULL,'Full relationship gardening'),
 ('sheaf','council','full_plus',NULL,'Full relationship gardening'),
 -- Thresh: coaching insights
 ('thresh','sower','none',0,'Not yet'),
 ('thresh','keeper','basic',4,'Basic session reports'),
 ('thresh','ambassador','full',NULL,'Full insights'),
 ('thresh','council','full_plus',NULL,'Full insights + simulations'),
 -- Groundskeeper: orchestrator, free for everyone
 ('groundskeeper','sower','basic',NULL,'Always available'),
 ('groundskeeper','keeper','standard',NULL,'Always available'),
 ('groundskeeper','ambassador','full',NULL,'Always available'),
 ('groundskeeper','council','full_plus',NULL,'Always available')
ON CONFLICT (companion_slug, tier) DO UPDATE SET
  mode = EXCLUDED.mode,
  monthly_quota = EXCLUDED.monthly_quota,
  notes = EXCLUDED.notes;

-- ──────────────────────────────────────────────────────────
-- Phase 2: Harvest pipeline tables
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.grove_session_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_kind TEXT NOT NULL CHECK (session_kind IN ('radio','classroom','training','skilldrop','live_room','one_on_one','group')),
  session_id   UUID NOT NULL,
  sower_id     UUID NOT NULL,
  event_type   TEXT NOT NULL CHECK (event_type IN ('session_started','session_ended','recording_ready','bestowal_received','harvest_complete')),
  payload      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_grove_events_sower    ON public.grove_session_events(sower_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_grove_events_session  ON public.grove_session_events(session_id, event_type);

ALTER TABLE public.grove_session_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sower reads own session events"
  ON public.grove_session_events FOR SELECT TO authenticated
  USING (auth.uid() = sower_id);

CREATE TABLE IF NOT EXISTS public.grove_relationship_scores (
  bestower_id          UUID NOT NULL,
  sower_id             UUID NOT NULL,
  tier                 TEXT NOT NULL DEFAULT 'new'
    CHECK (tier IN ('new','returning','core','patron')),
  sessions_attended    INT  NOT NULL DEFAULT 0,
  total_bestowed       NUMERIC(20,4) NOT NULL DEFAULT 0,
  consecutive_support  INT  NOT NULL DEFAULT 0,
  last_session_at      TIMESTAMPTZ,
  marked_core_by_sower BOOLEAN NOT NULL DEFAULT false,
  notes                TEXT,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (bestower_id, sower_id)
);
CREATE INDEX IF NOT EXISTS idx_grove_scores_sower    ON public.grove_relationship_scores(sower_id, tier);
CREATE INDEX IF NOT EXISTS idx_grove_scores_bestower ON public.grove_relationship_scores(bestower_id);

ALTER TABLE public.grove_relationship_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sower reads own grove relationships"
  ON public.grove_relationship_scores FOR SELECT TO authenticated
  USING (auth.uid() = sower_id);
CREATE POLICY "Bestower reads own relationship rows"
  ON public.grove_relationship_scores FOR SELECT TO authenticated
  USING (auth.uid() = bestower_id);
-- writes happen via service role only (no insert/update/delete policies)

CREATE TABLE IF NOT EXISTS public.grove_message_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id    UUID NOT NULL,
  agent_slug      TEXT NOT NULL,
  body            TEXT NOT NULL,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  scheduled_for   TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at    TIMESTAMPTZ,
  delivery_error  TEXT,
  attempts        INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_grove_queue_due
  ON public.grove_message_queue(scheduled_for)
  WHERE delivered_at IS NULL;

ALTER TABLE public.grove_message_queue ENABLE ROW LEVEL SECURITY;
-- service-role only (no policies)

-- Helper: tier mapping
CREATE OR REPLACE FUNCTION public.s2g_relationship_tier_for_score(_sessions INT, _total NUMERIC, _marked_core BOOLEAN)
RETURNS TEXT
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _marked_core THEN 'patron'
    WHEN _total >= 1000 OR _sessions >= 12 THEN 'patron'
    WHEN _total >= 250  OR _sessions >= 5  THEN 'core'
    WHEN _sessions >= 2 THEN 'returning'
    ELSE 'new'
  END;
$$;
REVOKE ALL ON FUNCTION public.s2g_relationship_tier_for_score(INT, NUMERIC, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.s2g_relationship_tier_for_score(INT, NUMERIC, BOOLEAN) TO authenticated, service_role;