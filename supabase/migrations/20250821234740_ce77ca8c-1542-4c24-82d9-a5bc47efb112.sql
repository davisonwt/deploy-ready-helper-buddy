-- Update RLS policies for call_sessions to only allow authenticated users
DROP POLICY IF EXISTS "Users can view calls they are involved in" ON public.call_sessions;
DROP POLICY IF EXISTS "Users can create calls as caller" ON public.call_sessions;
DROP POLICY IF EXISTS "Users can update calls they are involved in" ON public.call_sessions;

-- Create new policies that only allow authenticated users
CREATE POLICY "Authenticated users can view calls they are involved in" 
ON public.call_sessions 
FOR SELECT 
TO authenticated
USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

CREATE POLICY "Authenticated users can create calls as caller" 
ON public.call_sessions 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Authenticated users can update calls they are involved in" 
ON public.call_sessions 
FOR UPDATE 
TO authenticated
USING (auth.uid() = caller_id OR auth.uid() = receiver_id);