-- P0-5 Phase A devnet pocket test: make test account B the SOWER of the
-- test orchard. create-orchard-bestowal-order refuses an order (409
-- no_payout_method) unless the sower has a payout method; A has none, B
-- already has a Solana USDC payout address and settlement consent.
-- The orchard has no bestowals or holdings, so changing its owner is safe.
-- Run once in Studio. The final SELECT is the proof.

UPDATE public.orchards o
SET user_id    = 'a8872ed5-951c-4343-ba05-d4921af18eb2',                       -- test account B (davisontest2)
    profile_id = (SELECT id FROM public.profiles WHERE user_id = 'a8872ed5-951c-4343-ba05-d4921af18eb2'),
    updated_at = now()
WHERE o.id = '55f4e02e-32fe-4013-aa7b-4eff6da77d37'
  AND NOT EXISTS (SELECT 1 FROM public.bestowals b WHERE b.orchard_id = o.id)
  AND NOT EXISTS (SELECT 1 FROM public.orchard_holdings h WHERE h.orchard_id = o.id);

SELECT o.id, o.title, o.status, o.user_id AS sower_user_id, p.username AS sower,
       pr.payout_network, left(pr.payout_address, 8) AS payout_addr,
       public.has_accepted_settlement_consent(o.user_id) AS sower_consent,
       o.filled_pockets, o.total_pockets, o.pocket_price
FROM public.orchards o
JOIN public.profiles p  ON p.id = o.profile_id
JOIN public.profiles pr ON pr.user_id = o.user_id
WHERE o.id = '55f4e02e-32fe-4013-aa7b-4eff6da77d37';
