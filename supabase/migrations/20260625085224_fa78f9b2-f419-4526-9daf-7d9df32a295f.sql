
-- 1. live_call_participants: restrict SELECT to participants in same session
DROP POLICY IF EXISTS "Users can view call participants" ON public.live_call_participants;
CREATE POLICY "Participants can view co-participants"
ON public.live_call_participants
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.live_call_participants me
    WHERE me.call_session_id = live_call_participants.call_session_id
      AND me.user_id = auth.uid()
      AND me.is_active = true
  )
);

-- 2. live_session_participants: drop overly broad authenticated read
DROP POLICY IF EXISTS "Authenticated users can view active participants" ON public.live_session_participants;

-- 3. premium_item_purchases: force pending on client insert; service_role finalizes
DROP POLICY IF EXISTS "Buyer inserts own purchases" ON public.premium_item_purchases;
DROP POLICY IF EXISTS "Users can insert their own purchases" ON public.premium_item_purchases;
CREATE POLICY "Buyer inserts pending purchase"
ON public.premium_item_purchases
FOR INSERT
TO authenticated
WITH CHECK (buyer_id = auth.uid() AND payment_status = 'pending');

CREATE POLICY "Service role manages purchases"
ON public.premium_item_purchases
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 4. premium_room_access: allow only free/pending on client insert
DROP POLICY IF EXISTS "Users can insert their own access" ON public.premium_room_access;
DROP POLICY IF EXISTS "Users insert own access" ON public.premium_room_access;
CREATE POLICY "User inserts free or pending access"
ON public.premium_room_access
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND payment_status IN ('free','pending'));

CREATE POLICY "Service role manages access"
ON public.premium_room_access
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 5. session_listeners: restrict discovery SELECT to authenticated
DROP POLICY IF EXISTS "Public can view session listeners for discovery" ON public.session_listeners;
CREATE POLICY "Authenticated can view active listeners"
ON public.session_listeners
FOR SELECT
TO authenticated
USING (is_active = true);
