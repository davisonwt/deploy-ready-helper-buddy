-- Fix the specific orchard's pocket_price calculation
-- For full_value orchards, pocket_price should be seed_value / intended_pockets
UPDATE orchards 
SET pocket_price = seed_value / GREATEST(intended_pockets, 1)
WHERE 
  orchard_type = 'full_value' 
  AND id = 'b6db622e-d0e2-4d5c-857d-26f89c0112a0';