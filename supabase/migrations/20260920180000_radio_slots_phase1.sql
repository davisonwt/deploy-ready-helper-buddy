-- Grove Station DJ Slots, Phase 1 -- open-booking replacement for the old
-- approval-gated radio_schedule/radio_djs flow (retired in the same
-- deploy: see GroveStationPage.jsx/RadioManagementPage.jsx diffs). Any
-- member books a free future 2-hour slot directly; no DJ profile, no
-- approval step. The live playout resolver (_shared/radioSlots.ts) reads
-- ONLY these two tables -- radio_schedule is no longer consulted for
-- anything that airs.
--
-- `title` is not part of the originally-specced column list -- added here
-- because the playout requirement ("talk/opening segments show DJ + show
-- title + segment image") has nowhere else to read a show title from.
-- Nullable, DJ-provided, purely descriptive.

CREATE TABLE public.radio_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dj_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,
  starts_at timestamptz NOT NULL,
  mode text NOT NULL CHECK (mode IN ('live', 'prerecorded')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'scheduled', 'aired', 'cancelled')),
  ad_price numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Aligned to even 2h UTC boundaries -- enforced, not just documented.
ALTER TABLE public.radio_slots
  ADD CONSTRAINT radio_slots_starts_at_2h_boundary
  CHECK (EXTRACT(EPOCH FROM starts_at)::bigint % 7200 = 0);

-- "Unique on starts_at where status not in (cancelled)" -- a cancelled
-- slot frees its boundary for a new booking.
CREATE UNIQUE INDEX radio_slots_starts_at_active_uq
  ON public.radio_slots (starts_at) WHERE status <> 'cancelled';

CREATE INDEX radio_slots_dj_user_id_idx ON public.radio_slots (dj_user_id);

ALTER TABLE public.radio_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view radio slots"
  ON public.radio_slots FOR SELECT
  USING (true);

-- Booking: any member, any free future boundary, as themselves only.
CREATE POLICY "A member books their own future slot"
  ON public.radio_slots FOR INSERT
  WITH CHECK (auth.uid() = dj_user_id AND starts_at > now());

-- Update: a DJ manages their own row (rundown submission, status
-- transitions). Cancelling specifically requires >=24h notice -- WITH
-- CHECK runs against the resulting row, so a cancel that lands within 24h
-- of start is rejected outright; every other resulting status is
-- unrestricted (submitting a rundown, moving draft->submitted->scheduled).
CREATE POLICY "A DJ manages their own slot"
  ON public.radio_slots FOR UPDATE
  USING (auth.uid() = dj_user_id)
  WITH CHECK (
    auth.uid() = dj_user_id
    AND (status <> 'cancelled' OR starts_at > now() + interval '24 hours')
  );

CREATE TABLE public.radio_rundown_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id uuid NOT NULL REFERENCES public.radio_slots(id) ON DELETE CASCADE,
  position integer NOT NULL,
  kind text NOT NULL CHECK (kind IN ('opening', 'talk', 'song', 'advert', 'jingle', 'handover')),
  -- Always probed server-side from the real file (non-song kinds, via the
  -- pure-JS WAV/MP3 duration probe -- no ffmpeg in the edge runtime) or
  -- from the product row (song kind, products.duration) -- never
  -- user-typed. Enforced below: exactly one real source per row.
  duration_seconds integer NOT NULL CHECK (duration_seconds > 0),
  track_product_id uuid REFERENCES public.products(id),
  audio_path text,
  doc_path text,
  image_path text,
  notes text,
  UNIQUE (slot_id, position),
  CHECK (
    (kind = 'song' AND track_product_id IS NOT NULL AND audio_path IS NULL)
    OR (kind <> 'song' AND track_product_id IS NULL AND audio_path IS NOT NULL)
  )
);

CREATE INDEX radio_rundown_segments_slot_id_idx ON public.radio_rundown_segments (slot_id);

ALTER TABLE public.radio_rundown_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view rundown segments"
  ON public.radio_rundown_segments FOR SELECT
  USING (true);

CREATE POLICY "A DJ manages their own slot's segments"
  ON public.radio_rundown_segments FOR ALL
  USING (EXISTS (SELECT 1 FROM public.radio_slots s WHERE s.id = slot_id AND s.dj_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.radio_slots s WHERE s.id = slot_id AND s.dj_user_id = auth.uid()));

-- Storage: a DJ's own rundown-segment uploads (audio/doc/image), owner-
-- scoped folder -- same convention as radio-show-files/dj-music
-- ((storage.foldername(name))[1] = auth.uid()::text), not premium-room's
-- second-segment variant.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dj-rundown-segments', 'dj-rundown-segments', false, 52428800,
  ARRAY['audio/wav', 'audio/x-wav', 'audio/mpeg', 'application/pdf', 'text/plain', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Own folder upload: dj-rundown-segments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'dj-rundown-segments' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Owner-only read at the bucket level -- real playback never uses this
-- policy at all, since radio-stream signs URLs with the service-role
-- client (RLS doesn't apply there). This is just so a DJ can preview their
-- own uploaded segment in the rundown builder.
CREATE POLICY "Own folder read: dj-rundown-segments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'dj-rundown-segments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Own folder update: dj-rundown-segments"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'dj-rundown-segments' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'dj-rundown-segments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Own folder delete: dj-rundown-segments"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'dj-rundown-segments' AND (storage.foldername(name))[1] = auth.uid()::text);
