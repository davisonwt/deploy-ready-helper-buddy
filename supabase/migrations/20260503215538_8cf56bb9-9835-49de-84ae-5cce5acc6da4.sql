
-- Drop overly permissive policies (service_role bypasses RLS automatically)
DROP POLICY IF EXISTS "System can manage XP" ON public.user_xp;
DROP POLICY IF EXISTS "System can manage recordings" ON public.stream_recordings;
DROP POLICY IF EXISTS "System can update gift status" ON public.video_gifts;
DROP POLICY IF EXISTS "System can update gift payment status" ON public.clubhouse_gifts;
DROP POLICY IF EXISTS "Authenticated users can view messages" ON public.live_session_messages;
DROP POLICY IF EXISTS "System can insert badges" ON public.radio_dj_badges;
DROP POLICY IF EXISTS "System can manage referrals" ON public.referrals;

-- Restrict service_providers public listing to authenticated users only
DROP POLICY IF EXISTS "Anyone can view approved service providers" ON public.service_providers;
CREATE POLICY "Authenticated can view approved service providers"
  ON public.service_providers
  FOR SELECT
  TO authenticated
  USING (status = 'approved');

-- Scoped SELECT for live session messages: only participants of that session
CREATE POLICY "Participants can view session messages"
  ON public.live_session_messages
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = sender_id
    OR EXISTS (
      SELECT 1 FROM public.live_session_participants lsp
      WHERE lsp.session_id = live_session_messages.session_id
        AND lsp.user_id = auth.uid()
    )
  );

-- Allow users to manage their own XP row (insert/update self only)
CREATE POLICY "Users can insert own XP"
  ON public.user_xp
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own XP"
  ON public.user_xp
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow affiliates to insert their own referrals (service_role still bypasses)
CREATE POLICY "Affiliates can insert own referrals"
  ON public.referrals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    referrer_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid())
  );
