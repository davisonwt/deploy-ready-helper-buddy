-- Paystack pay-in rail (cards Visa/Mastercard/Amex + EFT via Ozow).
-- Pay-in only -- payouts stay PayPal/USDC exclusively; nothing here touches
-- a payout table.
--
-- 1. Widen the three CHECK constraints that actually sit on the pay-in path
--    (processed_webhooks.provider, invoice_payments.rail,
--    revenue_ledger.rail) to allow 'paystack', same ALTER pattern
--    20260902210000_solana_pay_in.sql used to add 'solana'.
--
--    Deliberately NOT widened: orchard_holdings.rail / orchard_refunds.rail
--    (both CHECK (... , 'unknown')). orchard_apply_holding()'s provider ->
--    rail CASE has no 'paystack' branch and none is added here, so a
--    Paystack-funded orchard bestowal falls through to the existing
--    'unknown' branch -- already a valid value, and orchard_cancel()'s
--    refund queue already treats 'unknown' as needs_human (no automated
--    refund path assumed). Paystack has no refund-automation in this
--    change set (not in the spec this migration implements), so 'unknown'
--    is the honest, safe classification -- not a workaround.
--
-- 2. paystack_transactions -- one row per /transaction/initialize call:
--    reference (Paystack's own id), status, both currencies, the stored
--    FX rate used, and the raw webhook/verify payload for audit.
--
-- 3. paystack_disputes -- charge.dispute.create webhook events, for GoSat
--    (this app's internal admin/ops portal) to review chargebacks. No
--    external system integration; a fresh table, no precedent to mirror.

-- --- 1. Widen CHECK constraints ---------------------------------------------
ALTER TABLE public.processed_webhooks DROP CONSTRAINT processed_webhooks_provider_check;
ALTER TABLE public.processed_webhooks ADD CONSTRAINT processed_webhooks_provider_check
  CHECK (provider = ANY (ARRAY['binance_pay', 'stripe', 'other', 'paypal', 'nowpayments', 'solana', 'paystack']));

ALTER TABLE public.invoice_payments DROP CONSTRAINT invoice_payments_rail_check;
ALTER TABLE public.invoice_payments ADD CONSTRAINT invoice_payments_rail_check
  CHECK (rail IN ('solana', 'paypal', 'paystack'));

ALTER TABLE public.revenue_ledger DROP CONSTRAINT revenue_ledger_rail_check;
ALTER TABLE public.revenue_ledger ADD CONSTRAINT revenue_ledger_rail_check
  CHECK (rail IN ('solana', 'paypal', 'balance', 'nowpayments', 'paystack', 'none'));

-- --- 2. paystack_transactions ------------------------------------------------
CREATE TABLE public.paystack_transactions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference      text NOT NULL UNIQUE,                                    -- Paystack's transaction reference
  status         text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'success', 'failed', 'abandoned')),
  kind           text NOT NULL,                                          -- PaypalOrderKind ("gift" | "orchard" | "invoice" | ...) -- same vocabulary the shared finalize() switches on, not paystack-specific
  record_id      uuid NOT NULL,                                          -- bestowals.id or invoice_payments.id, per `kind`
  amount_usd     numeric(14,2) NOT NULL CHECK (amount_usd > 0),          -- the buyer-total charge in USD (base + S2G 15% where applicable + processor fee)
  amount_zar     numeric(14,2) NOT NULL CHECK (amount_zar > 0),          -- what Paystack actually charged, at the stored rate below
  fx_rate        numeric(14,6) NOT NULL CHECK (fx_rate > 0),             -- USD->ZAR rate used (public.exchange_rates snapshot at initialize time)
  environment    text NOT NULL CHECK (environment IN ('live', 'sandbox')),
  raw_payload    jsonb,                                                  -- last initialize/verify/webhook response, for audit
  created_at     timestamptz NOT NULL DEFAULT now(),
  completed_at   timestamptz
);
CREATE INDEX idx_paystack_transactions_record ON public.paystack_transactions(kind, record_id);
CREATE INDEX idx_paystack_transactions_status ON public.paystack_transactions(status, created_at DESC);

ALTER TABLE public.paystack_transactions ENABLE ROW LEVEL SECURITY;
-- Internal audit/ledger table (no member-facing UI reads it directly --
-- members already see payment_status/rail on their own bestowals/
-- invoice_payments rows). Same "gosat/admin only" shape as orchard_events.
REVOKE ALL ON public.paystack_transactions FROM public, anon;
GRANT ALL ON public.paystack_transactions TO service_role;
GRANT SELECT ON public.paystack_transactions TO authenticated;
CREATE POLICY "paystack_transactions_select_gosat" ON public.paystack_transactions
  FOR SELECT TO authenticated USING (public.is_admin_or_gosat(auth.uid()));

-- --- 3. paystack_disputes (chargebacks, for GoSat) ---------------------------
CREATE TABLE public.paystack_disputes (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_reference      text NOT NULL,                                  -- Paystack's dispute id
  transaction_reference  text NOT NULL REFERENCES public.paystack_transactions(reference) ON DELETE RESTRICT,
  status                 text NOT NULL DEFAULT 'pending',
  amount_zar             numeric(14,2),
  currency               text NOT NULL DEFAULT 'ZAR',
  reason                 text,
  raw_payload            jsonb,
  created_at             timestamptz NOT NULL DEFAULT now(),
  resolved_at            timestamptz
);
CREATE UNIQUE INDEX idx_paystack_disputes_reference ON public.paystack_disputes(dispute_reference);
CREATE INDEX idx_paystack_disputes_txn ON public.paystack_disputes(transaction_reference);

ALTER TABLE public.paystack_disputes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.paystack_disputes FROM public, anon;
GRANT ALL ON public.paystack_disputes TO service_role;
GRANT SELECT ON public.paystack_disputes TO authenticated;
CREATE POLICY "paystack_disputes_select_gosat" ON public.paystack_disputes
  FOR SELECT TO authenticated USING (public.is_admin_or_gosat(auth.uid()));

-- --- Proof --------------------------------------------------------------------
SELECT json_build_object(
  'processed_webhooks_check', pg_get_constraintdef((SELECT oid FROM pg_constraint WHERE conname = 'processed_webhooks_provider_check')),
  'invoice_payments_check', pg_get_constraintdef((SELECT oid FROM pg_constraint WHERE conname = 'invoice_payments_rail_check')),
  'revenue_ledger_check', pg_get_constraintdef((SELECT oid FROM pg_constraint WHERE conname = 'revenue_ledger_rail_check')),
  'paystack_transactions_exists', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'paystack_transactions'),
  'paystack_disputes_exists', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'paystack_disputes')
) AS proof;
