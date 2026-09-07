-- P0-5 Phase D (2026-09-07): read-only. The two devnet destinations for the
-- Uplift party-payment proof: test account B's Solana payout address (from
-- user_wallets, the row resolveSowerPayout reads) and the wallet that paid
-- every devnet pocket so far (the newest devnet orchard holding's
-- payer_address). Also the orchard kinds/states and whether Phase D's table
-- already exists.
-- Run: npx supabase db query --linked -f scripts/studio/phase-d-destinations.sql
SELECT jsonb_build_object(
  'b_wallets', (SELECT jsonb_agg(jsonb_build_object('type', w.wallet_type, 'address', w.wallet_address, 'currency', w.payout_currency, 'network', w.network, 'primary', w.is_primary, 'active', w.is_active))
                  FROM public.user_wallets w WHERE w.user_id = 'a8872ed5-951c-4343-ba05-d4921af18eb2'),
  'a_wallets', (SELECT jsonb_agg(jsonb_build_object('type', w.wallet_type, 'address', w.wallet_address, 'currency', w.payout_currency, 'network', w.network, 'primary', w.is_primary, 'active', w.is_active))
                  FROM public.user_wallets w WHERE w.user_id = 'de22c876-d477-4a5e-81a2-cd22091ce125'),
  'b_profile_payout', (SELECT jsonb_build_object('method', p.preferred_payout_method, 'network', p.payout_network, 'address', p.payout_address)
                         FROM public.profiles p WHERE p.user_id = 'a8872ed5-951c-4343-ba05-d4921af18eb2'),
  'last_devnet_payer', (SELECT h.payer_address FROM public.orchard_holdings h JOIN public.bestowals b ON b.id = h.bestowal_id
                         WHERE h.rail = 'solana' AND public.payment_environment(b.provider, 'orchard', b.id) = 'devnet'
                         ORDER BY h.created_at DESC LIMIT 1),
  'orchards_by_kind_state', (SELECT jsonb_object_agg(k, n) FROM (SELECT orchard_kind || '/' || funding_state AS k, count(*) AS n FROM public.orchards GROUP BY 1) x),
  'orchard_payments_table_exists', to_regclass('public.orchard_release_payments') IS NOT NULL,
  'gosat_ids', (SELECT jsonb_agg(DISTINCT user_id) FROM public.user_roles WHERE role IN ('gosat', 'admin'))
) AS facts;
