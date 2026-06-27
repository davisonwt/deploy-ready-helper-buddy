-- Finding #1: hide radio_live_sessions.session_token from anon/authenticated.
-- Frontend never selects session_token directly; privileged access goes through
-- the existing get_session_token_secure() SECURITY DEFINER function.
REVOKE SELECT (session_token) ON public.radio_live_sessions FROM anon, authenticated, PUBLIC;
-- service_role keeps full access (GRANT ALL already in place).