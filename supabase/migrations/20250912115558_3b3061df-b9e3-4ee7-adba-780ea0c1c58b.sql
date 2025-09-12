-- Fix RLS recursion on live_session_participants and adjust wallet_balances policies/indexes

-- 1) Helper functions to avoid recursive RLS in policies
CREATE OR REPLACE FUNCTION public.user_is_active_in_session(_session_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.live_session_participants
    WHERE session_id = _session_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.user_is_host_or_cohost(_session_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.live_session_participants
    WHERE session_id = _session_id
      AND user_id = auth.uid()
      AND participant_type IN ('host','co_host')
  );
$$;

-- 2) Recreate problematic live_session_participants policies using the helper functions
DROP POLICY IF EXISTS "Hosts can manage participants" ON public.live_session_participants;
CREATE POLICY "Hosts can manage participants"
ON public.live_session_participants
FOR UPDATE
USING (public.user_is_host_or_cohost(live_session_participants.session_id));

DROP POLICY IF EXISTS "Participants can view session participants" ON public.live_session_participants;
CREATE POLICY "Participants can view session participants"
ON public.live_session_participants
FOR SELECT
USING (public.user_is_active_in_session(live_session_participants.session_id));

DROP POLICY IF EXISTS "Users can view live session participants safely" ON public.live_session_participants;
CREATE POLICY "Users can view live session participants safely"
ON public.live_session_participants
FOR SELECT
TO authenticated
USING ((user_id = auth.uid()) OR public.user_is_active_in_session(live_session_participants.session_id));

-- Keep existing policies:
--   "Public can view active live session participants" (SELECT USING status='active')
--   "Users can join sessions" (INSERT WITH CHECK auth.uid() = user_id)
--   "Users can leave sessions" (UPDATE USING auth.uid() = user_id)

-- 3) Wallet balances: allow admin/service updates and fix unique constraint collision
-- Drop the unique index on wallet_address so multiple users can track the same address independently
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname='public' AND indexname='wallet_balances_wallet_address_key'
  ) THEN
    EXECUTE 'DROP INDEX public.wallet_balances_wallet_address_key';
  END IF;
END $$;

-- Ensure composite unique index exists (already present, but create if missing for safety)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname='public' AND indexname='wallet_balances_user_wallet_unique'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX wallet_balances_user_wallet_unique ON public.wallet_balances (user_id, wallet_address)';
  END IF;
END $$;

-- Broaden policies to allow service_role and admins to manage balances (avoids RLS errors in admin flows)
DROP POLICY IF EXISTS "Service role can manage wallet balances" ON public.wallet_balances;
CREATE POLICY "Service role can manage wallet balances"
ON public.wallet_balances
FOR ALL
USING (current_setting('role', true) = 'service_role')
WITH CHECK (current_setting('role', true) = 'service_role');

DROP POLICY IF EXISTS "Admins can manage wallet balances" ON public.wallet_balances;
CREATE POLICY "Admins can manage wallet balances"
ON public.wallet_balances
FOR ALL
TO authenticated
USING (is_admin_or_gosat(auth.uid()))
WITH CHECK (is_admin_or_gosat(auth.uid()));