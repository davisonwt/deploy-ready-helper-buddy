-- P0-5 Phase D (2026-09-07): read-only. The live RLS policies on
-- public.orchards, so the Uplift creation gate is designed against reality.
-- Run: npx supabase db query --linked -f scripts/studio/phase-d-orchards-policies.sql
SELECT jsonb_agg(jsonb_build_object('name', policyname, 'cmd', cmd, 'roles', roles, 'using', qual, 'check', with_check) ORDER BY cmd, policyname) AS orchards_policies
  FROM pg_policies WHERE schemaname = 'public' AND tablename = 'orchards';
