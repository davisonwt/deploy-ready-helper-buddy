-- Add RLS policy to allow room creators to delete their own rooms
CREATE POLICY "Room creators can delete their own rooms" 
ON public.chat_rooms 
FOR DELETE 
USING (auth.uid() = created_by);