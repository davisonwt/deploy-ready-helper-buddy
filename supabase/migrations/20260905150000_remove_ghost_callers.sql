-- P0-3 part D (2026-09-05): remove every caller of the eight remaining
-- "ghost" edge functions before the functions themselves are deleted.
-- See archive/ghost-functions/INVENTORY.md.
--
-- Run this whole script once in the Studio SQL editor. Every unschedule is
-- wrapped so a job that is already gone does not abort the rest. The final
-- SELECT must come back with cron_jobs_remaining = [] and
-- trigger_functions_remaining = [] before the edge functions are deleted.

-- 1. Cron jobs -------------------------------------------------------------

DO $$
DECLARE
  j text;
BEGIN
  FOREACH j IN ARRAY ARRAY[
    'generate-364ttt-weekly-playlist',
    'poll-video-jobs-every-minute',
    'linux-family-hourly',
    'debian-collab-dm-dispatch',
    'debian-event-scheduler-weekly',
    'gentoo-mentorship-nightly',
    'weekly-elder-council-rotation'
  ] LOOP
    BEGIN
      PERFORM cron.unschedule(j);
      RAISE NOTICE 'unscheduled %', j;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '% : not scheduled, nothing to unschedule (%)', j, SQLERRM;
    END;
  END LOOP;
END;
$$;

-- 2. Triggers that call trigger-video-agent, then the function itself -----

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT tg.tgname, tg.tgrelid::regclass AS rel
    FROM pg_trigger tg
    JOIN pg_proc p ON p.oid = tg.tgfoid
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE NOT tg.tgisinternal
      AND n.nspname = 'public'
      AND p.proname = 'trigger_video_agent_on_insert'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %s', t.tgname, t.rel);
    RAISE NOTICE 'dropped trigger % on %', t.tgname, t.rel;
  END LOOP;
END;
$$;

DROP FUNCTION IF EXISTS public.trigger_video_agent_on_insert();

-- 3. Proof -----------------------------------------------------------------

SELECT json_build_object(
  'cron_jobs_remaining', (
    SELECT COALESCE(json_agg(jobname), '[]'::json) FROM cron.job
    WHERE jobname IN (
      'generate-364ttt-weekly-playlist',
      'poll-video-jobs-every-minute',
      'linux-family-hourly',
      'debian-collab-dm-dispatch',
      'debian-event-scheduler-weekly',
      'gentoo-mentorship-nightly',
      'weekly-elder-council-rotation'
    )
  ),
  'trigger_functions_remaining', (
    SELECT COALESCE(json_agg(n.nspname || '.' || p.proname), '[]'::json)
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'trigger_video_agent_on_insert'
  ),
  'triggers_remaining', (
    SELECT COALESCE(json_agg(tgname), '[]'::json)
    FROM pg_trigger tg JOIN pg_proc p ON p.oid = tg.tgfoid
    WHERE NOT tg.tgisinternal AND p.proname = 'trigger_video_agent_on_insert'
  )
) AS proof;
