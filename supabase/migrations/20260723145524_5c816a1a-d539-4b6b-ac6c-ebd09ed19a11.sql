
DROP POLICY IF EXISTS "Users can create their own book orders" ON public.book_orders;
CREATE POLICY "Users can create their own book orders" ON public.book_orders
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = bestower_id AND payment_status = 'pending');

DROP POLICY IF EXISTS "Users can send gifts in active sessions" ON public.clubhouse_gifts;
CREATE POLICY "Users can send gifts in active sessions" ON public.clubhouse_gifts
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = giver_id
  AND payment_status = 'pending'
  AND EXISTS (SELECT 1 FROM chat_participants cp WHERE cp.room_id = clubhouse_gifts.room_id AND cp.user_id = auth.uid() AND cp.is_active = true)
  AND EXISTS (SELECT 1 FROM chat_participants cp WHERE cp.room_id = clubhouse_gifts.room_id AND cp.user_id = clubhouse_gifts.receiver_id AND cp.is_active = true)
);

DROP POLICY IF EXISTS "Customers create bookings" ON public.gig_bookings;
CREATE POLICY "Customers create bookings" ON public.gig_bookings
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = customer_id AND payment_status = 'pending'::payment_status AND status = 'pending'::booking_status);

DROP POLICY IF EXISTS "Buyers can create orders" ON public.provider_orders;
CREATE POLICY "Buyers can create orders" ON public.provider_orders
FOR INSERT TO authenticated
WITH CHECK (buyer_id = auth.uid() AND status = 'pending' AND escrow_status = 'pending');

DROP POLICY IF EXISTS "Guests can create bookings" ON public.stay_bookings;
CREATE POLICY "Guests can create bookings" ON public.stay_bookings
FOR INSERT TO authenticated
WITH CHECK (guest_id = auth.uid() AND payment_status = 'pending' AND status = 'pending');

DROP POLICY IF EXISTS "Users can send gifts" ON public.video_gifts;
CREATE POLICY "Users can send gifts" ON public.video_gifts
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = giver_id AND payment_status = 'pending');

-- Consolidate chat_files bucket into chat-files (move objects, remove chat_files policies)
UPDATE storage.objects SET bucket_id = 'chat-files' WHERE bucket_id = 'chat_files';
DROP POLICY IF EXISTS "Chat files readable by room participants (chat_files)" ON storage.objects;
DROP POLICY IF EXISTS "Owners can delete chat_files" ON storage.objects;
DROP POLICY IF EXISTS "Owners can update chat_files" ON storage.objects;
DROP POLICY IF EXISTS "Owners can upload chat_files" ON storage.objects;

-- Move recipient_pubkey off orchards into an owner-only table
CREATE TABLE IF NOT EXISTS public.orchard_payouts (
  orchard_id uuid PRIMARY KEY REFERENCES public.orchards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  recipient_pubkey text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.orchard_payouts (orchard_id, user_id, recipient_pubkey)
SELECT id, user_id, recipient_pubkey FROM public.orchards WHERE recipient_pubkey IS NOT NULL
ON CONFLICT (orchard_id) DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orchard_payouts TO authenticated;
GRANT ALL ON public.orchard_payouts TO service_role;
ALTER TABLE public.orchard_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their orchard payout" ON public.orchard_payouts
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP INDEX IF EXISTS public.idx_orchards_recipient_pubkey;
ALTER TABLE public.orchards DROP COLUMN IF EXISTS recipient_pubkey;
