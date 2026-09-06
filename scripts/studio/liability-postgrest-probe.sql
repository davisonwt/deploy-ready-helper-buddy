-- Temporary probe used on 2026-09-06 to reproduce and verify the
-- liability_snapshot() failure through PostgREST (whose connection preloads
-- safeupdate, unlike the Management API path). Creates a SECURITY DEFINER
-- wrapper anyone can call, so the REAL function runs under PostgREST's
-- session settings. Call it once via REST, then run the DROP below.
--
--   create:  npx supabase db query --linked -f scripts/studio/liability-postgrest-probe.sql
--   call:    curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/_liability_probe" -H "apikey: <anon>" -H "Authorization: Bearer <anon>" -H "Content-Type: application/json" -d '{}'
--   drop:    DROP FUNCTION public._liability_probe();   (also at the bottom of this file, commented)

CREATE OR REPLACE FUNCTION public._liability_probe()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $probe$
DECLARE
  v jsonb;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
  v := public.liability_snapshot('live');
  RETURN 'ok: liabilities_total=' || (v ->> 'liabilities_total');
EXCEPTION WHEN OTHERS THEN
  RETURN 'error ' || SQLSTATE || ': ' || SQLERRM;
END;
$probe$;
GRANT EXECUTE ON FUNCTION public._liability_probe() TO anon, authenticated, service_role;

-- DROP FUNCTION public._liability_probe();
