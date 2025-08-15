-- Create some test orchards with different statuses for testing the filter buttons
-- Note: We'll let the system calculate total_pockets automatically

-- First, let's create a test orchard with completed status
INSERT INTO orchards (
  user_id, 
  title, 
  description, 
  category, 
  status, 
  seed_value, 
  original_seed_value, 
  pocket_price, 
  filled_pockets, 
  currency,
  location
) VALUES (
  auth.uid(),
  'Completed Test Orchard',
  'This is a test orchard with completed status to test the filter buttons',
  'The Gift of Testing',
  'completed'::orchard_status,
  1000,
  1000,
  50,
  20,
  'USD',
  'Test Location'
);

-- Create a test orchard with paused status
INSERT INTO orchards (
  user_id, 
  title, 
  description, 
  category, 
  status, 
  seed_value, 
  original_seed_value, 
  pocket_price, 
  filled_pockets, 
  currency,
  location
) VALUES (
  auth.uid(),
  'Paused Test Orchard',
  'This is a test orchard with paused status to test the filter buttons',
  'The Gift of Testing',
  'paused'::orchard_status,
  1500,
  1500,
  75,
  8,
  'USD',
  'Test Location'
);

-- Create another active test orchard for more variety
INSERT INTO orchards (
  user_id, 
  title, 
  description, 
  category, 
  status, 
  seed_value, 
  original_seed_value, 
  pocket_price, 
  filled_pockets, 
  currency,
  location
) VALUES (
  auth.uid(),
  'Active Test Orchard',
  'This is a test orchard with active status to test the filter buttons',
  'The Gift of Testing',
  'active'::orchard_status,
  2000,
  2000,
  100,
  12,
  'USD',
  'Test Location'
);