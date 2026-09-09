-- Member invoicing, Phase 1 (MEMBER-INVOICING-PLAN.md sections 1, 2, 4).
-- Smallest useful slice: customers, a basic invoice with line items from
-- saved items, the public pay page on the USDC rail only, finalize into
-- paid, the fee in the revenue ledger, the income in Books, the gating
-- function for a paid invoicing subscription.
--
-- Dollar-quote tags are unique per block (Studio's editor mis-splits
-- repeated $$). Apply with: npx supabase db push (or db query --linked -f
-- against this file).

-- ---------------------------------------------------------------------
-- 1. Gating: feature_subscriptions + has_invoicing_access()
-- ---------------------------------------------------------------------
CREATE TABLE public.feature_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature text NOT NULL CHECK (feature IN ('invoicing')),
  status text NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'past_due', 'cancelled')),
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz,
  price_usd numeric(10,2),
  period text CHECK (period IN ('month', 'year')),
  source text NOT NULL DEFAULT 'gosat' CHECK (source IN ('gosat', 'system', 'bestowal', 'manual', 'trial')),
  source_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_feature_subscriptions_user ON public.feature_subscriptions(user_id, feature);
GRANT SELECT ON public.feature_subscriptions TO authenticated;
GRANT ALL ON public.feature_subscriptions TO service_role;
ALTER TABLE public.feature_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feature_subscriptions_select_own" ON public.feature_subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "feature_subscriptions_select_gosat" ON public.feature_subscriptions
  FOR SELECT TO authenticated USING (public.is_admin_or_gosat(auth.uid()));
CREATE POLICY "feature_subscriptions_gosat_insert" ON public.feature_subscriptions
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_gosat(auth.uid()));
CREATE POLICY "feature_subscriptions_gosat_update" ON public.feature_subscriptions
  FOR UPDATE TO authenticated USING (public.is_admin_or_gosat(auth.uid())) WITH CHECK (public.is_admin_or_gosat(auth.uid()));
CREATE TRIGGER trg_feature_subscriptions_updated BEFORE UPDATE ON public.feature_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.has_invoicing_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $hia$
  SELECT public.is_admin_or_gosat(_user_id) OR EXISTS (
    SELECT 1 FROM public.feature_subscriptions
     WHERE user_id = _user_id
       AND feature = 'invoicing'
       AND status IN ('active', 'trial')
       AND (current_period_end IS NULL OR current_period_end > now())
  )
$hia$;
GRANT EXECUTE ON FUNCTION public.has_invoicing_access(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- 2. customers
-- ---------------------------------------------------------------------
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  address text,
  member_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  default_tax_profile_id uuid,
  notes text,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_customers_business ON public.customers(business_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers_owner_all" ON public.customers FOR ALL TO authenticated
  USING (public.owns_company(business_id)) WITH CHECK (public.owns_company(business_id));
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- 3. invoices -- replaces the empty legacy table (client_name/amount/
--    currency, 0 rows, InvoicesTab.tsx). No FK anywhere references it
--    (checked: nothing in migrations REFERENCES public.invoices).
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS public.invoices;

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  estimate_id uuid,
  number text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'void')),
  kind text NOT NULL DEFAULT 'standard' CHECK (kind IN ('standard', 'deposit', 'balance')),
  currency_display text NOT NULL DEFAULT 'USD',
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  tax_total numeric(14,2) NOT NULL DEFAULT 0,
  total numeric(14,2) NOT NULL DEFAULT 0,
  amount_paid numeric(14,2) NOT NULL DEFAULT 0,
  amount_due numeric(14,2) GENERATED ALWAYS AS (round(total - amount_paid, 2)) STORED,
  due_at timestamptz,
  notes_to_customer text,
  public_token uuid NOT NULL DEFAULT gen_random_uuid(),
  sent_at timestamptz,
  paid_at timestamptz,
  voided_at timestamptz,
  void_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, number),
  UNIQUE (public_token)
);
CREATE INDEX idx_invoices_business ON public.invoices(business_id, created_at DESC);
CREATE INDEX idx_invoices_customer ON public.invoices(customer_id);
GRANT SELECT, INSERT, UPDATE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
-- SELECT stays owner-only, no gating -- a lapsed subscription never blocks
-- a member reading their own records (section 1's free tier).
CREATE POLICY "invoices_owner_select" ON public.invoices FOR SELECT TO authenticated
  USING (public.owns_company(business_id));
CREATE POLICY "invoices_owner_insert" ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (public.owns_company(business_id) AND public.has_invoicing_access(auth.uid()));
CREATE POLICY "invoices_owner_update" ON public.invoices FOR UPDATE TO authenticated
  USING (public.owns_company(business_id) AND public.has_invoicing_access(auth.uid()))
  WITH CHECK (public.owns_company(business_id) AND public.has_invoicing_access(auth.uid()));
-- No anon table grant at all -- the public pay page never gets a
-- `USING (true)` policy on this table (that would let anyone with the
-- anon key list every invoice, token or not, via a raw REST call). A
-- guest reads through get_public_invoice(_token) below instead, which
-- checks the token itself before returning anything.
CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Per-business sequential INV-0001 numbering. Race-prone under concurrent
-- inserts by the same business (accepted -- same shape as the existing
-- generate_invoice_number() on payment_invoices); a business sends one
-- invoice at a time in practice.
CREATE OR REPLACE FUNCTION public.next_invoice_number(_business_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $nin$
DECLARE
  v_next integer;
BEGIN
  SELECT COALESCE(MAX(CAST(NULLIF(regexp_replace(number, '\D', '', 'g'), '') AS integer)), 0) + 1
    INTO v_next
    FROM public.invoices
   WHERE business_id = _business_id;
  RETURN 'INV-' || lpad(v_next::text, 4, '0');
END;
$nin$;
GRANT EXECUTE ON FUNCTION public.next_invoice_number(uuid) TO authenticated, service_role;

-- Section 2's transition table, enforced, not just documented: draft->sent,
-- draft->void, sent->void (member actions) and sent->paid (finalize_invoice_payment,
-- SECURITY DEFINER but this trigger still fires for it -- the same function
-- IS the thing moving sent->paid, so that transition is allowed here too).
-- Anything else -- paid->anything, void->anything, a same-state no-op UPDATE
-- that isn't touching status at all is fine and skipped entirely.
CREATE OR REPLACE FUNCTION public.enforce_invoice_status_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $eist$
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF (OLD.status, NEW.status) IN (
    ('draft', 'sent'), ('draft', 'void'), ('sent', 'void'), ('sent', 'paid')
  ) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'invoice_status_transition_refused: % -> %', OLD.status, NEW.status;
END;
$eist$;
DROP TRIGGER IF EXISTS trg_invoices_status_transition ON public.invoices;
CREATE TRIGGER trg_invoices_status_transition
BEFORE UPDATE OF status ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.enforce_invoice_status_transition();

-- ---------------------------------------------------------------------
-- 4. line_items
-- ---------------------------------------------------------------------
CREATE TABLE public.line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  description text NOT NULL,
  quantity numeric(12,2) NOT NULL DEFAULT 1,
  unit text,
  unit_price numeric(14,2) NOT NULL DEFAULT 0,
  taxable boolean NOT NULL DEFAULT false,
  tax_rate_percent numeric(5,2) NOT NULL DEFAULT 0,
  line_total numeric(14,2) GENERATED ALWAYS AS (round(quantity * unit_price, 2)) STORED,
  books_item_id uuid REFERENCES public.books_items(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_line_items_invoice ON public.line_items(invoice_id, position);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.line_items TO authenticated;
GRANT ALL ON public.line_items TO service_role;
ALTER TABLE public.line_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "line_items_owner_select" ON public.line_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND public.owns_company(i.business_id)));
CREATE POLICY "line_items_owner_insert" ON public.line_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND public.owns_company(i.business_id) AND i.status = 'draft')
    AND public.has_invoicing_access(auth.uid())
  );
CREATE POLICY "line_items_owner_update" ON public.line_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND public.owns_company(i.business_id) AND i.status = 'draft') AND public.has_invoicing_access(auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND public.owns_company(i.business_id) AND i.status = 'draft') AND public.has_invoicing_access(auth.uid()));
CREATE POLICY "line_items_owner_delete" ON public.line_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND public.owns_company(i.business_id) AND i.status = 'draft') AND public.has_invoicing_access(auth.uid()));
-- No anon grant here either -- same reasoning as invoices above; a guest
-- reads lines through get_public_invoice(_token), never the table directly.

-- ---------------------------------------------------------------------
-- 5. invoice_payments
-- ---------------------------------------------------------------------
CREATE TABLE public.invoice_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL,
  rail text NOT NULL CHECK (rail IN ('solana', 'paypal')),
  environment text NOT NULL CHECK (environment IN ('live', 'devnet', 'sandbox')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'expired')),
  provider_order_id text,
  payment_reference text,
  payer_email text,
  payer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  fee_amount numeric(14,2),
  processor_fee numeric(14,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
-- payout_status/payout_completed_at/payout_error added here (not as a
-- later ALTER) -- owed_payout_balances() below is CREATE OR REPLACE'd in
-- this same migration and reads ip.payout_status; that column must exist
-- before this function definition runs, not after.
ALTER TABLE public.invoice_payments
  ADD COLUMN IF NOT EXISTS payout_status text NOT NULL DEFAULT 'pending' CHECK (payout_status IN ('pending', 'processing', 'paid')),
  ADD COLUMN IF NOT EXISTS payout_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS payout_error text;
CREATE INDEX idx_invoice_payments_invoice ON public.invoice_payments(invoice_id, created_at DESC);
GRANT SELECT ON public.invoice_payments TO authenticated;
GRANT ALL ON public.invoice_payments TO service_role;
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoice_payments_owner_select" ON public.invoice_payments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND public.owns_company(i.business_id)));
-- No client INSERT/UPDATE at all -- create-invoice-payment (service role)
-- is the only writer, matching the "public token, no session" design; a
-- signed-in member never creates a payment attempt on their own invoice.

-- The one way a guest (or a signed-in customer) reads an invoice: by its
-- own unguessable token, checked inside the function before anything is
-- returned. Deliberately narrow -- no customer email/phone/address (the
-- member's own CRM data), just what's needed to show and pay the bill.
-- Callable with the anon key directly (no anon table grant needed).
CREATE OR REPLACE FUNCTION public.get_public_invoice(_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $gpi$
DECLARE
  v_invoice public.invoices%ROWTYPE;
  v_customer_name text;
  v_lines jsonb;
  v_pending_payment jsonb;
BEGIN
  SELECT * INTO v_invoice FROM public.invoices WHERE public_token = _token;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT name INTO v_customer_name FROM public.customers WHERE id = v_invoice.customer_id;

  SELECT jsonb_agg(jsonb_build_object(
           'id', l.id, 'position', l.position, 'description', l.description,
           'quantity', l.quantity, 'unit', l.unit, 'unit_price', l.unit_price,
           'taxable', l.taxable, 'tax_rate_percent', l.tax_rate_percent, 'line_total', l.line_total
         ) ORDER BY l.position)
    INTO v_lines
    FROM public.line_items l WHERE l.invoice_id = v_invoice.id;

  SELECT jsonb_build_object(
           'id', p.id, 'status', p.status, 'rail', p.rail, 'amount', p.amount,
           'provider_order_id', p.provider_order_id, 'created_at', p.created_at
         )
    INTO v_pending_payment
    FROM public.invoice_payments p
   WHERE p.invoice_id = v_invoice.id AND p.status = 'pending'
   ORDER BY p.created_at DESC LIMIT 1;

  RETURN jsonb_build_object(
    'id', v_invoice.id,
    'number', v_invoice.number,
    'status', v_invoice.status,
    'currency_display', v_invoice.currency_display,
    'subtotal', v_invoice.subtotal,
    'tax_total', v_invoice.tax_total,
    'total', v_invoice.total,
    'amount_paid', v_invoice.amount_paid,
    'amount_due', v_invoice.amount_due,
    'due_at', v_invoice.due_at,
    'notes_to_customer', v_invoice.notes_to_customer,
    'paid_at', v_invoice.paid_at,
    'voided_at', v_invoice.voided_at,
    'customer_name', v_customer_name,
    'line_items', COALESCE(v_lines, '[]'::jsonb),
    'pending_payment', v_pending_payment
  );
END;
$gpi$;
GRANT EXECUTE ON FUNCTION public.get_public_invoice(uuid) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- 6. document_events
-- ---------------------------------------------------------------------
CREATE TABLE public.document_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_kind text NOT NULL CHECK (document_kind IN ('invoice', 'estimate')),
  document_id uuid NOT NULL,
  event text NOT NULL CHECK (event IN ('created', 'sent', 'paid', 'void')),
  from_state text,
  to_state text,
  actor text NOT NULL CHECK (actor IN ('member', 'customer', 'system')),
  actor_ref text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_document_events_doc ON public.document_events(document_kind, document_id, created_at);
GRANT SELECT ON public.document_events TO authenticated;
GRANT ALL ON public.document_events TO service_role;
ALTER TABLE public.document_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "document_events_owner_select" ON public.document_events FOR SELECT TO authenticated
  USING (
    document_kind = 'invoice' AND EXISTS (
      SELECT 1 FROM public.invoices i WHERE i.id = document_id AND public.owns_company(i.business_id)
    )
  );
-- The member's own client logs 'sent'/'void' directly (sendInvoice/
-- voidInvoice in useInvoicing.ts) -- 'paid' never needs this policy, it's
-- written by finalize_invoice_payment (SECURITY DEFINER, bypasses RLS).
CREATE POLICY "document_events_owner_insert" ON public.document_events FOR INSERT TO authenticated
  WITH CHECK (
    document_kind = 'invoice' AND actor = 'member' AND event IN ('sent', 'void') AND EXISTS (
      SELECT 1 FROM public.invoices i WHERE i.id = document_id AND public.owns_company(i.business_id)
    )
  );

-- ---------------------------------------------------------------------
-- 7. books_items gains unit / default_taxable (kind is already free text)
-- ---------------------------------------------------------------------
ALTER TABLE public.books_items
  ADD COLUMN IF NOT EXISTS unit text,
  ADD COLUMN IF NOT EXISTS default_taxable boolean NOT NULL DEFAULT false;

-- ---------------------------------------------------------------------
-- 8. solana_payment_intents.order_kind gains 'invoice'
-- ---------------------------------------------------------------------
ALTER TABLE public.solana_payment_intents DROP CONSTRAINT IF EXISTS solana_payment_intents_order_kind_check;
ALTER TABLE public.solana_payment_intents
  ADD CONSTRAINT solana_payment_intents_order_kind_check
  CHECK (order_kind IN ('basket', 'content', 'gift', 'orchard', 'topup', 'invoice'));

-- ---------------------------------------------------------------------
-- 9. revenue_ledger.kind gains 'invoice_fee'; record_revenue() learns the
--    invoice_payments source (status = 'completed' is released).
-- ---------------------------------------------------------------------
ALTER TABLE public.revenue_ledger DROP CONSTRAINT IF EXISTS revenue_ledger_kind_check;
ALTER TABLE public.revenue_ledger
  ADD CONSTRAINT revenue_ledger_kind_check
  CHECK (kind IN (
    'sale_fee', 'gift_fee', 'content_fee', 'booking_fee', 'orchard_fee', 'invoice_fee',
    'processor_fee_income', 'refund_cost', 'payout_fee_cost',
    'correction', 'opening_balance'
  ));

CREATE OR REPLACE FUNCTION public.record_revenue(
  _kind            text,
  _amount          numeric,
  _environment     text,
  _source_table    text    DEFAULT NULL,
  _source_id       uuid    DEFAULT NULL,
  _rail            text    DEFAULT 'none',
  _release_ref     text    DEFAULT NULL,
  _recognised_at   timestamptz DEFAULT now(),
  _notes           text    DEFAULT NULL,
  _currency        text    DEFAULT 'USD',
  _idempotency_key text    DEFAULT NULL,
  _created_by      uuid    DEFAULT NULL
) RETURNS public.revenue_ledger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $rr$
DECLARE
  v_direction text;
  v_amount    numeric(18,2);
  v_released  boolean := false;
  v_row       public.revenue_ledger%ROWTYPE;
BEGIN
  IF _kind IN ('sale_fee', 'gift_fee', 'content_fee', 'booking_fee', 'orchard_fee', 'invoice_fee', 'processor_fee_income') THEN
    v_direction := 'income';
    v_amount := round(_amount, 2);
  ELSIF _kind IN ('refund_cost', 'payout_fee_cost') THEN
    v_direction := 'cost';
    v_amount := -abs(round(_amount, 2));
  ELSIF _kind IN ('correction', 'opening_balance') THEN
    v_amount := round(_amount, 2);
    v_direction := CASE WHEN v_amount > 0 THEN 'income' ELSE 'cost' END;
  ELSE
    RAISE EXCEPTION 'record_revenue: unknown kind %', _kind;
  END IF;

  IF v_amount = 0 THEN
    RAISE WARNING 'record_revenue: zero amount for % % % -- nothing recorded', _kind, _source_table, _source_id;
    RETURN NULL;
  END IF;
  IF v_direction = 'income' AND v_amount < 0 THEN
    RAISE EXCEPTION 'record_revenue: % must be positive, got %', _kind, _amount;
  END IF;

  IF _kind IN ('correction', 'opening_balance') THEN
    v_released := true;
  ELSIF _source_table IS NULL OR _source_id IS NULL THEN
    RAISE EXCEPTION 'record_revenue: % needs a source row', _kind;
  ELSIF _source_table = 'product_bestowals' AND _kind IN ('sale_fee', 'booking_fee', 'processor_fee_income', 'refund_cost') THEN
    SELECT (status = 'completed') INTO v_released FROM public.product_bestowals WHERE id = _source_id;
  ELSIF _source_table = 'bookings' AND _kind IN ('booking_fee', 'refund_cost') THEN
    SELECT (status = 'paid') INTO v_released FROM public.bookings WHERE id = _source_id;
  ELSIF _source_table = 'content_purchases' AND _kind IN ('content_fee', 'processor_fee_income', 'refund_cost') THEN
    SELECT (payment_status = 'completed') INTO v_released FROM public.content_purchases WHERE id = _source_id;
  ELSIF _source_table = 'bestowals' AND _kind IN ('gift_fee', 'processor_fee_income', 'refund_cost') THEN
    SELECT (payment_status IN ('completed', 'distributed') AND orchard_id IS NULL)
      INTO v_released FROM public.bestowals WHERE id = _source_id;
  ELSIF _source_table = 'orchard_releases' AND _kind IN ('orchard_fee', 'refund_cost') THEN
    IF to_regclass('public.orchard_releases') IS NULL THEN
      RAISE WARNING 'record_revenue: orchard_releases is not built yet (Phase B) -- nothing recorded';
      RETURN NULL;
    END IF;
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.orchard_releases WHERE id = $1)' INTO v_released USING _source_id;
  ELSIF _source_table = 'orchard_refunds' AND _kind = 'refund_cost' THEN
    IF to_regclass('public.orchard_refunds') IS NULL THEN
      RAISE WARNING 'record_revenue: orchard_refunds is not built yet (Phase C) -- nothing recorded';
      RETURN NULL;
    END IF;
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.orchard_refunds WHERE id = $1)' INTO v_released USING _source_id;
  ELSIF _source_table = 'payouts' AND _kind = 'payout_fee_cost' THEN
    SELECT (status = 'paid') INTO v_released FROM public.payouts WHERE id = _source_id;
  ELSIF _source_table = 'invoice_payments' AND _kind = 'invoice_fee' THEN
    SELECT (status = 'completed') INTO v_released FROM public.invoice_payments WHERE id = _source_id;
  ELSE
    RAISE EXCEPTION 'record_revenue: % is not a valid source for %', _source_table, _kind;
  END IF;

  IF NOT COALESCE(v_released, false) THEN
    RAISE WARNING 'record_revenue: % % is not completed/released -- nothing recorded (kind %)', _source_table, _source_id, _kind;
    RETURN NULL;
  END IF;

  INSERT INTO public.revenue_ledger (
    kind, direction, amount, currency, rail, environment,
    source_table, source_id, release_ref, recognised_at, idempotency_key, notes, created_by
  ) VALUES (
    _kind, v_direction, v_amount, COALESCE(_currency, 'USD'), COALESCE(_rail, 'none'), _environment,
    _source_table, _source_id, _release_ref, COALESCE(_recognised_at, now()), _idempotency_key, _notes, _created_by
  )
  ON CONFLICT (kind, source_table, source_id, environment) WHERE kind <> 'correction' AND source_table IS NOT NULL
  DO NOTHING
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    SELECT * INTO v_row FROM public.revenue_ledger
     WHERE kind = _kind AND source_table = _source_table AND source_id = _source_id AND environment = _environment
     LIMIT 1;
  END IF;

  RETURN v_row;
END;
$rr$;

-- ---------------------------------------------------------------------
-- 10. finalize_invoice_payment(): the one place an invoice payment
--     becomes paid. Idempotent (locks the payment row, short-circuits if
--     already completed). Mirrors finalize_basket_order's shape: one SQL
--     transaction moves the payment, the invoice, and the money-owed
--     figure together, so the member's earning and S2G's fee can never
--     drift apart from the invoice's own paid state.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finalize_invoice_payment(_payment_id uuid, _environment text, _reference text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fip$
DECLARE
  v_payment public.invoice_payments%ROWTYPE;
  v_invoice public.invoices%ROWTYPE;
  v_fee numeric(14,2);
BEGIN
  SELECT * INTO v_payment FROM public.invoice_payments WHERE id = _payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invoice_payment_not_found: %', _payment_id; END IF;
  IF v_payment.status = 'completed' THEN RETURN; END IF; -- idempotent short-circuit

  SELECT * INTO v_invoice FROM public.invoices WHERE id = v_payment.invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invoice_not_found_for_payment: %', _payment_id; END IF;

  v_fee := round(v_payment.amount * 0.15, 2);

  UPDATE public.invoice_payments
     SET status = 'completed', payment_reference = COALESCE(_reference, payment_reference), completed_at = now(), fee_amount = v_fee
   WHERE id = _payment_id;

  UPDATE public.invoices
     SET amount_paid = amount_paid + v_payment.amount,
         status = 'paid',
         paid_at = COALESCE(paid_at, now())
   WHERE id = v_invoice.id;

  INSERT INTO public.document_events (document_kind, document_id, event, from_state, to_state, actor, actor_ref, notes)
  VALUES ('invoice', v_invoice.id, 'paid', v_invoice.status, 'paid', 'system', v_payment.rail, 'invoice_payments:' || _payment_id::text);

  PERFORM public.record_revenue('invoice_fee', v_fee, _environment, 'invoice_payments', _payment_id, v_payment.rail, _reference);
END;
$fip$;
REVOKE ALL ON FUNCTION public.finalize_invoice_payment(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_invoice_payment(uuid, text, text) TO service_role;

-- ---------------------------------------------------------------------
-- 11. owed_payout_balances() gains the invoice recipient: the business
--     owner is owed the invoice's own total (S2G's 15% already left as
--     the invoice_fee row above -- the member's earning is the buyer's
--     payment minus that fee, same "sower's price plus S2G's fee carried
--     by the payer" split as every other sale). Paid once, on
--     finalize_invoice_payment -- there is no separate "release" step for
--     an invoice the way there is for an orchard pocket.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.owed_payout_balances()
RETURNS TABLE (
  recipient_type text,
  recipient_user_id uuid,
  amount_usd numeric,
  covered_rows jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $opb$
  WITH rows AS (
    SELECT
      'sower'::text AS recipient_type,
      s.user_id AS recipient_user_id,
      pb.sower_amount AS amount,
      jsonb_build_object('source_table', 'product_bestowals', 'source_id', pb.id) AS ref
    FROM public.product_bestowals pb
    JOIN public.sowers s ON s.id = pb.sower_id
    WHERE pb.status = 'completed'
      AND pb.release_status = 'released'
      AND pb.payout_status = 'pending'

    UNION ALL

    SELECT
      'sower',
      cp.seller_id,
      cp.base_amount,
      jsonb_build_object('source_table', 'content_purchases', 'source_id', cp.id)
    FROM public.content_purchases cp
    WHERE cp.payment_status = 'completed'
      AND cp.payout_status = 'pending'

    UNION ALL

    SELECT
      'sower',
      COALESCE((b.distribution_data ->> 'sower_user_id')::uuid, o.user_id),
      COALESCE((b.distribution_data ->> 'sower_amount')::numeric, b.base_amount),
      jsonb_build_object('source_table', 'bestowals', 'source_id', b.id)
    FROM public.bestowals b
    LEFT JOIN public.orchards o ON o.id = b.orchard_id
    WHERE b.payment_status IN ('completed', 'distributed')
      AND b.payout_status = 'pending'
      AND (
        (b.distribution_data ->> 'sower_user_id') IS NOT NULL
        OR o.user_id IS NOT NULL
      )

    UNION ALL

    SELECT
      'whisperer',
      w.user_id,
      we.amount,
      jsonb_build_object('source_table', 'whisperer_earnings', 'source_id', we.id)
    FROM public.whisperer_earnings we
    JOIN public.whisperers w ON w.id = we.whisperer_id
    WHERE we.status = 'payable'

    UNION ALL

    SELECT
      'invoice',
      c.owner_user_id,
      ip.amount - COALESCE(ip.fee_amount, 0),
      jsonb_build_object('source_table', 'invoice_payments', 'source_id', ip.id)
    FROM public.invoice_payments ip
    JOIN public.invoices i ON i.id = ip.invoice_id
    JOIN public.companies c ON c.id = i.business_id
    WHERE ip.status = 'completed'
      AND ip.payout_status = 'pending'
  )
  SELECT
    recipient_type,
    recipient_user_id,
    ROUND(SUM(amount), 2) AS amount_usd,
    jsonb_agg(ref) AS covered_rows
  FROM rows
  WHERE recipient_user_id IS NOT NULL
  GROUP BY recipient_type, recipient_user_id;
$opb$;
REVOKE ALL ON FUNCTION public.owed_payout_balances() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.owed_payout_balances() TO service_role;

-- ---------------------------------------------------------------------
-- 12. books_income.income_type gains 'invoice' -- syncBooksEntries writes
--     one row per paid invoice the same way it does for a sale (section 4:
--     "A paid invoice becomes a books_income row the same way a sale does").
-- ---------------------------------------------------------------------
ALTER TABLE public.books_income DROP CONSTRAINT IF EXISTS books_income_income_type_check;
ALTER TABLE public.books_income
  ADD CONSTRAINT books_income_income_type_check
  CHECK (income_type IN ('sale', 'gift', 'invoice'));
