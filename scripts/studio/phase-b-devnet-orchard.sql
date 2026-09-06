-- P0-5 Phase B devnet proof, step 1: a ONE-pocket Launch orchard sown by
-- test account B (payout address + consent on file), so a single devnet
-- pocket payment by test account A funds it 1/1 and fires the release.
-- seed_value 8.70 x 1.15 = 10.005 / pocket_price 10 -> total_pockets 1,
-- target 10.00. Run once; the proof SELECT prints the new orchard id.

INSERT INTO public.orchards (title, description, category, user_id, profile_id, seed_value, original_seed_value,
                             pocket_price, status, currency, product_type, orchard_type)
SELECT 'Phase B release test orchard', 'One pocket of 10 USDC. Devnet proof of orchard release (P0-5 Phase B). Safe to cancel afterwards.',
       'General', 'a8872ed5-951c-4343-ba05-d4921af18eb2', p.id, 8.70, 8.70, 10, 'active', 'USDC', 'digital', 'standard'
FROM public.profiles p
WHERE p.user_id = 'a8872ed5-951c-4343-ba05-d4921af18eb2'
  AND NOT EXISTS (SELECT 1 FROM public.orchards WHERE title = 'Phase B release test orchard');

SELECT o.id, o.title, o.total_pockets, o.pocket_price, o.orchard_kind, o.funding_state, f.target, f.funded
FROM public.orchards o CROSS JOIN LATERAL public.orchard_funding_status(o.id) f
WHERE o.title = 'Phase B release test orchard';
