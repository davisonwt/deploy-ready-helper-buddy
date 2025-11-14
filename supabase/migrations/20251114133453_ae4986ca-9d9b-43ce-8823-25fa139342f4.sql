-- Add API credentials columns to organization_wallets table
ALTER TABLE public.organization_wallets 
ADD COLUMN IF NOT EXISTS api_key TEXT,
ADD COLUMN IF NOT EXISTS api_secret TEXT,
ADD COLUMN IF NOT EXISTS merchant_id TEXT;

-- Add comment explaining the structure
COMMENT ON TABLE public.organization_wallets IS 'Organization wallets with individual Binance Pay API credentials. s2gholding receives all payments initially, s2gbestow receives tithing (10%) and admin fees (5%)';

-- Update user_wallets table to support storing API credentials for personal wallets
ALTER TABLE public.user_wallets
ADD COLUMN IF NOT EXISTS api_key TEXT,
ADD COLUMN IF NOT EXISTS api_secret TEXT,
ADD COLUMN IF NOT EXISTS merchant_id TEXT;

COMMENT ON TABLE public.user_wallets IS 'Individual user Binance Pay wallets with their own API credentials for receiving bestowals';

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_org_wallets_name ON public.organization_wallets(wallet_name);
CREATE INDEX IF NOT EXISTS idx_user_wallets_user ON public.user_wallets(user_id);