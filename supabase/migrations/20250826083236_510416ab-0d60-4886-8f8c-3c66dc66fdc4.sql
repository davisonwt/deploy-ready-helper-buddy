-- Create music_purchases table for individual track sales
CREATE TABLE public.music_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id UUID NOT NULL,
  track_id UUID NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 1.25,
  platform_fee NUMERIC NOT NULL DEFAULT 0.125, -- 10%
  sow2grow_fee NUMERIC NOT NULL DEFAULT 0.00625, -- 0.5%
  total_amount NUMERIC NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_reference TEXT,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.music_purchases ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can create their own purchases" 
ON public.music_purchases 
FOR INSERT 
WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Users can view their own purchases" 
ON public.music_purchases 
FOR SELECT 
USING (auth.uid() = buyer_id);

CREATE POLICY "Service role can update purchase status" 
ON public.music_purchases 
FOR UPDATE 
USING (current_setting('role') = 'service_role');

-- Create function to calculate music purchase total
CREATE OR REPLACE FUNCTION public.calculate_music_purchase_total(base_amount NUMERIC DEFAULT 1.25)
RETURNS JSONB AS $$
DECLARE
  platform_fee NUMERIC;
  sow2grow_fee NUMERIC;
  total_amount NUMERIC;
BEGIN
  platform_fee := base_amount * 0.10; -- 10%
  sow2grow_fee := base_amount * 0.005; -- 0.5%
  total_amount := base_amount + platform_fee + sow2grow_fee;
  
  RETURN jsonb_build_object(
    'base_amount', base_amount,
    'platform_fee', platform_fee,
    'sow2grow_fee', sow2grow_fee,
    'total_amount', total_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;