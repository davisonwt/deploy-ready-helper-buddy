-- ORCHARD-CANCEL-REFUND-PLAN.md section 1: is every orchard holding
-- refundable, and to whom? READ-ONLY. One row per holding with what we
-- store about how it was paid and whether the payer can be recovered.
--
--   Solana: the confirmed signature is stored on the holding
--   (rail_reference) and on the intent; the payer wallet is the owner of
--   the transfer's source token account, read from the transaction. It is
--   not stored yet (payer_address NULL) -- that is what Phase C1 adds.
--   PayPal: rail_reference is the CAPTURE id (captureAndFinalize stores
--   capture.data.id as payment_reference); a refund goes against it.
--
--   npx supabase db query --linked -f scripts/studio/phase-c-refundability.sql

SELECT
  left(h.id::text, 8)                         AS holding,
  left(h.orchard_id::text, 8)                 AS orchard,
  o.funding_state,
  h.status,
  h.rail,
  h.location,
  h.gross_amount,
  h.pocket_type,
  h.payer_address,                            -- NULL today for every holding
  h.rail_reference,                           -- solana signature / paypal capture id
  i.cluster,
  i.status                                    AS intent_status,
  i.client_signature IS NOT NULL              AS has_client_signature,
  b.provider_order_id,
  CASE
    WHEN h.rail = 'solana' AND h.rail_reference IS NOT NULL THEN 'recoverable: getTransaction(signature) -> source token account -> owner'
    WHEN h.rail = 'paypal' AND h.rail_reference IS NOT NULL THEN 'recoverable: refund against capture id'
    WHEN h.rail = 'balance' THEN 'recoverable: credit back to balance_ledger'
    ELSE 'NOT recoverable without a human: no reference stored'
  END                                         AS refund_path
FROM public.orchard_holdings h
JOIN public.orchards o ON o.id = h.orchard_id
JOIN public.bestowals b ON b.id = h.bestowal_id
LEFT JOIN public.solana_payment_intents i ON i.order_kind = 'orchard' AND i.order_id = b.id
ORDER BY h.created_at;
