-- Ensure realtime and performance for chat tables (idempotent)

-- 1) Set REPLICA IDENTITY FULL for proper realtime payloads
ALTER TABLE IF EXISTS public.chat_rooms REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.chat_participants REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.chat_messages REPLICA IDENTITY FULL;

-- 2) Ensure tables are part of supabase_realtime publication
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname='public' AND tablename='chat_rooms'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname='public' AND tablename='chat_participants'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_participants';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname='public' AND tablename='chat_messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages';
  END IF;
END $$;

-- 3) Create helpful indexes (safe if they already exist)
CREATE INDEX IF NOT EXISTS idx_chat_rooms_updated_at ON public.chat_rooms (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_is_active ON public.chat_rooms (is_active);
CREATE INDEX IF NOT EXISTS idx_chat_participants_room_active ON public.chat_participants (room_id, is_active);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_created_at ON public.chat_messages (room_id, created_at DESC);

-- 4) Ensure FK relationships exist (no-op if already present)
DO $$ BEGIN
  -- chat_participants.room_id -> chat_rooms.id
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname='public' AND t.relname='chat_participants' 
      AND c.contype='f' AND c.conname='chat_participants_room_id_fkey'
  ) THEN
    ALTER TABLE public.chat_participants 
      ADD CONSTRAINT chat_participants_room_id_fkey 
      FOREIGN KEY (room_id) REFERENCES public.chat_rooms(id) ON DELETE CASCADE;
  END IF;

  -- chat_participants.user_id -> auth.users.id
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname='public' AND t.relname='chat_participants' 
      AND c.contype='f' AND c.conname='chat_participants_user_id_fkey'
  ) THEN
    ALTER TABLE public.chat_participants 
      ADD CONSTRAINT chat_participants_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- chat_messages.room_id -> chat_rooms.id
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname='public' AND t.relname='chat_messages' 
      AND c.contype='f' AND c.conname='chat_messages_room_id_fkey'
  ) THEN
    ALTER TABLE public.chat_messages 
      ADD CONSTRAINT chat_messages_room_id_fkey 
      FOREIGN KEY (room_id) REFERENCES public.chat_rooms(id) ON DELETE CASCADE;
  END IF;

  -- chat_messages.sender_id -> auth.users.id
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname='public' AND t.relname='chat_messages' 
      AND c.contype='f' AND c.conname='chat_messages_sender_id_fkey'
  ) THEN
    ALTER TABLE public.chat_messages 
      ADD CONSTRAINT chat_messages_sender_id_fkey 
      FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;
