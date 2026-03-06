
-- SkillDrop Host Applications table
CREATE TABLE public.skilldrop_host_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  role_type text NOT NULL, -- sower, grower, driver, whisperer, service_provider
  expertise_area text NOT NULL,
  description text,
  experience_summary text,
  status text NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.skilldrop_host_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own application"
  ON public.skilldrop_host_applications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own application"
  ON public.skilldrop_host_applications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending application"
  ON public.skilldrop_host_applications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can read all applications"
  ON public.skilldrop_host_applications FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gosat'));

CREATE POLICY "Admins can update all applications"
  ON public.skilldrop_host_applications FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gosat'));

CREATE INDEX idx_skilldrop_host_apps_status ON public.skilldrop_host_applications(status);
CREATE INDEX idx_skilldrop_host_apps_user ON public.skilldrop_host_applications(user_id);

-- SkillDrop session subscriptions (per-host monthly access)
CREATE TABLE public.skilldrop_session_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  host_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 5.00,
  currency text NOT NULL DEFAULT 'USDT',
  status text NOT NULL DEFAULT 'active', -- active, cancelled, expired
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  cancelled_at timestamptz,
  payment_reference text,
  payment_method text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.skilldrop_session_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own subscriptions"
  ON public.skilldrop_session_subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = subscriber_id OR auth.uid() = host_id);

CREATE POLICY "Service role manages subscriptions"
  ON public.skilldrop_session_subscriptions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Admins can read all subscriptions"
  ON public.skilldrop_session_subscriptions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gosat'));

CREATE INDEX idx_skilldrop_subs_subscriber ON public.skilldrop_session_subscriptions(subscriber_id, status);
CREATE INDEX idx_skilldrop_subs_host ON public.skilldrop_session_subscriptions(host_id, status);
CREATE INDEX idx_skilldrop_subs_expires ON public.skilldrop_session_subscriptions(expires_at);

-- Add host_id to skilldrop_sessions to track who hosts
ALTER TABLE public.skilldrop_sessions ADD COLUMN IF NOT EXISTS host_approved boolean DEFAULT false;
ALTER TABLE public.skilldrop_sessions ADD COLUMN IF NOT EXISTS session_fee numeric DEFAULT 5.00;
ALTER TABLE public.skilldrop_sessions ADD COLUMN IF NOT EXISTS is_gosat_session boolean DEFAULT false;
