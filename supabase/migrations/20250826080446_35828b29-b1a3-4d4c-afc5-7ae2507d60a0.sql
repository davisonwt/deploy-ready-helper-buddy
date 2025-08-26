-- Fix wallet_balances RLS policy error
-- The error shows that new rows violate row-level security policy for wallet_balances table

-- First, let's check if wallet_balances table exists and fix the RLS policies
DO $$ 
BEGIN
    -- Create wallet_balances table if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'wallet_balances') THEN
        CREATE TABLE public.wallet_balances (
            id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            wallet_address text NOT NULL,
            usdc_balance numeric DEFAULT 0,
            created_at timestamp with time zone NOT NULL DEFAULT now(),
            updated_at timestamp with time zone NOT NULL DEFAULT now()
        );

        -- Create unique constraint to prevent duplicate wallet addresses per user
        ALTER TABLE public.wallet_balances 
        ADD CONSTRAINT unique_user_wallet UNIQUE (user_id, wallet_address);
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.wallet_balances ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own wallet balances" ON public.wallet_balances;
DROP POLICY IF EXISTS "Users can insert their own wallet balances" ON public.wallet_balances;
DROP POLICY IF EXISTS "Users can update their own wallet balances" ON public.wallet_balances;

-- Create proper RLS policies for wallet_balances
CREATE POLICY "Users can view their own wallet balances" 
ON public.wallet_balances 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallet balances" 
ON public.wallet_balances 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet balances" 
ON public.wallet_balances 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create function to update wallet balance timestamp
CREATE OR REPLACE FUNCTION public.update_wallet_balance_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS update_wallet_balances_updated_at ON public.wallet_balances;
CREATE TRIGGER update_wallet_balances_updated_at
    BEFORE UPDATE ON public.wallet_balances
    FOR EACH ROW
    EXECUTE FUNCTION public.update_wallet_balance_timestamp();