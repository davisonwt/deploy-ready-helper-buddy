-- Create wallet system tables for USDC on Solana

-- User wallets table to store Solana wallet addresses
CREATE TABLE public.user_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  wallet_address TEXT NOT NULL,
  wallet_type TEXT NOT NULL DEFAULT 'phantom',
  is_primary BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, wallet_address)
);

-- USDC transactions table to track all USDC transfers
CREATE TABLE public.usdc_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  from_wallet TEXT,
  to_wallet TEXT,
  amount DECIMAL(15,6) NOT NULL,
  signature TEXT UNIQUE NOT NULL,
  transaction_type TEXT NOT NULL, -- 'bestowal', 'top_up', 'withdrawal'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'confirmed', 'failed'
  bestowal_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  
  FOREIGN KEY (bestowal_id) REFERENCES public.bestowals(id)
);

-- Wallet balances table for caching USDC balances
CREATE TABLE public.wallet_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE NOT NULL,
  usdc_balance DECIMAL(15,6) NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usdc_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_balances ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_wallets
CREATE POLICY "Users can view their own wallets" 
ON public.user_wallets 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallets" 
ON public.user_wallets 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallets" 
ON public.user_wallets 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS policies for usdc_transactions
CREATE POLICY "Users can view their own transactions" 
ON public.usdc_transactions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions" 
ON public.usdc_transactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- RLS policies for wallet_balances (public read for balance checking)
CREATE POLICY "Anyone can view wallet balances" 
ON public.wallet_balances 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service can manage wallet balances" 
ON public.wallet_balances 
FOR ALL 
USING (true);

-- Create indexes for performance
CREATE INDEX idx_user_wallets_user_id ON public.user_wallets(user_id);
CREATE INDEX idx_usdc_transactions_user_id ON public.usdc_transactions(user_id);
CREATE INDEX idx_usdc_transactions_signature ON public.usdc_transactions(signature);
CREATE INDEX idx_wallet_balances_address ON public.wallet_balances(wallet_address);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_user_wallets_updated_at
  BEFORE UPDATE ON public.user_wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to update balance timestamp
CREATE TRIGGER update_wallet_balances_updated_at
  BEFORE UPDATE ON public.wallet_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();