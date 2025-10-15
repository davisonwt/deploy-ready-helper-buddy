-- Create chat_files storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat_files', 'chat_files', false)
ON CONFLICT (id) DO NOTHING;