-- P0-5 Phase C2: fire the refund worker once through the cron path
-- (invoke_money_job -> CRON_SECRET -> orchard-refund-worker). With nothing
-- queued it must answer ok with claimed = 0. Read the answer with
-- scripts/studio/phase-c-refund-proof.sql a few seconds later.
-- Run: npx supabase db query --linked -f scripts/studio/phase-c-worker-invoke.sql
SELECT public.invoke_money_job('orchard-refund-worker') AS request_id, now() AS fired_at;
