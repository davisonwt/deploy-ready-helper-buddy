-- Add missing metadata column to user_notifications table
ALTER TABLE public.user_notifications 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add index for better performance on metadata queries
CREATE INDEX IF NOT EXISTS idx_user_notifications_metadata 
ON public.user_notifications USING GIN(metadata);