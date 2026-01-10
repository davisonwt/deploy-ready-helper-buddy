-- Add RLS policy to allow all authenticated users to view all tracks for voting (364ttt)
-- This enables the Torah Top Ten feature where users can vote on any uploaded song

CREATE POLICY "Authenticated users can view all tracks for voting" 
ON public.dj_music_tracks 
FOR SELECT 
TO authenticated
USING (true);