-- Add foreign key constraint between seeds and profiles tables
ALTER TABLE public.seeds 
ADD CONSTRAINT seeds_gifter_id_fkey 
FOREIGN KEY (gifter_id) 
REFERENCES public.profiles(user_id) 
ON DELETE CASCADE;