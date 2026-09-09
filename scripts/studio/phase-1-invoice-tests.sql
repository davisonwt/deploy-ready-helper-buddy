-- Member invoicing Phase 1 (MEMBER-INVOICING-PLAN.md, migration
-- 20260909100000_invoicing_phase1.sql): database-side tests.
-- BEGIN ... ROLLBACK; nothing persists. Every row must say pass = true.
--
-- Run: npx supabase db query --linked -f scripts/studio/phase-1-invoice-tests.sql
--
-- Connects as `postgres`, which has BYPASSRLS -- set_config('request.jwt.claims', ...)
-- alone does NOT make RLS engage under that role (confirmed live: an insert
-- that should violate a policy just silently succeeds). Every case that
-- actually asserts an RLS boundary runs under `SET LOCAL ROLE authenticated`
-- so the policy engine is really in the loop; fixture setup that isn't
-- itself under test (companies, the trial grant) stays on the bypassing
-- role for simplicity. fixture_ids carries uuids between blocks (PL/pgSQL
-- variables don't survive across separate DO blocks / role switches).

BEGIN;

CREATE TEMP TABLE test_results (name text, pass boolean, detail text) ON COMMIT DROP;
CREATE TEMP TABLE fixture_ids (key text PRIMARY KEY, val text) ON COMMIT DROP;
-- Created as postgres; the RLS-testing blocks below run as `authenticated`
-- (a different role in the same session) and need access to these too.
GRANT ALL ON test_results, fixture_ids TO authenticated;

-- ---------------------------------------------------------------------
-- Setup (postgres, bypasses RLS -- not under test here)
-- ---------------------------------------------------------------------
DO $setup$
DECLARE
  v_user_a uuid := 'de22c876-d477-4a5e-81a2-cd22091ce125'; -- test account A (non-admin)
  v_user_b uuid := 'a8872ed5-951c-4343-ba05-d4921af18eb2'; -- test account B
  v_gosat  uuid := (SELECT user_id FROM public.user_roles WHERE role = 'gosat' LIMIT 1);
  v_biz_a  uuid;
  v_biz_b  uuid;
BEGIN
  INSERT INTO public.companies (name, slug, owner_user_id, currency, books_enabled)
  VALUES ('Phase 1 test co (A)', 'phase-1-test-co-a-' || gen_random_uuid()::text, v_user_a, 'USD', true) RETURNING id INTO v_biz_a;
  INSERT INTO public.companies (name, slug, owner_user_id, currency, books_enabled)
  VALUES ('Phase 1 test co (B)', 'phase-1-test-co-b-' || gen_random_uuid()::text, v_user_b, 'USD', true) RETURNING id INTO v_biz_b;

  INSERT INTO fixture_ids VALUES ('user_a', v_user_a::text), ('user_b', v_user_b::text), ('gosat', v_gosat::text),
    ('biz_a', v_biz_a::text), ('biz_b', v_biz_b::text);
END;
$setup$;

-- ---------------------------------------------------------------------
-- As A, authenticated role, before any invoicing access: customer RLS
-- and the invoice-insert gate.
-- ---------------------------------------------------------------------
SELECT set_config('request.jwt.claims', json_build_object('sub', val, 'role', 'authenticated')::text, false)
  FROM fixture_ids WHERE key = 'user_a';
SET LOCAL ROLE authenticated;

DO $case_1_4$
DECLARE
  v_biz_a  uuid := (SELECT val::uuid FROM fixture_ids WHERE key = 'biz_a');
  v_biz_b  uuid := (SELECT val::uuid FROM fixture_ids WHERE key = 'biz_b');
  v_user_a uuid := (SELECT val::uuid FROM fixture_ids WHERE key = 'user_a');
  v_customer uuid;
BEGIN
  -- 1. customer insert, owner-scoped, actually RLS-enforced (authenticated role)
  INSERT INTO public.customers (business_id, name, email) VALUES (v_biz_a, 'Jane Customer', 'jane@example.com')
    RETURNING id INTO v_customer;
  INSERT INTO test_results VALUES ('1. customer insert succeeds for the owner (RLS-enforced)', v_customer IS NOT NULL, v_customer::text);
  INSERT INTO fixture_ids VALUES ('customer', v_customer::text);

  -- 2. cross-business customer insert refused by RLS (owns_company fails for B's business)
  BEGIN
    INSERT INTO public.customers (business_id, name) VALUES (v_biz_b, 'Should not be allowed');
    INSERT INTO test_results VALUES ('2. customer insert into another business is refused (RLS-enforced)', false, 'no error raised');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO test_results VALUES ('2. customer insert into another business is refused (RLS-enforced)', SQLERRM LIKE '%row-level security%', SQLERRM);
  END;

  -- 3. has_invoicing_access is false with no subscription yet
  INSERT INTO test_results VALUES ('3. has_invoicing_access is false with no subscription',
    public.has_invoicing_access(v_user_a) = false, 'ok');

  -- 4. draft invoice refused before any invoicing access exists (RLS-enforced)
  BEGIN
    INSERT INTO public.invoices (business_id, customer_id, number, total)
    VALUES (v_biz_a, v_customer, 'INV-TEST-1', 100);
    INSERT INTO test_results VALUES ('4. invoice insert refused without invoicing access (RLS-enforced)', false, 'no error raised');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO test_results VALUES ('4. invoice insert refused without invoicing access (RLS-enforced)', SQLERRM LIKE '%row-level security%', SQLERRM);
  END;
END;
$case_1_4$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);

-- ---------------------------------------------------------------------
-- Grant A a trial, as the gosat account (also RLS-enforced: a non-gosat
-- could not do this insert).
-- ---------------------------------------------------------------------
SELECT set_config('request.jwt.claims', json_build_object('sub', val, 'role', 'authenticated')::text, false)
  FROM fixture_ids WHERE key = 'gosat';
SET LOCAL ROLE authenticated;

DO $case_5$
DECLARE
  v_user_a uuid := (SELECT val::uuid FROM fixture_ids WHERE key = 'user_a');
BEGIN
  INSERT INTO public.feature_subscriptions (user_id, feature, status, current_period_end, source)
  VALUES (v_user_a, 'invoicing', 'trial', now() + interval '30 days', 'gosat');
  INSERT INTO test_results VALUES ('5. has_invoicing_access is true after a gosat-granted trial (RLS-enforced insert)',
    public.has_invoicing_access(v_user_a) = true, 'ok');
END;
$case_5$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);

-- ---------------------------------------------------------------------
-- Back to A: draft invoice now succeeds, transitions, amount_due, tokens.
-- ---------------------------------------------------------------------
SELECT set_config('request.jwt.claims', json_build_object('sub', val, 'role', 'authenticated')::text, false)
  FROM fixture_ids WHERE key = 'user_a';
SET LOCAL ROLE authenticated;

DO $case_6_9$
DECLARE
  v_biz_a    uuid := (SELECT val::uuid FROM fixture_ids WHERE key = 'biz_a');
  v_customer uuid := (SELECT val::uuid FROM fixture_ids WHERE key = 'customer');
  v_invoice  uuid;
  v_invoice2 uuid;
  v_token1   uuid;
  v_token2   uuid;
BEGIN
  -- 6. draft invoice insert succeeds now that A has invoicing access
  INSERT INTO public.invoices (business_id, customer_id, number, subtotal, total)
  VALUES (v_biz_a, v_customer, public.next_invoice_number(v_biz_a), 100, 100)
    RETURNING id, public_token INTO v_invoice, v_token1;
  INSERT INTO test_results VALUES ('6. draft invoice insert succeeds with invoicing access (RLS-enforced)', v_invoice IS NOT NULL, v_invoice::text);
  INSERT INTO fixture_ids VALUES ('invoice', v_invoice::text);

  INSERT INTO public.line_items (invoice_id, position, description, quantity, unit_price)
  VALUES (v_invoice, 0, 'Test labour', 1, 100);

  -- 7. amount_due generated column: total - amount_paid, no payment yet
  PERFORM 1 FROM public.invoices WHERE id = v_invoice AND amount_due = 100 AND amount_paid = 0;
  INSERT INTO test_results VALUES ('7. amount_due = total - amount_paid, unpaid so far', FOUND, 'ok');

  -- 8. public_token is unique across two invoices
  INSERT INTO public.invoices (business_id, customer_id, number, subtotal, total)
  VALUES (v_biz_a, v_customer, public.next_invoice_number(v_biz_a), 50, 50)
    RETURNING id, public_token INTO v_invoice2, v_token2;
  INSERT INTO test_results VALUES ('8. public_token is unique per invoice', v_token1 IS NOT NULL AND v_token2 IS NOT NULL AND v_token1 <> v_token2, format('%s vs %s', v_token1, v_token2));
  INSERT INTO fixture_ids VALUES ('invoice2', v_invoice2::text);

  -- 9. disallowed transition refused (draft -> paid, skipping sent) -- the
  -- enforce_invoice_status_transition trigger, not RLS, so this still
  -- fires correctly even though this block is on the bypassing... no,
  -- we ARE under authenticated here, and the trigger fires regardless of
  -- role either way (it's a trigger, not a policy).
  BEGIN
    UPDATE public.invoices SET status = 'paid' WHERE id = v_invoice2;
    INSERT INTO test_results VALUES ('9. draft -> paid transition is refused', false, 'no error raised');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO test_results VALUES ('9. draft -> paid transition is refused', SQLERRM LIKE '%invoice_status_transition_refused%', SQLERRM);
  END;

  -- Legal transition: draft -> sent, so finalize below has something to pay
  UPDATE public.invoices SET status = 'sent', sent_at = now() WHERE id = v_invoice;
  INSERT INTO public.document_events (document_kind, document_id, event, from_state, to_state, actor)
  VALUES ('invoice', v_invoice, 'sent', 'draft', 'sent', 'member');
END;
$case_6_9$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);

-- ---------------------------------------------------------------------
-- finalize_invoice_payment, the fee ledger row, idempotence,
-- document_events, and the books_income schema check -- all as postgres
-- (this is service-role territory: nothing here is client-reachable, so
-- there's no RLS boundary to prove).
-- ---------------------------------------------------------------------
DO $case_10_13$
DECLARE
  v_biz_a   uuid := (SELECT val::uuid FROM fixture_ids WHERE key = 'biz_a');
  v_invoice uuid := (SELECT val::uuid FROM fixture_ids WHERE key = 'invoice');
  v_payment uuid;
BEGIN
  INSERT INTO public.invoice_payments (invoice_id, amount, rail, environment, status)
  VALUES (v_invoice, 100, 'solana', 'devnet', 'pending') RETURNING id INTO v_payment;
  PERFORM public.finalize_invoice_payment(v_payment, 'devnet', 'TEST-SIGNATURE-1');

  PERFORM 1 FROM public.invoices WHERE id = v_invoice AND status = 'paid' AND amount_paid = 100 AND amount_due = 0;
  INSERT INTO test_results VALUES ('10a. finalize_invoice_payment moves the invoice to paid', FOUND, 'ok');

  PERFORM 1 FROM public.revenue_ledger
   WHERE kind = 'invoice_fee' AND source_table = 'invoice_payments' AND source_id = v_payment
     AND amount = 15.00 AND environment = 'devnet';
  INSERT INTO test_results VALUES ('11. invoice_fee ledger row is exactly 15% of the payment (devnet, ignored by revenue_summary(''live''))', FOUND, 'ok');

  -- Re-run: idempotent, no duplicate fee row, no error
  PERFORM public.finalize_invoice_payment(v_payment, 'devnet', 'TEST-SIGNATURE-1');
  PERFORM 1 FROM (SELECT count(*) n FROM public.revenue_ledger WHERE kind = 'invoice_fee' AND source_id = v_payment) s WHERE s.n = 1;
  INSERT INTO test_results VALUES ('10b. a second finalize call is a no-op (idempotent)', FOUND, 'ok');

  PERFORM 1 FROM (SELECT count(*) n FROM public.document_events WHERE document_kind = 'invoice' AND document_id = v_invoice AND event IN ('sent', 'paid')) s WHERE s.n = 2;
  INSERT INTO test_results VALUES ('12. document_events has one row for sent and one for paid', FOUND, 'ok');

  -- 13. books_income accepts income_type='invoice' (the schema half of
  -- syncInvoicePayment -- the function itself is TypeScript, not
  -- reachable from this SQL fixture; this proves the CHECK it depends on).
  BEGIN
    INSERT INTO public.books_income (business_id, income_type, description, amount, currency, source_table, source_id, occurred_at)
    VALUES (v_biz_a, 'invoice', 'Invoice ' || v_invoice::text, 85, 'USD', 'invoice_payments', v_payment, now());
    INSERT INTO test_results VALUES ('13. books_income accepts income_type = invoice (syncInvoicePayment''s schema half)', true, 'ok');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO test_results VALUES ('13. books_income accepts income_type = invoice (syncInvoicePayment''s schema half)', false, SQLERRM);
  END;
END;
$case_10_13$;

SELECT * FROM test_results ORDER BY name;

ROLLBACK;
