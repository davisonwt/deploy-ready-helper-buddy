-- P0-5 Phase C2 devnet proof, step 1: cancel the Phase A test orchard as a
-- gosat. COMMITS. Its one held devnet pocket (holding 2df2ff33, 10.00 USDC,
-- payer EbSUvuE8...) becomes a queued refund for orchard-refund-worker.
-- Run only with SOLANA_CLUSTER=devnet, so the worker can send it.
-- Run: npx supabase db query --linked -f scripts/studio/phase-c-devnet-cancel.sql
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_id FROM public.user_roles WHERE role = 'gosat' ORDER BY user_id LIMIT 1), 'role', 'authenticated')::text, true);
SELECT public.orchard_cancel('55f4e02e-32fe-4013-aa7b-4eff6da77d37',
  'Phase C2 devnet proof 2026-09-06: cancel the Phase A test orchard and refund its one devnet pocket to the payer') AS cancel_result;
