-- Books Phase 4 invoicing -- Phase 1 (full workflow), follow-up.
--
-- 20260909140000 removed the client UPDATE policy on invoices (every write
-- now goes through a SECURITY DEFINER function) but never added a
-- SECURITY DEFINER path for voiding one -- InvoiceViewPage's existing void
-- button called a raw `invoices.update()`, which RLS now silently no-ops
-- (0 rows matched, no error) instead of actually voiding. This closes that
-- gap with the same shape as send_estimate/mark_job_progress: an
-- owner-only RPC that checks the transition, writes document_events +
-- job_events, and posts a chat message.
CREATE OR REPLACE FUNCTION public.void_invoice(_invoice_id uuid, _reason text DEFAULT NULL)
RETURNS public.invoices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $vi$
DECLARE
  v_invoice public.invoices%ROWTYPE;
BEGIN
  SELECT * INTO v_invoice FROM public.invoices WHERE id = _invoice_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'invoice_not_found'; END IF;
  IF NOT public.owns_company(v_invoice.business_id) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NOT public.has_invoicing_access(auth.uid()) THEN RAISE EXCEPTION 'invoicing_access_required'; END IF;
  IF v_invoice.status NOT IN ('draft', 'sent') THEN RAISE EXCEPTION 'invoice_not_voidable: %', v_invoice.status; END IF;

  UPDATE public.invoices
     SET status = 'void', voided_at = now(), void_reason = _reason
   WHERE id = _invoice_id
   RETURNING * INTO v_invoice;

  INSERT INTO public.document_events (document_kind, document_id, event, from_state, to_state, actor, actor_ref, notes)
  VALUES ('invoice', v_invoice.id, 'void', 'sent', 'void', 'member', auth.uid()::text, _reason);
  INSERT INTO public.job_events (job_notes_id, event_type, actor, actor_ref, notes)
  VALUES (v_invoice.job_notes_id, 'status_change', 'member', auth.uid()::text, 'invoice ' || v_invoice.number || ' voided');

  PERFORM public.post_job_chat_message(
    v_invoice.job_notes_id,
    'Invoice ' || v_invoice.number || ' was withdrawn.' || CASE WHEN _reason IS NOT NULL THEN ' Reason: ' || _reason ELSE '' END,
    'text'
  );

  RETURN v_invoice;
END;
$vi$;
GRANT EXECUTE ON FUNCTION public.void_invoice(uuid, text) TO authenticated;
