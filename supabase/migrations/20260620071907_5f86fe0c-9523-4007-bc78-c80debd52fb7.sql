
-- D: User wallet dashboard — topups ledger + RPC to credit sower_balances
CREATE TABLE IF NOT EXISTS public.topups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('nowpayments','paypal')),
  provider_order_id text,
  amount numeric(18,2) NOT NULL CHECK (amount > 0),
  fee_amount numeric(18,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed','cancelled')),
  credited_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_topups_user ON public.topups(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_topups_provider_order ON public.topups(provider, provider_order_id);

GRANT SELECT ON public.topups TO authenticated;
GRANT ALL ON public.topups TO service_role;

ALTER TABLE public.topups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own topups"
ON public.topups FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role manages topups"
ON public.topups FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_topups_updated_at ON public.topups;
CREATE TRIGGER trg_topups_updated_at
BEFORE UPDATE ON public.topups
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RPC: idempotent credit of an on-platform balance from a completed topup.
-- Returns true if it actually credited, false if already credited (idempotent).
CREATE OR REPLACE FUNCTION public.credit_sower_balance_from_topup(_topup_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid;
  _amount numeric;
  _currency text;
  _already boolean;
BEGIN
  SELECT user_id, amount, currency, (credited_at IS NOT NULL)
    INTO _user, _amount, _currency, _already
    FROM public.topups
   WHERE id = _topup_id
   FOR UPDATE;

  IF _user IS NULL THEN
    RAISE EXCEPTION 'topup_not_found:%', _topup_id;
  END IF;
  IF _already THEN
    RETURN false;
  END IF;

  INSERT INTO public.sower_balances (user_id, available_balance, currency)
  VALUES (_user, _amount, COALESCE(_currency,'USD'))
  ON CONFLICT (user_id) DO UPDATE
    SET available_balance = public.sower_balances.available_balance + EXCLUDED.available_balance,
        total_earned = public.sower_balances.total_earned + EXCLUDED.available_balance,
        updated_at = now();

  UPDATE public.topups
     SET status = 'completed',
         credited_at = now()
   WHERE id = _topup_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.credit_sower_balance_from_topup(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_sower_balance_from_topup(uuid) TO service_role;

-- Ensure sower_balances has a uniqueness on user_id so ON CONFLICT works.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE schemaname='public' AND indexname='sower_balances_user_id_key'
  ) THEN
    BEGIN
      ALTER TABLE public.sower_balances ADD CONSTRAINT sower_balances_user_id_key UNIQUE (user_id);
    EXCEPTION WHEN duplicate_table THEN NULL;
             WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
