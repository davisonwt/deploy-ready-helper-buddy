-- Add premium room functionality to chat_rooms
ALTER TABLE chat_rooms 
ADD COLUMN orchard_id uuid REFERENCES orchards(id),
ADD COLUMN is_premium boolean DEFAULT false,
ADD COLUMN required_bestowal_amount numeric DEFAULT 0,
ADD COLUMN access_description text;

-- Add room categories enum
CREATE TYPE premium_room_category AS ENUM (
  'marketing',
  'cooking_nutrition', 
  'diy_home',
  'natural_health',
  'business_training',
  'podcasts_interviews',
  'general_courses'
);

ALTER TABLE chat_rooms 
ADD COLUMN premium_category premium_room_category;

-- Create index for better performance
CREATE INDEX idx_chat_rooms_orchard_id ON chat_rooms(orchard_id);
CREATE INDEX idx_chat_rooms_premium ON chat_rooms(is_premium) WHERE is_premium = true;

-- Add RLS policy for premium rooms
CREATE POLICY "Users can view premium rooms they have access to" 
ON chat_rooms 
FOR SELECT 
USING (
  NOT is_premium OR 
  (is_premium AND (
    -- Room creator can always see their premium rooms
    created_by = auth.uid() OR
    -- Users who have bestowed the required amount can see the room
    EXISTS (
      SELECT 1 FROM bestowals 
      WHERE orchard_id = chat_rooms.orchard_id 
      AND bestower_id = auth.uid() 
      AND payment_status = 'completed'
      AND amount >= chat_rooms.required_bestowal_amount
    )
  ))
);

-- Update existing policy to be more specific
DROP POLICY IF EXISTS "Users can view rooms they participate in" ON chat_rooms;

CREATE POLICY "Users can view rooms they participate in" 
ON chat_rooms 
FOR SELECT 
USING (
  -- Non-premium rooms: users can see if they participate or created them
  (NOT is_premium AND (
    EXISTS (
      SELECT 1 FROM chat_participants 
      WHERE room_id = chat_rooms.id 
      AND user_id = auth.uid() 
      AND is_active = true
    ) OR created_by = auth.uid()
  )) OR
  -- Premium rooms: handled by the premium access policy above
  is_premium
);