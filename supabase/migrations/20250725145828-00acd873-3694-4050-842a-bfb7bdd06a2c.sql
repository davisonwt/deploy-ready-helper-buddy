-- Add foreign key relationship between orchards and profiles
ALTER TABLE public.orchards 
ADD CONSTRAINT fk_orchards_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_orchards_user_id ON public.orchards(user_id);
CREATE INDEX IF NOT EXISTS idx_orchards_status ON public.orchards(status);
CREATE INDEX IF NOT EXISTS idx_orchards_category ON public.orchards(category);