-- SNAPSHOT + RESTORE, captured 2026-09-25 BEFORE the referrals follow-up:
--   scripts/studio/referrals-followup-2026-09-25.sql
-- Named rows only. Parts are independent.
--
-- PART A  Petrus Booyens (camokahola) back to davisontest1.
-- PART B  Chari Relling (chariwellnesspro) back to the founder.
--         (The counter triggers from 20260925130000 move the counts back
--         by exactly one when these rows move back.)
-- PART C  The referred_by backfill undone: these 33 members had a
--         referral_circle row but referred_by NULL before it ran.
-- PART D  The late welcomes for Anton (Global + private) and Otavio
--         (private only) -- message/room ids are appended below by the
--         run itself, once they exist.
-- PART E  books_backfill_products exactly as it was, mojibake included
--         (comments only: "â€”" for an em dash, "Â§" for a section sign).

-- ======================================================== PART A
begin;
update public.referral_circle set referrer_id = 'de22c876-d477-4a5e-81a2-cd22091ce125' where id = 'f87f127c-f845-4040-bf05-5ea874df69b7';
update public.referrals       set referrer_id = '3a39724a-5619-4ce5-b50c-ff747f8f2e54' where id = '4e697388-33f8-4378-b43a-0e2a9bca3c75';
update public.profiles set referred_by = 'de22c876-d477-4a5e-81a2-cd22091ce125' where user_id = '198092bc-b360-4c8a-9f07-7615add074a6';
commit;

-- ======================================================== PART B
begin;
update public.referral_circle set referrer_id = '04754d57-d41d-4ea7-93df-542047a6785b' where id = 'e0bae563-ac4d-4e67-a4b6-6e85ab1b99c6';
update public.referrals       set referrer_id = '36f08f61-f6ce-46d2-ad82-a8b55cdf52c5' where id = 'f47bd58b-d4ba-41a5-b74d-2e62cbae9d7a';
update public.profiles set referred_by = '04754d57-d41d-4ea7-93df-542047a6785b' where user_id = 'd9cf6f3f-f3cd-4b20-b3e6-73b863f85e7e';
commit;

-- ======================================================== PART C
begin;
update public.profiles p set referred_by = null
  from (values
  ('6a159d17-3fd6-4408-bf0a-17e2cf9d23be'::uuid)  -- aboveandbeyond263 (tribe row: amberwheeles),
  ('4dfc2eb7-20ec-412f-bd80-ee886a0a0b2b'::uuid)  -- ernie.cayw (tribe row: bianca.liebenberg123),
  ('bdb3153f-8f87-4fbf-bfcc-ea02356cc118'::uuid)  -- health1stsa (tribe row: bianca.liebenberg123),
  ('0356b9d0-02d9-41a7-ae57-cca4acecdc79'::uuid)  -- lribouet (tribe row: callth3guy),
  ('09ce380b-dcb5-49fd-8181-4c32fba61909'::uuid)  -- 4amazinglearning (tribe row: davison.taljaard),
  ('c34c0eba-0010-480b-8326-7063cd7221ae'::uuid)  -- amberswheeles (tribe row: davison.taljaard),
  ('432df4a7-07f1-4a5e-835c-a3c2806ce6c5'::uuid)  -- amberwheeles (tribe row: davison.taljaard),
  ('269a3387-085b-4ec7-80bd-3b54069307b6'::uuid)  -- andre.grobler (tribe row: davison.taljaard),
  ('b19c9972-b30e-4113-ad80-683e21a13063'::uuid)  -- bianca.liebenberg123 (tribe row: davison.taljaard),
  ('3cc963dd-e12e-4707-86a1-bebe70a749cc'::uuid)  -- born2nd78 (tribe row: davison.taljaard),
  ('cce69b0d-0faa-45d6-bfeb-9a7b2198e09f'::uuid)  -- cmbconcepts2020 (tribe row: davison.taljaard),
  ('58249abb-829a-406c-a78b-a831ca528cd1'::uuid)  -- coenie (tribe row: davison.taljaard),
  ('a2d16040-c742-4a6f-8afe-5f21d61e2d09'::uuid)  -- davineruach (tribe row: davison.taljaard),
  ('fad5212e-9262-4317-9b3c-586c3d3693bc'::uuid)  -- dpak.wessel (tribe row: davison.taljaard),
  ('34b37520-9907-4fe6-bb35-f50e5222d683'::uuid)  -- earthangels638284 (tribe row: davison.taljaard),
  ('0a24d607-1859-4e56-a4bd-c09af4697f16'::uuid)  -- ezra.taljaard (tribe row: davison.taljaard),
  ('51719598-532b-4423-93b8-5ffb97057f13'::uuid)  -- followerofyah777 (tribe row: davison.taljaard),
  ('0d4bf0a8-8381-41ba-ba03-bf2b82bc73bc'::uuid)  -- gorufusan (tribe row: davison.taljaard),
  ('8d183fc5-2e38-487f-afd5-f97c59a42476'::uuid)  -- grootbrak (tribe row: davison.taljaard),
  ('d19a2447-d241-4675-8823-323385facc9c'::uuid)  -- hap9here (tribe row: davison.taljaard),
  ('6b671af1-49d2-4824-8777-f55544217184'::uuid)  -- julieanderson.com (tribe row: davison.taljaard),
  ('8aa979b2-ff89-4d51-bc46-3825eb335e7d'::uuid)  -- mkatwesige (tribe row: davison.taljaard),
  ('fa87de40-8a3d-4ef4-a8c3-96b13c7c608f'::uuid)  -- mwheeles71 (tribe row: davison.taljaard),
  ('421eca4e-6959-496a-8483-b8051a6734bc'::uuid)  -- nelis (tribe row: davison.taljaard),
  ('110b5a23-ce07-45c8-a432-086550aa78b5'::uuid)  -- primitivevsns (tribe row: davison.taljaard),
  ('6ec87b18-44fe-4c68-8c6a-f5b2a79ae7b2'::uuid)  -- rodney (tribe row: davison.taljaard),
  ('69fabacd-950e-4d5a-b300-f9c6b175295b'::uuid)  -- taljaard.abiyah1 (tribe row: davison.taljaard),
  ('84110981-1ccd-4fdf-a512-d80056be927e'::uuid)  -- terri1951 (tribe row: davison.taljaard),
  ('098a3ea4-7b1d-4a63-aa16-166dff808e09'::uuid)  -- tjparker091 (tribe row: davison.taljaard),
  ('54dda6fb-e96c-48e6-a0f3-ba2012eb15e9'::uuid)  -- tnehemyah (tribe row: davison.taljaard),
  ('5130d2c5-69c2-4546-bb71-67997d9215a3'::uuid)  -- vjkennach (tribe row: davison.taljaard),
  ('b6932c56-6892-4648-b171-bd181b6c13d1'::uuid)  -- wesselsangelique3 (tribe row: davison.taljaard),
  ('ad1042ff-3cf6-4153-bea4-a938a93d2cd6'::uuid)  -- william247business (tribe row: davison.taljaard)
) as v(user_id)
 where p.user_id = v.user_id;
commit;

-- ======================================================== PART E
begin;
CREATE OR REPLACE FUNCTION public.books_backfill_products(_business_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_owner uuid;
  v_cur text;
  v_enabled boolean;
  v_count integer := 0;
  v_products integer := 0;
  v_books integer := 0;
BEGIN
  SELECT c.owner_user_id, c.currency, c.books_enabled
    INTO v_owner, v_cur, v_enabled
    FROM public.companies c
   WHERE c.id = _business_id;

  IF v_owner IS NULL OR v_owner <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorised for this business';
  END IF;
  IF NOT COALESCE(v_enabled, false) THEN
    RETURN 0;
  END IF;

  WITH ins AS (
    INSERT INTO public.books_items
      (business_id, product_id, book_id, name, description, kind, sku, unit_price, currency, source, active)
    SELECT
      _business_id,
      p.id,
      NULL,
      COALESCE(p.title, 'Untitled'),
      p.description,
      COALESCE(p.type, 'product'),
      p.sku,
      COALESCE(p.price, 0),
      COALESCE(v_cur, 'USD'),
      'marketplace',
      COALESCE(p.status, 'active') <> 'archived'
    FROM public.products p
    WHERE p.company_id = _business_id
    ON CONFLICT (business_id, product_id) WHERE product_id IS NOT NULL
    DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      kind = EXCLUDED.kind,
      sku = EXCLUDED.sku,
      unit_price = EXCLUDED.unit_price,
      active = EXCLUDED.active,
      updated_at = now()
    RETURNING 1
  )
  SELECT count(*) INTO v_products FROM ins;

  -- sower_books has no company_id (out of scope for this migration â€”
  -- spec-books.md Â§2 only adds company_id to products/orchards), so it
  -- stays scoped by get_my_account_scope(), unchanged.
  WITH scope AS (
    SELECT user_id FROM public.get_my_account_scope()
  ), ins AS (
    INSERT INTO public.books_items
      (business_id, product_id, book_id, name, description, kind, sku, unit_price, currency, source, active)
    SELECT
      _business_id,
      NULL,
      b.id,
      COALESCE(b.title, 'Untitled'),
      b.description,
      'book',
      b.isbn,
      COALESCE(b.bestowal_value, 0),
      COALESCE(v_cur, 'USD'),
      'marketplace-book',
      COALESCE(b.status, 'active') <> 'archived'
    FROM public.sower_books b
    WHERE b.user_id IN (SELECT user_id FROM scope)
    ON CONFLICT (business_id, book_id) WHERE book_id IS NOT NULL
    DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      kind = EXCLUDED.kind,
      sku = EXCLUDED.sku,
      unit_price = EXCLUDED.unit_price,
      active = EXCLUDED.active,
      updated_at = now()
    RETURNING 1
  )
  SELECT count(*) INTO v_books FROM ins;

  v_count := v_products + v_books;
  RETURN v_count;
END;
$function$
;
commit;

-- ======================================================== PART D
-- (appended by the run)
begin;
-- otaviocosta1973
delete from public.chat_messages where id in ('3e6e9313-ab0e-49c1-b9f6-47502f1c571b');
delete from public.chat_participants where room_id = '0f8647fe-3e8a-406f-b62c-3fd9ed44757a';
delete from public.chat_rooms where id = '0f8647fe-3e8a-406f-b62c-3fd9ed44757a';
delete from public.member_welcomes where user_id = 'ef206f1c-3c1c-49f4-8bca-3bddcb9deb51';
-- antoncrossm
delete from public.chat_messages where id in ('98daf723-5486-4150-aab8-ae051999c7b5', '9fbf1d80-64eb-4c59-8cac-3f2c4ea3ee3a');
delete from public.chat_participants where room_id = '74276979-8f50-452c-8edc-960b64225e69';
delete from public.chat_rooms where id = '74276979-8f50-452c-8edc-960b64225e69';
delete from public.member_welcomes where user_id = 'bdea1480-503b-4f60-a2bf-5408c3de0757';
commit;
