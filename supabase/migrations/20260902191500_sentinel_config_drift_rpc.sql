-- Sentinel check #7 (config drift) needs pg_class/pg_trigger/
-- has_function_privilege introspection, none of which is reachable via
-- PostgREST's normal .from() client. One SECURITY DEFINER RPC returning
-- everything that check needs in one call, same cross-schema pattern as
-- get_cron_job_health.
CREATE OR REPLACE FUNCTION public.get_config_drift_signals(money_tables text[], expected_triggers text[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
STABLE
AS $$
DECLARE
  rls jsonb;
  triggers jsonb;
  bootstrap_admin_executable boolean;
BEGIN
  SELECT jsonb_object_agg(c.relname, c.relrowsecurity) INTO rls
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = ANY(money_tables);

  SELECT jsonb_object_agg(t.tgname, t.tgenabled <> 'D') INTO triggers
  FROM pg_trigger t
  WHERE t.tgname = ANY(expected_triggers) AND NOT t.tgisinternal;

  SELECT has_function_privilege('authenticated', 'public.grant_bootstrap_admin(text)', 'EXECUTE')
    INTO bootstrap_admin_executable;

  RETURN jsonb_build_object(
    'rls', coalesce(rls, '{}'::jsonb),
    'triggers', coalesce(triggers, '{}'::jsonb),
    'bootstrap_admin_executable_by_authenticated', bootstrap_admin_executable
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_config_drift_signals(text[], text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_config_drift_signals(text[], text[]) TO service_role;
