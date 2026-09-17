-- Fail-open moderation: an unscannable image is accepted and flagged for a
-- human, instead of blocking the member who uploaded it.
--
-- On 2026-09-17 Sightengine's free-plan daily quota ran out. moderate-media
-- correctly failed closed, CoverDropZone nulled the photo, and NO member
-- could add a photo to any sow form for the rest of the day. The storage
-- upload returned 200 the whole time, so nothing looked broken. That is the
-- wrong trade: an unscanned image awaiting review is a smaller risk than
-- every member being unable to list.
--
-- The distinction this encodes is between the scanner ANSWERING and the
-- scanner being UNAVAILABLE:
--
--   * answered "prohibited"      -> verdict 'block'      (unchanged)
--   * answered "not sure"        -> verdict 'uncertain'  (unchanged)
--   * could not answer at all    -> verdict 'allow' + needs_review
--
-- Only the third case changes. A real rejection still blocks exactly as
-- before, and minor-detection is untouched.
--
-- Why a column rather than a new verdict value: storage RLS reads
-- media_is_allowed(), which is `verdict = 'allow'` on the most recent row.
-- A fourth verdict would make the object unreadable by anyone but its
-- uploader -- the member would "succeed" and then find their own listing
-- showing a broken cover to everyone else. The verdict has to stay 'allow'
-- for the image to work; needs_review is what carries it to the queue.
--
-- Snapshot rule: no restore script accompanies this. It adds a column and an
-- index and writes nothing to any existing row -- the DEFAULT false is
-- exactly the current meaning of every row already there (none of them were
-- flagged for this reason, because the reason did not exist).

alter table public.media_moderation
  add column if not exists needs_review boolean not null default false;

comment on column public.media_moderation.needs_review is
  'True when this media was accepted WITHOUT a successful scan because the '
  'scanner could not answer (quota exhausted, timeout, network error). The '
  'verdict is ''allow'' so the member is not blocked and the image works; '
  'this flag is what puts it in the Trust & Safety queue for a human. Not '
  'set for a genuine block or uncertain verdict -- those carry their own '
  'verdict and are queued on that.';

-- Mirrors idx_media_moderation_queue, for the fail-open rows that queue on
-- the flag rather than on their verdict. Oldest first: an image that has
-- been visible unscanned the longest is the one to look at first.
create index if not exists idx_media_moderation_needs_review
  on public.media_moderation (created_at)
  where needs_review and reviewed_at is null;

notify pgrst, 'reload schema';
