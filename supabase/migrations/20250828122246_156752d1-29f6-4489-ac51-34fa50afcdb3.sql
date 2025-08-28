-- Add orchard_id column to community_videos table to link marketing videos to orchards
ALTER TABLE public.community_videos 
ADD COLUMN orchard_id UUID REFERENCES public.orchards(id) ON DELETE CASCADE;

-- Add index for better performance when querying by orchard
CREATE INDEX idx_community_videos_orchard_id ON public.community_videos(orchard_id);

-- Update RLS policies to allow viewing videos linked to orchards
CREATE POLICY "Users can view orchard marketing videos" ON public.community_videos
FOR SELECT USING (
  orchard_id IS NOT NULL AND 
  status = 'approved' AND
  auth.uid() IS NOT NULL
);