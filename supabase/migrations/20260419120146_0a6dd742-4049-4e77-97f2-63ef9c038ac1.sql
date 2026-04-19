-- ============================================================
-- LINUX OPEN SOURCE FAMILY — Phase 1 Backbone
-- ============================================================

-- 1. Agent registry (per-member agent state)
CREATE TABLE public.linux_family_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  agent_name TEXT NOT NULL, -- 'gentoo' | 'tux' | 'ubuntu' | 'kali' | 'fedora' | 'debian' | 'arch' | 'mint'
  enabled BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'idle', -- 'idle' | 'working' | 'waiting'
  persona_overrides JSONB DEFAULT '{}'::jsonb,
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, agent_name)
);

-- 2. Long-term memory (per agent + per seed)
CREATE TABLE public.linux_family_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  agent_name TEXT NOT NULL,
  seed_id UUID, -- nullable for global memory
  memory_key TEXT NOT NULL,
  memory_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_lfm_lookup ON public.linux_family_memory (user_id, agent_name, seed_id);

-- 3. Task queue
CREATE TABLE public.linux_family_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  agent_name TEXT NOT NULL,
  seed_id UUID,
  task_type TEXT NOT NULL, -- 'generate_post' | 'generate_image' | 'send_message' | 'make_call' | 'build_report' | etc.
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'queued', -- 'queued' | 'running' | 'done' | 'failed'
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
CREATE INDEX idx_lft_status ON public.linux_family_tasks (status, created_at);
CREATE INDEX idx_lft_user ON public.linux_family_tasks (user_id, created_at DESC);

-- 4. Proactive suggestions
CREATE TABLE public.linux_family_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  agent_name TEXT NOT NULL,
  seed_id UUID,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  suggestion_type TEXT NOT NULL, -- 'create_videos' | 'connect_social' | 'send_collab' | 'follow_up_calls' | etc.
  proposed_action JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'declined' | 'snoozed' | 'expired'
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_lfs_pending ON public.linux_family_suggestions (user_id, status, created_at DESC);

-- 5. Activity log (live feed)
CREATE TABLE public.linux_family_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  agent_name TEXT NOT NULL,
  seed_id UUID,
  activity_type TEXT NOT NULL, -- 'task_started' | 'task_completed' | 'suggestion_created' | 'message_sent' | etc.
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_lfal_user_time ON public.linux_family_activity_log (user_id, created_at DESC);

-- 6. Bestowal reports
CREATE TABLE public.bestowal_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  seed_id UUID,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'weekly', -- 'weekly' | 'monthly' | 'on_demand'
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  pdf_url TEXT,
  html_snapshot TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_br_user ON public.bestowal_reports (user_id, created_at DESC);

-- 7. Daily seed analytics rollup
CREATE TABLE public.seed_analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  seed_id UUID NOT NULL,
  metric_date DATE NOT NULL,
  views INT NOT NULL DEFAULT 0,
  reach INT NOT NULL DEFAULT 0,
  clicks INT NOT NULL DEFAULT 0,
  messages INT NOT NULL DEFAULT 0,
  calls INT NOT NULL DEFAULT 0,
  bestowals_count INT NOT NULL DEFAULT 0,
  bestowals_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (seed_id, metric_date)
);
CREATE INDEX idx_sad_user_date ON public.seed_analytics_daily (user_id, metric_date DESC);

-- 8. Social connections (encrypted token references)
CREATE TABLE public.linux_family_social_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  platform TEXT NOT NULL, -- 'instagram' | 'facebook' | 'tiktok' | 'whatsapp'
  account_handle TEXT,
  is_connected BOOLEAN NOT NULL DEFAULT false,
  secret_ref TEXT, -- name of vault secret holding the token
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, platform)
);

-- 9. Outbound messages log (Debian's record of bestowar broadcasts)
CREATE TABLE public.linux_family_outbound_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  agent_name TEXT NOT NULL DEFAULT 'debian',
  seed_id UUID,
  recipient_user_id UUID,
  recipient_room_id UUID,
  channel TEXT NOT NULL DEFAULT 'chatapp', -- 'chatapp' | 'instagram' | 'whatsapp' | etc.
  message_body TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'collab_offer', -- 'collab_offer' | 'follow_up' | 'broadcast'
  status TEXT NOT NULL DEFAULT 'sent', -- 'sent' | 'failed' | 'replied'
  reply_text TEXT,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_lfom_user ON public.linux_family_outbound_messages (user_id, created_at DESC);

-- 10. Call log (Arch's record of Jitsi calls)
CREATE TABLE public.linux_family_call_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  seed_id UUID,
  direction TEXT NOT NULL, -- 'incoming' | 'outgoing'
  call_type TEXT NOT NULL DEFAULT 'video', -- 'audio' | 'video'
  counterparty_user_id UUID,
  jitsi_room TEXT,
  duration_seconds INT,
  transcript TEXT,
  outcome TEXT, -- 'connected' | 'no_answer' | 'declined' | 'completed'
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_lfcl_user ON public.linux_family_call_log (user_id, created_at DESC);

-- ============================================================
-- RLS — every table user-scoped
-- ============================================================
ALTER TABLE public.linux_family_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linux_family_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linux_family_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linux_family_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linux_family_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bestowal_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seed_analytics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linux_family_social_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linux_family_outbound_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linux_family_call_log ENABLE ROW LEVEL SECURITY;

-- Generic owner policies
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'linux_family_agents','linux_family_memory','linux_family_tasks',
    'linux_family_suggestions','linux_family_activity_log','bestowal_reports',
    'seed_analytics_daily','linux_family_social_connections',
    'linux_family_outbound_messages','linux_family_call_log'
  ])
  LOOP
    EXECUTE format('CREATE POLICY "owner_select" ON public.%I FOR SELECT USING (auth.uid() = user_id)', t);
    EXECUTE format('CREATE POLICY "owner_insert" ON public.%I FOR INSERT WITH CHECK (auth.uid() = user_id)', t);
    EXECUTE format('CREATE POLICY "owner_update" ON public.%I FOR UPDATE USING (auth.uid() = user_id)', t);
    EXECUTE format('CREATE POLICY "owner_delete" ON public.%I FOR DELETE USING (auth.uid() = user_id)', t);
  END LOOP;
END$$;

-- Service role bypass for edge functions (orchestrator runs as service role)
CREATE POLICY "service_role_all_tasks" ON public.linux_family_tasks FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all_activity" ON public.linux_family_activity_log FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all_suggestions" ON public.linux_family_suggestions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all_memory" ON public.linux_family_memory FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all_reports" ON public.bestowal_reports FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all_analytics" ON public.seed_analytics_daily FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all_outbound" ON public.linux_family_outbound_messages FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all_calls" ON public.linux_family_call_log FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all_agents" ON public.linux_family_agents FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- TRIGGERS — updated_at maintenance
-- ============================================================
CREATE TRIGGER trg_lfa_updated BEFORE UPDATE ON public.linux_family_agents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_lfm_updated BEFORE UPDATE ON public.linux_family_memory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sad_updated BEFORE UPDATE ON public.seed_analytics_daily
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_lfsc_updated BEFORE UPDATE ON public.linux_family_social_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- HELPER: ensure default agent roster exists for a user
-- ============================================================
CREATE OR REPLACE FUNCTION public.ensure_linux_family_agents(_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.linux_family_agents (user_id, agent_name)
  SELECT _user_id, name FROM unnest(ARRAY[
    'gentoo','tux','ubuntu','kali','fedora','debian','arch','mint'
  ]) AS name
  ON CONFLICT (user_id, agent_name) DO NOTHING;
END;
$$;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.linux_family_activity_log;
ALTER PUBLICATION supabase_realtime ADD TABLE public.linux_family_suggestions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.linux_family_tasks;