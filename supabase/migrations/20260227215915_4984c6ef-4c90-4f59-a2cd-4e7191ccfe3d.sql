
-- ============================================================
-- Sprint 1: Story Whisperer Foundation Migration
-- All 8 steps in a single atomic migration
-- FK correction: sower_id → profiles(user_id), NOT profiles(id)
-- ============================================================

-- ──────────────────────────────────────────────
-- STEP 1: Add AI columns to chat_messages
-- ──────────────────────────────────────────────
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS intent_tags TEXT[],
  ADD COLUMN IF NOT EXISTS emotional_tone TEXT,
  ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS immutable_hash TEXT;

-- ──────────────────────────────────────────────
-- STEP 2: Enable pgvector + embedding column
-- ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS embedding vector(768);

-- IVFFlat index for similarity search (lists=100 for scaling)
CREATE INDEX IF NOT EXISTS idx_chat_messages_embedding
  ON public.chat_messages
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ──────────────────────────────────────────────
-- STEP 3: Create sower_stories
-- FK → profiles(user_id) so sower_id = auth.uid()
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sower_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sower_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  story_type TEXT DEFAULT 'testimony',
  media_urls TEXT[],
  tags TEXT[],
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sower_stories ENABLE ROW LEVEL SECURITY;

-- Sowers can manage their own stories
CREATE POLICY "sower_stories_own_select" ON public.sower_stories
  FOR SELECT TO authenticated
  USING (sower_id = auth.uid());

CREATE POLICY "sower_stories_own_insert" ON public.sower_stories
  FOR INSERT TO authenticated
  WITH CHECK (sower_id = auth.uid());

CREATE POLICY "sower_stories_own_update" ON public.sower_stories
  FOR UPDATE TO authenticated
  USING (sower_id = auth.uid());

CREATE POLICY "sower_stories_own_delete" ON public.sower_stories
  FOR DELETE TO authenticated
  USING (sower_id = auth.uid());

-- GoSAT and admin can read all stories
CREATE POLICY "sower_stories_gosat_read" ON public.sower_stories
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'gosat') OR public.has_role(auth.uid(), 'admin'));

-- Published stories are visible to all authenticated users
CREATE POLICY "sower_stories_published_read" ON public.sower_stories
  FOR SELECT TO authenticated
  USING (is_published = true);

-- ──────────────────────────────────────────────
-- STEP 4: Create ai_generated_content
-- FK → profiles(user_id) so sower_id = auth.uid()
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_generated_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sower_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  content_type TEXT NOT NULL DEFAULT 'script',
  title TEXT NOT NULL,
  content TEXT,
  prompt_used TEXT,
  model_version TEXT,
  tts_provider TEXT,
  tts_voice_id TEXT,
  audio_url TEXT,
  metadata JSONB DEFAULT '{}',
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_generated_content ENABLE ROW LEVEL SECURITY;

-- Sowers can manage their own AI content
CREATE POLICY "ai_content_own_select" ON public.ai_generated_content
  FOR SELECT TO authenticated
  USING (sower_id = auth.uid());

CREATE POLICY "ai_content_own_insert" ON public.ai_generated_content
  FOR INSERT TO authenticated
  WITH CHECK (sower_id = auth.uid());

CREATE POLICY "ai_content_own_update" ON public.ai_generated_content
  FOR UPDATE TO authenticated
  USING (sower_id = auth.uid());

CREATE POLICY "ai_content_own_delete" ON public.ai_generated_content
  FOR DELETE TO authenticated
  USING (sower_id = auth.uid());

-- GoSAT and admin can read all AI content
CREATE POLICY "ai_content_gosat_read" ON public.ai_generated_content
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'gosat') OR public.has_role(auth.uid(), 'admin'));

-- ──────────────────────────────────────────────
-- STEP 5: Create arweave_exports
-- FK → chat_rooms(id)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.arweave_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  arweave_tx_id TEXT,
  export_status TEXT NOT NULL DEFAULT 'pending',
  message_count INTEGER DEFAULT 0,
  batch_start TIMESTAMPTZ,
  batch_end TIMESTAMPTZ,
  file_hash TEXT,
  file_size_bytes BIGINT,
  exported_by UUID REFERENCES public.profiles(user_id),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.arweave_exports ENABLE ROW LEVEL SECURITY;

-- Only GoSAT and admin can manage exports
CREATE POLICY "arweave_exports_gosat_select" ON public.arweave_exports
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'gosat') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "arweave_exports_gosat_insert" ON public.arweave_exports
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'gosat') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "arweave_exports_gosat_update" ON public.arweave_exports
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'gosat') OR public.has_role(auth.uid(), 'admin'));

-- ──────────────────────────────────────────────
-- STEP 6: Create registered_agents
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.registered_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT NOT NULL UNIQUE,
  agent_type TEXT NOT NULL DEFAULT 'whisperer',
  description TEXT,
  endpoint_url TEXT,
  api_key_hash TEXT,
  is_active BOOLEAN DEFAULT true,
  capabilities JSONB DEFAULT '[]',
  rate_limit_per_minute INTEGER DEFAULT 60,
  created_by UUID REFERENCES public.profiles(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.registered_agents ENABLE ROW LEVEL SECURITY;

-- All authenticated users can see active agents
CREATE POLICY "agents_authenticated_read" ON public.registered_agents
  FOR SELECT TO authenticated
  USING (is_active = true);

-- Only admin can manage agents
CREATE POLICY "agents_admin_insert" ON public.registered_agents
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "agents_admin_update" ON public.registered_agents
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "agents_admin_delete" ON public.registered_agents
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admin can also see inactive agents
CREATE POLICY "agents_admin_read_all" ON public.registered_agents
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ──────────────────────────────────────────────
-- STEP 7: Create gosat_insights + security definer
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gosat_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type TEXT NOT NULL DEFAULT 'behavioral',
  title TEXT NOT NULL,
  summary TEXT,
  details JSONB DEFAULT '{}',
  severity TEXT DEFAULT 'info',
  related_user_ids UUID[],
  related_room_ids UUID[],
  access_tier TEXT NOT NULL DEFAULT 'gosat',
  is_actionable BOOLEAN DEFAULT false,
  actioned_at TIMESTAMPTZ,
  actioned_by UUID REFERENCES public.profiles(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

ALTER TABLE public.gosat_insights ENABLE ROW LEVEL SECURITY;

-- GoSAT can read their tier
CREATE POLICY "gosat_insights_gosat_read" ON public.gosat_insights
  FOR SELECT TO authenticated
  USING (
    access_tier = 'gosat' AND public.has_role(auth.uid(), 'gosat')
  );

-- Admin can read all tiers
CREATE POLICY "gosat_insights_admin_read" ON public.gosat_insights
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Only system/admin can insert
CREATE POLICY "gosat_insights_admin_insert" ON public.gosat_insights
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin can update (action insights)
CREATE POLICY "gosat_insights_admin_update" ON public.gosat_insights
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gosat'));

-- Security definer function for safe detail retrieval
CREATE OR REPLACE FUNCTION public.get_gosat_insight_details(_insight_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT details
  FROM public.gosat_insights
  WHERE id = _insight_id
    AND (
      access_tier = 'public'
      OR (access_tier = 'gosat' AND public.has_role(auth.uid(), 'gosat'))
      OR public.has_role(auth.uid(), 'admin')
    );
$$;

-- ──────────────────────────────────────────────
-- STEP 8: Storage buckets + cleanup function
-- ──────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('voice-clones', 'voice-clones', false, 52428800, ARRAY['audio/wav', 'audio/mpeg', 'audio/ogg', 'audio/webm']),
  ('conversation-exports', 'conversation-exports', false, 104857600, ARRAY['application/json', 'application/zip', 'text/plain'])
ON CONFLICT (id) DO NOTHING;

-- RLS for voice-clones: users can manage their own folder
CREATE POLICY "voice_clones_own_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'voice-clones' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "voice_clones_own_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'voice-clones' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "voice_clones_own_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'voice-clones' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS for conversation-exports: gosat/admin only
CREATE POLICY "conv_exports_gosat_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'conversation-exports' AND (public.has_role(auth.uid(), 'gosat') OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY "conv_exports_gosat_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'conversation-exports' AND (public.has_role(auth.uid(), 'gosat') OR public.has_role(auth.uid(), 'admin')));

-- Cleanup function for inactive voice clones (>90 days)
CREATE OR REPLACE FUNCTION public.cleanup_inactive_voice_clones()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  DELETE FROM storage.objects
  WHERE bucket_id = 'voice-clones'
    AND updated_at < now() - interval '90 days'
  RETURNING 1 INTO deleted_count;

  RETURN COALESCE(deleted_count, 0);
END;
$$;
