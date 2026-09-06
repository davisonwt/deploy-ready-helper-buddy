-- Mainnet victory lap, Proof 1: the orchard to cancel and refund with REAL USDC.
-- 2 pockets x 10.00 (seed_value 20 / pocket_price 10), Launch, digital (no
-- delivery address), sown by test account B. One real pocket leaves it at
-- 1/2 = open, so it can be cancelled. COMMITS.
-- Run: npx supabase db query --linked -f scripts/studio/mainnet-refund-orchard.sql
INSERT INTO public.orchards (title, description, category, user_id, profile_id, seed_value, original_seed_value, pocket_price, status, currency, product_type)
VALUES ('Mainnet refund test', 'Victory lap proof 1 (2026-09-06): one real 10 USDC pocket in, cancelled, refunded to the payer on mainnet.',
        'general', 'a8872ed5-951c-4343-ba05-d4921af18eb2', (SELECT id FROM public.profiles WHERE user_id = 'a8872ed5-951c-4343-ba05-d4921af18eb2'),
        20, 20, 10, 'active', 'USDC', 'digital')
RETURNING id, title, total_pockets, pocket_price, orchard_kind, funding_state, product_type, 'https://sow2growapp.com/orchard/' || id::text AS url;
