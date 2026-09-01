-- Media moderation core: media_moderation (every scan verdict) and
-- content_reports (user-filed reports), plus the storage-RLS helper both
-- the edge function and every bucket policy will use.
--
-- media_moderation is the single source of truth for "has this file been
-- scanned, and what was the verdict" -- storage RLS reads it directly so
-- an unscanned or blocked file is unreadable at the database layer, not
-- just hidden by the UI. subject_ref covers the one case with no
-- bucket+path (the avatar column write) -- see moderate-media's caller in
-- ProfilePage.jsx.

CREATE TABLE public.media_moderation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text,
  object_path text,
  subject_type text NOT NULL DEFAULT 'storage_object'
    CHECK (subject_type IN ('storage_object', 'avatar')),
  subject_ref text,
  uploader_user_id uuid NOT NULL,
  verdict text NOT NULL CHECK (verdict IN ('allow', 'block', 'uncertain')),
  minor_suspected boolean NOT NULL DEFAULT false,
  reason text,
  scores jsonb,
  model_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_action text CHECK (review_action IN ('allow', 'remove', 'suspend_uploader')),
  CONSTRAINT media_moderation_subject_check CHECK (
    (subject_type = 'storage_object' AND bucket_id IS NOT NULL AND object_path IS NOT NULL)
    OR (subject_type = 'avatar' AND subject_ref IS NOT NULL)
  )
);

CREATE INDEX idx_media_moderation_bucket_path ON public.media_moderation (bucket_id, object_path, created_at DESC);
CREATE INDEX idx_media_moderation_subject_ref ON public.media_moderation (subject_ref, created_at DESC);
CREATE INDEX idx_media_moderation_uploader ON public.media_moderation (uploader_user_id);
-- Review queue: everything not yet resolved, worst-first (minors flagged before plain blocks).
CREATE INDEX idx_media_moderation_queue ON public.media_moderation (minor_suspected DESC, created_at)
  WHERE verdict IN ('block', 'uncertain') AND reviewed_at IS NULL;

ALTER TABLE public.media_moderation ENABLE ROW LEVEL SECURITY;

-- Uploaders can see their own scan history (so a rejected-upload screen can
-- explain why); gosat/admin see everything for the review queue. Only the
-- service role (the edge function) inserts -- never client-writable.
CREATE POLICY "media_moderation_own_read"
  ON public.media_moderation FOR SELECT TO authenticated
  USING (uploader_user_id = auth.uid());
CREATE POLICY "media_moderation_gosat_read"
  ON public.media_moderation FOR SELECT TO authenticated
  USING (public.is_admin_or_gosat(auth.uid()));
CREATE POLICY "media_moderation_gosat_review"
  ON public.media_moderation FOR UPDATE TO authenticated
  USING (public.is_admin_or_gosat(auth.uid()))
  WITH CHECK (public.is_admin_or_gosat(auth.uid()));

GRANT SELECT, UPDATE ON public.media_moderation TO authenticated;
GRANT ALL ON public.media_moderation TO service_role;

-- Storage RLS reads this: true only if the MOST RECENT scan for this exact
-- bucket+path said 'allow'. No row (never scanned) or a stale superseded
-- row both correctly fall through to NULL/false -- an unscanned file is
-- never readable, per the "scanner unavailable -> reject" policy.
CREATE OR REPLACE FUNCTION public.media_is_allowed(_bucket text, _path text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT verdict = 'allow'
  FROM public.media_moderation
  WHERE bucket_id = _bucket AND object_path = _path
  ORDER BY created_at DESC
  LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.media_is_allowed(text, text) TO authenticated, anon;

-- content_reports: any member can file a report against any piece of
-- content; target_type/target_id are loose (text id) since targets span
-- many unrelated tables (profiles, tribal_hearts_profiles, chat_messages,
-- products, sower_books, community_videos, ...) -- no single FK fits.
CREATE TABLE public.content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id uuid NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'allowed', 'removed', 'suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid
);

CREATE INDEX idx_content_reports_status ON public.content_reports (status, created_at);
CREATE INDEX idx_content_reports_target ON public.content_reports (target_type, target_id);

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_reports_insert_own"
  ON public.content_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_user_id = auth.uid());
CREATE POLICY "content_reports_read_own"
  ON public.content_reports FOR SELECT TO authenticated
  USING (reporter_user_id = auth.uid());
CREATE POLICY "content_reports_gosat_read"
  ON public.content_reports FOR SELECT TO authenticated
  USING (public.is_admin_or_gosat(auth.uid()));
CREATE POLICY "content_reports_gosat_resolve"
  ON public.content_reports FOR UPDATE TO authenticated
  USING (public.is_admin_or_gosat(auth.uid()))
  WITH CHECK (public.is_admin_or_gosat(auth.uid()));

GRANT SELECT, INSERT, UPDATE ON public.content_reports TO authenticated;
GRANT ALL ON public.content_reports TO service_role;

-- A report citing sexual content involving a minor hides the target
-- immediately pending review (per policy). Everything else stays visible
-- until a gosat acts. This is a marker other tables' display logic checks;
-- it does not by itself remove anything.
CREATE OR REPLACE FUNCTION public.content_hidden_pending_minor_report(_target_type text, _target_id text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.content_reports
    WHERE target_type = _target_type AND target_id = _target_id
      AND status = 'pending' AND reason = 'minor_sexual_content'
  )
$$;
GRANT EXECUTE ON FUNCTION public.content_hidden_pending_minor_report(text, text) TO authenticated, anon;
