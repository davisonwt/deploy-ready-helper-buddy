DROP POLICY IF EXISTS "Users can create their own purchases" ON public.music_purchases;

CREATE POLICY "Users can create their own pending purchases"
ON public.music_purchases
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = buyer_id
  AND payment_status = 'pending'
);