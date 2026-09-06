-- Sentinel cron_health timed out because cron.job_run_details had 325k
-- rows since January (pg_cron never prunes it). Keep 7 days. Safe to
-- re-run; the migration that ships with this adds a daily cleanup job.
-- Run: npx supabase db query --linked -f scripts/studio/cron-history-purge.sql
DELETE FROM cron.job_run_details WHERE start_time < now() - interval '7 days';
SELECT count(*) AS rows_left, min(start_time) AS oldest FROM cron.job_run_details;
