-- Finishes the sower_id audit started in 20260901220000: product_bestowals
-- .sower_id stores sowers.id (that table's own PK), not the seller's auth
-- id. escrow_events_party_read (20260825054120_...sql:63) compared it
-- directly to auth.uid(), so a real seller could never read the escrow
-- audit trail for their own sales. Resolve via the sowers table, same
-- pattern as product_bestowals' own "Users can view their bestowals" policy.

DROP POLICY IF EXISTS "escrow_events_party_read" ON public.escrow_events;
CREATE POLICY "escrow_events_party_read"
  ON public.escrow_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.product_bestowals pb
       WHERE pb.id = escrow_events.bestowal_id
         AND (
           pb.bestower_id = auth.uid()
           OR EXISTS (
             SELECT 1 FROM public.sowers s
              WHERE s.id = pb.sower_id AND s.user_id = auth.uid()
           )
         )
    )
  );
