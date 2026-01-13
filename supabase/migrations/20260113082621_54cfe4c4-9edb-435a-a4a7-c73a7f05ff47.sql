-- Allow authenticated users to view all classroom sessions (for discovery and joining)
CREATE POLICY "Authenticated users can view all classroom sessions"
ON public.classroom_sessions
FOR SELECT
TO authenticated
USING (true);

-- Update the existing classroom to include instructor_profile_id
UPDATE public.classroom_sessions 
SET instructor_profile_id = (
  SELECT id FROM profiles WHERE user_id = classroom_sessions.instructor_id LIMIT 1
)
WHERE instructor_profile_id IS NULL;