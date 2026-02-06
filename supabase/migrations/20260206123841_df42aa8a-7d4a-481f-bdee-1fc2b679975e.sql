-- Create sower_balances table for tracking sower earnings and withdrawals
CREATE TABLE IF NOT EXISTS public.sower_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  available_balance NUMERIC(12,2) DEFAULT 0 CHECK (available_balance >= 0),
  pending_balance NUMERIC(12,2) DEFAULT 0 CHECK (pending_balance >= 0),
  total_earned NUMERIC(12,2) DEFAULT 0 CHECK (total_earned >= 0),
  total_withdrawn NUMERIC(12,2) DEFAULT 0 CHECK (total_withdrawn >= 0),
  currency TEXT DEFAULT 'USD',
  wallet_address TEXT,
  wallet_type TEXT DEFAULT 'solana',
  last_payout_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create sower_payouts table for tracking withdrawal requests
CREATE TABLE IF NOT EXISTS public.sower_payouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency TEXT DEFAULT 'USD',
  wallet_address TEXT NOT NULL,
  wallet_type TEXT DEFAULT 'solana',
  payout_provider TEXT DEFAULT 'nowpayments',
  payout_reference TEXT,
  payout_batch_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  failure_reason TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sower_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sower_payouts ENABLE ROW LEVEL SECURITY;

-- RLS policies for sower_balances
CREATE POLICY "Users can view their own balance"
  ON public.sower_balances FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can update balances"
  ON public.sower_balances FOR ALL
  USING (true);

-- RLS policies for sower_payouts  
CREATE POLICY "Users can view their own payouts"
  ON public.sower_payouts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can request their own payouts"
  ON public.sower_payouts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_sower_balances_user_id ON public.sower_balances(user_id);
CREATE INDEX idx_sower_payouts_user_id ON public.sower_payouts(user_id);
CREATE INDEX idx_sower_payouts_status ON public.sower_payouts(status);

-- Create trigger for updated_at
CREATE TRIGGER update_sower_balances_updated_at
  BEFORE UPDATE ON public.sower_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sower_payouts_updated_at
  BEFORE UPDATE ON public.sower_payouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();