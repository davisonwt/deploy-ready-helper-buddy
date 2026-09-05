-- P0-5 Phase A, Step 0: live orchard money counts (read-only).
-- Run in Studio, download the CSV to Downloads.
-- Per orchard: target inputs (total_pockets, pocket_price), pockets paid,
-- money currently in the parked S2G Balance ledger vs the payout queue,
-- and the rails used. Plus pending unpaid rows and total orchard ledger credits.

SELECT json_build_object(
  'orchards_with_money', (
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.received_total DESC), '[]'::json) FROM (
      SELECT o.id, o.title, o.status, o.orchard_type, o.user_id AS sower_user_id,
             o.pocket_price, o.total_pockets, o.intended_pockets, o.filled_pockets,
             count(b.id)                                   AS completed_bestowals,
             sum(b.pockets_count)                          AS pockets_paid,
             round(sum(b.base_amount)::numeric, 2)         AS received_gross,
             round(sum(b.buyer_total_amount)::numeric, 2)  AS received_total,
             round(sum((b.distribution_data->>'sower_amount')::numeric), 2)         AS sower_share,
             round(sum((b.distribution_data->>'tithing_admin_amount')::numeric), 2) AS s2g_share,
             count(*) FILTER (WHERE b.payout_status = 'credited_to_balance')       AS rows_in_parked_ledger,
             count(*) FILTER (WHERE b.payout_status = 'pending')                   AS rows_in_payout_queue,
             count(*) FILTER (WHERE b.payout_status = 'paid')                      AS rows_paid,
             json_agg(DISTINCT b.provider)                 AS rails
      FROM public.orchards o
      JOIN public.bestowals b ON b.orchard_id = o.id
      WHERE b.payment_status IN ('completed', 'distributed')
      GROUP BY o.id
    ) t
  ),
  'pending_unpaid_rows', (
    SELECT count(*) FROM public.bestowals WHERE orchard_id IS NOT NULL AND payment_status = 'pending'
  ),
  'ledger_credits_from_orchards', (
    SELECT json_build_object('rows', count(*), 'total', round(COALESCE(sum(amount), 0)::numeric, 2))
    FROM public.balance_ledger WHERE reference_table = 'bestowals' AND kind = 'earning_credit'
  )
);
