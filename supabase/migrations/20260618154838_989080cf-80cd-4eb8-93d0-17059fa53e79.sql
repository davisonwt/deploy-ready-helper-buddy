
-- =====================================================================
-- MEDIUM + LOW security hardening (2026-06-18 audit, part 2)
-- =====================================================================

-- ---------- M3: tribal_hearts_profiles — restrict browse to safe cols ----------
DROP POLICY IF EXISTS "hearts_profiles_ambassador_browse" ON public.tribal_hearts_profiles;

CREATE OR REPLACE VIEW public.tribal_hearts_browse
WITH (security_invoker = false) AS
SELECT
  p.user_id,
  p.display_first_name,
  -- Expose computed age in years, NOT the raw birthdate
  CASE WHEN p.birthdate IS NOT NULL
       THEN EXTRACT(YEAR FROM age(p.birthdate))::int
       ELSE NULL END AS age,
  p.gender,
  p.seeking,
  p.seeking_intent,
  p.age_verified,
  p.photo_verified,
  p.bio,
  p.values_list,
  p.interests,
  p.location_country,
  p.location_region,
  p.photos,
  p.voice_note_url,
  p.voice_note_duration_sec,
  p.last_active_at
FROM public.tribal_hearts_profiles p
WHERE p.status = 'active'
  AND public.is_tribal_hearts_member(auth.uid())
  AND public.get_hearts_gender(auth.uid()) IS NOT NULL
  AND (p.gender)::text <> public.get_hearts_gender(auth.uid())
  AND p.user_id <> auth.uid();

GRANT SELECT ON public.tribal_hearts_browse TO authenticated;

-- ---------- M4: user_wallets — drop duplicates, single policy per cmd ----------
DROP POLICY IF EXISTS "Users can view their own wallets" ON public.user_wallets;
DROP POLICY IF EXISTS "Users can view their wallets" ON public.user_wallets;
DROP POLICY IF EXISTS "Users can insert their own wallets" ON public.user_wallets;
DROP POLICY IF EXISTS "Users can insert their wallets" ON public.user_wallets;
DROP POLICY IF EXISTS "Users can update their own wallets" ON public.user_wallets;
DROP POLICY IF EXISTS "Users can update their wallets" ON public.user_wallets;
DROP POLICY IF EXISTS "Users can delete their wallets" ON public.user_wallets;

CREATE POLICY "user_wallets_select_own"
  ON public.user_wallets FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user_wallets_insert_own"
  ON public.user_wallets FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_wallets_update_own"
  ON public.user_wallets FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_wallets_delete_own"
  ON public.user_wallets FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ---------- M5: seller_credentials — lock status on owner update ----------
DROP POLICY IF EXISTS "creds owner update own pending" ON public.seller_credentials;
CREATE POLICY "creds owner update own pending"
  ON public.seller_credentials FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending'::verification_status)
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'::verification_status  -- owner cannot self-verify
  );

-- ---------- M1: study-uploads — explicit owner+admin SELECT policy ----------
-- Note: bucket itself must be flipped from public to private in the Storage dashboard.
CREATE POLICY "Owners and admins can read their study files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'study-uploads'
    AND (
      (auth.uid())::text = (storage.foldername(name))[1]
      OR public.is_admin_or_gosat(auth.uid())
    )
  );

-- ---------- L2: cosmetic role rescoping (public -> authenticated) ----------

-- bestowals: orchard-owner read
DROP POLICY IF EXISTS "Orchard owners can view bestowals for their orchards" ON public.bestowals;
CREATE POLICY "Orchard owners can view bestowals for their orchards"
  ON public.bestowals FOR SELECT TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.orchards
      WHERE orchards.id = bestowals.orchard_id
        AND orchards.user_id = auth.uid()
    )
  );

-- live_streams: owner write policies (SELECT already authenticated)
DROP POLICY IF EXISTS "Users can create their own streams" ON public.live_streams;
CREATE POLICY "Users can create their own streams"
  ON public.live_streams FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own streams" ON public.live_streams;
CREATE POLICY "Users can update their own streams"
  ON public.live_streams FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own streams" ON public.live_streams;
CREATE POLICY "Users can delete their own streams"
  ON public.live_streams FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- chat_rooms
DROP POLICY IF EXISTS "chat_rooms_select" ON public.chat_rooms;
CREATE POLICY "chat_rooms_select"
  ON public.chat_rooms FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR public.is_member_of_chat(id, auth.uid()));

DROP POLICY IF EXISTS "chat_rooms_insert" ON public.chat_rooms;
CREATE POLICY "chat_rooms_insert"
  ON public.chat_rooms FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "chat_rooms_update" ON public.chat_rooms;
CREATE POLICY "chat_rooms_update"
  ON public.chat_rooms FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin_or_gosat(auth.uid()))
  WITH CHECK (created_by = auth.uid() OR public.is_admin_or_gosat(auth.uid()));

DROP POLICY IF EXISTS "chat_rooms_delete" ON public.chat_rooms;
CREATE POLICY "chat_rooms_delete"
  ON public.chat_rooms FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin_or_gosat(auth.uid()));

-- sower_balances: SELECT (rescope public -> authenticated)
DROP POLICY IF EXISTS "Users can view their own balance" ON public.sower_balances;
CREATE POLICY "Users can view their own balance"
  ON public.sower_balances FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- sower_payouts: SELECT (rescope public -> authenticated)
DROP POLICY IF EXISTS "Users can view their own payouts" ON public.sower_payouts;
CREATE POLICY "Users can view their own payouts"
  ON public.sower_payouts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
