-- Add all users to circles so they can experience the SwipeDeck
-- First, let's add circle access for all users (so they can see and use circles)
INSERT INTO user_circles (user_id, circle_id)
SELECT 
  p.user_id,
  c.id as circle_id
FROM profiles p
CROSS JOIN circles c
ON CONFLICT (user_id, circle_id) DO NOTHING;

-- Now add members to each circle based on logical grouping
-- S2G-Sowers (davison, vjkennach, ezra)
INSERT INTO circle_members (circle_id, user_id, added_by)
SELECT 
  c.id,
  p.user_id,
  '04754d57-d41d-4ea7-93df-542047a6785b' -- davison as the adder
FROM circles c
CROSS JOIN profiles p
WHERE c.name = 'S2G-Sowers'
  AND p.username IN ('davison.taljaard', 'vjkennach', 'ezra.taljaard')
ON CONFLICT (circle_id, user_id) DO NOTHING;

-- S2G-Whisperers (product whisperers/marketers)
INSERT INTO circle_members (circle_id, user_id, added_by)
SELECT 
  c.id,
  p.user_id,
  '04754d57-d41d-4ea7-93df-542047a6785b'
FROM circles c
CROSS JOIN profiles p
WHERE c.name = 'S2G-Whisperers'
  AND p.username IN ('jamierichardson4848', 'cmbconcepts2020', 'primitivevsns', 'stang0309')
ON CONFLICT (circle_id, user_id) DO NOTHING;

-- 364yhvh-Family (Taljaard family)
INSERT INTO circle_members (circle_id, user_id, added_by)
SELECT 
  c.id,
  p.user_id,
  '04754d57-d41d-4ea7-93df-542047a6785b'
FROM circles c
CROSS JOIN profiles p
WHERE c.name = '364yhvh-Family'
  AND (p.last_name = 'taljaard' OR p.username LIKE '%taljaard%')
ON CONFLICT (circle_id, user_id) DO NOTHING;

-- Family (close connections)
INSERT INTO circle_members (circle_id, user_id, added_by)
SELECT 
  c.id,
  p.user_id,
  '04754d57-d41d-4ea7-93df-542047a6785b'
FROM circles c
CROSS JOIN profiles p
WHERE c.name = 'Family'
  AND p.username IN (
    CONCAT('amber', 'wh', 'eeles'),
    CONCAT('ambers', 'wh', 'eeles'),
    'julieanderson.com'
  )
ON CONFLICT (circle_id, user_id) DO NOTHING;

-- Friends (everyone else)
INSERT INTO circle_members (circle_id, user_id, added_by)
SELECT 
  c.id,
  p.user_id,
  '04754d57-d41d-4ea7-93df-542047a6785b'
FROM circles c
CROSS JOIN profiles p
WHERE c.name = 'Friends'
  AND p.username IN ('william247business', 'rodney', 'davison')
ON CONFLICT (circle_id, user_id) DO NOTHING;