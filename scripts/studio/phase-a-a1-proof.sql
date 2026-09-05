-- P0-5 Phase A, Migration A1 proof (read-only). Run after
-- supabase/migrations/20260905200000_orchard_holdings.sql has been applied.
-- Same SELECT the migration ends with, kept here so it can be re-run any time.

SELECT json_build_object(
  'per_orchard', (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
      SELECT o.id, o.title, o.filled_pockets, f.target, f.held_total, f.pockets_total, f.pockets_held, f.funded
      FROM public.orchards o
      JOIN LATERAL public.orchard_funding_status(o.id) f ON true
      WHERE o.status = 'active' OR EXISTS (SELECT 1 FROM public.orchard_holdings h WHERE h.orchard_id = o.id)
      ORDER BY f.held_total DESC, o.created_at DESC
      LIMIT 50
    ) t
  ),
  'holdings', (SELECT json_build_object('rows', count(*), 'held_total', round(COALESCE(sum(gross_amount), 0), 2)) FROM public.orchard_holdings WHERE status = 'held'),
  'reversed_credits_per_sower', (
    SELECT COALESCE(json_agg(json_build_object('user_id', user_id, 'reversed', round(sum(amount), 2))), '[]'::json)
    FROM (SELECT user_id, sum(amount) AS amount FROM public.balance_ledger
          WHERE reference_table = 'orchard_holdings' AND kind = 'adjustment' GROUP BY user_id) s
  ),
  'orchard_bestowals_still_credited', (
    SELECT count(*) FROM public.bestowals WHERE orchard_id IS NOT NULL AND payout_status = 'credited_to_balance'
  ),
  'dead_trigger_fn_gone', NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_orchard_filled_pockets'),
  'recount_trigger_attached', EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'orchard_holdings_recount'),
  'rpc_grants', json_build_object(
    'funding_status_authenticated', has_function_privilege('authenticated', 'public.orchard_funding_status(uuid)', 'EXECUTE'),
    'apply_holding_authenticated',  has_function_privilege('authenticated', 'public.orchard_apply_holding(uuid)', 'EXECUTE'),
    'apply_holding_service_role',   has_function_privilege('service_role', 'public.orchard_apply_holding(uuid)', 'EXECUTE')
  )
) AS proof;
