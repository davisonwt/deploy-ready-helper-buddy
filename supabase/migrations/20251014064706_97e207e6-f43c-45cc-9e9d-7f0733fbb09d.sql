-- Add blockchain and wallet_type columns to organization_wallets table
ALTER TABLE public.organization_wallets 
ADD COLUMN IF NOT EXISTS blockchain TEXT DEFAULT 'cronos',
ADD COLUMN IF NOT EXISTS wallet_type TEXT DEFAULT 'cryptocom';

-- Update existing records to cronos if they exist
UPDATE public.organization_wallets 
SET blockchain = 'cronos', wallet_type = 'cryptocom'
WHERE blockchain IS NULL OR blockchain = 'solana';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_organization_wallets_blockchain_active 
ON public.organization_wallets(blockchain, is_active) 
WHERE is_active = true;