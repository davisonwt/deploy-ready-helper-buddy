-- Gosat/admin unblock for a member caught by a rate limit (2026-09-06).
-- The limiter (check_rate_limit_enhanced) counts rows in billing_access_logs
-- with access_type = 'rate_limit:<type>:<user id>'. Deleting a member's rows
-- for one type resets that bucket. Only the two member-facing buckets can be
-- cleared; the call is logged as a security event with the caller.
--
-- Prefer: npx supabase db query --linked -f <this file>

CREATE OR REPLACE FUNCTION public.clear_member_rate_limit(_user_id uuid, _limit_type text DEFAULT 'checkout')
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $cmrl_1$
DECLARE
  v_deleted integer;
BEGIN
  IF NOT public.is_admin_or_gosat(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _limit_type NOT IN ('checkout', 'payment') THEN
    RAISE EXCEPTION 'unsupported_limit_type: %', _limit_type;
  END IF;

  DELETE FROM public.billing_access_logs
   WHERE access_type = 'rate_limit:' || _limit_type || ':' || _user_id::text;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  PERFORM public.log_security_event_enhanced(
    'rate_limit_cleared', _user_id,
    jsonb_build_object('limit_type', _limit_type, 'rows_deleted', v_deleted, 'cleared_by', auth.uid()),
    inet_client_addr(), 'info');
  RETURN v_deleted;
END;
$cmrl_1$;

REVOKE ALL ON FUNCTION public.clear_member_rate_limit(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clear_member_rate_limit(uuid, text) TO authenticated, service_role;

-- proof: exists, and a non-gosat is refused (act as test account A)
SELECT set_config('request.jwt.claims', json_build_object('sub', 'de22c876-d477-4a5e-81a2-cd22091ce125', 'role', 'authenticated')::text, true);
DO $cmrl_2$
BEGIN
  PERFORM public.clear_member_rate_limit('de22c876-d477-4a5e-81a2-cd22091ce125', 'checkout');
  RAISE EXCEPTION 'proof_failed: a non-gosat was allowed to clear a rate limit';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'forbidden' THEN RAISE; END IF;
END;
$cmrl_2$;
SELECT to_regprocedure('public.clear_member_rate_limit(uuid, text)')::text AS fn, 'non-gosat refused' AS proof;
