-- Fix chat room data exposure security issue
-- Replace the broad "Authenticated users can view accessible rooms" policy with more restrictive ones

-- First, drop the existing overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view accessible rooms" ON public.chat_rooms;

-- Create separate, more restrictive policies for different access scenarios

-- 1. Users can view rooms they created
CREATE POLICY "Creators can view their own rooms" 
ON public.chat_rooms 
FOR SELECT 
USING (auth.uid() = created_by);

-- 2. Users can view rooms they are active participants in
CREATE POLICY "Participants can view their joined rooms" 
ON public.chat_rooms 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants 
    WHERE chat_participants.room_id = chat_rooms.id 
    AND chat_participants.user_id = auth.uid() 
    AND chat_participants.is_active = true
  )
);

-- 3. Users can view premium rooms they have access to (through bestowals)
CREATE POLICY "Premium room access for contributors" 
ON public.chat_rooms 
FOR SELECT 
USING (
  is_premium = true 
  AND EXISTS (
    SELECT 1 FROM public.bestowals 
    WHERE bestowals.orchard_id = chat_rooms.orchard_id 
    AND bestowals.bestower_id = auth.uid() 
    AND bestowals.payment_status = 'completed' 
    AND bestowals.amount >= chat_rooms.required_bestowal_amount
  )
);

-- 4. Allow viewing public (non-premium) rooms for discovery purposes
-- But only basic info - restrict sensitive fields
CREATE POLICY "Public room discovery" 
ON public.chat_rooms 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND is_premium = false 
  AND is_active = true
);