-- Add missing foreign key relationships to fix schema cache issues

-- Add foreign key from user_roles to auth.users
ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign key from profiles to auth.users  
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign key from seeds to auth.users
ALTER TABLE public.seeds 
ADD CONSTRAINT seeds_gifter_id_fkey 
FOREIGN KEY (gifter_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign key from orchards to auth.users
ALTER TABLE public.orchards 
ADD CONSTRAINT orchards_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign key from orchards to profiles
ALTER TABLE public.orchards 
ADD CONSTRAINT orchards_profile_id_fkey 
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add foreign key from bestowals to auth.users
ALTER TABLE public.bestowals 
ADD CONSTRAINT bestowals_bestower_id_fkey 
FOREIGN KEY (bestower_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign key from bestowals to orchards
ALTER TABLE public.bestowals 
ADD CONSTRAINT bestowals_orchard_id_fkey 
FOREIGN KEY (orchard_id) REFERENCES public.orchards(id) ON DELETE CASCADE;

-- Add foreign key from bestowals to profiles
ALTER TABLE public.bestowals 
ADD CONSTRAINT bestowals_bestower_profile_id_fkey 
FOREIGN KEY (bestower_profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add foreign key from chat_participants to profiles  
ALTER TABLE public.chat_participants 
ADD CONSTRAINT chat_participants_profile_id_fkey 
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add foreign key from chat_participants to auth.users
ALTER TABLE public.chat_participants 
ADD CONSTRAINT chat_participants_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign key from chat_participants to chat_rooms
ALTER TABLE public.chat_participants 
ADD CONSTRAINT chat_participants_room_id_fkey 
FOREIGN KEY (room_id) REFERENCES public.chat_rooms(id) ON DELETE CASCADE;

-- Add foreign key from chat_rooms to auth.users
ALTER TABLE public.chat_rooms 
ADD CONSTRAINT chat_rooms_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign key from chat_messages to auth.users
ALTER TABLE public.chat_messages 
ADD CONSTRAINT chat_messages_sender_id_fkey 
FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign key from chat_messages to profiles
ALTER TABLE public.chat_messages 
ADD CONSTRAINT chat_messages_sender_profile_id_fkey 
FOREIGN KEY (sender_profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add foreign key from chat_messages to chat_rooms
ALTER TABLE public.chat_messages 
ADD CONSTRAINT chat_messages_room_id_fkey 
FOREIGN KEY (room_id) REFERENCES public.chat_rooms(id) ON DELETE CASCADE;

-- Add foreign key from chat_files to auth.users
ALTER TABLE public.chat_files 
ADD CONSTRAINT chat_files_uploader_id_fkey 
FOREIGN KEY (uploader_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign key from chat_files to chat_rooms
ALTER TABLE public.chat_files 
ADD CONSTRAINT chat_files_room_id_fkey 
FOREIGN KEY (room_id) REFERENCES public.chat_rooms(id) ON DELETE CASCADE;

-- Add foreign key from payment_transactions to bestowals
ALTER TABLE public.payment_transactions 
ADD CONSTRAINT payment_transactions_bestowal_id_fkey 
FOREIGN KEY (bestowal_id) REFERENCES public.bestowals(id) ON DELETE SET NULL;