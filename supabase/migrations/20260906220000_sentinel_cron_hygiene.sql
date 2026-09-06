-- Sentinel / cron hygiene (2026-09-06). Found while chasing "last heartbeat
-- 19h ago, 2 critical" on /admin:
--   1. get_cron_job_health() scanned cron.job_run_details, which pg_cron
--      never prunes (325k rows since January): the sentinel cron_health
--      check hit the 8 s statement timeout on every run since 2026-09-05.
--      The function now reads a bounded window with one ordered pass, and a
--      daily job keeps 7 days of history (an initial purge was run by hand:
--      scripts/studio/cron-history-purge.sql).
--   2. 'grove-flush-queue-every-minute' posted with no credentials at all
--      and got 401 every minute (predates the key rotation). Routed through
--      invoke_money_job like every other job (CRON_SECRET bearer).
--   3. 'generate-364ttt-weekly-playlist' carried a hard-coded legacy JWT
--      (dead since legacy API keys were disabled today) and targets a
--      function that was retired to archive/ghost-functions. Unscheduled.
-- No bare UPDATE/DELETE without WHERE.

-- 1. Bounded cron health ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_cron_job_health(job_names text[])
RETURNS TABLE(jobname text, schedule text, last_start timestamptz, last_status text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, cron
STABLE
AS $sch_1$
  WITH recent AS (
    SELECT DISTINCT ON (d.jobid) d.jobid, d.start_time, d.status
      FROM cron.job_run_details d
     WHERE d.start_time > now() - interval '8 days'
     ORDER BY d.jobid, d.start_time DESC
  )
  SELECT j.jobname, j.schedule, r.start_time, r.status
    FROM cron.job j
    LEFT JOIN recent r ON r.jobid = j.jobid
   WHERE j.jobname = ANY(job_names);
$sch_1$;
REVOKE ALL ON FUNCTION public.get_cron_job_health(text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_cron_job_health(text[]) TO service_role;

-- An index for the bounded scan; pg_cron's table may not accept one from
-- this role on every plan, so a failure is a notice, not an error.
DO $sch_2$
BEGIN
  CREATE INDEX IF NOT EXISTS job_run_details_jobid_start_idx ON cron.job_run_details (jobid, start_time DESC);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'cron.job_run_details index not created: %', SQLERRM;
END;
$sch_2$;

-- 2. Keep 7 days of cron history ---------------------------------------------
CREATE OR REPLACE FUNCTION public.prune_cron_history(_keep interval DEFAULT interval '7 days')
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $sch_3$
DECLARE
  v_n integer;
BEGIN
  DELETE FROM cron.job_run_details WHERE start_time < now() - _keep;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$sch_3$;
REVOKE ALL ON FUNCTION public.prune_cron_history(interval) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prune_cron_history(interval) TO postgres, service_role;

SELECT cron.schedule(
  'cron-history-cleanup',
  '10 4 * * *',
  $sch_4$ SELECT public.prune_cron_history(); $sch_4$
);

-- 3. grove-flush-queue: same auth path as every other job ----------------------
SELECT cron.schedule(
  'grove-flush-queue-every-minute',
  '* * * * *',
  $sch_5$ SELECT public.invoke_money_job('grove-flush-queue'); $sch_5$
);

-- 4. Retired function, dead key: unschedule ------------------------------------
DO $sch_6$
DECLARE
  v_id bigint;
BEGIN
  SELECT jobid INTO v_id FROM cron.job WHERE jobname = 'generate-364ttt-weekly-playlist';
  IF v_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_id);   -- by id: unschedule(name) left it in place on 2026-09-06
  END IF;
END;
$sch_6$;
