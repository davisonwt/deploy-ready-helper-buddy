-- Create table for organizational wallet settings
CREATE TABLE public.organization_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL UNIQUE,
  wallet_name TEXT NOT NULL DEFAULT 'Sow2Grow Organizational Wallet',
  is_active BOOLEAN NOT NULL DEFAULT true,
  supported_tokens TEXT[] NOT NULL DEFAULT ARRAY['SOL', 'USDC'],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for tracking incoming payments to organizational wallet
CREATE TABLE public.organization_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_signature TEXT NOT NULL UNIQUE,
  sender_address TEXT NOT NULL,
  recipient_address TEXT NOT NULL,
  amount DECIMAL(20, 9) NOT NULL,
  token_symbol TEXT NOT NULL,
  token_mint TEXT,
  memo TEXT,
  block_time TIMESTAMP WITH TIME ZONE,
  confirmation_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.organization_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_payments ENABLE ROW LEVEL SECURITY;

-- Create policies for organization_wallets (only admins can manage)
CREATE POLICY "Admins can view organization wallets" 
ON public.organization_wallets 
FOR SELECT 
USING (public.is_admin_or_gosat(auth.uid()));

CREATE POLICY "Admins can insert organization wallets" 
ON public.organization_wallets 
FOR INSERT 
WITH CHECK (public.is_admin_or_gosat(auth.uid()));

CREATE POLICY "Admins can update organization wallets" 
ON public.organization_wallets 
FOR UPDATE 
USING (public.is_admin_or_gosat(auth.uid()));

-- Create policies for organization_payments (admins can view all, users can view public stats)
CREATE POLICY "Admins can view all organization payments" 
ON public.organization_payments 
FOR SELECT 
USING (public.is_admin_or_gosat(auth.uid()));

CREATE POLICY "Admins can insert organization payments" 
ON public.organization_payments 
FOR INSERT 
WITH CHECK (public.is_admin_or_gosat(auth.uid()));

CREATE POLICY "Admins can update organization payments" 
ON public.organization_payments 
FOR UPDATE 
USING (public.is_admin_or_gosat(auth.uid()));

-- Create trigger for updating timestamps
CREATE TRIGGER update_organization_wallets_updated_at
BEFORE UPDATE ON public.organization_wallets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organization_payments_updated_at
BEFORE UPDATE ON public.organization_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default organizational wallet (replace with actual wallet address)
INSERT INTO public.organization_wallets (wallet_address, wallet_name, supported_tokens)
VALUES (
  'sow2grow-placeholder-wallet-address-replace-with-real',
  'Sow2Grow Main Donation Wallet',
  ARRAY['SOL', 'USDC', 'USDT']
);