-- Add status column to sower_books table for pause/relaunch functionality
ALTER TABLE public.sower_books 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused'));

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_sower_books_status ON public.sower_books(status);