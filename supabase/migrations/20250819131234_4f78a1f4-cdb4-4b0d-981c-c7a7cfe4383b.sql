-- Add unique constraint for wallet_balances upsert to work properly
ALTER TABLE wallet_balances 
ADD CONSTRAINT wallet_balances_user_wallet_unique 
UNIQUE (user_id, wallet_address);