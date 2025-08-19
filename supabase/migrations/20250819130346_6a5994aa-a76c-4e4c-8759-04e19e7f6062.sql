-- Fix user_wallets table to add missing is_active column
ALTER TABLE user_wallets ADD COLUMN is_active boolean DEFAULT true;

-- Fix wallet_balances table to add missing columns
ALTER TABLE wallet_balances ADD COLUMN user_id uuid REFERENCES auth.users(id);
ALTER TABLE wallet_balances ADD COLUMN updated_at timestamp with time zone DEFAULT now();

-- Update existing wallet_balances records to copy last_updated to updated_at
UPDATE wallet_balances SET updated_at = last_updated WHERE updated_at IS NULL;

-- Enable RLS on both tables if not already enabled
ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_balances ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_wallets
DROP POLICY IF EXISTS "Users can view their own wallets" ON user_wallets;
CREATE POLICY "Users can view their own wallets" 
ON user_wallets FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own wallets" ON user_wallets;
CREATE POLICY "Users can insert their own wallets" 
ON user_wallets FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own wallets" ON user_wallets;
CREATE POLICY "Users can update their own wallets" 
ON user_wallets FOR UPDATE 
USING (auth.uid() = user_id);

-- Create RLS policies for wallet_balances
DROP POLICY IF EXISTS "Users can view their own wallet balances" ON wallet_balances;
CREATE POLICY "Users can view their own wallet balances" 
ON wallet_balances FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own wallet balances" ON wallet_balances;
CREATE POLICY "Users can insert their own wallet balances" 
ON wallet_balances FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own wallet balances" ON wallet_balances;
CREATE POLICY "Users can update their own wallet balances" 
ON wallet_balances FOR UPDATE 
USING (auth.uid() = user_id);