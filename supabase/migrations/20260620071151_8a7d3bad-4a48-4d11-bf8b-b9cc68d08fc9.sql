ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS payout_setup_complete boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payout_reminder_sent_at timestamptz;

-- Backfill: any existing user who already has a payout wallet is considered set up.
UPDATE public.profiles p
   SET payout_setup_complete = true
  FROM public.user_wallets w
 WHERE w.user_id = p.user_id
   AND w.wallet_type IN ('nowpayments_crypto','paypal_email')
   AND p.payout_setup_complete = false;

CREATE OR REPLACE FUNCTION public.tg_mark_payout_setup_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.wallet_type IN ('nowpayments_crypto','paypal_email') THEN
    UPDATE public.profiles
       SET payout_setup_complete = true,
           updated_at = now()
     WHERE user_id = NEW.user_id
       AND payout_setup_complete = false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mark_payout_setup_complete ON public.user_wallets;
CREATE TRIGGER trg_mark_payout_setup_complete
AFTER INSERT ON public.user_wallets
FOR EACH ROW
EXECUTE FUNCTION public.tg_mark_payout_setup_complete();