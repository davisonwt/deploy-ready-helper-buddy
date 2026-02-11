-- Add last_read_at to chat_participants to track when user last viewed messages
ALTER TABLE public.chat_participants 
ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Set existing participants' last_read_at to now so they don't see old messages as unread
UPDATE public.chat_participants SET last_read_at = now() WHERE last_read_at IS NULL;