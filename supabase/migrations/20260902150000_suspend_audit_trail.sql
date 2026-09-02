-- Wallet-hardening audit item: "every gosat/admin action that moves
-- money, suspends a user, or changes a payout destination gets an
-- immutable log row." Payout destination changes and escrow release/
-- refund already have this (payout_change_audit / escrow_events) --
-- confirmed by reading their triggers, both correctly capture old/new
-- values, actor via auth.uid(), and timestamp. Suspension had no
-- equivalent: prevent_profile_privilege_escalation blocks a non-admin
-- from touching profiles.suspended, but nothing LOGS a legitimate admin
-- doing it. Same shape as log_payout_detail_change, on the same table.

CREATE TABLE public.user_suspension_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  changed_by uuid,
  old_suspended boolean NOT NULL,
  new_suspended boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_suspension_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_suspension_audit_gosat_select" ON public.user_suspension_audit
  FOR SELECT TO authenticated
  USING (public.is_admin_or_gosat(auth.uid()));

-- No INSERT policy for authenticated: written only by the SECURITY
-- DEFINER trigger function below, never directly by a client.

CREATE OR REPLACE FUNCTION public.log_suspension_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.suspended IS DISTINCT FROM OLD.suspended THEN
    INSERT INTO public.user_suspension_audit (user_id, changed_by, old_suspended, new_suspended)
    VALUES (NEW.user_id, auth.uid(), OLD.suspended, NEW.suspended);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_suspension_change ON public.profiles;
CREATE TRIGGER trg_log_suspension_change
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_suspension_change();
