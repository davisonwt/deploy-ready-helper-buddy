-- Add only the missing foreign key relationships

-- Check and add foreign key from seeds to auth.users if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'seeds_gifter_id_fkey' 
        AND table_name = 'seeds'
    ) THEN
        ALTER TABLE public.seeds 
        ADD CONSTRAINT seeds_gifter_id_fkey 
        FOREIGN KEY (gifter_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Check and add foreign key from orchards to profiles if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'orchards_profile_id_fkey' 
        AND table_name = 'orchards'
    ) THEN
        ALTER TABLE public.orchards 
        ADD CONSTRAINT orchards_profile_id_fkey 
        FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Check and add foreign key from bestowals to profiles if not exists  
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'bestowals_bestower_profile_id_fkey' 
        AND table_name = 'bestowals'
    ) THEN
        ALTER TABLE public.bestowals 
        ADD CONSTRAINT bestowals_bestower_profile_id_fkey 
        FOREIGN KEY (bestower_profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Check and add foreign key from chat_participants to profiles if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'chat_participants_profile_id_fkey' 
        AND table_name = 'chat_participants'
    ) THEN
        ALTER TABLE public.chat_participants 
        ADD CONSTRAINT chat_participants_profile_id_fkey 
        FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Check and add foreign key from chat_messages to profiles if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'chat_messages_sender_profile_id_fkey' 
        AND table_name = 'chat_messages'
    ) THEN
        ALTER TABLE public.chat_messages 
        ADD CONSTRAINT chat_messages_sender_profile_id_fkey 
        FOREIGN KEY (sender_profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
END $$;