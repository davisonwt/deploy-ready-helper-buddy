-- Lets a sower set a custom thank-you note that's used in the post-bestowal
-- "thank you from the sower" chat message. NULL means "no custom note" —
-- the finalize step falls back to a default message signed with the
-- sower's display name.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bestowal_thank_you_message text;
