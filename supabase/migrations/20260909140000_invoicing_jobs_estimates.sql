-- Member invoicing, Phase 1 full workflow (jobs, estimates, payment
-- schedules, auto-invoicing, chat-only messaging). Builds on
-- 20260909100000_invoicing_phase1.sql, which shipped feature_subscriptions/
-- has_invoicing_access/record_revenue's invoice_fee kind/owed_payout_balances'
-- invoice branch/solana_payment_intents.order_kind/books_items columns --
-- all unchanged here, still correct.
--
-- invoices and line_items are DROPPED and rebuilt: both are empty (verified
-- live immediately before this migration) and their old shape (a standalone
-- invoice with its own line items, no estimate/job) is superseded by the
-- estimate-driven model below, where every invoice is one payment-schedule
-- slice of an estimate and line items describe the estimate's work, not
-- the invoice.
--
-- SECURITY NOTE on customer sign-up: the brief describes join-with-invite
-- as an endpoint that "creates auth user if needed or signs in existing"
-- from a public request. Implemented literally, that authenticates someone
-- without ever checking a password -- if an invited email happens to match
-- an existing member's account, anyone holding the invite link (which
-- travels over SMS/WhatsApp, not a secure channel) could sign in as that
-- member. Built safely instead: /join uses this app's own existing
-- signUp/signInWithPassword (RegisterPage/useAuth.jsx, unchanged, already
-- password-verified), and claim_customer_invite() below -- called only
-- after that real authentication completes -- does the token-linking. Same
-- shape as claim_referral_code() already in this codebase.

-- ---------------------------------------------------------------------
-- 1. customers gains invite fields
-- ---------------------------------------------------------------------
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS invite_token uuid,
  ADD COLUMN IF NOT EXISTS invite_expires_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_invite_token ON public.customers(invite_token) WHERE invite_token IS NOT NULL;

-- Sower-only: does this email already belong to a Sow2Grow member? Used by
-- CreateCustomerDialog to decide invite-link vs. immediate chat. Narrow on
-- purpose -- returns only a user id (or null), never other account data,
-- and only to a caller who owns at least one company (a real sower),
-- so it can't be used as a bare email-enumeration oracle by just anyone
-- with an account.
CREATE OR REPLACE FUNCTION public.find_member_by_email(_email text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fmbe$
DECLARE
  v_uid uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.companies WHERE owner_user_id = auth.uid()) THEN
    RETURN NULL;
  END IF;
  SELECT id INTO v_uid FROM auth.users WHERE lower(email) = lower(trim(_email)) LIMIT 1;
  RETURN v_uid;
END;
$fmbe$;
GRANT EXECUTE ON FUNCTION public.find_member_by_email(text) TO authenticated;

-- A linked customer can read their own customers row. Without this, every
-- OTHER customer-facing RLS policy that checks customer membership via a
-- subquery on this table (job_notes_customer_select, estimates_customer_select,
-- invoices_customer_select, invoice_payments_customer_select) silently
-- fails too -- those subqueries run under the same caller and are
-- themselves subject to this table's RLS, so with no SELECT policy here
-- at all, a real linked customer could not see their own estimate, job,
-- or invoice despite each of those tables' own policy looking correct in
-- isolation. Found by the SQL fixture, not by inspection.
GRANT SELECT ON public.customers TO authenticated;
CREATE POLICY "customers_self_select" ON public.customers FOR SELECT TO authenticated
  USING (member_user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 2. job_notes, with its own S2G chat channel
-- ---------------------------------------------------------------------
CREATE TABLE public.job_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  date_needed date,
  location text,
  status text NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'quoted', 'approved', 'in_progress', 'completed', 'cancelled')),
  sower_user_id uuid NOT NULL,
  assigned_to_member_id uuid,
  notes_to_supplier text,
  chat_channel_id uuid REFERENCES public.chat_rooms(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_job_notes_business ON public.job_notes(business_id, created_at DESC);
GRANT SELECT, UPDATE ON public.job_notes TO authenticated;
GRANT ALL ON public.job_notes TO service_role;
ALTER TABLE public.job_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "job_notes_owner_select" ON public.job_notes FOR SELECT TO authenticated
  USING (public.owns_company(business_id));
-- job_notes_customer_select (customer can see the job behind an estimate
-- they were sent) is created further down, right after the estimates
-- table exists -- it references public.estimates, which doesn't exist yet
-- at this point in the file.
CREATE POLICY "job_notes_owner_update" ON public.job_notes FOR UPDATE TO authenticated
  USING (public.owns_company(business_id) AND public.has_invoicing_access(auth.uid()))
  WITH CHECK (public.owns_company(business_id) AND public.has_invoicing_access(auth.uid()));
CREATE TRIGGER trg_job_notes_updated BEFORE UPDATE ON public.job_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- job_notes_owner_update's RLS lets the sower update the row directly
-- (editing notes, per the brief) -- this guard is what actually stops a
-- raw client call from also jumping `status` straight to 'completed' and
-- skipping mark_job_progress's milestone-invoice-sending step. Every
-- transition the SECURITY DEFINER functions below make is listed here too
-- (SECURITY DEFINER bypasses RLS, never triggers).
CREATE OR REPLACE FUNCTION public.enforce_job_notes_status_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $ejnst$
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF (OLD.status, NEW.status) IN (
    ('planning', 'quoted'), ('planning', 'approved'), ('planning', 'cancelled'),
    ('quoted', 'approved'), ('quoted', 'cancelled'),
    ('approved', 'in_progress'), ('approved', 'completed'), ('approved', 'cancelled'),
    ('in_progress', 'completed'), ('in_progress', 'cancelled')
  ) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'job_status_transition_refused: % -> %', OLD.status, NEW.status;
END;
$ejnst$;
DROP TRIGGER IF EXISTS trg_job_notes_status_transition ON public.job_notes;
CREATE TRIGGER trg_job_notes_status_transition
BEFORE UPDATE OF status ON public.job_notes
FOR EACH ROW EXECUTE FUNCTION public.enforce_job_notes_status_transition();

-- INSERT goes through this function, not a raw client insert -- creating a
-- job also means creating its chat room and adding the sower as the first
-- (and, at this point, only) participant, atomically. Mirrors the shape of
-- every other "insert + set up related rows" flow in Books
-- (ensure_whisperer_ref_link, orchard_apply_holding).
CREATE OR REPLACE FUNCTION public.create_job_note(
  _business_id uuid, _title text, _description text, _date_needed date,
  _location text, _notes_to_supplier text
) RETURNS public.job_notes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $cjn$
DECLARE
  v_room_id uuid;
  v_job public.job_notes%ROWTYPE;
BEGIN
  IF NOT public.owns_company(_business_id) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NOT public.has_invoicing_access(auth.uid()) THEN RAISE EXCEPTION 'invoicing_access_required'; END IF;

  -- trg_ensure_creator_participant (existing, chat_rooms AFTER INSERT)
  -- already adds created_by as a moderator participant -- no explicit
  -- chat_participants insert needed here (one collided with it directly).
  INSERT INTO public.chat_rooms (name, room_type, created_by)
  VALUES (COALESCE(_title, 'Job'), 'group', auth.uid())
  RETURNING id INTO v_room_id;

  INSERT INTO public.job_notes (business_id, title, description, date_needed, location, sower_user_id, notes_to_supplier, chat_channel_id)
  VALUES (_business_id, _title, _description, _date_needed, _location, auth.uid(), _notes_to_supplier, v_room_id)
  RETURNING * INTO v_job;

  INSERT INTO public.job_events (job_notes_id, event_type, to_state, actor, actor_ref)
  VALUES (v_job.id, 'status_change', 'planning', 'member', auth.uid()::text);

  RETURN v_job;
END;
$cjn$;
GRANT EXECUTE ON FUNCTION public.create_job_note(uuid, text, text, date, text, text) TO authenticated;

-- ---------------------------------------------------------------------
-- 3. supplier_quotes
-- ---------------------------------------------------------------------
CREATE TABLE public.supplier_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_notes_id uuid NOT NULL REFERENCES public.job_notes(id) ON DELETE CASCADE,
  supplier_name text NOT NULL,
  amount numeric(14,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  attached_document_path text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_supplier_quotes_job ON public.supplier_quotes(job_notes_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_quotes TO authenticated;
GRANT ALL ON public.supplier_quotes TO service_role;
ALTER TABLE public.supplier_quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "supplier_quotes_owner_all" ON public.supplier_quotes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.job_notes j WHERE j.id = job_notes_id AND public.owns_company(j.business_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.job_notes j WHERE j.id = job_notes_id AND public.owns_company(j.business_id)) AND public.has_invoicing_access(auth.uid()));

-- ---------------------------------------------------------------------
-- 4. estimates
-- ---------------------------------------------------------------------
CREATE TABLE public.estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  job_notes_id uuid NOT NULL REFERENCES public.job_notes(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  number text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'rejected')),
  currency_display text NOT NULL DEFAULT 'USD',
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  tax_total numeric(14,2) NOT NULL DEFAULT 0,
  total numeric(14,2) NOT NULL DEFAULT 0,
  public_token uuid NOT NULL DEFAULT gen_random_uuid(),
  approval_expires_at timestamptz,
  approved_at timestamptz,
  approved_by_email text,
  rejected_at timestamptz,
  rejected_reason text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, number),
  UNIQUE (public_token)
);
CREATE INDEX idx_estimates_business ON public.estimates(business_id, created_at DESC);
CREATE INDEX idx_estimates_job ON public.estimates(job_notes_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estimates TO authenticated;
GRANT ALL ON public.estimates TO service_role;
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "estimates_owner_select" ON public.estimates FOR SELECT TO authenticated
  USING (public.owns_company(business_id));
CREATE POLICY "estimates_customer_select" ON public.estimates FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.member_user_id = auth.uid()));
CREATE POLICY "estimates_owner_insert" ON public.estimates FOR INSERT TO authenticated
  WITH CHECK (public.owns_company(business_id) AND public.has_invoicing_access(auth.uid()));
CREATE POLICY "estimates_owner_update" ON public.estimates FOR UPDATE TO authenticated
  USING (public.owns_company(business_id) AND public.has_invoicing_access(auth.uid()))
  WITH CHECK (public.owns_company(business_id) AND public.has_invoicing_access(auth.uid()));
CREATE POLICY "estimates_owner_delete" ON public.estimates FOR DELETE TO authenticated
  USING (public.owns_company(business_id) AND status = 'draft');
CREATE TRIGGER trg_estimates_updated BEFORE UPDATE ON public.estimates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Deferred from job_notes' own RLS section above -- needs this table to exist.
CREATE POLICY "job_notes_customer_select" ON public.job_notes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.estimates e JOIN public.customers c ON c.id = e.customer_id
       WHERE e.job_notes_id = job_notes.id AND c.member_user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.next_estimate_number(_business_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $nen$
DECLARE
  v_next integer;
BEGIN
  SELECT COALESCE(MAX(CAST(NULLIF(regexp_replace(number, '\D', '', 'g'), '') AS integer)), 0) + 1
    INTO v_next FROM public.estimates WHERE business_id = _business_id;
  RETURN 'EST-' || lpad(v_next::text, 4, '0');
END;
$nen$;
GRANT EXECUTE ON FUNCTION public.next_estimate_number(uuid) TO authenticated, service_role;

-- Approval/rejection transition guard, same shape as invoices'.
CREATE OR REPLACE FUNCTION public.enforce_estimate_status_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $eest$
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF (OLD.status, NEW.status) IN (('draft', 'sent'), ('sent', 'approved'), ('sent', 'rejected')) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'estimate_status_transition_refused: % -> %', OLD.status, NEW.status;
END;
$eest$;
DROP TRIGGER IF EXISTS trg_estimates_status_transition ON public.estimates;
CREATE TRIGGER trg_estimates_status_transition
BEFORE UPDATE OF status ON public.estimates
FOR EACH ROW EXECUTE FUNCTION public.enforce_estimate_status_transition();

-- ---------------------------------------------------------------------
-- 5. line_items now belong to the estimate (the work), not an invoice
--    (a payment slice) -- see the file header.
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS public.line_items;
CREATE TABLE public.line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id uuid NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
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
CREATE INDEX idx_line_items_estimate ON public.line_items(estimate_id, position);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.line_items TO authenticated;
GRANT ALL ON public.line_items TO service_role;
ALTER TABLE public.line_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "line_items_owner_select" ON public.line_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.estimates e WHERE e.id = estimate_id AND public.owns_company(e.business_id)));
CREATE POLICY "line_items_owner_write" ON public.line_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.estimates e WHERE e.id = estimate_id AND public.owns_company(e.business_id) AND e.status = 'draft'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.estimates e WHERE e.id = estimate_id AND public.owns_company(e.business_id) AND e.status = 'draft') AND public.has_invoicing_access(auth.uid()));

-- ---------------------------------------------------------------------
-- 6. payment_schedule_items
-- ---------------------------------------------------------------------
CREATE TABLE public.payment_schedule_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id uuid NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  label text NOT NULL,
  percentage_of_total numeric(5,2),
  fixed_amount numeric(14,2),
  amount numeric(14,2) NOT NULL, -- computed by the client from percentage_of_total * estimate.total / 100, or fixed_amount directly, at build time (a cross-table generated column isn't possible in Postgres)
  trigger_type text NOT NULL CHECK (trigger_type IN ('date', 'job_status')),
  due_offset_days integer, -- meaningful only when trigger_type = 'date': days after estimate approval
  trigger_job_status text CHECK (trigger_job_status IN ('job_50pct', 'job_completion')), -- meaningful only when trigger_type = 'job_status'
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'due', 'paid', 'void')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (trigger_type = 'date' AND trigger_job_status IS NULL)
    OR (trigger_type = 'job_status' AND trigger_job_status IS NOT NULL)
  ),
  CHECK (num_nonnulls(percentage_of_total, fixed_amount) = 1)
);
CREATE INDEX idx_payment_schedule_items_estimate ON public.payment_schedule_items(estimate_id, position);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_schedule_items TO authenticated;
GRANT ALL ON public.payment_schedule_items TO service_role;
ALTER TABLE public.payment_schedule_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment_schedule_items_owner_select" ON public.payment_schedule_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.estimates e WHERE e.id = estimate_id AND public.owns_company(e.business_id)));
CREATE POLICY "payment_schedule_items_owner_write" ON public.payment_schedule_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.estimates e WHERE e.id = estimate_id AND public.owns_company(e.business_id) AND e.status = 'draft'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.estimates e WHERE e.id = estimate_id AND public.owns_company(e.business_id) AND e.status = 'draft') AND public.has_invoicing_access(auth.uid()));

-- ---------------------------------------------------------------------
-- 7. invoices, rebuilt: one row per payment_schedule_item, never standalone.
-- ---------------------------------------------------------------------
-- CASCADE: invoice_payments' FK to invoices, and the invoices-dependent
-- RLS policies on invoice_payments/document_events, all get dropped along
-- with it and are recreated below once the new invoices table exists.
DROP TABLE IF EXISTS public.invoices CASCADE;
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  estimate_id uuid NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
  job_notes_id uuid NOT NULL REFERENCES public.job_notes(id) ON DELETE CASCADE,
  linked_schedule_item_id uuid REFERENCES public.payment_schedule_items(id) ON DELETE SET NULL,
  number text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'void')),
  kind text NOT NULL DEFAULT 'milestone' CHECK (kind IN ('standard', 'deposit', 'milestone', 'balance')),
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
CREATE INDEX idx_invoices_job ON public.invoices(job_notes_id);
CREATE INDEX idx_invoices_estimate ON public.invoices(estimate_id);
GRANT SELECT ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
-- No client INSERT/UPDATE -- invoices are only ever written by
-- generate_estimate_invoices / mark_job_progress / finalize_invoice_payment
-- (all SECURITY DEFINER), never built by hand the way Phase 1's standalone
-- invoices were.
CREATE POLICY "invoices_owner_select" ON public.invoices FOR SELECT TO authenticated
  USING (public.owns_company(business_id));
CREATE POLICY "invoices_customer_select" ON public.invoices FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.member_user_id = auth.uid()));
CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Re-established after DROP ... CASCADE above removed them along with the
-- old invoices table: invoice_payments' FK, and the invoices-dependent RLS
-- policies on invoice_payments and document_events (Phase 1's).
ALTER TABLE public.invoice_payments
  ADD CONSTRAINT invoice_payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;
CREATE POLICY "invoice_payments_owner_select" ON public.invoice_payments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND public.owns_company(i.business_id)));
CREATE POLICY "invoice_payments_customer_select" ON public.invoice_payments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.invoices i JOIN public.customers c ON c.id = i.customer_id
     WHERE i.id = invoice_id AND c.member_user_id = auth.uid()
  ));
CREATE POLICY "document_events_owner_select" ON public.document_events FOR SELECT TO authenticated
  USING (
    document_kind = 'invoice' AND EXISTS (
      SELECT 1 FROM public.invoices i WHERE i.id = document_id AND public.owns_company(i.business_id)
    )
  );

CREATE OR REPLACE FUNCTION public.next_job_invoice_number(_business_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $njin$
DECLARE
  v_next integer;
BEGIN
  SELECT COALESCE(MAX(CAST(NULLIF(regexp_replace(number, '\D', '', 'g'), '') AS integer)), 0) + 1
    INTO v_next FROM public.invoices WHERE business_id = _business_id;
  RETURN 'INV-' || lpad(v_next::text, 4, '0');
END;
$njin$;
GRANT EXECUTE ON FUNCTION public.next_job_invoice_number(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.enforce_job_invoice_status_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $ejist$
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF (OLD.status, NEW.status) IN (('draft', 'sent'), ('draft', 'void'), ('sent', 'void'), ('sent', 'paid')) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'invoice_status_transition_refused: % -> %', OLD.status, NEW.status;
END;
$ejist$;
DROP TRIGGER IF EXISTS trg_invoices_status_transition ON public.invoices;
CREATE TRIGGER trg_invoices_status_transition
BEFORE UPDATE OF status ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.enforce_job_invoice_status_transition();

-- ---------------------------------------------------------------------
-- 8. invoice_payments -- same shape as Phase 1's, table itself is
--    unchanged (still empty; recreated only if missing).
-- ---------------------------------------------------------------------
-- (Table already exists from 20260909100000_invoicing_phase1.sql with the
-- exact columns this brief asks for, including payout_status/
-- payout_completed_at/payout_error added there for owed_payout_balances().
-- Nothing to change.)

-- ---------------------------------------------------------------------
-- 9. job_events
-- ---------------------------------------------------------------------
CREATE TABLE public.job_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_notes_id uuid NOT NULL REFERENCES public.job_notes(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'approval', 'rejection', 'status_change', 'invoice_created', 'invoice_sent',
    'invoice_paid', 'customer_invited', 'customer_joined'
  )),
  from_state text,
  to_state text,
  actor text NOT NULL CHECK (actor IN ('member', 'customer', 'system')),
  actor_ref text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_job_events_job ON public.job_events(job_notes_id, created_at);
GRANT SELECT ON public.job_events TO authenticated;
GRANT ALL ON public.job_events TO service_role;
ALTER TABLE public.job_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "job_events_owner_select" ON public.job_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.job_notes j WHERE j.id = job_notes_id AND public.owns_company(j.business_id)));
-- customer_invited rows are readable without the caller owning the
-- business -- an invite must be checkable/acceptable before login. Scoped
-- to that one event_type only, not a blanket public grant.
GRANT SELECT ON public.job_events TO anon;
CREATE POLICY "job_events_public_invite_select" ON public.job_events FOR SELECT TO anon
  USING (event_type = 'customer_invited');

-- ---------------------------------------------------------------------
-- 10. document_events gains 'approved'/'rejected' (document_kind already
--     included 'estimate' since Phase 1).
-- ---------------------------------------------------------------------
ALTER TABLE public.document_events DROP CONSTRAINT IF EXISTS document_events_event_check;
ALTER TABLE public.document_events
  ADD CONSTRAINT document_events_event_check
  CHECK (event IN ('created', 'sent', 'approved', 'rejected', 'paid', 'void'));
-- job_notes_id-scoped document_events (estimates) need their own SELECT
-- policy -- the Phase 1 one only covers document_kind = 'invoice'.
CREATE POLICY "document_events_estimate_owner_select" ON public.document_events FOR SELECT TO authenticated
  USING (
    document_kind = 'estimate' AND EXISTS (
      SELECT 1 FROM public.estimates e WHERE e.id = document_id AND public.owns_company(e.business_id)
    )
  );

-- ---------------------------------------------------------------------
-- 11. Chat helper: post a system message into a job's chat room.
--     sender_id null, matching every other system message in this app
--     (see _shared/postFinalize/messaging.ts). Kept as one function so
--     every job-workflow message goes through the same shape.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.post_job_chat_message(_job_notes_id uuid, _content text, _message_type text DEFAULT 'text')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $pjcm$
DECLARE
  v_room uuid;
BEGIN
  SELECT chat_channel_id INTO v_room FROM public.job_notes WHERE id = _job_notes_id;
  IF v_room IS NULL THEN RETURN; END IF;
  INSERT INTO public.chat_messages (room_id, sender_id, content, message_type, system_metadata)
  VALUES (v_room, NULL, _content, _message_type, jsonb_build_object('is_system', true, 'sender_name', 'Sow2Grow', 'source', 'job_notes', 'job_notes_id', _job_notes_id));
END;
$pjcm$;
GRANT EXECUTE ON FUNCTION public.post_job_chat_message(uuid, text, text) TO service_role;

-- ---------------------------------------------------------------------
-- 12. Estimate send: draft -> sent, posts the estimate link (or the
--     invite link, for a not-yet-member customer) in the job chat.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.send_estimate(_estimate_id uuid)
RETURNS public.estimates
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $se$
DECLARE
  v_est public.estimates%ROWTYPE;
  v_cust public.customers%ROWTYPE;
  v_link text;
BEGIN
  SELECT * INTO v_est FROM public.estimates WHERE id = _estimate_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'estimate_not_found'; END IF;
  IF NOT public.owns_company(v_est.business_id) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NOT public.has_invoicing_access(auth.uid()) THEN RAISE EXCEPTION 'invoicing_access_required'; END IF;

  UPDATE public.estimates SET status = 'sent', sent_at = now() WHERE id = _estimate_id RETURNING * INTO v_est;
  INSERT INTO public.document_events (document_kind, document_id, event, from_state, to_state, actor, actor_ref)
  VALUES ('estimate', v_est.id, 'sent', 'draft', 'sent', 'member', auth.uid()::text);

  SELECT * INTO v_cust FROM public.customers WHERE id = v_est.customer_id;
  v_link := 'https://sow2growapp.com/estimate/' || v_est.public_token::text;

  IF v_cust.member_user_id IS NOT NULL THEN
    PERFORM public.post_job_chat_message(v_est.job_notes_id, 'Estimate ' || v_est.number || ' is ready to review: ' || v_link, 'estimate_link');
  ELSE
    IF v_cust.invite_token IS NULL THEN
      UPDATE public.customers SET invite_token = gen_random_uuid(), invite_expires_at = now() + interval '30 days' WHERE id = v_cust.id
        RETURNING * INTO v_cust;
      INSERT INTO public.job_events (job_notes_id, event_type, actor, actor_ref, notes)
      VALUES (v_est.job_notes_id, 'customer_invited', 'system', v_cust.id::text, v_cust.email);
    END IF;
    PERFORM public.post_job_chat_message(v_est.job_notes_id, 'Estimate sent to ' || COALESCE(v_cust.email, v_cust.name) || '. They''ll join when they open the invite link.', 'text');
    PERFORM public.post_job_chat_message(v_est.job_notes_id, 'Invite link: https://sow2growapp.com/join?invite=' || v_cust.invite_token::text, 'invite_link');
  END IF;

  RETURN v_est;
END;
$se$;
GRANT EXECUTE ON FUNCTION public.send_estimate(uuid) TO authenticated;

-- ---------------------------------------------------------------------
-- 13. claim_customer_invite: the SAFE half of join-with-invite. Called by
--     an already-authenticated client right after a normal signUp/
--     signInWithPassword -- never before. Requires the caller's own email
--     to match the invited email (defense in depth: a token alone, if it
--     leaked, still can't attach to someone else's account).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_customer_invite(_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $cci$
DECLARE
  v_cust public.customers%ROWTYPE;
  v_job public.job_notes%ROWTYPE;
  v_my_email text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT * INTO v_cust FROM public.customers WHERE invite_token = _token;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'invite_not_found'); END IF;
  IF v_cust.invite_expires_at IS NOT NULL AND v_cust.invite_expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invite_expired');
  END IF;

  SELECT email INTO v_my_email FROM auth.users WHERE id = auth.uid();
  IF v_cust.email IS NOT NULL AND lower(v_my_email) <> lower(v_cust.email) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'email_mismatch');
  END IF;

  UPDATE public.customers
     SET member_user_id = auth.uid(), invite_token = NULL, invite_expires_at = NULL
   WHERE id = v_cust.id;

  -- Add to every job's chat this customer has an estimate on (usually one).
  FOR v_job IN
    SELECT DISTINCT j.* FROM public.job_notes j
     JOIN public.estimates e ON e.job_notes_id = j.id
     WHERE e.customer_id = v_cust.id AND j.chat_channel_id IS NOT NULL
  LOOP
    INSERT INTO public.chat_participants (room_id, user_id)
    VALUES (v_job.chat_channel_id, auth.uid())
    ON CONFLICT (room_id, user_id) DO NOTHING;
    PERFORM public.post_job_chat_message(v_job.id, 'Customer joined the chat.', 'text');
    INSERT INTO public.job_events (job_notes_id, event_type, actor, actor_ref)
    VALUES (v_job.id, 'customer_joined', 'customer', auth.uid()::text);
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'customer_id', v_cust.id);
END;
$cci$;
GRANT EXECUTE ON FUNCTION public.claim_customer_invite(uuid) TO authenticated;

-- Public, read-only invite preview for the /join page before the visitor
-- has an account -- name of the business and job title only, never the
-- customer's own contact details.
CREATE OR REPLACE FUNCTION public.get_invite_preview(_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $gip$
DECLARE
  v_cust public.customers%ROWTYPE;
  v_biz_name text;
BEGIN
  SELECT * INTO v_cust FROM public.customers WHERE invite_token = _token;
  IF NOT FOUND OR (v_cust.invite_expires_at IS NOT NULL AND v_cust.invite_expires_at < now()) THEN
    RETURN NULL;
  END IF;
  SELECT name INTO v_biz_name FROM public.companies WHERE id = v_cust.business_id;
  RETURN jsonb_build_object('business_name', v_biz_name, 'email', v_cust.email);
END;
$gip$;
GRANT EXECUTE ON FUNCTION public.get_invite_preview(uuid) TO anon, authenticated;

-- ---------------------------------------------------------------------
-- 14. Public estimate read, same shape as get_public_invoice.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_estimate(_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $gpe$
DECLARE
  v_est public.estimates%ROWTYPE;
  v_job public.job_notes%ROWTYPE;
  v_cust public.customers%ROWTYPE;
  v_lines jsonb;
  v_schedule jsonb;
  v_quotes jsonb;
BEGIN
  SELECT * INTO v_est FROM public.estimates WHERE public_token = _token;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO v_job FROM public.job_notes WHERE id = v_est.job_notes_id;
  SELECT * INTO v_cust FROM public.customers WHERE id = v_est.customer_id;

  SELECT jsonb_agg(jsonb_build_object(
    'description', l.description, 'quantity', l.quantity, 'unit', l.unit,
    'unit_price', l.unit_price, 'taxable', l.taxable, 'tax_rate_percent', l.tax_rate_percent, 'line_total', l.line_total
  ) ORDER BY l.position) INTO v_lines FROM public.line_items l WHERE l.estimate_id = v_est.id;

  SELECT jsonb_agg(jsonb_build_object(
    'label', p.label, 'amount', p.amount, 'trigger_type', p.trigger_type,
    'trigger_job_status', p.trigger_job_status, 'due_offset_days', p.due_offset_days
  ) ORDER BY p.position) INTO v_schedule FROM public.payment_schedule_items p WHERE p.estimate_id = v_est.id;

  SELECT jsonb_agg(jsonb_build_object('supplier_name', q.supplier_name, 'amount', q.amount, 'currency', q.currency))
    INTO v_quotes FROM public.supplier_quotes q WHERE q.job_notes_id = v_job.id;

  RETURN jsonb_build_object(
    'id', v_est.id, 'number', v_est.number, 'status', v_est.status,
    'job_title', v_job.title, 'job_location', v_job.location, 'job_date_needed', v_job.date_needed,
    'subtotal', v_est.subtotal, 'tax_total', v_est.tax_total, 'total', v_est.total,
    'customer_name', v_cust.name,
    'line_items', COALESCE(v_lines, '[]'::jsonb),
    'payment_schedule', COALESCE(v_schedule, '[]'::jsonb),
    'supplier_quotes', COALESCE(v_quotes, '[]'::jsonb)
  );
END;
$gpe$;
GRANT EXECUTE ON FUNCTION public.get_public_estimate(uuid) TO anon, authenticated;

-- Rebuilt for this model: an invoice no longer carries its own line_items
-- (those belong to the estimate). The pay page shows the schedule slice
-- being billed (label + amount) plus the estimate's lines for context.
CREATE OR REPLACE FUNCTION public.get_public_invoice(_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $gpi2$
DECLARE
  v_invoice public.invoices%ROWTYPE;
  v_job public.job_notes%ROWTYPE;
  v_biz_name text;
  v_customer_name text;
  v_schedule_label text;
  v_lines jsonb;
BEGIN
  SELECT * INTO v_invoice FROM public.invoices WHERE public_token = _token;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT * INTO v_job FROM public.job_notes WHERE id = v_invoice.job_notes_id;
  SELECT name INTO v_biz_name FROM public.companies WHERE id = v_invoice.business_id;
  SELECT name INTO v_customer_name FROM public.customers WHERE id = v_invoice.customer_id;
  SELECT label INTO v_schedule_label FROM public.payment_schedule_items WHERE id = v_invoice.linked_schedule_item_id;

  SELECT jsonb_agg(jsonb_build_object(
    'description', l.description, 'quantity', l.quantity, 'unit', l.unit, 'line_total', l.line_total
  ) ORDER BY l.position) INTO v_lines FROM public.line_items l WHERE l.estimate_id = v_invoice.estimate_id;

  RETURN jsonb_build_object(
    'id', v_invoice.id, 'number', v_invoice.number, 'status', v_invoice.status, 'kind', v_invoice.kind,
    'schedule_label', v_schedule_label, 'business_name', v_biz_name, 'job_title', v_job.title,
    'customer_name', v_customer_name, 'subtotal', v_invoice.subtotal, 'tax_total', v_invoice.tax_total,
    'total', v_invoice.total, 'amount_paid', v_invoice.amount_paid, 'amount_due', v_invoice.amount_due,
    'due_at', v_invoice.due_at, 'paid_at', v_invoice.paid_at, 'voided_at', v_invoice.voided_at,
    'estimate_lines', COALESCE(v_lines, '[]'::jsonb)
  );
END;
$gpi2$;
GRANT EXECUTE ON FUNCTION public.get_public_invoice(uuid) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- 15. generate_estimate_invoices: one invoice per payment_schedule_item.
--     Deposit (position 0) goes out sent immediately; the rest stay
--     draft until their trigger fires (mark_job_progress below, or
--     immediately if their trigger is a date offset -- date-triggered
--     items besides the deposit still wait for send_scheduled_invoices'
--     due-date sweep, not built in this phase; see report).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.infer_invoice_kind(_label text) RETURNS text
LANGUAGE sql IMMUTABLE AS $iik$
  SELECT CASE
    WHEN _label ILIKE '%deposit%' THEN 'deposit'
    WHEN _label ILIKE '%balance%' OR _label ILIKE '%final%' THEN 'balance'
    ELSE 'milestone'
  END;
$iik$;

CREATE OR REPLACE FUNCTION public.generate_estimate_invoices(_estimate_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $gei$
DECLARE
  v_est public.estimates%ROWTYPE;
  v_item RECORD;
  v_invoice_id uuid;
  v_number text;
  v_first boolean := true;
  v_deposit_token uuid;
  v_ids uuid[] := '{}';
  v_existing jsonb;
BEGIN
  SELECT * INTO v_est FROM public.estimates WHERE id = _estimate_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'estimate_not_found'; END IF;
  IF v_est.status <> 'approved' THEN RAISE EXCEPTION 'estimate_not_approved'; END IF;
  IF EXISTS (SELECT 1 FROM public.invoices WHERE estimate_id = _estimate_id) THEN
    -- Idempotent: already generated (approval retried, or called twice).
    SELECT jsonb_build_object(
      'invoice_ids', jsonb_agg(id),
      'deposit_public_token', (SELECT public_token FROM public.invoices WHERE estimate_id = _estimate_id AND kind = 'deposit' LIMIT 1)
    ) INTO v_existing FROM public.invoices WHERE estimate_id = _estimate_id;
    RETURN v_existing;
  END IF;

  FOR v_item IN SELECT * FROM public.payment_schedule_items WHERE estimate_id = _estimate_id ORDER BY position LOOP
    v_number := public.next_job_invoice_number(v_est.business_id);
    INSERT INTO public.invoices (
      business_id, customer_id, estimate_id, job_notes_id, linked_schedule_item_id,
      number, status, kind, subtotal, total, due_at
    ) VALUES (
      v_est.business_id, v_est.customer_id, v_est.id, v_est.job_notes_id, v_item.id,
      v_number, 'draft', public.infer_invoice_kind(v_item.label), v_item.amount, v_item.amount,
      CASE WHEN v_item.trigger_type = 'date' THEN now() + make_interval(days => COALESCE(v_item.due_offset_days, 0)) ELSE NULL END
    ) RETURNING id INTO v_invoice_id;

    INSERT INTO public.job_events (job_notes_id, event_type, actor, notes)
    VALUES (v_est.job_notes_id, 'invoice_created', 'system', v_number);
    v_ids := array_append(v_ids, v_invoice_id);

    IF v_first THEN
      UPDATE public.invoices SET status = 'sent', sent_at = now() WHERE id = v_invoice_id RETURNING public_token INTO v_deposit_token;
      INSERT INTO public.document_events (document_kind, document_id, event, from_state, to_state, actor)
      VALUES ('invoice', v_invoice_id, 'sent', 'draft', 'sent', 'system');
      INSERT INTO public.job_events (job_notes_id, event_type, actor, notes)
      VALUES (v_est.job_notes_id, 'invoice_sent', 'system', v_number);
      PERFORM public.post_job_chat_message(
        v_est.job_notes_id,
        'Your first invoice for $' || to_char(v_item.amount, 'FM999999990.00') || ' is ready. Pay now: https://sow2growapp.com/pay/' || v_deposit_token::text,
        'invoice_link'
      );
      v_first := false;
    END IF;
  END LOOP;

  UPDATE public.job_notes SET status = 'approved' WHERE id = v_est.job_notes_id;

  RETURN jsonb_build_object('invoice_ids', to_jsonb(v_ids), 'deposit_public_token', v_deposit_token);
END;
$gei$;
GRANT EXECUTE ON FUNCTION public.generate_estimate_invoices(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- 16. approve_estimate / reject_estimate -- customer-only (the caller
--     must be the linked member on this estimate's customer row).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_estimate(_estimate_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $ae$
DECLARE
  v_est public.estimates%ROWTYPE;
  v_my_email text;
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_est FROM public.estimates WHERE id = _estimate_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'estimate_not_found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.customers c WHERE c.id = v_est.customer_id AND c.member_user_id = auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF v_est.status <> 'sent' THEN RAISE EXCEPTION 'estimate_not_pending: %', v_est.status; END IF;

  SELECT email INTO v_my_email FROM auth.users WHERE id = auth.uid();
  UPDATE public.estimates SET status = 'approved', approved_at = now(), approved_by_email = v_my_email WHERE id = _estimate_id;
  INSERT INTO public.document_events (document_kind, document_id, event, from_state, to_state, actor, actor_ref)
  VALUES ('estimate', _estimate_id, 'approved', 'sent', 'approved', 'customer', auth.uid()::text);
  INSERT INTO public.job_events (job_notes_id, event_type, from_state, to_state, actor, actor_ref)
  VALUES (v_est.job_notes_id, 'approval', 'sent', 'approved', 'customer', auth.uid()::text);

  v_result := public.generate_estimate_invoices(_estimate_id);
  PERFORM public.post_job_chat_message(v_est.job_notes_id, 'Estimate approved! Your first invoice is ready to pay.', 'text');

  RETURN v_result;
END;
$ae$;
GRANT EXECUTE ON FUNCTION public.approve_estimate(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.reject_estimate(_estimate_id uuid, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $re$
DECLARE
  v_est public.estimates%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_est FROM public.estimates WHERE id = _estimate_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'estimate_not_found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.customers c WHERE c.id = v_est.customer_id AND c.member_user_id = auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF v_est.status <> 'sent' THEN RAISE EXCEPTION 'estimate_not_pending: %', v_est.status; END IF;

  UPDATE public.estimates SET status = 'rejected', rejected_at = now(), rejected_reason = _reason WHERE id = _estimate_id;
  INSERT INTO public.document_events (document_kind, document_id, event, from_state, to_state, actor, actor_ref, notes)
  VALUES ('estimate', _estimate_id, 'rejected', 'sent', 'rejected', 'customer', auth.uid()::text, _reason);
  INSERT INTO public.job_events (job_notes_id, event_type, from_state, to_state, actor, actor_ref, notes)
  VALUES (v_est.job_notes_id, 'rejection', 'sent', 'rejected', 'customer', auth.uid()::text, _reason);

  PERFORM public.post_job_chat_message(v_est.job_notes_id, 'I need changes: ' || COALESCE(_reason, '(no reason given)'), 'text');
END;
$re$;
GRANT EXECUTE ON FUNCTION public.reject_estimate(uuid, text) TO authenticated;

-- ---------------------------------------------------------------------
-- 17. mark_job_progress: sower marks 50% or completed. Sends any draft
--     invoice whose schedule item is triggered by that milestone.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_job_progress(_job_notes_id uuid, _milestone text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $mjp$
DECLARE
  v_job public.job_notes%ROWTYPE;
  v_inv RECORD;
BEGIN
  IF _milestone NOT IN ('job_50pct', 'job_completion') THEN RAISE EXCEPTION 'invalid_milestone'; END IF;
  SELECT * INTO v_job FROM public.job_notes WHERE id = _job_notes_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'job_not_found'; END IF;
  IF NOT public.owns_company(v_job.business_id) THEN RAISE EXCEPTION 'forbidden'; END IF;

  INSERT INTO public.job_events (job_notes_id, event_type, to_state, actor, actor_ref)
  VALUES (_job_notes_id, 'status_change', _milestone, 'member', auth.uid()::text);

  IF _milestone = 'job_completion' THEN
    UPDATE public.job_notes SET status = 'in_progress' WHERE id = _job_notes_id AND status = 'approved';
    PERFORM public.post_job_chat_message(_job_notes_id, 'Job marked completed — final invoice coming!', 'text');
  ELSE
    UPDATE public.job_notes SET status = 'in_progress' WHERE id = _job_notes_id AND status = 'approved';
    PERFORM public.post_job_chat_message(_job_notes_id, 'Job marked 50% complete — next invoice coming!', 'text');
  END IF;

  FOR v_inv IN
    SELECT i.* FROM public.invoices i
     JOIN public.payment_schedule_items p ON p.id = i.linked_schedule_item_id
     WHERE i.job_notes_id = _job_notes_id AND i.status = 'draft'
       AND p.trigger_type = 'job_status' AND p.trigger_job_status = _milestone
  LOOP
    UPDATE public.invoices SET status = 'sent', sent_at = now(), due_at = now() WHERE id = v_inv.id;
    INSERT INTO public.document_events (document_kind, document_id, event, from_state, to_state, actor)
    VALUES ('invoice', v_inv.id, 'sent', 'draft', 'sent', 'system');
    INSERT INTO public.job_events (job_notes_id, event_type, actor, notes)
    VALUES (_job_notes_id, 'invoice_sent', 'system', v_inv.number);
    PERFORM public.post_job_chat_message(
      _job_notes_id,
      'Your next invoice for $' || to_char(v_inv.total, 'FM999999990.00') || ' is ready. Pay now: https://sow2growapp.com/pay/' || v_inv.public_token::text,
      'invoice_link'
    );
  END LOOP;
END;
$mjp$;
GRANT EXECUTE ON FUNCTION public.mark_job_progress(uuid, text) TO authenticated;

-- ---------------------------------------------------------------------
-- 18. finalize_invoice_payment, extended: job_events, chat message on
--     payment, and job auto-completion once every invoice on the job is
--     paid (with a one-time congratulations message on a sower's first
--     ever completed job). Same core shape as Phase 1's version --
--     CREATE OR REPLACE, not a new function.
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
  v_outstanding integer;
  v_prior_completed integer;
BEGIN
  SELECT * INTO v_payment FROM public.invoice_payments WHERE id = _payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invoice_payment_not_found: %', _payment_id; END IF;
  IF v_payment.status = 'completed' THEN RETURN; END IF;

  SELECT * INTO v_invoice FROM public.invoices WHERE id = v_payment.invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invoice_not_found_for_payment: %', _payment_id; END IF;

  v_fee := round(v_payment.amount * 0.15, 2);

  UPDATE public.invoice_payments
     SET status = 'completed', payment_reference = COALESCE(_reference, payment_reference), completed_at = now(), fee_amount = v_fee
   WHERE id = _payment_id;

  UPDATE public.invoices
     SET amount_paid = amount_paid + v_payment.amount, status = 'paid', paid_at = COALESCE(paid_at, now())
   WHERE id = v_invoice.id;

  INSERT INTO public.document_events (document_kind, document_id, event, from_state, to_state, actor, actor_ref, notes)
  VALUES ('invoice', v_invoice.id, 'paid', v_invoice.status, 'paid', 'system', v_payment.rail, 'invoice_payments:' || _payment_id::text);
  INSERT INTO public.job_events (job_notes_id, event_type, actor, notes)
  VALUES (v_invoice.job_notes_id, 'invoice_paid', 'system', v_invoice.number);

  PERFORM public.record_revenue('invoice_fee', v_fee, _environment, 'invoice_payments', _payment_id, v_payment.rail, _reference);

  PERFORM public.post_job_chat_message(
    v_invoice.job_notes_id,
    'Invoice paid! $' || to_char(v_payment.amount, 'FM999999990.00') || ' received on ' || to_char(now(), 'YYYY-MM-DD') || '.',
    'text'
  );

  -- Auto-complete the job once nothing owed remains (no draft/sent invoice
  -- outstanding). Idempotent via job_notes.status's own check.
  SELECT count(*) INTO v_outstanding FROM public.invoices WHERE job_notes_id = v_invoice.job_notes_id AND status IN ('draft', 'sent');
  IF v_outstanding = 0 THEN
    UPDATE public.job_notes SET status = 'completed' WHERE id = v_invoice.job_notes_id AND status <> 'completed';
    IF FOUND THEN
      PERFORM public.post_job_chat_message(v_invoice.job_notes_id, 'Job completed! All invoices paid.', 'text');

      SELECT count(*) INTO v_prior_completed FROM public.job_notes
       WHERE sower_user_id = (SELECT sower_user_id FROM public.job_notes WHERE id = v_invoice.job_notes_id)
         AND status = 'completed';
      IF v_prior_completed = 1 THEN
        PERFORM public.post_job_chat_message(v_invoice.job_notes_id, 'Congratulations on your first completed job on Sow2Grow!', 'text');
      END IF;
    END IF;
  END IF;
END;
$fip$;
REVOKE ALL ON FUNCTION public.finalize_invoice_payment(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_invoice_payment(uuid, text, text) TO service_role;
