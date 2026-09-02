-- Sentinel: hourly monitoring agent. Detects and reports only -- never
-- fixes anything itself. See sentinel.txt (the build spec) for the full
-- check list; this migration is the storage + cross-schema access it needs.

-- ── sentinel_events ──────────────────────────────────────────────────────
-- Both an ongoing-condition tracker (dedup on check_name+subject while
-- status='open') and a point-in-time log (checks that only ever fire once
-- per real occurrence, e.g. an avatar wipe or a new admin, just insert a
-- fresh row every time -- there's nothing to "resolve").
CREATE TABLE public.sentinel_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_name text NOT NULL,
  subject text,
  severity text NOT NULL CHECK (severity IN ('info', 'warn', 'critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
  message text NOT NULL,
  detail jsonb,
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  last_notified_at timestamptz,
  acknowledged_by uuid REFERENCES auth.users(id),
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Only one OPEN row per (check_name, subject) -- this is what makes the
-- "update last_seen, only re-notify after 24h or a severity rise" dedupe
-- rule work: a check queries for an existing open row before deciding
-- whether to insert a new one or update the existing one.
CREATE UNIQUE INDEX sentinel_events_open_unique
  ON public.sentinel_events (check_name, coalesce(subject, ''))
  WHERE status = 'open';

CREATE INDEX idx_sentinel_events_status ON public.sentinel_events (status, severity);

ALTER TABLE public.sentinel_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sentinel_events_gosat_select" ON public.sentinel_events
  FOR SELECT TO authenticated
  USING (public.is_admin_or_gosat(auth.uid()));

-- The only client-side write this table needs: the acknowledge button.
-- Scoped to open->acknowledged only, by a real gosat/admin, on their own
-- action -- a client can't resolve a condition itself (only the next
-- sentinel run, finding the condition gone, does that) and can't touch
-- severity/message/detail.
CREATE POLICY "sentinel_events_gosat_acknowledge" ON public.sentinel_events
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_gosat(auth.uid()) AND status = 'open')
  WITH CHECK (public.is_admin_or_gosat(auth.uid()) AND status = 'acknowledged');

-- No INSERT/DELETE policy for authenticated -- only sentinel itself
-- (service_role) creates or resolves a condition.

-- ── function_invocations ─────────────────────────────────────────────────
-- Fallback error log for check #4 ("edge function health"). Neither
-- function_edge_logs nor any other log/analytics table is reachable via
-- SQL from this project (confirmed empty information_schema search,
-- 2026-09-02), and the Management API's log-query endpoint was already
-- confirmed unreliable earlier this session (zero rows for functions with
-- known traffic) -- this is the lightweight, always-reachable substitute
-- the build spec asked for. Failure-only (not every invocation, per "keep
-- it light") -- gives a failure COUNT per function per window, not a true
-- error RATE (no total-invocation denominator exists anywhere reachable
-- either) -- sentinel's check says so explicitly rather than mislabeling
-- a count as a rate.
CREATE TABLE public.function_invocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_function_invocations_name_time
  ON public.function_invocations (function_name, created_at DESC);

ALTER TABLE public.function_invocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "function_invocations_gosat_select" ON public.function_invocations
  FOR SELECT TO authenticated
  USING (public.is_admin_or_gosat(auth.uid()));

-- No INSERT policy for authenticated -- every writer is a service-role
-- edge function logging its own failure.

-- ── sentinel_avatar_watch ────────────────────────────────────────────────
-- Internal bookkeeping only, no client/UI ever reads this directly. Check
-- #8 ("avatar_url went non-null -> null") needs to know the PREVIOUS
-- value to detect a transition -- profiles.updated_at alone can't say
-- what changed FROM. No audit trail exists for profiles.avatar_url (the
-- 2026-09-02 avatar-wipe investigation confirmed this), so sentinel has to
-- build its own going forward: one row per profile, upserted every run,
-- diffed against the previous run. Stores a hash + length, not the full
-- value (can be 30KB+ base64) -- enough to know something real was lost
-- and roughly what shape it was, without duplicating potentially large
-- blobs on every hourly run.
CREATE TABLE public.sentinel_avatar_watch (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  avatar_present boolean NOT NULL,
  avatar_length integer,
  avatar_hash text,
  checked_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sentinel_avatar_watch ENABLE ROW LEVEL SECURITY;
-- No policies at all -- service_role only, same lockdown as
-- paypal_reconcile_misses. Nothing here is ever meant for a client.

-- ── cron job health, cross-schema access ─────────────────────────────────
-- cron.job/cron.job_run_details are not exposed to PostgREST (confirmed:
-- neither appears in information_schema for any exposed schema), so an
-- edge function's supabase-js client can't query them directly. This
-- SECURITY DEFINER wrapper is the same pattern already used throughout
-- this schema for exactly this kind of cross-schema need.
CREATE OR REPLACE FUNCTION public.get_cron_job_health(job_names text[])
RETURNS TABLE(jobname text, schedule text, last_start timestamptz, last_status text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, cron
STABLE
AS $$
  SELECT
    j.jobname,
    j.schedule,
    (SELECT d.start_time FROM cron.job_run_details d WHERE d.jobid = j.jobid ORDER BY d.start_time DESC LIMIT 1) AS last_start,
    (SELECT d.status FROM cron.job_run_details d WHERE d.jobid = j.jobid ORDER BY d.start_time DESC LIMIT 1) AS last_status
  FROM cron.job j
  WHERE j.jobname = ANY(job_names);
$$;

REVOKE ALL ON FUNCTION public.get_cron_job_health(text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_cron_job_health(text[]) TO service_role;
