-- Study subscriptions for Scriptural Q&A SkillDrop access (5 USDT/month)
CREATE TABLE public.study_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active',
  amount numeric NOT NULL DEFAULT 5,
  currency text NOT NULL DEFAULT 'USDT',
  payment_method text,
  payment_reference text,
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  cancelled_at timestamptz,
  auto_renew boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_study_subs_user_status ON public.study_subscriptions(user_id, status);
CREATE INDEX idx_study_subs_expires ON public.study_subscriptions(expires_at);

-- Enable RLS
ALTER TABLE public.study_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscriptions
CREATE POLICY "Users can read own subscriptions"
  ON public.study_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Only system (service role) can insert/update subscriptions (via edge functions after payment)
CREATE POLICY "Service role manages subscriptions"
  ON public.study_subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);