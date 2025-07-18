-- Create payment configuration table for bank details and payment settings
CREATE TABLE public.payment_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name TEXT NOT NULL,
  bank_account_name TEXT NOT NULL,
  bank_account_number TEXT NOT NULL,
  bank_swift_code TEXT,
  business_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_config ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view payment config (bank details are public for EFT)
CREATE POLICY "Payment config is viewable by everyone" 
ON public.payment_config 
FOR SELECT 
USING (true);

-- Only allow admin users to update payment config
CREATE POLICY "Only admins can update payment config" 
ON public.payment_config 
FOR INSERT 
WITH CHECK (false);

CREATE POLICY "Only admins can modify payment config" 
ON public.payment_config 
FOR UPDATE 
USING (false);

-- Insert your bank details
INSERT INTO public.payment_config (
  bank_name,
  bank_account_name,
  bank_account_number,
  bank_swift_code,
  business_email
) VALUES (
  'FNB',
  'Next Up',
  '63026823880',
  'FIRNZAJJ',
  'nextupsowgrow@example.com'
);

-- Create payment transactions table to track all payment attempts
CREATE TABLE public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bestowal_id UUID REFERENCES public.bestowals(id) ON DELETE CASCADE,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('paypal', 'stripe', 'eft')),
  payment_provider_id TEXT, -- PayPal order ID, Stripe payment intent ID, etc.
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  provider_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on payment transactions
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own payment transactions
CREATE POLICY "Users can view their own payment transactions" 
ON public.payment_transactions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.bestowals 
    WHERE bestowals.id = payment_transactions.bestowal_id 
    AND bestowals.bestower_id = auth.uid()
  )
);

-- Edge functions can create and update payment transactions
CREATE POLICY "Service can manage payment transactions" 
ON public.payment_transactions 
FOR ALL 
USING (true) 
WITH CHECK (true);