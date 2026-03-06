-- Rename the table
ALTER TABLE public.lecture_halls RENAME TO skilldrop_sessions;

-- Add topic linking columns for scriptural study integration
ALTER TABLE public.skilldrop_sessions ADD COLUMN IF NOT EXISTS topic_id text;
ALTER TABLE public.skilldrop_sessions ADD COLUMN IF NOT EXISTS topic_question_id text;