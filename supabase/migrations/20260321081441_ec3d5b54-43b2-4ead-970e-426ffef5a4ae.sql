
-- Analytics Events table
CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text NOT NULL,
  event text NOT NULL,
  properties jsonb DEFAULT '{}'::jsonb,
  timestamp timestamptz NOT NULL DEFAULT now(),
  device_model text,
  os_version text,
  screen_width integer,
  screen_height integer,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  attribution_channel text,
  ip_country text,
  ip_city text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- User Consent table
CREATE TABLE public.user_consent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  analytics boolean NOT NULL DEFAULT false,
  marketing_attribution boolean NOT NULL DEFAULT false,
  precise_location boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_analytics_events_event ON public.analytics_events(event);
CREATE INDEX idx_analytics_events_user_timestamp ON public.analytics_events(user_id, timestamp);
CREATE INDEX idx_analytics_events_created_at ON public.analytics_events(created_at);

-- RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_consent ENABLE ROW LEVEL SECURITY;

-- analytics_events: anyone authenticated can insert their own events
CREATE POLICY "users_insert_own_events" ON public.analytics_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- analytics_events: anon can insert (anonymous tracking with null user_id)
CREATE POLICY "anon_insert_events" ON public.analytics_events
  FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);

-- analytics_events: users can read their own events
CREATE POLICY "users_select_own_events" ON public.analytics_events
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- analytics_events: admins/gosats can read all
CREATE POLICY "admins_select_all_events" ON public.analytics_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gosat'));

-- user_consent: users manage their own consent
CREATE POLICY "users_manage_own_consent" ON public.user_consent
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
