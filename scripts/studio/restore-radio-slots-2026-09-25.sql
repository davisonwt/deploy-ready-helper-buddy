-- Restore point taken 2026-09-25, BEFORE
--   supabase/migrations/20260925120000_radio_slots_members.sql
-- and before deleting davisontest1's leftover test slot ec77d02b.
--
-- There is no real member's radio slot in this snapshot: all four
-- radio_slots rows belong to davisontest1 (de22c876-...), the QA account.
--
-- Two independent parts; run either on its own.
--   PART A  undoes the migration (policies, constraints, bucket limit,
--           trigger, reorder RPC, cron job, added columns).
--   PART B  puts back the four radio_slots rows and ec77d02b's two
--           segments, by explicit id.
--
-- Storage bytes are not in this file. ec77d02b's two bucket objects were
-- archived before deletion to
--   C:\Users\Ezra\S2G-backups\radio-ec77d02b-2026-09-25\
--     1789910898493.mp3  157747 bytes  sha256 7dde1158202441d56b5507dd8ac69358c7b4d2a021cfd060016a7fcd0a9f4049
--     1789910909276.mp3  172781 bytes  sha256 0a6c4eaa36b20e063c390e1ebe30ee176113e364d23d2f7afb1c336b906cab40
-- and belong at dj-rundown-segments/de22c876-d477-4a5e-81a2-cd22091ce125/
-- ec77d02b-92ca-41dc-af2a-bd0640dfd70b/<name> (upload as davisontest1 or
-- with the service key). Neither was referenced by a segment row.

-- ======================================================== PART A
BEGIN;

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'radio-slot-tick';

DROP TRIGGER IF EXISTS radio_slots_guard ON public.radio_slots;
DROP FUNCTION IF EXISTS public.radio_slots_guard();
DROP FUNCTION IF EXISTS public.reorder_radio_rundown(uuid, uuid[]);

DROP POLICY IF EXISTS "A member books their own future slot" ON public.radio_slots;
CREATE POLICY "A member books their own future slot"
  ON public.radio_slots FOR INSERT
  WITH CHECK ((auth.uid() = dj_user_id) AND (starts_at > now()));

DROP POLICY IF EXISTS "A DJ manages their own slot" ON public.radio_slots;
CREATE POLICY "A DJ manages their own slot"
  ON public.radio_slots FOR UPDATE
  USING (auth.uid() = dj_user_id)
  WITH CHECK ((auth.uid() = dj_user_id) AND ((status <> 'cancelled'::text) OR (starts_at > (now() + '24:00:00'::interval))));

DROP POLICY IF EXISTS "Station staff can cancel any slot" ON public.radio_slots;
DROP POLICY IF EXISTS "gosat or admin can cancel any slot" ON public.radio_slots;
CREATE POLICY "gosat or admin can cancel any slot"
  ON public.radio_slots FOR UPDATE
  USING (has_role(auth.uid(), 'gosat'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK ((has_role(auth.uid(), 'gosat'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) AND (status = 'cancelled'::text));

DROP POLICY IF EXISTS "A member deletes their own draft or cancelled slot" ON public.radio_slots;

-- Any 'show' segments must go before the old kind list comes back.
DELETE FROM public.radio_rundown_segments WHERE kind = 'show';
ALTER TABLE public.radio_rundown_segments DROP CONSTRAINT IF EXISTS radio_rundown_segments_kind_check;
ALTER TABLE public.radio_rundown_segments
  ADD CONSTRAINT radio_rundown_segments_kind_check
  CHECK ((kind = ANY (ARRAY['opening'::text, 'talk'::text, 'song'::text, 'advert'::text, 'jingle'::text, 'handover'::text])));

ALTER TABLE public.radio_rundown_segments DROP CONSTRAINT IF EXISTS radio_rundown_segments_slot_id_position_key;
ALTER TABLE public.radio_rundown_segments
  ADD CONSTRAINT radio_rundown_segments_slot_id_position_key UNIQUE (slot_id, "position");

UPDATE storage.buckets SET file_size_limit = 52428800 WHERE id = 'dj-rundown-segments';
DROP POLICY IF EXISTS "Station staff read: dj-rundown-segments" ON storage.objects;

ALTER TABLE public.radio_slots
  DROP COLUMN IF EXISTS scheduled_at,
  DROP COLUMN IF EXISTS scheduled_notice_sent_at,
  DROP COLUMN IF EXISTS reminder_sent_at,
  DROP COLUMN IF EXISTS aired_at,
  DROP COLUMN IF EXISTS cancelled_at,
  DROP COLUMN IF EXISTS cancelled_by,
  DROP COLUMN IF EXISTS cancel_reason;

COMMIT;

-- ======================================================== PART B
-- Runs as postgres/service role (the member-facing guard trigger, if still
-- present, lets those through).
BEGIN;

INSERT INTO public.radio_slots (id, dj_user_id, title, starts_at, mode, status, ad_price, created_at) VALUES
  ('ec77d02b-92ca-41dc-af2a-bd0640dfd70b', 'de22c876-d477-4a5e-81a2-cd22091ce125', NULL, '2026-09-20 14:00:00+00', 'prerecorded', 'scheduled', NULL, '2026-09-20 13:28:16.544994+00'),
  ('2ddf0de5-8844-41d5-893f-88cde04a4106', 'de22c876-d477-4a5e-81a2-cd22091ce125', NULL, '2026-09-20 16:00:00+00', 'prerecorded', 'cancelled', NULL, '2026-09-20 13:29:28.959245+00'),
  ('f41323ac-c7e8-478c-83b2-d256776d63bc', 'de22c876-d477-4a5e-81a2-cd22091ce125', NULL, '2026-09-21 02:00:00+00', 'prerecorded', 'cancelled', NULL, '2026-09-20 14:21:04.170504+00'),
  ('00384e71-af7c-49b3-ba85-ee5024e2ee24', 'de22c876-d477-4a5e-81a2-cd22091ce125', NULL, '2026-09-20 16:00:00+00', 'prerecorded', 'cancelled', NULL, '2026-09-20 14:29:34.332611+00')
ON CONFLICT (id) DO UPDATE SET
  dj_user_id = EXCLUDED.dj_user_id, title = EXCLUDED.title, starts_at = EXCLUDED.starts_at,
  mode = EXCLUDED.mode, status = EXCLUDED.status, ad_price = EXCLUDED.ad_price, created_at = EXCLUDED.created_at;

INSERT INTO public.radio_rundown_segments
  (id, slot_id, position, kind, duration_seconds, track_product_id, audio_path, doc_path, image_path, notes, track_title_snapshot) VALUES
  ('46305f00-5d12-4368-8fef-e10828f03647', 'ec77d02b-92ca-41dc-af2a-bd0640dfd70b', 0, 'song', 184, NULL, NULL, NULL, NULL, NULL, 'Broken Hill'),
  ('0ddcd577-0832-42d7-95a4-cc45e9c9c690', 'ec77d02b-92ca-41dc-af2a-bd0640dfd70b', 1, 'song', 194, '72d2937a-efc3-43a1-8429-4f4b74409b89', NULL, NULL, NULL, NULL, 'promises of old')
ON CONFLICT (id) DO UPDATE SET
  slot_id = EXCLUDED.slot_id, position = EXCLUDED.position, kind = EXCLUDED.kind,
  duration_seconds = EXCLUDED.duration_seconds, track_product_id = EXCLUDED.track_product_id,
  audio_path = EXCLUDED.audio_path, doc_path = EXCLUDED.doc_path, image_path = EXCLUDED.image_path,
  notes = EXCLUDED.notes, track_title_snapshot = EXCLUDED.track_title_snapshot;

COMMIT;
