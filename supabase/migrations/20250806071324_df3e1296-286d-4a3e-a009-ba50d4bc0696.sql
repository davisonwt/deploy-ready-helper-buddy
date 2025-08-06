-- Create enum for chat room types
CREATE TYPE public.chat_room_type AS ENUM (
  'direct',
  'group', 
  'live_marketing',
  'live_study',
  'live_podcast',
  'live_training',
  'live_conference'
);

-- Create enum for file types
CREATE TYPE public.file_type AS ENUM (
  'image',
  'video', 
  'document',
  'audio'
);

-- Create chat_rooms table
CREATE TABLE public.chat_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  description TEXT,
  room_type chat_room_type NOT NULL DEFAULT 'group',
  category TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_participants INTEGER DEFAULT 50,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat_participants table
CREATE TABLE public.chat_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  profile_id UUID,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_moderator BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(room_id, user_id)
);

-- Create chat_messages table  
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_profile_id UUID,
  content TEXT,
  message_type TEXT NOT NULL DEFAULT 'text',
  file_url TEXT,
  file_name TEXT,
  file_type file_type,
  file_size INTEGER,
  reply_to_id UUID REFERENCES public.chat_messages(id),
  is_edited BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat_files table for file uploads
CREATE TABLE public.chat_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  uploader_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type file_type NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_rooms
CREATE POLICY "Users can view rooms they participate in" 
ON public.chat_rooms FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants 
    WHERE room_id = chat_rooms.id 
    AND user_id = auth.uid() 
    AND is_active = true
  ) OR created_by = auth.uid()
);

CREATE POLICY "Authenticated users can create rooms" 
ON public.chat_rooms FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Room creators can update their rooms" 
ON public.chat_rooms FOR UPDATE 
USING (auth.uid() = created_by);

-- RLS Policies for chat_participants
CREATE POLICY "Users can view participants in their rooms" 
ON public.chat_participants FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants cp 
    WHERE cp.room_id = chat_participants.room_id 
    AND cp.user_id = auth.uid() 
    AND cp.is_active = true
  )
);

CREATE POLICY "Users can join rooms" 
ON public.chat_participants FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participation" 
ON public.chat_participants FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages in their rooms" 
ON public.chat_messages FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants 
    WHERE room_id = chat_messages.room_id 
    AND user_id = auth.uid() 
    AND is_active = true
  )
);

CREATE POLICY "Users can send messages to their rooms" 
ON public.chat_messages FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id AND 
  EXISTS (
    SELECT 1 FROM public.chat_participants 
    WHERE room_id = chat_messages.room_id 
    AND user_id = auth.uid() 
    AND is_active = true
  )
);

CREATE POLICY "Users can update their own messages" 
ON public.chat_messages FOR UPDATE 
USING (auth.uid() = sender_id);

-- RLS Policies for chat_files
CREATE POLICY "Users can view files in their rooms" 
ON public.chat_files FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants 
    WHERE room_id = chat_files.room_id 
    AND user_id = auth.uid() 
    AND is_active = true
  )
);

CREATE POLICY "Users can upload files to their rooms" 
ON public.chat_files FOR INSERT 
WITH CHECK (
  auth.uid() = uploader_id AND 
  EXISTS (
    SELECT 1 FROM public.chat_participants 
    WHERE room_id = chat_files.room_id 
    AND user_id = auth.uid() 
    AND is_active = true
  )
);

-- Create storage bucket for chat files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-files', 'chat-files', false);

-- Storage policies for chat files
CREATE POLICY "Users can view chat files they have access to" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'chat-files' AND 
  EXISTS (
    SELECT 1 FROM public.chat_files cf
    JOIN public.chat_participants cp ON cf.room_id = cp.room_id
    WHERE cf.file_path = name
    AND cp.user_id = auth.uid()
    AND cp.is_active = true
  )
);

CREATE POLICY "Users can upload files to chat rooms" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'chat-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add triggers for updated_at timestamps
CREATE TRIGGER update_chat_rooms_updated_at
  BEFORE UPDATE ON public.chat_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chat_messages_updated_at
  BEFORE UPDATE ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for chat tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_files;