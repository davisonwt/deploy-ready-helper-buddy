-- Insert the premium room into chat_rooms with a valid created_by
-- First, get the creator_id from premium_rooms and use it as created_by
INSERT INTO chat_rooms (id, name, room_type, is_premium, created_by, created_at)
SELECT 
  'a9a882d9-33f5-4cd0-83e2-00ac9ec1fd1b',
  'Premium Room',
  'group',
  true,
  creator_id,
  NOW()
FROM premium_rooms
WHERE id = 'a9a882d9-33f5-4cd0-83e2-00ac9ec1fd1b'
ON CONFLICT (id) DO NOTHING;