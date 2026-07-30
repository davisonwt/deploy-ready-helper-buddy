-- 1) live_session_media_purchases: add payment_status, block client self-grant
ALTER TABLE public.live_session_media_purchases
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'live_session_media_purchases_payment_status_check'
  ) THEN
    ALTER TABLE public.live_session_media_purchases
      ADD CONSTRAINT live_session_media_purchases_payment_status_check
      CHECK (payment_status IN ('pending','completed','failed','refunded'));
  END IF;
END $$;

-- Existing rows that were already delivered stay usable
UPDATE public.live_session_media_purchases
SET payment_status = 'completed'
WHERE delivered_at IS NOT NULL AND payment_status = 'pending';

DROP POLICY IF EXISTS "Authenticated users can make purchases" ON public.live_session_media_purchases;

CREATE POLICY "Service role manages media purchases"
ON public.live_session_media_purchases
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

GRANT ALL ON public.live_session_media_purchases TO service_role;

-- 2) live_session_media: only completed purchases unlock paid media
DROP POLICY IF EXISTS "Authorized users can view session media" ON public.live_session_media;

CREATE POLICY "Authorized users can view session media"
ON public.live_session_media
FOR SELECT
TO authenticated
USING (
  (uploader_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.live_session_participants p
    WHERE p.session_id = live_session_media.session_id AND p.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.live_session_media_purchases pu
    WHERE pu.media_id = live_session_media.id
      AND pu.buyer_id = auth.uid()
      AND pu.payment_status = 'completed'
  )
);

-- 3) premium_room_access: 'free' only for genuinely free rooms
DROP POLICY IF EXISTS "User inserts free or pending access" ON public.premium_room_access;

CREATE POLICY "Users join free rooms only"
ON public.premium_room_access
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND payment_status = 'free'
  AND COALESCE(payment_amount, 0) = 0
  AND EXISTS (
    SELECT 1 FROM public.premium_rooms r
    WHERE r.id = premium_room_access.room_id
      AND COALESCE(r.price, 0) = 0
  )
);
