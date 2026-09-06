-- The 15.00 USDC float the owner sent to the hot wallet on 2026-09-06 08:58 UTC
-- (split out of bookkeeping-2026-09-06-corrections.sql). Applied server-side
-- 2026-09-06 ~09:40 UTC; idempotent on the transfer signature.

SELECT set_config('request.jwt.claims',
  json_build_object('sub', '04754d57-d41d-4ea7-93df-542047a6785b', 'role', 'authenticated')::text, false);

-- 2. the 15.00 USDC float, if not already recorded
SELECT id, kind, wallet, amount_usd, currency, reference
FROM public.record_treasury_movement(
  'float_in', 'hot', 15.00,
  'Owner sent 15.00 USDC from their own wallet to the hot wallet on mainnet on 2026-09-06 08:58 UTC to cover the first real payouts (8.00 owed vs 5.62 on hand). S2G float, not income.',
  'USDC',
  '5yDg3G8ytXeQbJnDCZVCpcsdc2bMZPygofnprVLxyBUCsLkrv3GExTGcNQJ2F1kEsNhtxpTBkj68KamoDY4eqkRY')
WHERE NOT EXISTS (
  SELECT 1 FROM public.treasury_movements
   WHERE reference = '5yDg3G8ytXeQbJnDCZVCpcsdc2bMZPygofnprVLxyBUCsLkrv3GExTGcNQJ2F1kEsNhtxpTBkj68KamoDY4eqkRY');

SELECT round(sum(amount_usd), 2) AS hot_float_expect_15 FROM public.treasury_movements WHERE wallet = 'hot' AND environment = 'live';
