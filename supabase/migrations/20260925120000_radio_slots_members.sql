-- Grove Station slots for members: submit is enforced by the database,
-- admins get a cancel-with-reason path, whole-show uploads fit, and the
-- rundown can be reordered in one statement.
--
-- 1. radio_slots gains station-owned bookkeeping columns. Members never
--    write them; the trigger below refuses it.
-- 2. The owner's UPDATE policy only accepts a resulting row that is still
--    'draft' (editing) or 'cancelled' (with 24h notice). 'scheduled' is
--    reachable only from submit-radio-slot, which runs as service_role and
--    re-measures every segment first.
-- 3. A row-level BEFORE trigger locks everything RLS cannot express:
--    starts_at/mode/title are frozen once a slot leaves 'draft', and
--    status may only move draft|scheduled -> cancelled for members.
--    Deliberately NOT a deferred constraint trigger: PostgREST gives each
--    request its own transaction, and a plain BEFORE trigger behaves the
--    same inside and outside one.
-- 4. Live hosting does not exist yet, so a member can only book
--    'prerecorded'.
-- 5. admin, gosat and radio_admin may cancel any slot and preview its
--    uploaded segment files.
-- 6. The owner may delete their own draft or cancelled slot (segments
--    cascade).
-- 7. Segment kind 'show' -- one file that is the whole rundown -- and the
--    bucket limit raised to 150 MB (the project's own global cap) so a
--    2-hour 128 kbps MP3 fits.
-- 8. (slot_id, position) becomes DEFERRABLE INITIALLY IMMEDIATE, so the
--    single-statement reorder RPC can swap positions without tripping the
--    unique check mid-statement.

ALTER TABLE public.radio_slots
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS scheduled_notice_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS aired_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cancel_reason text;

CREATE OR REPLACE FUNCTION public.radio_slots_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  is_owner boolean;
BEGIN
  -- service_role (edge functions) and postgres (migrations, cron) are the
  -- station itself; only signed-in members are policed here.
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.scheduled_at := NULL;
    NEW.scheduled_notice_sent_at := NULL;
    NEW.reminder_sent_at := NULL;
    NEW.aired_at := NULL;
    NEW.cancelled_at := NULL;
    NEW.cancelled_by := NULL;
    NEW.cancel_reason := NULL;
    RETURN NEW;
  END IF;

  is_owner := auth.uid() = OLD.dj_user_id;

  IF NEW.dj_user_id IS DISTINCT FROM OLD.dj_user_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.ad_price IS DISTINCT FROM OLD.ad_price
     OR NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at
     OR NEW.scheduled_notice_sent_at IS DISTINCT FROM OLD.scheduled_notice_sent_at
     OR NEW.reminder_sent_at IS DISTINCT FROM OLD.reminder_sent_at
     OR NEW.aired_at IS DISTINCT FROM OLD.aired_at
     OR NEW.cancelled_by IS DISTINCT FROM OLD.cancelled_by
     OR NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at THEN
    RAISE EXCEPTION 'That field is set by Grove Station, not by members.'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (NEW.status = 'cancelled' AND OLD.status IN ('draft', 'scheduled')) THEN
      RAISE EXCEPTION 'A slot is scheduled only by submitting its rundown.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF NEW.starts_at IS DISTINCT FROM OLD.starts_at
     OR NEW.mode IS DISTINCT FROM OLD.mode
     OR NEW.title IS DISTINCT FROM OLD.title THEN
    IF NOT is_owner OR OLD.status <> 'draft' OR NEW.status <> 'draft' THEN
      RAISE EXCEPTION 'Only a draft slot''s time, mode and title can be changed.'
        USING ERRCODE = '42501';
    END IF;
    IF NEW.starts_at IS DISTINCT FROM OLD.starts_at AND NEW.starts_at <= now() THEN
      RAISE EXCEPTION 'Pick a slot that has not started yet.'
        USING ERRCODE = '42501';
    END IF;
    IF NEW.mode <> 'prerecorded' THEN
      RAISE EXCEPTION 'Live hosting is coming soon; slots are pre-recorded for now.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
    NEW.cancelled_at := now();
    NEW.cancelled_by := auth.uid();
  ELSIF NEW.cancel_reason IS DISTINCT FROM OLD.cancel_reason THEN
    RAISE EXCEPTION 'A cancel reason is given when cancelling, not afterwards.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS radio_slots_guard ON public.radio_slots;
CREATE TRIGGER radio_slots_guard
  BEFORE INSERT OR UPDATE ON public.radio_slots
  FOR EACH ROW EXECUTE FUNCTION public.radio_slots_guard();

DROP POLICY IF EXISTS "A member books their own future slot" ON public.radio_slots;
CREATE POLICY "A member books their own future slot"
  ON public.radio_slots FOR INSERT
  WITH CHECK (
    auth.uid() = dj_user_id
    AND starts_at > now()
    AND status = 'draft'
    AND mode = 'prerecorded'
    AND ad_price IS NULL
  );

DROP POLICY IF EXISTS "A DJ manages their own slot" ON public.radio_slots;
CREATE POLICY "A DJ manages their own slot"
  ON public.radio_slots FOR UPDATE
  USING (auth.uid() = dj_user_id AND status IN ('draft', 'scheduled'))
  WITH CHECK (
    auth.uid() = dj_user_id
    AND (
      status = 'draft'
      OR (status = 'cancelled' AND starts_at > now() + interval '24 hours')
    )
  );

DROP POLICY IF EXISTS "gosat or admin can cancel any slot" ON public.radio_slots;
CREATE POLICY "Station staff can cancel any slot"
  ON public.radio_slots FOR UPDATE
  USING (
    has_role(auth.uid(), 'gosat'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'radio_admin'::app_role)
  )
  WITH CHECK (
    (
      has_role(auth.uid(), 'gosat'::app_role)
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'radio_admin'::app_role)
    )
    AND status = 'cancelled'
  );

DROP POLICY IF EXISTS "A member deletes their own draft or cancelled slot" ON public.radio_slots;
CREATE POLICY "A member deletes their own draft or cancelled slot"
  ON public.radio_slots FOR DELETE
  USING (auth.uid() = dj_user_id AND status IN ('draft', 'cancelled'));

-- Whole-show segment kind.
ALTER TABLE public.radio_rundown_segments
  DROP CONSTRAINT IF EXISTS radio_rundown_segments_kind_check;
ALTER TABLE public.radio_rundown_segments
  ADD CONSTRAINT radio_rundown_segments_kind_check
  CHECK (kind IN ('opening', 'talk', 'song', 'advert', 'jingle', 'handover', 'show'));

-- Reorder in one statement.
ALTER TABLE public.radio_rundown_segments
  DROP CONSTRAINT radio_rundown_segments_slot_id_position_key;
ALTER TABLE public.radio_rundown_segments
  ADD CONSTRAINT radio_rundown_segments_slot_id_position_key
  UNIQUE (slot_id, position) DEFERRABLE INITIALLY IMMEDIATE;

-- SECURITY INVOKER: the draft-lock RLS policy on radio_rundown_segments
-- still decides whether the caller may touch these rows at all.
CREATE OR REPLACE FUNCTION public.reorder_radio_rundown(p_slot_id uuid, p_ordered_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  existing_count integer;
  updated_count integer;
BEGIN
  SELECT count(*) INTO existing_count
  FROM radio_rundown_segments WHERE slot_id = p_slot_id;

  IF existing_count <> coalesce(array_length(p_ordered_ids, 1), 0)
     OR (SELECT count(DISTINCT x) FROM unnest(p_ordered_ids) x) <> existing_count THEN
    RAISE EXCEPTION 'The rundown changed while you were editing it. Reload and try again.'
      USING ERRCODE = '40001';
  END IF;

  UPDATE radio_rundown_segments s
  SET position = o.ord - 1
  FROM unnest(p_ordered_ids) WITH ORDINALITY AS o(id, ord)
  WHERE s.id = o.id AND s.slot_id = p_slot_id;
  GET DIAGNOSTICS updated_count = ROW_COUNT;

  IF updated_count <> existing_count THEN
    RAISE EXCEPTION 'This rundown can no longer be edited (it is submitted or not yours).'
      USING ERRCODE = '42501';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reorder_radio_rundown(uuid, uuid[]) TO authenticated;

-- Whole-show uploads: 150 MB is the project's global per-file cap.
UPDATE storage.buckets
SET file_size_limit = 157286400
WHERE id = 'dj-rundown-segments';

DROP POLICY IF EXISTS "Station staff read: dj-rundown-segments" ON storage.objects;
CREATE POLICY "Station staff read: dj-rundown-segments"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'dj-rundown-segments'
    AND (
      has_role(auth.uid(), 'gosat'::app_role)
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'radio_admin'::app_role)
    )
  );

-- Every 5 minutes: mark finished slots 'aired', send 1-hour reminders.
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'radio-slot-tick';
SELECT cron.schedule(
  'radio-slot-tick',
  '*/5 * * * *',
  $$ SELECT public.invoke_money_job('radio-slot-tick'); $$
);
