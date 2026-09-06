-- Mainnet victory lap, Proof 2: the orchard to fund and release with REAL USDC.
-- 1 pocket x 10.00 (seed_value 10 / pocket_price 10), Launch, digital, sown by
-- test account B. The first real pocket funds it and Phase B releases it
-- in the same transaction. COMMITS.
-- Run: npx supabase db query --linked -f scripts/studio/mainnet-release-orchard.sql
INSERT INTO public.orchards (title, description, category, user_id, profile_id, seed_value, original_seed_value, pocket_price, status, currency, product_type)
VALUES ('Mainnet release test', 'Victory lap proof 2 (2026-09-06): one real 10 USDC pocket funds and releases this orchard on mainnet; B is owed 8.70, S2G books 1.30.',
        'general', 'a8872ed5-951c-4343-ba05-d4921af18eb2', (SELECT id FROM public.profiles WHERE user_id = 'a8872ed5-951c-4343-ba05-d4921af18eb2'),
        10, 10, 10, 'active', 'USDC', 'digital')
RETURNING id, title, total_pockets, pocket_price, orchard_kind, funding_state, product_type, 'https://sow2growapp.com/orchard/' || id::text AS url;
