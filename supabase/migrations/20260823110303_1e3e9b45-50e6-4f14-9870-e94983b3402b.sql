
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS payout_network text,
  ADD COLUMN IF NOT EXISTS payout_address text,
  ADD COLUMN IF NOT EXISTS payout_tag bigint,
  ADD COLUMN IF NOT EXISTS payout_wallet_type text,
  ADD COLUMN IF NOT EXISTS payout_details_updated_at timestamptz;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_payout_network_check,
  DROP CONSTRAINT IF EXISTS profiles_payout_wallet_type_check,
  DROP CONSTRAINT IF EXISTS profiles_payout_tag_range_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_payout_network_check
    CHECK (payout_network IS NULL OR payout_network IN ('solana_usdc','xrp')),
  ADD CONSTRAINT profiles_payout_wallet_type_check
    CHECK (payout_wallet_type IS NULL OR payout_wallet_type IN ('personal','custodial')),
  ADD CONSTRAINT profiles_payout_tag_range_check
    CHECK (payout_tag IS NULL OR (payout_tag >= 0 AND payout_tag <= 4294967295));

CREATE TABLE IF NOT EXISTS public.payout_change_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now(),
  old_network text,
  old_address text,
  old_tag bigint,
  old_wallet_type text,
  new_network text,
  new_address text,
  new_tag bigint,
  new_wallet_type text
);

GRANT SELECT ON public.payout_change_audit TO authenticated;
GRANT ALL ON public.payout_change_audit TO service_role;
ALTER TABLE public.payout_change_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own payout change history" ON public.payout_change_audit;
CREATE POLICY "Users view own payout change history"
  ON public.payout_change_audit FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS payout_change_audit_user_idx
  ON public.payout_change_audit (user_id, changed_at DESC);

CREATE OR REPLACE FUNCTION public.log_payout_detail_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.payout_network IS DISTINCT FROM OLD.payout_network
     OR NEW.payout_address IS DISTINCT FROM OLD.payout_address
     OR NEW.payout_tag IS DISTINCT FROM OLD.payout_tag
     OR NEW.payout_wallet_type IS DISTINCT FROM OLD.payout_wallet_type THEN
    INSERT INTO public.payout_change_audit (
      user_id, changed_by,
      old_network, old_address, old_tag, old_wallet_type,
      new_network, new_address, new_tag, new_wallet_type
    ) VALUES (
      COALESCE(NEW.user_id, NEW.id), auth.uid(),
      OLD.payout_network, OLD.payout_address, OLD.payout_tag, OLD.payout_wallet_type,
      NEW.payout_network, NEW.payout_address, NEW.payout_tag, NEW.payout_wallet_type
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_payout_detail_change ON public.profiles;
CREATE TRIGGER trg_log_payout_detail_change
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_payout_detail_change();

CREATE TABLE IF NOT EXISTS public.crypto_payout_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id uuid,
  network text NOT NULL CHECK (network IN ('solana_usdc','xrp')),
  cluster text NOT NULL,
  destination_address text NOT NULL,
  destination_tag bigint,
  amount numeric NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  tx_hash text,
  error_message text,
  reference text UNIQUE,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.crypto_payout_transfers TO authenticated;
GRANT ALL ON public.crypto_payout_transfers TO service_role;
ALTER TABLE public.crypto_payout_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Recipients view own crypto transfers" ON public.crypto_payout_transfers;
CREATE POLICY "Recipients view own crypto transfers"
  ON public.crypto_payout_transfers FOR SELECT TO authenticated
  USING (recipient_user_id = auth.uid() OR public.is_admin_or_gosat(auth.uid()));
