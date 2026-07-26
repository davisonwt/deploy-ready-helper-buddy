
-- =========================================================================
-- 1. SIDECAR PAYOUT WALLETS (owner-only) + drop public wallet_address cols
-- =========================================================================

-- Sowers
CREATE TABLE IF NOT EXISTS public.sower_payout_wallets (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sower_payout_wallets TO authenticated;
GRANT ALL ON public.sower_payout_wallets TO service_role;
ALTER TABLE public.sower_payout_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage sower payout wallet"
  ON public.sower_payout_wallets FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

INSERT INTO public.sower_payout_wallets (user_id, wallet_address)
SELECT user_id, wallet_address FROM public.sowers
WHERE wallet_address IS NOT NULL AND wallet_address <> ''
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE public.sowers DROP COLUMN IF EXISTS wallet_address;

-- Whisperers
CREATE TABLE IF NOT EXISTS public.whisperer_payout_wallets (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address text NOT NULL,
  wallet_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whisperer_payout_wallets TO authenticated;
GRANT ALL ON public.whisperer_payout_wallets TO service_role;
ALTER TABLE public.whisperer_payout_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage whisperer payout wallet"
  ON public.whisperer_payout_wallets FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

INSERT INTO public.whisperer_payout_wallets (user_id, wallet_address, wallet_type)
SELECT user_id, wallet_address, wallet_type FROM public.whisperers
WHERE wallet_address IS NOT NULL AND wallet_address <> ''
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE public.whisperers DROP COLUMN IF EXISTS wallet_address;
ALTER TABLE public.whisperers DROP COLUMN IF EXISTS wallet_type;

-- DJ music tracks
CREATE TABLE IF NOT EXISTS public.dj_track_payout_wallets (
  track_id uuid PRIMARY KEY REFERENCES public.dj_music_tracks(id) ON DELETE CASCADE,
  wallet_address text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dj_track_payout_wallets TO authenticated;
GRANT ALL ON public.dj_track_payout_wallets TO service_role;
ALTER TABLE public.dj_track_payout_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Track owner manages track payout wallet"
  ON public.dj_track_payout_wallets FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dj_music_tracks t
      JOIN public.radio_djs d ON d.id = t.dj_id
      WHERE t.id = dj_track_payout_wallets.track_id
        AND d.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.dj_music_tracks t
      JOIN public.radio_djs d ON d.id = t.dj_id
      WHERE t.id = dj_track_payout_wallets.track_id
        AND d.user_id = auth.uid()
    )
  );

INSERT INTO public.dj_track_payout_wallets (track_id, wallet_address)
SELECT id, wallet_address FROM public.dj_music_tracks
WHERE wallet_address IS NOT NULL AND wallet_address <> ''
ON CONFLICT (track_id) DO NOTHING;

ALTER TABLE public.dj_music_tracks DROP COLUMN IF EXISTS wallet_address;

-- =========================================================================
-- 2. dj_playlists: split ALL policy so is_public only grants SELECT
-- =========================================================================
DROP POLICY IF EXISTS "DJs and accepted co-hosts can manage playlists" ON public.dj_playlists;

CREATE POLICY "Owners and co-hosts insert playlists"
  ON public.dj_playlists FOR INSERT TO authenticated
  WITH CHECK (
    dj_id IN (SELECT id FROM public.radio_djs WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.radio_schedule rs
      JOIN public.radio_co_host_invites rchi ON rchi.schedule_id = rs.id
      WHERE rs.dj_id = dj_playlists.dj_id
        AND rchi.co_host_user_id = auth.uid()
        AND rchi.status = 'accepted'
    )
  );

CREATE POLICY "Owners and co-hosts update playlists"
  ON public.dj_playlists FOR UPDATE TO authenticated
  USING (
    dj_id IN (SELECT id FROM public.radio_djs WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.radio_schedule rs
      JOIN public.radio_co_host_invites rchi ON rchi.schedule_id = rs.id
      WHERE rs.dj_id = dj_playlists.dj_id
        AND rchi.co_host_user_id = auth.uid()
        AND rchi.status = 'accepted'
    )
  )
  WITH CHECK (
    dj_id IN (SELECT id FROM public.radio_djs WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.radio_schedule rs
      JOIN public.radio_co_host_invites rchi ON rchi.schedule_id = rs.id
      WHERE rs.dj_id = dj_playlists.dj_id
        AND rchi.co_host_user_id = auth.uid()
        AND rchi.status = 'accepted'
    )
  );

CREATE POLICY "Owners and co-hosts delete playlists"
  ON public.dj_playlists FOR DELETE TO authenticated
  USING (
    dj_id IN (SELECT id FROM public.radio_djs WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.radio_schedule rs
      JOIN public.radio_co_host_invites rchi ON rchi.schedule_id = rs.id
      WHERE rs.dj_id = dj_playlists.dj_id
        AND rchi.co_host_user_id = auth.uid()
        AND rchi.status = 'accepted'
    )
  );

-- =========================================================================
-- 3. live_room_moderators: only authenticated room participants can view
-- =========================================================================
DROP POLICY IF EXISTS "Anyone can view moderators" ON public.live_room_moderators;

CREATE POLICY "Room participants view moderators"
  ON public.live_room_moderators FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR granted_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.live_room_participants p
      WHERE p.room_id = live_room_moderators.room_id
        AND p.user_id = auth.uid()
    )
  );

-- =========================================================================
-- 4. song_votes: restrict raw rows to voter; expose aggregated counts via view
-- =========================================================================
DROP POLICY IF EXISTS "Authenticated users can view vote counts" ON public.song_votes;

CREATE POLICY "Users view their own votes"
  ON public.song_votes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE VIEW public.song_vote_counts
WITH (security_invoker = true) AS
SELECT song_id, week_id, count(*)::int AS vote_count
FROM public.song_votes
GROUP BY song_id, week_id;

GRANT SELECT ON public.song_vote_counts TO anon, authenticated;
