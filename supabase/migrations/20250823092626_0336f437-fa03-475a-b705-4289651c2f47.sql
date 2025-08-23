-- Add voice memo support to live call participants
ALTER TABLE public.live_call_participants 
ADD COLUMN voice_memo_url text,
ADD COLUMN voice_memo_duration integer,
ADD COLUMN recorded_at timestamp with time zone;