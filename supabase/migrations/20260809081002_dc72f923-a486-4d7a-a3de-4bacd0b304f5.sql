
-- 1. gig_live_tracking: verify provider owns booking
DROP POLICY IF EXISTS "Providers insert tracking" ON public.gig_live_tracking;
CREATE POLICY "Providers insert tracking"
ON public.gig_live_tracking
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = provider_id
  AND EXISTS (
    SELECT 1 FROM public.gig_bookings b
    WHERE b.id = gig_live_tracking.booking_id
      AND b.provider_id = auth.uid()
  )
);

-- 2. room_gifts: sender must be part of the room
DROP POLICY IF EXISTS "Users can send gifts" ON public.room_gifts;
CREATE POLICY "Users can send gifts"
ON public.room_gifts
FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND (
    EXISTS (
      SELECT 1 FROM public.rooms r
      WHERE r.id = room_gifts.room_id
        AND (
          r.creator_id = auth.uid()
          OR auth.uid() = ANY (r.admins)
          OR auth.uid() = ANY (r.co_hosts)
          OR auth.uid() = ANY (r.starting_guests)
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.room_participants rp
      WHERE rp.room_id = room_gifts.room_id
        AND rp.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.room_members rm
      WHERE rm.room_id = room_gifts.room_id
        AND rm.user_id = auth.uid()
    )
  )
);

-- 3. radio_djs: remove duplicate/overlapping policies
DROP POLICY IF EXISTS "radio_djs_admin_access" ON public.radio_djs;
DROP POLICY IF EXISTS "radio_djs_authenticated_view" ON public.radio_djs;
DROP POLICY IF EXISTS "radio_djs_own_profile" ON public.radio_djs;
DROP POLICY IF EXISTS "radio_djs_own_update" ON public.radio_djs;
DROP POLICY IF EXISTS "Users can update their own DJ profile" ON public.radio_djs;

DROP POLICY IF EXISTS "DJs can update their own profile" ON public.radio_djs;
CREATE POLICY "DJs can update their own profile"
ON public.radio_djs
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
