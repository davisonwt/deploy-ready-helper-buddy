-- Fix RLS recursion on live_session_participants and adjust wallet_balances policies

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

-- 3) Wallet balances: Drop unique constraint (not just index) and add admin access
ALTER TABLE public.wallet_balances DROP CONSTRAINT IF EXISTS wallet_balances_wallet_address_key;

-- Broaden policies to allow service_role and admins to manage balances
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