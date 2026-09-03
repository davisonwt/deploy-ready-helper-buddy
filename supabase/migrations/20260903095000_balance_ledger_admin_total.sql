-- S2G Balance — Stage 6: admin-facing total liability figure.
-- balance_available_v is RLS-scoped to the caller's own row (owner-read
-- only), so an admin/gosat needs a dedicated aggregate rather than
-- summing the view directly from the client. Self-checks the caller's
-- role rather than relying on a grant alone, matching is_admin_or_gosat's
-- use elsewhere in this codebase.
CREATE OR REPLACE FUNCTION public.total_balance_ledger_liability()
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_or_gosat(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN COALESCE((SELECT SUM(amount) FROM public.balance_ledger), 0);
END;
$$;

REVOKE ALL ON FUNCTION public.total_balance_ledger_liability() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.total_balance_ledger_liability() TO authenticated;
