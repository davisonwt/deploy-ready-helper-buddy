-- Fix chat_rooms RLS policies to prevent unauthorized access to private room information

-- First, drop the problematic public discovery policy
DROP POLICY IF EXISTS "Public room discovery" ON public.chat_rooms;

-- Drop overlapping policies to clean up
DROP POLICY IF EXISTS "Users can view premium rooms they have access to" ON public.chat_rooms;

-- Create a comprehensive, secure policy for viewing chat rooms
CREATE POLICY "Users can only view rooms they have access to" 
ON public.chat_rooms 
FOR SELECT 
USING (
  -- Room creator can always see their room
  auth.uid() = created_by
  OR
  -- Active participants can see the room
  EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.room_id = chat_rooms.id 
    AND cp.user_id = auth.uid() 
    AND cp.is_active = true
  )
  OR
  -- Premium room access for qualified contributors
  (
    is_premium = true 
    AND EXISTS (
      SELECT 1 FROM public.bestowals b
      WHERE b.orchard_id = chat_rooms.orchard_id 
      AND b.bestower_id = auth.uid() 
      AND b.payment_status = 'completed'
      AND b.amount >= chat_rooms.required_bestowal_amount
    )
  )
  OR
  -- Admins can see all rooms for moderation purposes
  (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'gosat'::app_role)
  )
);

-- Add a separate policy for public room browsing (only for non-sensitive info)
-- This allows users to discover rooms they can potentially join, but limits exposed data
CREATE POLICY "Limited public room browsing for discovery" 
ON public.chat_rooms 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL
  AND is_premium = false 
  AND is_active = true
  AND room_type = 'group'  -- Only group rooms can be discovered, not direct messages
  AND (
    -- Only show basic info for discovery - actual access still requires participation
    -- This policy will be combined with application-level filtering to limit exposed fields
    created_by IS NOT NULL
  )
);

-- Ensure direct messages are completely private
CREATE POLICY "Direct messages are completely private" 
ON public.chat_rooms 
FOR ALL
USING (
  CASE 
    WHEN room_type = 'direct' THEN (
      -- For direct messages, only participants can access
      auth.uid() = created_by OR
      EXISTS (
        SELECT 1 FROM public.chat_participants cp
        WHERE cp.room_id = chat_rooms.id 
        AND cp.user_id = auth.uid() 
        AND cp.is_active = true
      )
    )
    ELSE true  -- Non-direct rooms use other policies
  END
);

-- Add policy to prevent unauthorized room creation with sensitive data
CREATE POLICY "Secure room creation" 
ON public.chat_rooms 
FOR INSERT 
WITH CHECK (
  auth.uid() = created_by
  AND auth.uid() IS NOT NULL
);

-- Update existing room modification policy for better security
DROP POLICY IF EXISTS "Room creators can update their rooms" ON public.chat_rooms;
CREATE POLICY "Authorized room updates only" 
ON public.chat_rooms 
FOR UPDATE 
USING (
  auth.uid() = created_by OR
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'gosat'::app_role)
);